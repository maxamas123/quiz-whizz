// supabase/functions/generate-quiz/index.ts
//
// Supabase Edge Function that takes a QuizConfiguration,
// calls the OpenAI API to generate questions, and returns them
// structured into rounds.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const OPENAI_MODEL = "gpt-4o";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const OPTION_LETTERS = ["A", "B", "C", "D"] as const;

/**
 * Shuffle the options for a single question so the correct answer
 * is placed at a random position. Updates correctAnswer to match.
 */
function shuffleQuestionOptions(q: {
  options: string[];
  correctAnswer: string;
  [key: string]: unknown;
}): typeof q {
  // Find which option is correct based on the letter
  const correctIdx = OPTION_LETTERS.indexOf(
    q.correctAnswer as (typeof OPTION_LETTERS)[number]
  );
  if (correctIdx < 0 || correctIdx >= q.options.length) return q;

  const correctText = q.options[correctIdx];

  // Shuffle the options
  const shuffled = shuffle(q.options);

  // Find where the correct answer ended up
  const newIdx = shuffled.indexOf(correctText);

  return {
    ...q,
    options: shuffled,
    correctAnswer: OPTION_LETTERS[newIdx],
  };
}

/** Build the system prompt that enforces factual accuracy */
function buildSystemPrompt(): string {
  return `You are QuizWhizz, an expert trivia question generator renowned for factual accuracy.

ABSOLUTE RULES:
1. FACTUAL ACCURACY IS PARAMOUNT — Every correct answer must be an established, verifiable fact. If you are not 100% certain an answer is correct, DO NOT include that question. It is better to generate fewer questions than to include one with an inaccurate answer.

2. NO AMBIGUITY — Never generate a question where more than one of the four options could reasonably be considered correct. Each question must have exactly one unambiguous correct answer. Example of a BAD question: "What event symbolised the end of the Cold War?" with options "Fall of the Berlin Wall" and "Dissolution of the Soviet Union" — both are valid answers. Always ensure the correct answer is the ONLY defensible choice.

3. NO OPINION-BASED QUESTIONS — Do not ask about "best", "greatest", "most important" unless it refers to a measurable, factual superlative (e.g., "tallest mountain", "longest river").

4. NO CURRENT-STATE QUESTIONS — Do not ask "Who is the current..." or anything whose answer could change over time. Instead, anchor questions to specific dates or events (e.g., "Who won the 2018 FIFA World Cup?").

5. PLAUSIBLE DISTRACTORS — The three wrong options must be plausible (same category as the correct answer) but clearly incorrect to someone who knows the subject.

6. ANSWER MUST NOT BE OBVIOUS FROM THE QUESTION — The correct answer text must NOT appear in the question text itself. For example, do NOT ask "What is the primary ingredient in miso soup?" with the answer "Miso paste" — the answer is literally in the question. Rephrase or choose a different question entirely.

7. RICH EXPLANATIONS — Every question MUST include a 1-2 sentence explanation that provides INTERESTING ADDITIONAL CONTEXT, TRIVIA, or HISTORICAL FACTS beyond just restating the answer. BAD example: "Latin was the primary language of the Roman Empire." GOOD example: "Latin served as the lingua franca across the Roman Empire from roughly 27 BC to 476 AD, and later formed the basis for Romance languages including Spanish, French, Italian, and Portuguese." The explanation should teach something new that even someone who got the answer right might not know.

8. AGE-APPROPRIATE CONTENT — Adjust vocabulary, complexity, and cultural references to suit the target audience.

9. MULTIPLE DIFFICULTY LEVELS — When a topic has multiple difficulty levels (e.g. Easy and Medium), distribute questions across those levels as evenly as possible.

10. DIFFICULTY CALIBRATION:
   - Easy: Common knowledge most people would know. Short, direct questions.
   - Medium: Requires some subject knowledge. May involve specific dates, names, or details.
   - Hard: Deep subject expertise needed. Obscure facts, nuanced distinctions, or tricky details.
   - Insane: Near-impossible. Requires extreme specialist knowledge, obscure trivia, or exceptionally specific details. Think pub quiz championship final — only true experts would know this. All four options must be plausible to non-experts.

11. VARIETY AND ORIGINALITY — Avoid the most commonly asked trivia questions (e.g., "What is the tallest mountain?", "What is the capital of France?"). Instead, find interesting, lesser-known facts within each topic. Aim for questions that will surprise and educate, not bore with familiarity.

12. NO LEADING OR LOADED LANGUAGE — Do not use words like "infamous", "notorious", "legendary", "controversial" in the question text as they give away the answer or introduce bias. Keep questions neutral and factual.

13. INTRA-QUIZ DEDUPLICATION — Every question in this quiz MUST cover a DISTINCT subject. No two questions may be about the same person, event, place, or specific fact. For example, if one question asks about the Berlin Wall, NO other question in the entire quiz may mention the Berlin Wall or the same event. Spread questions across diverse subtopics within each category.

14. SELF-REVIEW — Before finalising the JSON, mentally review EVERY question and ask: (a) Is there genuinely only ONE correct answer among the options? (b) Could a knowledgeable person argue for a different option? (c) Is the fact 100% verifiable? (d) Does any other question in this quiz cover the same subject? If any question fails these checks, REPLACE it with a better one.

You must respond with ONLY valid JSON matching this exact schema:
{
  "rounds": [
    {
      "roundNumber": 1,
      "topic": "Topic Name or null for mixed",
      "questions": [
        {
          "questionText": "The full question text ending with a question mark",
          "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
          "correctAnswer": "A",
          "explanation": "Interesting additional context, trivia, or historical fact about the answer.",
          "topic": "The topic category this question belongs to",
          "difficulty": "Easy|Medium|Hard|Insane"
        }
      ]
    }
  ]
}

The "correctAnswer" field must be exactly one of: "A", "B", "C", or "D" corresponding to the option index.`;
}

