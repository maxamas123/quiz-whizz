// src/components/play/PlayerLobby.tsx
//
// Player's lobby view: waiting for host to start the game.

import { useGameStore } from "@/store/gameStore";
import { Loader2, Users } from "lucide-react";

export function PlayerLobby() {
  const gameSession = useGameStore((s) => s.gameSession);
  const gamePlayers = useGameStore((s) => s.gamePlayers);
  const currentPlayer = useGameStore((s) => s.currentPlayer);

  return (
    <div className="mx-auto max-w-md space-y-8 text-center">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          You're in!
        </h1>
        <p className="text-base text-muted-foreground">
          {gameSession?.quizName || "Waiting for the host to start..."}
        </p>
      </div>

      {/* Player identity */}
      {currentPlayer && (
        <div className="mx-auto flex items-center justify-center gap-3 rounded-2xl bg-primary/5 px-6 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
            {currentPlayer.displayName.charAt(0).toUpperCase()}
          </span>
          <span className="text-lg font-semibold text-foreground">
            {currentPlayer.displayName}
          </span>
        </div>
      )}

      {/* Waiting animation */}
      <div className="py-6">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary/40" />
        <p className="mt-3 text-sm text-muted-foreground">
          Waiting for the host to start the game...
        </p>
      </div>

      {/* Player count */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        <span>
          {gamePlayers.length} player{gamePlayers.length !== 1 ? "s" : ""}{" "}
          connected
        </span>
      </div>
    </div>
  );
}
