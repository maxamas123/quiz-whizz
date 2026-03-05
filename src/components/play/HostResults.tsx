// src/components/play/HostResults.tsx
//
// Shows results after each question on the host display:
// correct answer highlighted, answer distribution, then leaderboard.

import { useGameStore } from "@/store/gameStore";
import { Leaderboard } from "@/components/play/Leaderboard";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trophy,
  Lightbulb,
} from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

interface HostResultsProps {
  onNextQuestion: () => void;
  isLastQuestion: boolean;
}

export function HostResults({ onNextQuestion, isLastQuestion }: HostResultsProps) {
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const totalQuestions = useGameStore((s) => s.totalQuestions);
  const correctAnswer = useGameStore((s) => s.correctAnswer);
  const explanation = useGameStore((s) => s.explanation);
  const questionResults = useGameStore((s) => s.questionResults);
  const leaderboard = useGameStore((s) => s.leaderboard);

  if (!currentQuestion) return null;

  // Count answers per option
  const answerCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const r of questionResults) {
    if (answerCounts[r.answer] !== undefined) {
      answerCounts[r.answer]++;
    }
  }
  const totalResponses = questionResults.length;
  const correctCount = questionResults.filter((r) => r.isCorrect).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="text-center">
        <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
          Question {currentQuestionIndex + 1} / {totalQuestions} — Results
        </span>
      </div>

      {/* Question + correct answer */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <p className="mb-4 text-lg font-bold text-foreground">
          {currentQuestion.questionText}
        </p>

        {/* Options with answer distribution */}
        <div className="space-y-2">
          {currentQuestion.options.map((option, idx) => {
            const label = OPTION_LABELS[idx];
            const isCorrect = label === correctAnswer;
            const count = answerCounts[label] ?? 0;
            const pct =
              totalResponses > 0
                ? Math.round((count / totalResponses) * 100)
                : 0;

            return (
              <div
                key={idx}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  isCorrect
                    ? "bg-emerald-50 ring-2 ring-emerald-300"
                    : "bg-muted/20"
                }`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
                    isCorrect ? "bg-emerald-500" : "bg-muted-foreground/30"
                  }`}
                >
                  {label}
                </span>
                <span
                  className={`flex-1 text-sm font-medium ${
                    isCorrect ? "text-emerald-800" : "text-foreground"
                  }`}
                >
                  {option}
                </span>
                {isCorrect && (
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                )}
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        {explanation && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-primary/5 px-4 py-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
            <p className="text-sm leading-relaxed text-foreground/70">
              {explanation}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            {correctCount} correct
          </span>
          <span className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-rose-400" />
            {totalResponses - correctCount} wrong
          </span>
        </div>
      </div>

      {/* Leaderboard */}
      <Leaderboard entries={leaderboard} variant="compact" />

      {/* Next button */}
      <div className="flex justify-center pt-2">
        <Button
          size="lg"
          onClick={onNextQuestion}
          className="gap-2 rounded-full px-10 shadow-lg shadow-primary/25"
        >
          {isLastQuestion ? (
            <>
              <Trophy className="h-5 w-5" />
              Show Final Results
            </>
          ) : (
            <>
              <ArrowRight className="h-5 w-5" />
              Next Question
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
