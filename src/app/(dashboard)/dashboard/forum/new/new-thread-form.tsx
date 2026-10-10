"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createThread } from "./actions";

interface NewThreadFormProps {
  categories: { id: string; name: string; label: string }[];
}

export function NewThreadForm({ categories }: NewThreadFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !categoryId) return;

    setLoading(true);
    setError(null);

    try {
      const result = await createThread({
        categoryId,
        title: title.trim(),
        content: content.trim(),
      });
      if (result.error) {
        setError(result.error);
      } else if (result.threadId) {
        router.push(`/dashboard/forum/${result.threadId}`);
      }
    } catch {
      setError("Failed to create thread.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Link
        href="/dashboard/forum"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Forum
      </Link>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="What's your question or topic?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          <div>
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="Describe your question or topic in detail... (Markdown supported)"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/forum">Cancel</Link>
            </Button>
            <Button
              type="submit"
              variant="accent"
              disabled={loading || !title.trim() || !content.trim()}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Post Thread
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
