import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Mux from "@mux/mux-node";

function getMux() {
  return new Mux({
    tokenId: process.env.MUX_TOKEN_ID || "",
    tokenSecret: process.env.MUX_TOKEN_SECRET || "",
  });
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify instructor role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !profile ||
      !["instructor", "admin", "teaching_assistant"].includes(profile.role)
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { lessonId } = await request.json();
    if (!lessonId) {
      return NextResponse.json(
        { error: "lessonId is required" },
        { status: 400 }
      );
    }

    // Create a direct upload URL
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

    // Record in database
    await supabase.from("mux_assets").upsert(
      {
        lesson_id: lessonId,
        mux_upload_id: upload.id,
        status: "waiting",
        uploaded_by: user.id,
      },
      { onConflict: "lesson_id" }
    );

    return NextResponse.json({
      uploadUrl: upload.url,
      uploadId: upload.id,
    });
  } catch (error) {
    console.error("Mux upload error:", error);
    return NextResponse.json(
      { error: "Failed to create upload" },
      { status: 500 }
    );
  }
}
