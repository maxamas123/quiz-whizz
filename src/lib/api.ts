// src/lib/api.ts

import { supabase } from "@/lib/supabase";
import type {
  QuizConfiguration,
  GeneratedQuiz,
  GeneratedRound,
  GeneratedQuestion,
  Difficulty,
} from "@/types/quiz";

// ─── Quiz Generation ───────────────────────────────────

/**
 * Extract a human-readable error from a FunctionsHttpError context.
 * The context may be a Response object (newer client) or parsed JSON (older).
 */
async function extractEdgeFunctionError(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error: any,
  fallback: string
): Promise<string> {
  const ctx = error?.context;
  if (!ctx) return fallback;

  try {
    // Newer Supabase client: context is a Response object
    if (typeof ctx.json === "function") {
      const status: number | undefined = ctx.status;
      const body = await ctx.json();
      if (body?.error) {
        return body.error + (body.details ? ` — ${body.details}` : "");
      }
      if (body?.msg) return body.msg;
      if (status === 401)
        return "Session expired — please sign out and sign back in.";
      if (status) return `Edge Function error (HTTP ${status})`;
    }
    // Older Supabase client: context is already-parsed JSON
    else if (typeof ctx === "object") {
      if (ctx.error)
        return ctx.error + (ctx.details ? ` — ${ctx.details}` : "");
      if (ctx.msg) return ctx.msg;
    }
  } catch {
    // JSON parsing failed — check status
    const status = typeof ctx?.status === "number" ? ctx.status : null;
    if (status === 401)
      return "Session expired — please sign out and sign back in.";
    if (status) return `Edge Function error (HTTP ${status})`;
  }

  return fallback;
}

/**
 * Calls the Supabase Edge Function to generate a quiz via OpenAI.
 * Automatically retries once on 401 after refreshing the session.
 */
export async function generateQuiz(
  config: QuizConfiguration
): Promise<GeneratedQuiz> {
  // First attempt
  let { data, error } = await supabase.functions.invoke("generate-quiz", {
    body: config,
  });

  // On 401 — refresh the session and retry once
  if (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.context?.status;
    if (status === 401) {
      const { error: refreshErr } = await supabase.auth.refreshSession();
      if (!refreshErr) {
        const retry = await supabase.functions.invoke("generate-quiz", {
          body: config,
        });
        data = retry.data;
        error = retry.error;
      }
    }
  }

  if (error) {
    const detail = await extractEdgeFunctionError(
      error,
      error.message || "Failed to generate quiz"
    );
    console.error("Quiz generation error:", detail);
    throw new Error(detail);
  }

  return data as GeneratedQuiz;
}

// ─── Quiz Persistence ──────────────────────────────────

/** Metadata returned when listing saved quizzes */
export interface SavedQuizMeta {
  id: string;
  name: string | null;
  config: QuizConfiguration;
  createdAt: string;
  bestScore: { correct: number; total: number } | null;
}

/**
 * Save a generated quiz to the current user's account.
 * Inserts into `quizzes` (with rounds JSON) and `questions` (individual rows).
 */
export async function saveQuiz(
  quiz: GeneratedQuiz,
  userId: string
): Promise<string> {
  // 1. Insert quiz row
  const { data: row, error: quizErr } = await supabase
    .from("quizzes")
    .insert({
      id: quiz.id,
      user_id: userId,
      name: quiz.config?.quizName || null,
      config: quiz.config,
      rounds: quiz.rounds,
    })
    .select("id")
    .single();

  if (quizErr) {
    console.error("Save quiz error:", quizErr);
    throw new Error(quizErr.message);
  }

  const quizId = row.id as string;

  // 2. Insert question rows
  const questionRows = quiz.questions.map((q, idx) => ({
    quiz_id: quizId,
    question_text: q.questionText,
    options: q.options,
    correct_answer: q.correctAnswer,
    explanation: q.explanation,
    topic: q.topic,
    difficulty: q.difficulty,
    order_index: idx,
  }));

  if (questionRows.length > 0) {
    const { error: qErr } = await supabase
      .from("questions")
      .insert(questionRows);
    if (qErr) {
      console.error("Save questions error:", qErr);
      // Quiz row already saved — don't fail silently but don't throw either
    }
  }

  return quizId;
}

