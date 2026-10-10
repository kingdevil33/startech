"use client";

import { useState } from "react";
import { Upload, Link2, Type, Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { submitAssignment } from "./actions";

interface SubmissionFormProps {
  assignmentId: string;
  enrollmentId: string;
  cohortId: string;
  submissionTypes: string[];
  existingSubmission: {
    id: string;
    content: string | null;
    file_url: string | null;
    link_url: string | null;
    status: string;
  } | null;
  isOverdue: boolean;
}

export function SubmissionForm({
  assignmentId,
  enrollmentId,
  cohortId,
  submissionTypes,
  existingSubmission,
  isOverdue,
}: SubmissionFormProps) {
  const [activeTab, setActiveTab] = useState(submissionTypes[0] || "text");
  const [content, setContent] = useState(existingSubmission?.content || "");
  const [linkUrl, setLinkUrl] = useState(existingSubmission?.link_url || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const result = await submitAssignment({
        assignmentId,
        enrollmentId,
        cohortId,
        content: activeTab === "text" ? content : undefined,
        linkUrl: activeTab === "link" ? linkUrl : undefined,
        isLate: isOverdue,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Card className="p-8 text-center">
        <div className="rounded-full bg-accent-500/10 p-4 w-fit mx-auto mb-4">
          <Send className="h-8 w-8 text-accent-500" />
        </div>
        <h2 className="font-heading text-xl font-bold mb-2">
          Submission Received!
        </h2>
        <p className="text-sm text-muted-foreground">
          Your assignment has been submitted successfully.
          {isOverdue && " It was marked as late."}
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="font-heading font-semibold mb-4 flex items-center gap-2">
        <Send className="h-5 w-5 text-muted-foreground" />
        Submit Your Work
      </h2>

      {isOverdue && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mb-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">
            This assignment is past due. Submissions will be marked as late.
          </p>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          {submissionTypes.includes("text") && (
            <TabsTrigger value="text" className="gap-1.5">
              <Type className="h-3.5 w-3.5" />
              Text
            </TabsTrigger>
          )}
          {submissionTypes.includes("file") && (
            <TabsTrigger value="file" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              File
            </TabsTrigger>
          )}
          {submissionTypes.includes("link") && (
            <TabsTrigger value="link" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              Link
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="text" className="space-y-3">
          <div>
            <Label htmlFor="submission-text">Your Response</Label>
            <Textarea
              id="submission-text"
              placeholder="Write your response here... (Markdown supported)"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </TabsContent>

        <TabsContent value="file" className="space-y-3">
          <div>
            <Label htmlFor="submission-file">Upload File</Label>
            <div className="mt-1.5 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-accent-500/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max 50MB • PDF, PNG, JPEG, ZIP
              </p>
              <input
                id="submission-file"
                type="file"
                className="hidden"
                accept=".pdf,.png,.jpg,.jpeg,.zip"
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="link" className="space-y-3">
          <div>
            <Label htmlFor="submission-link">External Link</Label>
            <Input
              id="submission-link"
              type="url"
              placeholder="https://github.com/username/repo"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              GitHub repo, CodeSandbox, Figma link, etc.
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 mt-4 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex justify-end mt-6">
        <Button
          variant="accent"
          size="lg"
          onClick={handleSubmit}
          disabled={loading}
          className="gap-2"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Submit Assignment
        </Button>
      </div>
    </Card>
  );
}
