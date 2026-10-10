"use client";

import { useState } from "react";
import {
  Upload,
  Video,
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
}

export function VideoUploadForm({ lessonOptions }: VideoUploadFormProps) {
  const [selectedLesson, setSelectedLesson] = useState(
    lessonOptions[0]?.lessonId || ""
  );
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedLesson) return;

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
      if (createData.error) throw new Error(createData.error);

      const uploadUrl = createData.uploadUrl;

      // Step 2: Upload the file directly to Mux
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus("processing");
          // Mux will process the video and send a webhook when ready
          setTimeout(() => {
            setStatus("done");
            setUploading(false);
          }, 3000);
        } else {
          throw new Error("Upload failed");
        }
      };

      xhr.onerror = () => {
        throw new Error("Upload failed");
      };

      xhr.send(file);
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
              Mux is encoding your video. This may take a few minutes.
            </p>
          </div>
        </div>
      ) : status === "done" ? (
        <div className="rounded-xl border border-accent-500 bg-accent-500/5 p-8 text-center space-y-4">
          <CheckCircle2 className="h-10 w-10 text-accent-500 mx-auto" />
          <div>
            <p className="font-heading font-semibold">Upload Complete!</p>
            <p className="text-sm text-muted-foreground">
              Your video is being processed and will be available shortly.
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