/**
 * Fetch all past question texts for a user (across all saved quizzes).
 * Used for deduplication — passed to the Edge Function as excludeQuestions.
 */
export async function getUserPastQuestions(
  userId: string
): Promise<string[]> {
  // First get all quiz IDs for the user
  const { data: quizRows, error: qErr } = await supabase
    .from("quizzes")
    .select("id")
    .eq("user_id", userId);

  if (qErr || !quizRows || quizRows.length === 0) return [];

  const quizIds = quizRows.map((q) => q.id as string);

  // Fetch question texts from those quizzes
  const { data: questions, error: questErr } = await supabase
    .from("questions")
    .select("question_text")
    .in("quiz_id", quizIds);

  if (questErr || !questions) return [];

  return questions.map((q) => q.question_text as string);
}

/**
 * List all saved quizzes for a user, with their best attempt score.
 */
export async function listUserQuizzes(
  userId: string
): Promise<SavedQuizMeta[]> {
  // Fetch quizzes
  const { data: quizzes, error } = await supabase
    .from("quizzes")
    .select("id, name, config, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List quizzes error:", error);
    throw new Error(error.message);
  }

  if (!quizzes || quizzes.length === 0) return [];

  // Fetch best attempt for each quiz
  const quizIds = quizzes.map((q) => q.id);
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score_correct, score_total")
    .in("quiz_id", quizIds)
    .eq("user_id", userId)
    .order("score_correct", { ascending: false });

  // Build a map: quiz_id → best score
  const bestScores: Record<string, { correct: number; total: number }> = {};
  for (const a of attempts ?? []) {
    if (!bestScores[a.quiz_id]) {
      bestScores[a.quiz_id] = {
        correct: a.score_correct,
        total: a.score_total,
      };
    }
  }

  return quizzes.map((q) => ({
    id: q.id,
    name: q.name,
    config: q.config as QuizConfiguration,
    createdAt: q.created_at,
    bestScore: bestScores[q.id] ?? null,
  }));
}

/**
 * Load a saved quiz by ID. Reconstructs the GeneratedQuiz object.
 */
export async function loadSavedQuiz(quizId: string): Promise<GeneratedQuiz> {
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (error || !quiz) {
    throw new Error("Quiz not found");
  }

  // If rounds were stored as JSON, use them directly
  const rounds = (quiz.rounds as GeneratedRound[]) ?? [];

  // Flatten questions from rounds
  const questions: GeneratedQuestion[] = rounds.flatMap((r) => r.questions);

  return {
    id: quiz.id,
    rounds,
    questions,
    config: quiz.config as QuizConfiguration,
    createdAt: quiz.created_at,
  };
}

/**
 * Save a quiz attempt (selected answers + score).
 */
export async function saveAttempt(
  quizId: string,
  userId: string,
  selectedAnswers: Record<number, string>,
  scoreCorrect: number,
  scoreTotal: number
): Promise<string> {
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: userId,
      selected_answers: selectedAnswers,
      score_correct: scoreCorrect,
      score_total: scoreTotal,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Save attempt error:", error);
    throw new Error(error.message);
  }

  return data.id as string;
}

/**
 * Rename a saved quiz. Defence-in-depth: also filters by user_id
 * so even if RLS were bypassed, only the owner can rename.
 */
export async function renameQuiz(
  quizId: string,
  newName: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .update({ name: newName || null })
    .eq("id", quizId)
    .eq("user_id", userId);

  if (error) {
    console.error("Rename quiz error:", error);
    throw new Error(error.message);
  }
}

/**
 * Delete a saved quiz (cascades to questions + attempts via FK).
 * Defence-in-depth: also filters by user_id.
 */
