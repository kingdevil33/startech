import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AI_CONFIG } from "@/lib/constants";
import { aiRateLimit, checkRateLimit } from "@/lib/rate-limit";
import { getOpenAI } from "@/lib/ai/openai";
import {
  getMonthlyUsage,
  getUnlockedWeekNumbers,
  retrieveChunks,
} from "@/lib/ai/rag";
import { buildSystemPrompt, toSources } from "@/lib/ai/system-prompt";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const openai = getOpenAI();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, courseId, cohortId, conversationId } = await request.json();

    if (!message || !courseId || !cohortId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Abuse guard: sliding window per user (fails open without Upstash)
    const limit = await checkRateLimit(aiRateLimit, `ai:${user.id}`);
    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many questions right now. Please slow down." },
        { status: 429 }
      );
    }

    // Monthly budget
    const usage = await getMonthlyUsage(supabase, user.id, courseId);
    if (usage.questionCount >= AI_CONFIG.MONTHLY_QUESTION_LIMIT) {
      return NextResponse.json(
        { error: "Monthly question limit reached. Try again next month." },
        { status: 429 }
      );
    }

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      const { data: newConv, error: convError } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: user.id,
          course_id: courseId,
          cohort_id: cohortId,
          title: message.slice(0, 100),
        })
        .select("id")
        .single();

      if (convError) {
        return NextResponse.json({ error: convError.message }, { status: 500 });
      }
      convId = newConv.id;
    }

    // Retrieve only content the student has unlocked
    const unlockedWeekNumbers = await getUnlockedWeekNumbers(
      supabase,
      courseId,
      cohortId
    );
    const contextChunks = await retrieveChunks(supabase, {
      query: message,
      courseId,
      unlockedWeekNumbers,
    });

    const systemMessage = buildSystemPrompt(contextChunks);

    // Previous turns for conversational context
    const { data: previousMessages } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(10);

    const chatMessages: {
      role: "system" | "user" | "assistant";
      content: string;
    }[] = [
      { role: "system", content: systemMessage },
      ...(previousMessages || []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const completion = await openai.chat.completions.create({
      model: AI_CONFIG.MODEL,
      messages: chatMessages,
      max_tokens: AI_CONFIG.MAX_TOKENS,
      temperature: AI_CONFIG.TEMPERATURE,
    });

    const assistantContent =
      completion.choices[0]?.message?.content ||
      "I couldn't generate a response. Please try again.";
    const usageInfo = completion.usage;
    const sources = toSources(contextChunks);

    // Persist the exchange
    await supabase.from("ai_messages").insert({
      conversation_id: convId,
      role: "user",
      content: message,
    });

    const { data: savedMessage } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: convId,
        role: "assistant",
        content: assistantContent,
        sources: sources.length > 0 ? sources : null,
        prompt_tokens: usageInfo?.prompt_tokens || null,
        completion_tokens: usageInfo?.completion_tokens || null,
        total_tokens: usageInfo?.total_tokens || null,
      })
      .select("id")
      .single();

    await supabase
      .from("ai_conversations")
      .update({ message_count: (previousMessages?.length || 0) + 2 })
      .eq("id", convId);

    await supabase.from("ai_usage").upsert(
      {
        user_id: user.id,
        course_id: courseId,
        month_year: usage.monthYear,
        question_count: usage.questionCount + 1,
        total_tokens: usageInfo?.total_tokens || 0,
      },
      { onConflict: "user_id,course_id,month_year" }
    );

    return NextResponse.json({
      content: assistantContent,
      sources,
      conversationId: convId,
      messageId: savedMessage?.id,
      usage: {
        remaining: Math.max(
          0,
          AI_CONFIG.MONTHLY_QUESTION_LIMIT - (usage.questionCount + 1)
        ),
        limit: AI_CONFIG.MONTHLY_QUESTION_LIMIT,
      },
    });
  } catch (error) {
    console.error("AI chat error:", error);
    return NextResponse.json(
      { error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
