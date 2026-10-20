import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getMux, hasMuxCredentials } from "@/lib/mux/client";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

const lessonIdSchema = z.object({ lessonId: z.string().uuid() });

type StaffContext = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  role: string;
};

/** Unwrap an embedded PostgREST relation (object or single-element array). */
function unwrap<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T) ?? null;
  return (value as T) ?? null;
}

type LessonRow = { id: string; lesson_type?: string; week?: unknown };
type WeekRow = { course_id?: string; course?: unknown };
type CourseRow = { instructor_id?: string };

/**
 * Authenticate the caller and confirm they manage the lesson's course.
 * Mirrors the ownership rule used across /manage pages: course instructor or admin.
 */
async function requireStaffForLesson(
  lessonId: string
): Promise<{ ok: true; ctx: StaffContext } | { ok: false; response: NextResponse }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (
    !profile ||
    !["instructor", "admin", "teaching_assistant"].includes(profile.role)
  ) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const limit = await checkRateLimit(apiRateLimit, `api:${user.id}`);
  if (!limit.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      ),
    };
  }

  const ctx: StaffContext = { supabase, userId: user.id, role: profile.role };

  const { data, error: lessonError } = await ctx.supabase
    .from("lessons")
    .select(
      "id, lesson_type, week:weeks(id, course_id, course:courses(id, instructor_id))"
    )
    .eq("id", lessonId)
    .maybeSingle();

  const lesson = data as unknown as LessonRow | null;

  if (lessonError) {
    console.error("Lesson lookup failed:", lessonError);
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Failed to verify lesson" },
        { status: 500 }
      ),
    };
  }

  if (!lesson) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Lesson not found" }, { status: 404 }),
    };
  }

  const week = unwrap<WeekRow>(lesson.week);
  const course = unwrap<CourseRow>(week?.course);

  if (ctx.role !== "admin" && course?.instructor_id !== ctx.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (lesson.lesson_type !== "video") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Lesson is not a video lesson" },
        { status: 400 }
      ),
    };
  }

  return { ok: true, ctx };
}

/**
 * POST /api/mux/upload — create a Mux direct-upload URL for a lesson and
 * record the pending upload in mux_assets (one row per lesson, replaced
 * on re-upload).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = lessonIdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "lessonId is required and must be a UUID" },
        { status: 400 }
      );
    }

    const access = await requireStaffForLesson(parsed.data.lessonId);
    if (!access.ok) return access.response;
    const { ctx } = access;

    const upload = await getMux().video.uploads.create({
      new_asset_settings: {
        playback_policy: ["public"],
        encoding_tier: "smart",
        // Auto-generate captions
        input: [
          {
            generated_subtitles: [
              { language_code: "en", name: "English (auto)" },
            ],
          },
        ],
      },
      cors_origin: process.env.NEXT_PUBLIC_APP_URL || "*",
    });

    if (!upload?.id || !upload?.url) {
      console.error("Mux returned an incomplete upload:", upload);
      return NextResponse.json(
        { error: "Failed to create upload" },
        { status: 502 }
      );
    }

    const record = {
      lesson_id: parsed.data.lessonId,
      mux_upload_id: upload.id,
      status: "waiting" as const,
      error_message: null,
      uploaded_by: ctx.userId,
    };

    // mux_assets.lesson_id has no unique constraint, so upsert with
    // onConflict("lesson_id") is rejected by Postgres. Update the newest
    // row for the lesson instead, or insert the first one.
    const { data: existing, error: existingError } = await ctx.supabase
      .from("mux_assets")
      .select("id")
      .eq("lesson_id", parsed.data.lessonId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("mux_assets lookup failed:", existingError);
      return NextResponse.json(
        { error: "Failed to record upload" },
        { status: 500 }
      );
    }

    if (existing) {
      // Keep mux_playback_id so the previous video stays playable while
      // the replacement is processed; clear the asset link so the webhook
      // can't match a stale asset.
      const { error: updateError } = await ctx.supabase
        .from("mux_assets")
        .update({ ...record, mux_asset_id: null })
        .eq("id", existing.id);

      if (updateError) {
        console.error("mux_assets update failed:", updateError);
        return NextResponse.json(
          { error: "Failed to record upload" },
          { status: 500 }
        );
      }
    } else {
      const { error: insertError } = await ctx.supabase
        .from("mux_assets")
        .insert(record);

      if (insertError) {
        console.error("mux_assets insert failed:", insertError);
        return NextResponse.json(
          { error: "Failed to record upload" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
      lessonId: parsed.data.lessonId,
    });
  } catch (error) {
    console.error("Mux upload error:", error);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 }
    );
  }
}

type AssetStatusRow = {
  status: string | null;
  mux_asset_id: string | null;
  mux_upload_id: string | null;
  mux_playback_id: string | null;
  duration_seconds: number | null;
  error_message: string | null;
};

const TERMINAL_STATUSES = new Set(["ready", "errored"]);

/**
 * Reconcile mux_assets with Mux directly. Mux webhooks only reach public
 * URLs, so locally (or if the webhook is misconfigured) the row would stay
 * at "waiting" forever — ask Mux instead and write the result back.
 */
