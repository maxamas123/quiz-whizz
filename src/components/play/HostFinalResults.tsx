// src/components/play/HostFinalResults.tsx
//
// Final results screen for the host: podium + full leaderboard + action buttons.

import { useGameStore } from "@/store/gameStore";
import { useNavigate } from "react-router-dom";
import { Leaderboard } from "@/components/play/Leaderboard";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowLeft, RotateCcw } from "lucide-react";

export function HostFinalResults() {
  const navigate = useNavigate();
  const finalLeaderboard = useGameStore((s) => s.finalLeaderboard);
  const gameSession = useGameStore((s) => s.gameSession);
  const clearGameState = useGameStore((s) => s.clearGameState);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Game Over!
        </h1>
        <p className="text-base text-muted-foreground">
          {gameSession?.quizName ?? "Final Results"}
        </p>
      </div>

      {/* Leaderboard */}
      <Leaderboard
        entries={finalLeaderboard}
        variant="full"
        title="Final Standings"
      />

      {/* Actions */}
      <div className="flex items-center justify-center gap-4 pb-12">
        <Button
          variant="outline"
          className="gap-2 rounded-full px-6"
          onClick={() => {
            clearGameState();
            navigate("/review");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Quiz
        </Button>
        <Button
          className="gap-2 rounded-full px-6 shadow-lg shadow-primary/25"
          onClick={() => {
            clearGameState();
            navigate("/create");
          }}
        >
          <RotateCcw className="h-4 w-4" />
          New Quiz
        </Button>
      </div>
    </div>
  );
}
