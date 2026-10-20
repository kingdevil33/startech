"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface VideoUploadFormProps {
  lessonOptions: {
    lessonId: string;
    lessonTitle: string;
    weekTitle: string;
    courseTitle: string;
  }[];
  initialLessonId?: string;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5GB
const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 15 * 60 * 1000; // Mux can take a while on long videos

type Status = "idle" | "uploading" | "processing" | "done" | "error";

export function VideoUploadForm({
  lessonOptions,
  initialLessonId,
}: VideoUploadFormProps) {
  const [selectedLesson, setSelectedLesson] = useState(() => {
    if (
      initialLessonId &&
      lessonOptions.some((o) => o.lessonId === initialLessonId)
    ) {
      return initialLessonId;
    }
    return lessonOptions[0]?.lessonId || "";
  });
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Preselect when the lesson editor links here with ?lessonId=
  useEffect(() => {
    if (
      initialLessonId &&
      lessonOptions.some((o) => o.lessonId === initialLessonId)
    ) {
      setSelectedLesson(initialLessonId);
    }
  }, [initialLessonId, lessonOptions]);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  function pollUntilProcessed(lessonId: string, deadline: number) {
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/mux/upload?lessonId=${encodeURIComponent(lessonId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Status check failed");

        if (data.status === "ready") {
          setStatus("done");
          setUploading(false);
          return;
        }
        if (data.status === "errored") {
          throw new Error(data.error || "Mux failed to process this video");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Status check failed");
        setStatus("error");
        setUploading(false);
        return;
      }

      if (Date.now() > deadline) {
        setError(
          "Processing is taking longer than expected. Check the lesson page later for status."
        );
        setStatus("error");
        setUploading(false);
        return;
      }
      pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
    };

    pollTimer.current = setTimeout(poll, POLL_INTERVAL_MS);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file after a failure
    e.target.value = "";
    if (!file || !selectedLesson) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError("File is too large. Maximum size is 5GB.");
      setStatus("error");
      return;
    }

    setUploading(true);
    setStatus("uploading");
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get a direct upload URL from Mux via our API
      const createRes = await fetch("/api/mux/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: selectedLesson }),
      });

      const createData = await createRes.json();
      if (!createRes.ok || createData.error) {
        throw new Error(createData.error || "Failed to create upload");
      }

      const uploadUrl: string = createData.uploadUrl;

      // Step 2: Upload the file directly to Mux
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", uploadUrl);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed (HTTP ${xhr.status})`));
        };
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.onabort = () => reject(new Error("Upload cancelled"));
        xhr.send(file);
      });

      // Step 3: Poll our API until the Mux webhook reports ready/errored
      setStatus("processing");
      setProgress(100);
      pollUntilProcessed(selectedLesson, Date.now() + POLL_TIMEOUT_MS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setStatus("error");
      setUploading(false);
    }
  }

  return (
    <Card className="p-6 space-y-6">
      {/* Lesson selector */}
      <div>
        <Label htmlFor="lesson">Select Lesson</Label>
        <select
          id="lesson"
          value={selectedLesson}
          onChange={(e) => setSelectedLesson(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          disabled={uploading}
        >
          <option value="">Select a video lesson...</option>
          {lessonOptions.map((opt) => (
            <option key={opt.lessonId} value={opt.lessonId}>
              {opt.courseTitle} → {opt.weekTitle} → {opt.lessonTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Upload area */}
      {status === "idle" || status === "error" ? (
        <div className="relative">
          <input
            type="file"
            accept="video/*"
            onChange={handleUpload}
            disabled={!selectedLesson || uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />
          <div className="border-2 border-dashed border-border rounded-xl p-12 text-center hover:border-accent-500/50 transition-colors">
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-1">
              Drop your video here
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              or click to browse. MP4, MOV, WebM supported.
            </p>
            <Badge variant="outline">Max 5GB</Badge>
          </div>
        </div>
      ) : status === "uploading" ? (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-accent-500 mx-auto animate-spin" />
          <div>
            <p className="font-heading font-semibold">Uploading...</p>
            <p className="text-sm text-muted-foreground">{progress}% complete</p>
          </div>
          <Progress value={progress} className="h-3 max-w-xs mx-auto" />
        </div>
      ) : status === "processing" ? (
        <div className="rounded-xl border border-border p-8 text-center space-y-4">
          <Loader2 className="h-10 w-10 text-electric-500 mx-auto animate-spin" />
          <div>
            <p className="font-heading font-semibold">Processing Video</p>
            <p className="text-sm text-muted-foreground">
              Mux is encoding your video. This may take a few minutes — you can
              safely leave this page.
            </p>
          </div>
        </div>
      ) : status === "done" ? (
        <div className="rounded-xl border border-accent-500 bg-accent-500/5 p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-accent-500 mx-auto" />
          <div>
            <p className="font-heading font-semibold">Video Ready!</p>
            <p className="text-sm text-muted-foreground">
              Your video has been processed and is live on the lesson.
            </p>
          </div>
          <Button
            variant="accent"
            onClick={() => {
              setStatus("idle");
              setProgress(0);
            }}
          >
            Upload Another
          </Button>
        </div>
      ) : null}

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
    </Card>
  );
}
