import { zoomRequest } from "./client";

export type CreateMeetingParams = {
  topic: string;
  /** ISO 8601 start time, e.g. 2026-01-15T18:00:00Z */
  startTime: string;
  durationMinutes: number;
  timezone?: string;
  agenda?: string;
  /** Recurring settings are out of scope — one-off meetings only. */
  settings?: Record<string, unknown>;
};

export type ZoomMeeting = {
  id: number;
  join_url: string;
  start_url: string;
  password: string;
  start_time: string;
};

/**
 * Create a Zoom meeting for a live session.
 * Returns the meeting details including the student-facing join URL.
 */
export async function createZoomMeeting(
  params: CreateMeetingParams
): Promise<ZoomMeeting> {
  return zoomRequest<ZoomMeeting>("/users/me/meetings", {
    method: "POST",
    body: {
      topic: params.topic,
      type: 2, // scheduled meeting
      start_time: params.startTime,
      duration: params.durationMinutes,
      timezone: params.timezone ?? "Africa/Accra",
      agenda: params.agenda,
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        waiting_room: true,
        ...params.settings,
      },
    },
  });
}

/** Update the schedule of an existing meeting. */
export async function updateZoomMeeting(
  meetingId: number | string,
  params: { topic?: string; startTime?: string; durationMinutes?: number }
): Promise<void> {
  await zoomRequest(`/meetings/${meetingId}`, {
    method: "PATCH",
    body: {
      ...(params.topic ? { topic: params.topic } : {}),
      ...(params.startTime ? { start_time: params.startTime } : {}),
      ...(params.durationMinutes ? { duration: params.durationMinutes } : {}),
    },
  });
}

/** Delete/cancel a meeting. */
export async function deleteZoomMeeting(meetingId: number | string): Promise<void> {
  await zoomRequest(`/meetings/${meetingId}`, { method: "DELETE" });
}
