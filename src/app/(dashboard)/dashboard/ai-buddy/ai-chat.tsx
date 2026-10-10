"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  Loader2,
  Plus,
  MessageSquare,
  Sparkles,
  BookOpen,
  Clock,
  ThumbsUp,
  ThumbsDown,
  ChevronLeft,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatRelativeTime, percent } from "@/lib/utils";

interface CourseOption {
  enrollmentId: string;
  cohortId: string;
  courseId: string;
  courseTitle: string;
  cohortName: string;
}

interface Conversation {
  id: string;
  course_id: string;
  title: string | null;
  message_count: number;
  updated_at: string;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources?: {
    lesson_title: string;
    week_number: number;
  }[];
}

interface AiBuddyChatProps {
  courseOptions: CourseOption[];
  conversations: Conversation[];
  questionsUsed: number;
  questionsLimit: number;
}

export function AiBuddyChat({
  courseOptions,
  conversations: initialConversations,
  questionsUsed,
  questionsLimit,
}: AiBuddyChatProps) {
  const [selectedCourse, setSelectedCourse] = useState<CourseOption | null>(
    courseOptions[0] || null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!input.trim() || !selectedCourse || loading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          courseId: selectedCourse.courseId,
          cohortId: selectedCourse.cohortId,
          conversationId,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Sorry, I encountered an error: ${data.error}`,
          },
        ]);
      } else {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
        setMessages((prev) => [
          ...prev,
          {
            id: data.messageId || crypto.randomUUID(),
            role: "assistant",
            content: data.content,
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function startNewChat() {
    setMessages([]);
    setConversationId(null);
    setInput("");
  }

  const usagePercent = percent(questionsUsed, questionsLimit);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4 animate-fade-up">
      {/* Sidebar */}
      {showSidebar && (
        <div className="hidden lg:flex w-72 flex-col shrink-0">
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Course selector */}
            <div className="p-4 border-b border-border">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
                Course Context
              </label>
              <select
                value={selectedCourse?.courseId || ""}
                onChange={(e) => {
                  const course = courseOptions.find(
                    (c) => c.courseId === e.target.value
                  );
                  setSelectedCourse(course || null);
                  startNewChat();
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {courseOptions.map((c) => (
                  <option key={c.courseId} value={c.courseId}>
                    {c.courseTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Usage */}
            <div className="px-4 py-3 border-b border-border">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Monthly usage</span>
                <span className="font-medium">
                  {questionsUsed}/{questionsLimit}
                </span>
              </div>
              <Progress value={usagePercent} className="h-1.5" />
            </div>

            {/* New chat button */}
            <div className="p-3">
              <Button
                variant="accent"
                size="sm"
                className="w-full gap-2"
                onClick={startNewChat}
              >
                <Plus className="h-4 w-4" />
                New Chat
              </Button>
            </div>

            {/* Conversation history */}
            <div className="flex-1 overflow-y-auto px-3 pb-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">
                Recent
              </p>
              {initialConversations.length > 0 ? (
                <div className="space-y-1">
                  {initialConversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => {
                        setConversationId(conv.id);
                        // TODO: load messages for this conversation
                      }}
                      className={`w-full text-left rounded-lg px-3 py-2 text-xs transition-colors hover:bg-muted/50 ${
                        conversationId === conv.id
                          ? "bg-accent-500/10 text-accent-600"
                          : "text-muted-foreground"
                      }`}
                    >
                      <p className="truncate font-medium">
                        {conv.title || "Untitled conversation"}
                      </p>
                      <p className="text-[10px] mt-0.5 opacity-70">
                        {conv.message_count} messages •{" "}
                        {formatRelativeTime(conv.updated_at)}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-2">
                  No conversations yet
                </p>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Main chat area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0">
          <div className="rounded-xl bg-accent-500/10 p-2">
            <Bot className="h-5 w-5 text-accent-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-semibold text-sm">
              AI Study Buddy
            </h2>
            <p className="text-xs text-muted-foreground truncate">
              {selectedCourse
                ? `Helping with: ${selectedCourse.courseTitle}`
                : "Select a course to start"}
            </p>
          </div>
          <Badge variant="accent" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" />
            GPT-4o mini
          </Badge>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="rounded-2xl bg-accent-500/10 p-6 mb-6">
                <Bot className="h-12 w-12 text-accent-500" />
              </div>
              <h3 className="font-heading text-xl font-bold mb-2">
                Hi! I&apos;m your AI Study Buddy 🎓
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-6">
                Ask me anything about your course material. I can explain
                concepts, help with assignments, and find relevant lessons.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
                {[
                  "Explain the key concepts from this week's lesson",
                  "Help me understand the assignment requirements",
                  "Quiz me on what I've learned so far",
                  "Summarize the main topics covered",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left rounded-xl border border-border p-3 text-xs hover:bg-muted/50 transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-accent-500 mb-1" />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
              >
                {msg.role === "assistant" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-accent-500/10 text-accent-500">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-accent-500 text-white"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10 space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
                        Sources
                      </p>
                      {msg.sources.map((src, i) => (
                        <p key={i} className="text-[11px] opacity-80 flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Week {src.week_number}: {src.lesson_title}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary-600 text-white text-xs">
                      You
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))
          )}

          {loading && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-accent-500/10 text-accent-500">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-accent-500" />
                  <span className="text-sm text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              placeholder={
                selectedCourse
                  ? "Ask me anything about the course..."
                  : "Select a course first"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={!selectedCourse || loading}
              rows={1}
              className="resize-none min-h-[44px] max-h-32"
            />
            <Button
              variant="accent"
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || !selectedCourse || loading}
              className="shrink-0 h-[44px] w-[44px]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            AI responses are based on course content. Always verify with your instructor.
          </p>
        </div>
      </Card>
    </div>
  );
}
