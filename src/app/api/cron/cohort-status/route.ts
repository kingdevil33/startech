import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CRON_UNAUTHORIZED, verifyCronSecret } from "@/lib/cron";

/**
 * POST /api/cron/cohort-status
 *
 * Advances cohort lifecycle:
 *   enrollment_open → enrollment_closed  (enrollment window closed)
 *   enrollment_closed → active           (start date reached)
 *   active → completed                  (end date reached)
 *   completed → archived                (post-access period elapsed)
 */
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json(CRON_UNAUTHORIZED.json, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const transitions: { from: string; to: string; count: number }[] = [];

  // 1. Close enrollment when the window ends
  {
    const { data, error } = await admin
      .from("cohorts")
      .update({ status: "enrollment_closed" })
      .eq("status", "enrollment_open")
      .lte("enrollment_closes_at", now)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    transitions.push({
      from: "enrollment_open",
      to: "enrollment_closed",
      count: data?.length ?? 0,
    });
  }

  // 2. Activate cohorts whose start date has arrived
  {
    const { data, error } = await admin
      .from("cohorts")
      .update({ status: "active" })
      .in("status", ["enrollment_closed", "draft"])
      .lte("starts_at", now)
      .gt("ends_at", now)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    transitions.push({
      from: "enrollment_closed",
      to: "active",
      count: data?.length ?? 0,
    });
  }

  // 3. Complete cohorts whose end date has passed
  {
    const { data, error } = await admin
      .from("cohorts")
      .update({ status: "completed" })
      .eq("status", "active")
      .lte("ends_at", now)
      .select("id");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    transitions.push({ from: "active", to: "completed", count: data?.length ?? 0 });
  }

  // 4. Archive cohorts after their post-access period
  const { data: completed, error: completedError } = await admin
    .from("cohorts")
    .select("id, ends_at, post_access_days")
    .eq("status", "completed");

  if (completedError) {
    return NextResponse.json(
      { error: completedError.message },
      { status: 500 }
    );
  }

  const archiveIds = (completed ?? [])
    .filter((c) => {
      const accessEnds = new Date(c.ends_at);
      accessEnds.setDate(accessEnds.getDate() + c.post_access_days);
      return accessEnds.getTime() <= Date.now();
    })
    .map((c) => c.id);

  let archived = 0;
  if (archiveIds.length > 0) {
    const { data, error } = await admin
      .from("cohorts")
      .update({ status: "archived" })
      .in("id", archiveIds)
      .select("id");
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    archived = data?.length ?? 0;
  }

  transitions.push({ from: "completed", to: "archived", count: archived });

  return NextResponse.json({ transitions });
}
