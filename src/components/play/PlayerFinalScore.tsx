// src/components/play/PlayerFinalScore.tsx
//
// Player's final score screen at the end of the game.

import { useGameStore } from "@/store/gameStore";
import { useNavigate } from "react-router-dom";
import { Leaderboard } from "@/components/play/Leaderboard";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, RotateCcw } from "lucide-react";

function getRankMessage(rank: number, total: number): { title: string; subtitle: string } {
  if (rank === 1) return { title: "Champion!", subtitle: "You came out on top!" };
  if (rank === 2) return { title: "Runner Up!", subtitle: "So close to the top!" };
  if (rank === 3) return { title: "Bronze Medal!", subtitle: "A podium finish!" };
  if (rank <= Math.ceil(total / 2)) return { title: "Great effort!", subtitle: "You finished in the top half!" };
  return { title: "Well played!", subtitle: "Better luck next time!" };
}

export function PlayerFinalScore() {
  const navigate = useNavigate();
  const finalLeaderboard = useGameStore((s) => s.finalLeaderboard);
  const currentPlayer = useGameStore((s) => s.currentPlayer);
  const clearGameState = useGameStore((s) => s.clearGameState);

  const myEntry = finalLeaderboard.find(
    (e) => e.playerId === currentPlayer?.id
  );
  const rank = myEntry?.rank ?? 0;
  const score = myEntry?.totalScore ?? 0;
  const total = finalLeaderboard.length;

  const { title, subtitle } = getRankMessage(rank, total);

  return (
    <div className="mx-auto max-w-md space-y-6 text-center">
      {/* Rank badge */}
      <div className="space-y-3">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          {rank <= 3 ? (
            <Trophy className="h-10 w-10 text-amber-500" />
          ) : (
            <Sparkles className="h-10 w-10 text-primary" />
          )}
        </div>
        <h1 className="text-3xl font-black text-foreground">{title}</h1>
        <p className="text-base text-muted-foreground">{subtitle}</p>
      </div>

      {/* Score card */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="flex items-baseline justify-center gap-3">
          <span className="text-5xl font-black text-primary">#{rank}</span>
          <span className="text-sm text-muted-foreground">
            of {total} player{total !== 1 ? "s" : ""}
          </span>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums text-foreground">
          {score.toLocaleString()} points
        </p>
      </div>

      {/* Leaderboard */}
      <Leaderboard
        entries={finalLeaderboard}
        highlightPlayerId={currentPlayer?.id}
        variant="compact"
        title="Final Standings"
      />

      {/* Action */}
      <div className="pb-12">
        <Button
          variant="outline"
          className="gap-2 rounded-full px-6"
          onClick={() => {
            clearGameState();
            navigate("/play/join");
          }}
        >
          <RotateCcw className="h-4 w-4" />
          Join Another Game
        </Button>
      </div>
    </div>
  );
}
