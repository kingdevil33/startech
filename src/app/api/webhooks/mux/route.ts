import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";
import { ingestLessonContent, vttToText } from "@/lib/ai/ingest";

const MUX_WEBHOOK_SECRET = process.env.MUX_WEBHOOK_SECRET || "";
const TOLERANCE_SECONDS = 5 * 60;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Mux signs with `Mux-Signature: t=<unix>,v1=<hmac>` over `${t}.${body}`.
 * Older integrations sent a bare HMAC of the raw body — both are supported.
 */
function verifyMuxSignature(body: string, header: string): boolean {
  if (!MUX_WEBHOOK_SECRET) {
    console.warn(
      "MUX_WEBHOOK_SECRET is not set — webhook signature verification is skipped"
    );
    return true;
  }
  if (!header) return false;

  const expected = crypto
    .createHmac("sha256", MUX_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (!header.includes("=")) {
    return safeEqual(header, expected);
  }

  const parts = header.split(",").reduce<Record<string, string>>((acc, p) => {
    const [k, v] = p.split("=");
    if (k && v) acc[k.trim()] = v.trim();
    return acc;
  }, {});

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const signed = crypto
    .createHmac("sha256", MUX_WEBHOOK_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  return safeEqual(signature, signed);
}

export async function POST(request: NextRequest) {
  const body = await request.text();

  const sig = request.headers.get("mux-signature") || "";
  if (!verifyMuxSignature(body, sig)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = event?.type;
  const data = event?.data;
  if (typeof type !== "string" || !data) {
    return NextResponse.json({ error: "Malformed event" }, { status: 400 });
  }

  const supabase = getSupabase();

  switch (type) {
    case "video.asset.ready": {
      // Asset is ready for playback
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;
      const duration = data.duration;
      const aspectRatio = data.aspect_ratio;
      const resolution = data.resolution_tier;
      const maxResolution = data.max_stored_resolution;

      await supabase
        .from("mux_assets")
        .update({
          status: "ready",
          mux_playback_id: playbackId,
          duration_seconds: Math.round(duration || 0),
          aspect_ratio: aspectRatio,
          resolution_tier: resolution,
          max_resolution: maxResolution,
          error_message: null,
        })
        .eq("mux_asset_id", assetId);

      // Capture auto-generated captions as the lesson transcript
      try {
        const tracks: { type?: string; text_src?: string }[] =
          data.tracks || [];
        const textTrack = tracks.find(
          (t) => t.type === "text" && !!t.text_src
        );
        if (textTrack?.text_src) {
          const res = await fetch(textTrack.text_src);
          if (res.ok) {
            const transcript = vttToText(await res.text());
            if (transcript) {
              await supabase
                .from("mux_assets")
                .update({
                  transcript,
                  captions_url: textTrack.text_src,
                })
                .eq("mux_asset_id", assetId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to capture Mux transcript:", err);
      }

      // Update lesson duration
      const { data: muxAsset } = await supabase
        .from("mux_assets")
        .select("lesson_id")
        .eq("mux_asset_id", assetId)
        .single();

      if (muxAsset?.lesson_id) {
        await supabase
          .from("lessons")
          .update({
            duration_minutes: Math.ceil((duration || 0) / 60),
          })
          .eq("id", muxAsset.lesson_id);

        // Rebuild RAG chunks from the lesson text + transcript
        await ingestLessonContent(supabase, muxAsset.lesson_id);
      }

      break;
    }

    case "video.asset.errored": {
      const assetId = data.id;
      const errorMessage =
        data.errors?.messages?.[0] || "Video processing failed";

      await supabase
        .from("mux_assets")
        .update({
          status: "errored",
          error_message: errorMessage,
        })
        .eq("mux_asset_id", assetId);

      break;
    }

    case "video.upload.asset_created": {
      // Link the upload to the asset
      const uploadId = data.id;
      const assetId = data.asset_id;

      await supabase
        .from("mux_assets")
        .update({
          mux_asset_id: assetId,
          status: "preparing",
        })
        .eq("mux_upload_id", uploadId);

      break;
    }
  }

  return NextResponse.json({ received: true });
}
