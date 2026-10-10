"use client";

import MuxPlayer from "@mux/mux-player-react";
import { useCallback, useRef } from "react";
import { updateWatchProgress } from "./actions";

interface LessonVideoPlayerProps {
  playbackId: string;
  lessonId: string;
  enrollmentId: string;
  lastPosition: number;
}

export function LessonVideoPlayer({
  playbackId,
  lessonId,
  enrollmentId,
  lastPosition,
}: LessonVideoPlayerProps) {
  const lastSavedRef = useRef(0);
  const saveIntervalRef = useRef(30); // Save progress every 30 seconds of playback

  const handleTimeUpdate = useCallback(
    (event: Event) => {
      const target = event.target as HTMLMediaElement;
      if (!target) return;

      const currentTime = Math.floor(target.currentTime);
      const duration = Math.floor(target.duration || 0);

      // Save progress every 30 seconds of playback change
      if (Math.abs(currentTime - lastSavedRef.current) >= saveIntervalRef.current) {
        lastSavedRef.current = currentTime;
        updateWatchProgress({
          lessonId,
          enrollmentId,
          watchSeconds: currentTime,
          totalDurationSeconds: duration,
          lastPositionSeconds: currentTime,
        });
      }
    },
    [lessonId, enrollmentId]
  );

  const handleEnded = useCallback(() => {
    // Save final position when video ends
    updateWatchProgress({
      lessonId,
      enrollmentId,
      watchSeconds: 0,
      totalDurationSeconds: 0,
      lastPositionSeconds: 0,
    });
  }, [lessonId, enrollmentId]);

  return (
    <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
      <MuxPlayer
        playbackId={playbackId}
        startTime={lastPosition}
        accentColor="#22c55e"
        metadata={{
          video_title: "Lesson Video",
          viewer_user_id: enrollmentId,
        }}
        streamType="on-demand"
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
