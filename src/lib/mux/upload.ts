import { getMux } from "./client";

export type DirectUploadParams = {
  corsOrigin?: string;
  /** Seconds the upload URL stays valid (default 1 hour) */
  timeoutSeconds?: number;
};

export type DirectUploadResult = {
  id: string;
  url: string;
  status: string;
};

/**
 * Create a Mux direct upload URL. The client uploads straight to Mux;
 * Mux then calls our webhook with `video.upload.asset_created` and
 * `video.asset.ready`.
 */
export async function createDirectUpload(
  params: DirectUploadParams = {}
): Promise<DirectUploadResult> {
  const upload = await getMux().video.uploads.create({
    cors_origin: params.corsOrigin ?? "*",
    timeout: params.timeoutSeconds ?? 3600,
  });

  if (!upload.url) {
    throw new Error("Mux did not return an upload URL");
  }

  return { id: upload.id, url: upload.url, status: upload.status };
}
