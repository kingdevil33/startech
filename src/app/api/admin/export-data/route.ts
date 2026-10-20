import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { apiRateLimit, checkRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/admin/export-data
 *
 * GDPR data export. A signed-in user always exports their own data;
 * admins may pass `userId` to export another account's data.
 * Returns a JSON attachment.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limit = await checkRateLimit(apiRateLimit, `api:${user.id}`);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const requestedUserId =
      body && typeof body === "object"
        ? (body as { userId?: string }).userId
        : undefined;

    const targetUserId = requestedUserId ?? user.id;
    let isAdmin = false;

    if (requestedUserId && requestedUserId !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      isAdmin = profile?.role === "admin";
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Service role is needed to read tables the subject may not be able to
    // read under RLS in their current state (e.g. after account suspension).
    const reader = isAdmin ? createAdminClient() : supabase;

    const [
      profile,
      enrollments,
      payments,
      progress,
      submissions,
      reviews,
      threads,
      posts,
      notifications,
      certificates,
      conversations,
      auditLog,
    ] = await Promise.all([
      reader.from("profiles").select("*").eq("id", targetUserId).maybeSingle(),
      reader
        .from("enrollments")
        .select("*")
        .eq("user_id", targetUserId),
      reader.from("payments").select("*").eq("user_id", targetUserId),
      reader.from("progress").select("*").eq("user_id", targetUserId),
      reader.from("submissions").select("*").eq("user_id", targetUserId),
      reader.from("reviews").select("*").eq("reviewer_id", targetUserId),
      reader.from("threads").select("*").eq("user_id", targetUserId),
      reader.from("posts").select("*").eq("user_id", targetUserId),
      reader.from("notifications").select("*").eq("user_id", targetUserId),
      reader.from("certificates").select("*").eq("user_id", targetUserId),
      reader.from("ai_conversations").select("*").eq("user_id", targetUserId),
      reader.from("audit_log").select("*").eq("actor_id", targetUserId),
    ]);

    const conversationIds = (conversations.data ?? []).map((c) => c.id);
    const aiMessages = conversationIds.length
      ? await reader
          .from("ai_messages")
          .select("*")
          .in("conversation_id", conversationIds)
      : { data: [] as unknown[] };

    const exportPayload = {
      exported_at: new Date().toISOString(),
      subject_user_id: targetUserId,
      profile: profile.data ?? null,
      enrollments: enrollments.data ?? [],
      payments: payments.data ?? [],
      progress: progress.data ?? [],
      submissions: submissions.data ?? [],
      reviews: reviews.data ?? [],
      forum: {
        threads: threads.data ?? [],
        posts: posts.data ?? [],
      },
      notifications: notifications.data ?? [],
      certificates: certificates.data ?? [],
      ai: {
        conversations: conversations.data ?? [],
        messages: aiMessages.data ?? [],
      },
      audit_log: auditLog.data ?? [],
    };

    if (isAdmin && requestedUserId && requestedUserId !== user.id) {
      await supabase.rpc("log_audit", {
        p_actor_id: user.id,
        p_action: "gdpr.export",
        p_entity_type: "profile",
        p_entity_id: targetUserId,
        p_details: { format: "json" },
      });
    }

    return new NextResponse(JSON.stringify(exportPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="startech-export-${targetUserId}.json"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("Data export failed:", err);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