async function syncStatusFromMux(
  ctx: StaffContext,
  rowId: string,
  row: AssetStatusRow
): Promise<AssetStatusRow> {
  let current = row;
  const mux = getMux();

  // Resolve the asset behind the direct upload, if not linked yet.
  if (!current.mux_asset_id && current.mux_upload_id) {
    try {
      const upload = await mux.video.uploads.retrieve(current.mux_upload_id);
      const assetId = upload.asset_id;
      if (assetId) {
        current = { ...current, mux_asset_id: assetId };
        await ctx.supabase
          .from("mux_assets")
          .update({ mux_asset_id: assetId })
          .eq("id", rowId);
      }
    } catch (err) {
      console.error("Mux upload lookup failed:", err);
    }
  }

  if (!current.mux_asset_id) return current;

  try {
    const asset = await mux.video.assets.retrieve(current.mux_asset_id);
    const playbackId = asset.playback_ids?.[0]?.id ?? null;
    const duration = typeof asset.duration === "number" ? asset.duration : null;

    if (asset.status === "ready") {
      current = {
        ...current,
        status: "ready",
        mux_playback_id: playbackId,
        duration_seconds: duration ? Math.round(duration) : null,
        error_message: null,
      };
    } else if (asset.status === "errored") {
      current = {
        ...current,
        status: "errored",
        error_message:
          asset.errors?.messages?.[0] ?? "Video processing failed",
      };
    } else if (current.status !== "preparing") {
      current = { ...current, status: "preparing" };
    }

    if (current.status !== row.status || current.mux_playback_id !== row.mux_playback_id) {
      await ctx.supabase
        .from("mux_assets")
        .update({
          status: current.status,
          mux_playback_id: current.mux_playback_id,
          duration_seconds: current.duration_seconds,
          error_message: current.error_message,
        })
        .eq("id", rowId);
    }
  } catch (err) {
    console.error("Mux asset lookup failed:", err);
  }

  return current;
}

/**
 * GET /api/mux/upload?lessonId=... — poll the processing status of the
 * lesson's latest Mux asset (used by the upload form after the PUT).
 */
export async function GET(request: NextRequest) {
  try {
    const parsed = lessonIdSchema.safeParse({
      lessonId: request.nextUrl.searchParams.get("lessonId"),
    });
    if (!parsed.success) {
      return NextResponse.json(
        { error: "lessonId is required and must be a UUID" },
        { status: 400 }
      );
    }

    const access = await requireStaffForLesson(parsed.data.lessonId);
    if (!access.ok) return access.response;
    const { ctx } = access;

    const { data: asset, error: assetError } = await ctx.supabase
      .from("mux_assets")
      .select("id, status, mux_asset_id, mux_upload_id, mux_playback_id, duration_seconds, error_message")
      .eq("lesson_id", parsed.data.lessonId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (assetError) {
      console.error("mux_assets lookup failed:", assetError);
      return NextResponse.json(
        { error: "Failed to load status" },
        { status: 500 }
      );
    }

    let row = asset as unknown as (AssetStatusRow & { id: string }) | null;

    // Webhook hasn't reported yet (common when developing against localhost)
    if (row && !TERMINAL_STATUSES.has(row.status ?? "") && hasMuxCredentials()) {
      row = {
        ...(await syncStatusFromMux(ctx, row.id, row)),
        id: row.id,
      } as AssetStatusRow & { id: string };
    }

    return NextResponse.json({
      status: row?.status ?? "none",
      playbackId: row?.mux_playback_id ?? null,
      durationSeconds: row?.duration_seconds ?? null,
      error: row?.status === "errored" ? row?.error_message : null,
    });
  } catch (error) {
    console.error("Mux status error:", error);
    return NextResponse.json(
      { error: "Failed to load status" },
      { status: 500 }
    );
  }
}
