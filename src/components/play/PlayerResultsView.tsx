// src/components/play/PlayerResultsView.tsx
//
// Player's view of results after each question.

import { useGameStore } from "@/store/gameStore";
import { CheckCircle2, XCircle, Lightbulb, TrendingUp } from "lucide-react";

export function PlayerResultsView() {
  const currentQuestion = useGameStore((s) => s.currentQuestion);
  const selectedAnswer = useGameStore((s) => s.selectedAnswer);
  const correctAnswer = useGameStore((s) => s.correctAnswer);
  const explanation = useGameStore((s) => s.explanation);
  const questionResults = useGameStore((s) => s.questionResults);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const leaderboard = useGameStore((s) => s.leaderboard);

  if (!currentQuestion) return null;

  // Find this player's result
  const myResult = questionResults.find(
    (r) => r.playerId === currentPlayer?.id
  );
  const isCorrect = myResult?.isCorrect ?? false;
  const pointsEarned = myResult?.pointsAwarded ?? 0;

  // Find current rank
  const myRank = leaderboard.find(
    (e) => e.playerId === currentPlayer?.id
  )?.rank;
  const myTotalScore = leaderboard.find(
    (e) => e.playerId === currentPlayer?.id
  )?.totalScore;

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      {/* Correct / Incorrect badge */}
      {isCorrect ? (
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-emerald-600">Correct!</h2>
          <p className="text-lg font-semibold text-primary">
            +{pointsEarned} points
          </p>
        </div>
      ) : selectedAnswer ? (
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
            <XCircle className="h-8 w-8 text-rose-500" />
          </div>
          <h2 className="text-2xl font-bold text-rose-600">Incorrect</h2>
          <p className="text-sm text-muted-foreground">
            The answer was{" "}
            <span className="font-semibold text-emerald-600">
              {correctAnswer}
            </span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-amber-600">No answer</h2>
          <p className="text-sm text-muted-foreground">
            The answer was{" "}
            <span className="font-semibold text-emerald-600">
              {correctAnswer}
            </span>
          </p>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div className="flex items-start gap-2 rounded-xl bg-primary/5 px-4 py-3 text-left">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
          <p className="text-sm leading-relaxed text-foreground/70">
            {explanation}
          </p>
        </div>
      )}

      {/* Current standing */}
      {myRank !== undefined && (
        <div className="rounded-2xl bg-card p-5 shadow-sm">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            <span>Your standing</span>
          </div>
          <div className="mt-2 flex items-baseline justify-center gap-3">
            <span className="text-3xl font-black text-foreground">
              #{myRank}
            </span>
            <span className="text-lg font-semibold tabular-nums text-muted-foreground">
              {(myTotalScore ?? 0).toLocaleString()} pts
            </span>
          </div>
        </div>
      )}

      {/* Waiting message */}
      <p className="text-xs text-muted-foreground animate-pulse">
        Waiting for next question...
      </p>
    </div>
  );
}
