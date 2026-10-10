import { youtubeRequest } from "./client";

export type CreateBroadcastParams = {
  title: string;
  description?: string;
  /** ISO 8601 scheduled start, e.g. 2026-01-15T18:00:00Z */
  scheduledStartTime: string;
  privacyStatus?: "public" | "unlisted" | "private";
};

export type YouTubeBroadcastResult = {
  broadcastId: string;
  streamId: string;
  /** Public watch page for students */
  watchUrl: string;
  /** RTMP ingest URL for the streaming encoder (OBS) */
  streamUrl: string;
  /** Stream key for the encoder */
  streamKey: string;
};

/**
 * Create a YouTube live broadcast + stream and bind them together.
 * The instructor streams into `streamUrl` with `streamKey`; students watch
 * at `watchUrl`.
 */
export async function createYouTubeBroadcast(
  params: CreateBroadcastParams
): Promise<YouTubeBroadcastResult> {
  const broadcast = await youtubeRequest<{ id: string; snippet: { title: string } }>(
    "/liveBroadcasts",
    {
      method: "POST",
      body: {
        snippet: {
          title: params.title,
          description: params.description ?? "",
          scheduledStartTime: params.scheduledStartTime,
        },
        status: {
          privacyStatus: params.privacyStatus ?? "public",
          selfDeclaredMadeForKids: false,
        },
        contentDetails: {
          enableAutoStart: true,
          enableAutoStop: false,
          enableDvr: true,
          enableContentEncryption: false,
        },
      },
    }
  );

  const stream = await youtubeRequest<{
    id: string;
    cdn: { ingestionInfo: { ingestionAddress: string; streamName: string } };
  }>("/liveStreams", {
    method: "POST",
    body: {
      snippet: { title: `${params.title} — stream` },
      cdn: {
        frameRate: "30fps",
        ingestionType: "rtmp",
        resolution: "1080p",
      },
    },
  });

  await youtubeRequest(
    `/liveBroadcasts/bind?id=${encodeURIComponent(broadcast.id)}` +
      `&streamId=${encodeURIComponent(stream.id)}`,
    { method: "PUT" }
  );

  const streamKey = stream.cdn.ingestionInfo.streamName;

  return {
    broadcastId: broadcast.id,
    streamId: stream.id,
    watchUrl: `https://youtu.be/${broadcast.id}`,
    streamUrl: stream.cdn.ingestionInfo.ingestionAddress,
    streamKey,
  };
}
