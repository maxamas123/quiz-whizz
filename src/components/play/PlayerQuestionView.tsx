// src/components/play/PlayerQuestionView.tsx
//
// Player's mobile-first question view: large answer buttons, timer bar, instant feedback.

import { useGameStore } from "@/store/gameStore";
import { GameTimer } from "@/components/play/GameTimer";
import { Check, Lock } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const OPTION_COLORS = [
  { bg: "bg-rose-500 hover:bg-rose-600 active:bg-rose-700", ring: "ring-rose-500" },
  { bg: "bg-blue-500 hover:bg-blue-600 active:bg-blue-700", ring: "ring-blue-500" },
  { bg: "bg-amber-500 hover:bg-amber-600 active:bg-amber-700", ring: "ring-amber-500" },
  { bg: "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700", ring: "ring-emerald-500" },
];

interface PlayerQuestionViewProps {
  onAnswer: (letter: string) => void;
}

export function PlayerQuestionView({ onAnswer }: PlayerQuestionViewProps) {
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const totalQuestions = useGameStore((s) => s.totalQuestions);
  const gameSession = useGameStore((s) => s.gameSession);
  const selectedAnswer = useGameStore((s) => s.selectedAnswer);
  const isAnswered = useGameStore((s) => s.isAnswered);
  const timeRemaining = useGameStore((s) => s.timeRemaining);

  if (!currentQuestion || !gameSession) return null;

  const timeLimit = gameSession.timePerQuestionSeconds;
  const isTimedOut = timeRemaining <= 0;
  const isDisabled = isAnswered || isTimedOut;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      {/* Question counter */}
      <div className="text-center">
        <span className="text-xs font-bold text-muted-foreground">
          {currentQuestionIndex + 1} / {totalQuestions}
        </span>
      </div>

      {/* Timer */}
      <GameTimer totalSeconds={timeLimit} showNumber size="lg" />

      {/* Question text */}
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <p className="text-center text-base font-semibold leading-relaxed text-foreground sm:text-lg">
          {currentQuestion.questionText}
        </p>
      </div>

      {/* Answer locked state */}
      {isAnswered && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-primary/10 py-3">
          <Lock className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            Answer locked! Waiting for results...
          </span>
        </div>
      )}

      {/* Timed out state */}
      {isTimedOut && !isAnswered && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 py-3">
          <span className="text-sm font-semibold text-rose-600">
            Time's up!
          </span>
        </div>
      )}

      {/* Answer buttons */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {currentQuestion.options.map((option, idx) => {
          const label = OPTION_LABELS[idx];
          const color = OPTION_COLORS[idx];
          const isSelected = selectedAnswer === label;

          return (
            <button
              key={idx}
              type="button"
              disabled={isDisabled}
              onClick={() => onAnswer(label)}
              className={`relative flex items-center gap-3 rounded-2xl px-5 py-5 text-left text-white transition-all ${
                isDisabled
                  ? isSelected
                    ? `${color.bg.split(" ")[0]} opacity-90 ring-4 ${color.ring}`
                    : "bg-muted-foreground/20 text-muted-foreground"
                  : `${color.bg} active:scale-[0.97]`
              }`}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/20 text-sm font-bold">
                {label}
              </span>
              <span className="flex-1 text-sm font-medium">{option}</span>
              {isSelected && (
                <Check className="h-5 w-5 shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