/** Build the user prompt from quiz config */
function buildUserPrompt(config: {
  topics: string[];
  topicTimePeriods: { topic: string; from: number; to: number }[];
  globalDifficulties: string[];
  usePerTopicDifficulty: boolean;
  topicDifficultyOverrides: { topic: string; difficulties: string[] }[];
  numberOfRounds: number;
  questionsPerRound: number;
  roundMode: string;
  excludeQuestions?: string[];
}): string {
  // Support legacy single-difficulty format
  const globalDiffs: string[] = config.globalDifficulties ??
    [(config as Record<string, unknown>).globalDifficulty as string ?? "Medium"];

  const totalQuestions = config.numberOfRounds * config.questionsPerRound;

  // Build topic difficulty descriptions
  const topicDifficulties = config.topics.map((topic) => {
    let difficulties = globalDiffs;
    if (config.usePerTopicDifficulty) {
      const override = config.topicDifficultyOverrides.find(
        (o) => o.topic === topic
      );
      if (override) difficulties = override.difficulties ?? [(override as Record<string, unknown>).difficulty as string];
    }
    const timePeriod = config.topicTimePeriods.find((tp) => tp.topic === topic);
    const timeConstraint = timePeriod
      ? ` Questions must relate to the period ${timePeriod.from < 0 ? Math.abs(timePeriod.from) + " BC" : timePeriod.from}–${timePeriod.to}.`
      : "";
    return { topic, difficulties, timeConstraint };
  });

  let roundInstructions: string;

  if (config.roundMode === "topic-specific") {
    const topicCount = config.topics.length;
    const roundDescs: string[] = [];

    for (let r = 1; r <= config.numberOfRounds; r++) {
      if (r <= topicCount) {
        // Dedicated topic round
        const topic = config.topics[r - 1];
        const td = topicDifficulties.find((t) => t.topic === topic)!;
        const diffDesc = td.difficulties.join(" & ");
        roundDescs.push(
          `- Round ${r}: "${topic}" — ${config.questionsPerRound} questions at ${diffDesc} difficulty.${td.timeConstraint}`
        );
      } else {
        // Extra rounds beyond topic count — these are MIXED
        const allDiffDesc = globalDiffs.join(" & ");
        roundDescs.push(
          `- Round ${r}: MIXED — ${config.questionsPerRound} questions from across ALL selected topics at ${allDiffDesc} difficulty.`
        );
      }
    }

    roundInstructions = `ROUND STRUCTURE (topic-specific with mixed overflow):
The first ${Math.min(topicCount, config.numberOfRounds)} round(s) each focus on ONE specific topic.${config.numberOfRounds > topicCount ? ` Rounds ${topicCount + 1}–${config.numberOfRounds} are MIXED rounds drawing from all topics.` : ""}
${roundDescs.join("\n")}`;
  } else {
    // Mixed mode — evenly distribute topics across all questions
    const roundDescs: string[] = [];
    for (let r = 1; r <= config.numberOfRounds; r++) {
      roundDescs.push(
        `- Round ${r}: Mixed — ${config.questionsPerRound} questions from across all selected topics.`
      );
    }

    const topicBreakdown = topicDifficulties
      .map(
        (td) =>
          `  - ${td.topic}: ${td.difficulties.join(" & ")} difficulty.${td.timeConstraint}`
      )
      .join("\n");

    roundInstructions = `ROUND STRUCTURE (mixed):
Questions from all topics are mixed across rounds.
${roundDescs.join("\n")}

TOPIC DIFFICULTY & CONSTRAINTS:
${topicBreakdown}`;
  }

  // Add a random seed to encourage unique question generation each time
  const randomSeed = Math.floor(Math.random() * 1_000_000);

  // Build exclusion list for deduplication
  const exclusionBlock = config.excludeQuestions?.length
    ? `\nEXCLUSION LIST — The following questions have been asked before. Do NOT repeat them or ask questions that are substantially similar:\n${config.excludeQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}\n`
    : "";

  return `Generate exactly ${totalQuestions} trivia questions organised into ${config.numberOfRounds} rounds of ${config.questionsPerRound} questions each.

${roundInstructions}

IMPORTANT: Structure your response as a "rounds" array. Each round object must have "roundNumber", "topic" (the topic name if topic-specific, or null if mixed), and "questions" array.

CRITICAL: You MUST generate questions for EVERY listed topic — including custom/unusual topics. Do not skip any topic. Distribute questions as evenly as possible across all requested topics. For custom or niche topics, use creative interpretation to generate interesting, factual trivia questions.

TOPIC CORRECTION: If a topic name appears to contain a typo or misspelling (e.g., "jmes bond" instead of "James Bond", "sceince" instead of "Science"), interpret the INTENDED topic and generate questions accordingly. Use the corrected topic name in the "topic" field of each question. Do NOT use the misspelled version.

VARIETY SEED: ${randomSeed} — Use this as inspiration to generate UNIQUE questions that are different from typical quiz questions. Avoid the most commonly asked trivia questions. Surprise the quiz-taker with interesting, lesser-known facts.
${exclusionBlock}
Remember: accuracy is more important than creativity. Only include questions you are fully confident about. Double-check every fact before including it.`;
}

