// src/components/play/HostLobby.tsx
//
// Host's lobby view: shows join code and connected players, with Start button.

import { useGameStore } from "@/store/gameStore";
import { JoinCodeDisplay } from "@/components/play/JoinCodeDisplay";
import { Button } from "@/components/ui/button";
import { Users, Play, Loader2 } from "lucide-react";

interface HostLobbyProps {
  onStartGame: () => void;
  isStarting: boolean;
}

/** Deterministic color from player name */
const AVATAR_COLORS = [
  "bg-rose-400",
  "bg-blue-400",
  "bg-emerald-400",
  "bg-amber-400",
  "bg-purple-400",
  "bg-cyan-400",
  "bg-pink-400",
  "bg-indigo-400",
  "bg-teal-400",
  "bg-orange-400",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function HostLobby({ onStartGame, isStarting }: HostLobbyProps) {
  const gameSession = useGameStore((s) => s.gameSession);
  const gamePlayers = useGameStore((s) => s.gamePlayers);

  if (!gameSession) return null;

  const joinUrl = `${window.location.origin}/play/join?code=${gameSession.joinCode}`;

  return (
    <div className="mx-auto max-w-2xl space-y-8 text-center">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {gameSession.quizName || "Game Lobby"}
        </h1>
        <p className="text-base text-muted-foreground">
          Share this code with your players
        </p>
      </div>

      {/* Join code */}
      <JoinCodeDisplay code={gameSession.joinCode} joinUrl={joinUrl} />

      {/* Player list */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-bold text-foreground">
            Players ({gamePlayers.length})
          </h2>
        </div>

        {gamePlayers.length === 0 ? (
          <div className="py-8">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted/50">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              Waiting for players to join...
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-3">
            {gamePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center gap-2 rounded-full bg-muted/30 px-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white ${getAvatarColor(
                    player.displayName
                  )}`}
                >
                  {player.displayName.charAt(0).toUpperCase()}
                </span>
                <span className="text-sm font-medium text-foreground">
                  {player.displayName}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start button */}
      <Button
        size="lg"
        disabled={gamePlayers.length === 0 || isStarting}
        onClick={onStartGame}
        className="gap-2 rounded-full px-10 shadow-lg shadow-primary/25"
      >
        {isStarting ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Play className="h-5 w-5" />
        )}
        Start Game
      </Button>

      {/* Settings reminder */}
      <p className="text-xs text-muted-foreground">
        {gameSession.timePerQuestionSeconds}s per question
      </p>
    </div>
  );
}
