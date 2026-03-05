// src/components/play/HostGameView.tsx
//
// Host's view during active gameplay: shows the question on a large display,
// countdown timer, and tracks how many players have answered.

import { useGameStore } from "@/store/gameStore";
import { GameTimer } from "@/components/play/GameTimer";
import { Users, CheckCircle2 } from "lucide-react";

const OPTION_LABELS = ["A", "B", "C", "D"] as const;

const OPTION_COLORS = [
  { bg: "bg-rose-500", bgLight: "bg-rose-100", text: "text-rose-700" },
  { bg: "bg-blue-500", bgLight: "bg-blue-100", text: "text-blue-700" },
  { bg: "bg-amber-500", bgLight: "bg-amber-100", text: "text-amber-700" },
  { bg: "bg-emerald-500", bgLight: "bg-emerald-100", text: "text-emerald-700" },
];

export function HostGameView() {
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex);
  const totalQuestions = useGameStore((s) => s.totalQuestions);
  const gameSession = useGameStore((s) => s.gameSession);
  const answeredCount = useGameStore((s) => s.answeredCount);
  const gamePlayers = useGameStore((s) => s.gamePlayers);
  const timeRemaining = useGameStore((s) => s.timeRemaining);

  // Debug: never return blank — show what's missing so we can diagnose
  if (!currentQuestion || !gameSession) {
    return (
      <div className="mx-auto max-w-md pt-20 text-center">
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-6">
          <h2 className="mb-2 text-lg font-bold text-amber-600">
            Waiting for question data...
          </h2>
          <p className="text-sm text-amber-600/80">
            gameSession: {gameSession ? "OK" : "MISSING"} |
            currentQuestion: {currentQuestion ? "OK" : "MISSING"} |
            questionIndex: {currentQuestionIndex} |
            totalQuestions: {totalQuestions}
          </p>
        </div>
      </div>
    );
  }

  const timeLimit = gameSession.timePerQuestionSeconds;
  const totalPlayers = gamePlayers.length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Top bar: question counter + answered tracker */}
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold text-primary">
          Question {currentQuestionIndex + 1} / {totalQuestions}
        </span>
        <div className="flex items-center gap-2 rounded-full bg-muted/30 px-4 py-1.5">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            {answeredCount} / {totalPlayers} answered
          </span>
          {answeredCount === totalPlayers && totalPlayers > 0 && (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          )}
        </div>
      </div>

      {/* Timer */}
      <GameTimer totalSeconds={timeLimit} showNumber size="lg" />

      {/* Question text */}
      <div className="rounded-2xl bg-card p-8 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted/50 px-2.5 py-0.5 font-medium">
            {currentQuestion.topic}
          </span>
          <span className="rounded-full bg-muted/50 px-2.5 py-0.5 font-medium">
            {currentQuestion.difficulty}
          </span>
        </div>
        <h2 className="text-xl font-bold leading-relaxed text-foreground sm:text-2xl">
          {currentQuestion.questionText}
        </h2>
      </div>

      {/* Options grid */}
      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.options.map((option, idx) => {
          const color = OPTION_COLORS[idx];
          const label = OPTION_LABELS[idx];
          return (
            <div
              key={idx}
              className={`flex items-center gap-3 rounded-2xl ${color.bgLight} p-5`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${color.bg} text-lg font-bold text-white`}
              >
                {label}
              </span>
              <span className={`text-base font-medium ${color.text}`}>
                {option}
              </span>
            </div>
          );
        })}
      </div>

      {/* Waiting message when timer is up but results haven't been shown yet */}
      {timeRemaining <= 0 && (
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">
            Time's up! Calculating results...
          </p>
        </div>
      )}
    </div>
  );
}
