import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/forum/realtime?cohortId=...
 *
 * Returns the Realtime channel configuration for a cohort's forum.
 * Clients subscribe with the browser Supabase client using these values;
 * this endpoint exists so access (enrollment) is verified server-side
 * before handing out the channel name.
 */
export async function GET(request: NextRequest) {
  try {
    const cohortId = request.nextUrl.searchParams.get("cohortId");
    if (!cohortId) {
      return NextResponse.json(
        { error: "Missing cohortId" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isStaff =
      profile?.role === "admin" ||
      profile?.role === "instructor" ||
      profile?.role === "teaching_assistant";

    if (!isStaff) {
      const { data: enrollment } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("cohort_id", cohortId)
        .in("status", ["active", "completed"])
        .maybeSingle();

      if (!enrollment) {
        return NextResponse.json({ error: "Not enrolled" }, { status: 403 });
      }
    }

    return NextResponse.json({
      channel: `cohort:${cohortId}:forum`,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      events: ["INSERT"],
      tables: ["threads", "posts"],
    });
  } catch (err) {
    console.error("Forum realtime config failed:", err);
    return NextResponse.json(
      { error: "Could not load realtime config" },
      { status: 500 }
    );
  }
}