export async function deleteSavedQuiz(
  quizId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .delete()
    .eq("id", quizId)
    .eq("user_id", userId);

  if (error) {
    console.error("Delete quiz error:", error);
    throw new Error(error.message);
  }
}

// ─── Quiz Credits ─────────────────────────────────────

export interface UserProfile {
  id: string;
  quizCredits: number;
  totalQuizzesGenerated: number;
}

/**
 * Get or create a user profile (quiz credits).
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  let { data: profile, error } = await supabase
    .from("user_profiles")
    .select("id, quiz_credits, total_quizzes_generated")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    // Auto-create profile for existing users
    const { data: created, error: insertErr } = await supabase
      .from("user_profiles")
      .insert({ id: userId })
      .select("id, quiz_credits, total_quizzes_generated")
      .single();

    if (insertErr || !created) {
      throw new Error("Failed to load user profile");
    }
    profile = created;
  }

  return {
    id: profile.id,
    quizCredits: profile.quiz_credits,
    totalQuizzesGenerated: profile.total_quizzes_generated,
  };
}

/**
 * Decrement quiz credits by 1 and increment total quizzes generated.
 */
export async function decrementQuizCredit(userId: string): Promise<void> {
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("quiz_credits, total_quizzes_generated")
    .eq("id", userId)
    .single();

  if (!profile) return;

  await supabase
    .from("user_profiles")
    .update({
      quiz_credits: Math.max(0, profile.quiz_credits - 1),
      total_quizzes_generated: profile.total_quizzes_generated + 1,
    })
    .eq("id", userId);
}

/**
 * Create a Stripe Checkout session for purchasing quiz credits.
 */
export async function createCheckoutSession(
  quizCount: number
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("create-checkout", {
    body: { quizCount },
  });

  if (error) {
    let detail = error.message || "Failed to create checkout session";
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ctx = (error as any).context;
      if (ctx) {
        const body = ctx instanceof Response ? await ctx.json() : ctx;
        if (typeof body === "object" && body?.error) {
          detail = body.error;
        }
      }
    } catch {
      // Fall back
    }
    if (detail === error.message && typeof data === "object" && data?.error) {
      detail = data.error;
    }
    throw new Error(detail);
  }

  return data.url as string;
}

// ─── Question Votes ───────────────────────────────────

/**
 * Save question votes for a quiz. Stores as JSONB on the quizzes table.
 * Format: { questionNumber: voteValue } where voteValue is 1 (up) or -1 (down).
 * Defence-in-depth: also filters by user_id.
 */
export async function saveQuizVotes(
  quizId: string,
  votes: Record<number, number>,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("quizzes")
    .update({ votes })
    .eq("id", quizId)
    .eq("user_id", userId);

  if (error) console.error("Save votes error:", error);
}

/**
 * Load question votes for a quiz.
 */
export async function loadQuizVotes(
  quizId: string
): Promise<Record<number, number>> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("votes")
    .eq("id", quizId)
    .single();

  if (error || !data?.votes) return {};
  return data.votes as Record<number, number>;
}

// ─── Replacement Questions ────────────────────────────

/**
 * Generate replacement questions by calling the quiz generation edge function
 * with a minimal config targeting specific topics/difficulties.
 */
export async function generateReplacementQuestions(
  topics: string[],
  difficulties: Difficulty[],
  count: number,
  excludeQuestions: string[]
): Promise<GeneratedQuestion[]> {
  const config: QuizConfiguration = {
    quizName: "",
    topics,
    topicTimePeriods: [],
    globalDifficulties: difficulties,
    usePerTopicDifficulty: false,
    topicDifficultyOverrides: [],
    numberOfRounds: 1,
    questionsPerRound: count,
    roundMode: "mixed",
    outputMode: "play",
    excludeQuestions,
  };

  const quiz = await generateQuiz(config);
  return quiz.questions.slice(0, count);
}