Deno.serve(async (req: Request) => {
  console.log(">>> generate-quiz called, method:", req.method);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // ── Auth & credit enforcement ───────────────────────────
    // If the caller sends a real user JWT (not just the anon key),
    // we verify identity and enforce quiz credits server-side.
    // Anonymous callers (no JWT) are allowed for the free-tier
    // experience but should be rate-limited at infrastructure level.
    const authHeader = req.headers.get("Authorization");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    let authenticatedUserId: string | null = null;

    if (authHeader && authHeader !== `Bearer ${anonKey}`) {
      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        anonKey,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: { user } } = await supabaseAuth.auth.getUser();
      if (user) {
        authenticatedUserId = user.id;

        // Enforce credits server-side (prevents client-side bypass)
        const { data: profile } = await supabaseAuth
          .from("user_profiles")
          .select("quiz_credits, total_quizzes_generated")
          .eq("id", user.id)
          .single();

        if (profile && profile.quiz_credits <= 0) {
          return new Response(
            JSON.stringify({ error: "No quiz credits remaining. Please purchase more to continue." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Decrement credit BEFORE calling OpenAI (prevents race conditions)
        if (profile) {
          await supabaseAuth
            .from("user_profiles")
            .update({
              quiz_credits: Math.max(0, profile.quiz_credits - 1),
              total_quizzes_generated: profile.total_quizzes_generated + 1,
            })
            .eq("id", user.id);
        }
      }
    }

    console.log(">>> Authenticated user:", authenticatedUserId ?? "anonymous");

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    console.log(">>> OPENAI_API_KEY present:", !!openaiApiKey);

    if (!openaiApiKey) {
      console.error(">>> OPENAI_API_KEY is not set!");
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured. Set it via: supabase secrets set OPENAI_API_KEY=your-key" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.text();
    console.log(">>> Request body length:", body.length);

    let config;
    try {
      config = JSON.parse(body);
    } catch {
      console.error(">>> Failed to parse request body");
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!config.topics?.length) {
      console.error(">>> Missing topics");
      return new Response(
        JSON.stringify({ error: "Topics are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(">>> Generating quiz for topics:", config.topics, "rounds:", config.numberOfRounds, "qPerRound:", config.questionsPerRound, "mode:", config.roundMode);

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(config);

    // Call OpenAI API with higher temperature for variety
    console.log(">>> Calling OpenAI API...");

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.85,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    console.log(">>> OpenAI response status:", openaiResponse.status);

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error(">>> OpenAI API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI generation failed", details: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiResponse.json();

    // Extract the content from OpenAI's response
    const rawText = openaiData?.choices?.[0]?.message?.content ?? "";

    console.log(">>> OpenAI response text length:", rawText.length);

    if (!rawText) {
      console.error(">>> Empty response from OpenAI");
      return new Response(
        JSON.stringify({ error: "Empty response from AI" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the JSON
    let parsed: { rounds?: unknown[]; questions?: unknown[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.error(">>> Failed to parse OpenAI JSON:", rawText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle both "rounds" and legacy "questions" format
    // deno-lint-ignore no-explicit-any
    let rounds: { roundNumber: number; topic: string | null; questions: any[] }[];
    // deno-lint-ignore no-explicit-any
    let allQuestions: any[];

    if (Array.isArray(parsed.rounds) && parsed.rounds.length > 0) {
      // New rounds format
      // deno-lint-ignore no-explicit-any
      rounds = parsed.rounds as any;
      allQuestions = rounds.flatMap((r) => r.questions);
      console.log(">>> Got rounds format:", rounds.length, "rounds,", allQuestions.length, "questions");
    } else if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      // Legacy flat format — wrap into rounds
      const questions = parsed.questions;
      const qPerRound = config.questionsPerRound || questions.length;
      rounds = [];
      for (let i = 0; i < questions.length; i += qPerRound) {
        const roundQuestions = questions.slice(i, i + qPerRound);
        rounds.push({
          roundNumber: rounds.length + 1,
          topic: null,
          questions: roundQuestions,
        });
      }
      allQuestions = questions;
      console.log(">>> Converted flat format to", rounds.length, "rounds,", allQuestions.length, "questions");
    } else {
      console.error(">>> No rounds or questions in parsed response");
      return new Response(
        JSON.stringify({ error: "AI returned no questions" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── SHUFFLE ANSWER POSITIONS ──
    // The AI consistently places the correct answer as option A.
    // We shuffle each question's options randomly so the correct
    // answer is distributed evenly across A, B, C, D.
    for (const round of rounds) {
      round.questions = round.questions.map(shuffleQuestionOptions);
    }
    // Rebuild allQuestions after shuffle
    allQuestions = rounds.flatMap((r) => r.questions);

    console.log(">>> Successfully generated and shuffled", allQuestions.length, "questions in", rounds.length, "rounds");

    // Build response
    const quiz = {
      id: crypto.randomUUID(),
      rounds,
      questions: allQuestions,
      config,
      createdAt: new Date().toISOString(),
    };

    return new Response(JSON.stringify(quiz), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(">>> Edge function error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
