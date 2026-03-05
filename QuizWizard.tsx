// src/components/quiz/QuizWizard.tsx

import { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import {
  quizConfigSchema,
  type QuizConfigFormValues,
} from "@/schemas/quizConfigSchema";
import { TOPICS, DIFFICULTIES, TIME_PERIOD_RANGES, TIME_PERIOD_DEFAULTS } from "@/types/quiz";
import type { Topic, Difficulty } from "@/types/quiz";
import { TopicSelector } from "@/components/quiz/TopicSelector";
import { TimePeriodSlider } from "@/components/quiz/TimePeriodSlider";
import { DifficultyControl } from "@/components/quiz/DifficultyControl";
import { LengthControl } from "@/components/quiz/LengthControl";
import { OutputModeSelector } from "@/components/quiz/OutputModeSelector";
import { TimePerQuestionControl } from "@/components/quiz/TimePerQuestionControl";
import { QuizGenerating } from "@/components/quiz/QuizGenerating";
import { Button } from "@/components/ui/button";
import { Sparkles, RotateCcw, Dice5, PenLine } from "lucide-react";
import { useQuizStore } from "@/store/quizStore";
import { generateQuiz, getUserPastQuestions, getUserProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { PurchaseModal } from "@/components/quiz/PurchaseModal";
import type { QuizConfiguration } from "@/types/quiz";

const DEFAULT_VALUES: QuizConfigFormValues = {
  quizName: "",
  topics: [],
  topicTimePeriods: [],
  globalDifficulties: ["Medium"],
  usePerTopicDifficulty: false,
  topicDifficultyOverrides: [],
  numberOfRounds: 5,
  questionsPerRound: 5,
  roundMode: "mixed",
  outputMode: "print",
  timePerQuestionSeconds: 30,
};

/** Pick random items from array */
function pickRandom<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/** Random integer in range [min, max] */
function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function QuizWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    isGenerating,
    generationError,
    setIsGenerating,
    setGeneratedQuiz,
    setGenerationError,
  } = useQuizStore();

  const methods = useForm<QuizConfigFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(quizConfigSchema) as any,
    defaultValues: DEFAULT_VALUES,
    mode: "onChange",
  });

  const { handleSubmit, formState } = methods;

  // Track current config for the loading animation
  const [submittedConfig, setSubmittedConfig] =
    useState<QuizConfigFormValues | null>(null);

  // Credit tracking
  const [quizCredits, setQuizCredits] = useState<number | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  // Fetch credits on mount / user change
  useEffect(() => {
    if (!user) {
      setQuizCredits(null);
      return;
    }
    getUserProfile(user.id)
      .then((p) => setQuizCredits(p.quizCredits))
      .catch(() => setQuizCredits(null));
  }, [user]);

  async function onSubmit(data: QuizConfigFormValues) {
    // Credit check for logged-in users
    if (user && quizCredits !== null && quizCredits <= 0) {
      setShowPurchaseModal(true);
      return;
    }

    setSubmittedConfig(data);
    setIsGenerating(true);

    try {
      // Fetch past questions for deduplication (logged-in users only)
      let excludeQuestions: string[] = [];
      if (user) {
        try {
          excludeQuestions = await getUserPastQuestions(user.id);
        } catch {
          // Non-critical — proceed without dedup if fetch fails
        }
      }

      // Fill in default time periods for topics with custom defaults
      // This ensures Sport (1990) and Film & TV (1990) are sent to the AI
      const finalTimePeriods = [...data.topicTimePeriods];
      for (const topic of data.topics) {
        if (!finalTimePeriods.some((tp) => tp.topic === topic)) {
          const tpKey = topic as Topic;
          const customDefault = TIME_PERIOD_DEFAULTS[tpKey];
          const ranges = TIME_PERIOD_RANGES[tpKey];
          if (customDefault !== undefined && ranges) {
            finalTimePeriods.push({ topic, from: customDefault, to: ranges.max });
          }
        }
      }

      const config: QuizConfiguration = {
        quizName: data.quizName,
        topics: [...data.topics],
        topicTimePeriods: finalTimePeriods,
        globalDifficulties: [...data.globalDifficulties],
        usePerTopicDifficulty: data.usePerTopicDifficulty,
        topicDifficultyOverrides: [...data.topicDifficultyOverrides],
        numberOfRounds: data.numberOfRounds,
        questionsPerRound: data.questionsPerRound,
        roundMode: data.roundMode,
        outputMode: data.outputMode,
        timePerQuestionSeconds: data.timePerQuestionSeconds ?? 30,
        ...(excludeQuestions.length > 0 && { excludeQuestions }),
      };

      const quiz = await generateQuiz(config);

      // Refresh credit count (server already decremented server-side)
      if (user) {
        getUserProfile(user.id)
          .then((p) => setQuizCredits(p.quizCredits))
          .catch(() => {});
      }

      setGeneratedQuiz(quiz);
      navigate(data.outputMode === "play" ? "/play/host" : "/review");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setGenerationError(message);
      setSubmittedConfig(null);
    }
  }

  function handleRandomise() {
    const topics = pickRandom(TOPICS, 2, 4) as Topic[];
    const difficulties = pickRandom(DIFFICULTIES, 1, 2) as Difficulty[];
    const rounds = randInt(3, 8);
    const qPerRound = randInt(3, 8);

    methods.reset({
      quizName: "",
      topics,
      topicTimePeriods: [],
      globalDifficulties: difficulties,
      usePerTopicDifficulty: false,
      topicDifficultyOverrides: [],
      numberOfRounds: rounds,
      questionsPerRound: qPerRound,
      roundMode: "mixed",
      outputMode: "print",
      timePerQuestionSeconds: 30,
    });
  }

  return (
    <>
      {/* Loading overlay */}
      {isGenerating && submittedConfig && (
        <QuizGenerating config={submittedConfig} />
      )}

      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit as any)}
          className="mx-auto w-full max-w-3xl space-y-5"
        >
          {/* ── Header ── */}
          <div className="space-y-2 pb-2 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              Create your{" "}
              <span className="italic text-primary">perfect</span> quiz
            </h1>
            <p className="text-base text-muted-foreground">
              Configure every detail, then generate unique questions instantly.
            </p>
          </div>

          {/* ── Quiz Name (compact row) ── */}
          <div className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <PenLine className="h-4 w-4 text-primary" />
            </div>
            <label className="shrink-0 text-sm font-semibold text-foreground">
              Quiz Name
            </label>
            <input
              type="text"
              placeholder="e.g. Friday Night Trivia (optional)"
              {...methods.register("quizName")}
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* ── Sections ── */}
          <TopicSelector />
          <TimePeriodSlider />
          <DifficultyControl />
          <LengthControl />
          <OutputModeSelector />
          <TimePerQuestionControl />

          {/* ── Error message ── */}
          {generationError && (
            <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
              {generationError}
            </div>
          )}

          {/* ── Submit ── */}
          <div className="flex items-center justify-center gap-4 pb-16 pt-4">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-full px-6"
              onClick={() => methods.reset(DEFAULT_VALUES)}
              disabled={isGenerating}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-full px-6"
              onClick={handleRandomise}
              disabled={isGenerating}
            >
              <Dice5 className="h-4 w-4" />
              Randomise
            </Button>
            <Button
              type="submit"
              size="lg"
              disabled={!formState.isValid || isGenerating}
              className="gap-2 rounded-full px-8 shadow-lg shadow-primary/25"
            >
              <Sparkles className="h-4 w-4" />
              Generate Quiz
            </Button>
          </div>

          {/* Credits indicator for logged-in users */}
          {user && quizCredits !== null && (
            <div className="text-center -mt-10 pb-12">
              <p className="text-xs text-muted-foreground">
                {quizCredits > 0 ? (
                  <>
                    <span className="font-semibold text-foreground">{quizCredits}</span>{" "}
                    credit{quizCredits !== 1 ? "s" : ""} remaining
                  </>
                ) : (
                  <button
                    type="button"
                    className="font-semibold text-primary hover:underline"
                    onClick={() => setShowPurchaseModal(true)}
                  >
                    No credits left — buy more
                  </button>
                )}
              </p>
            </div>
          )}
        </form>
      </FormProvider>

      {/* Purchase modal */}
      <PurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        currentCredits={quizCredits ?? 0}
      />
    </>
  );
}
