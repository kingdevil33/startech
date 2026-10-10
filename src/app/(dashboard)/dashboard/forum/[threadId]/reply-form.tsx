"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { createReply } from "./actions";

export function ReplyForm({ threadId }: { threadId: string }) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createReply({ threadId, content: content.trim() });
      if (result.error) {
        setError(result.error);
      } else {
        setContent("");
        // Force reload to show new reply
        window.location.reload();
      }
    } catch {
      setError("Failed to post reply.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="font-heading font-semibold text-sm mb-3">Post a Reply</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Write your reply... (Markdown supported)"
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="accent"
            disabled={loading || !content.trim()}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Reply
          </Button>
        </div>
      </form>
    </Card>
  );
}
