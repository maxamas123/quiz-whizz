// src/pages/PlayJoinPage.tsx
//
// Public page where players enter a join code and display name to join a game.

import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/lib/auth";
import { joinGameSession } from "@/lib/gameApi";
import { Button } from "@/components/ui/button";
import { Gamepad2, Loader2 } from "lucide-react";

export function PlayJoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const setGameSession = useGameStore((s) => s.setGameSession);
  const setCurrentPlayer = useGameStore((s) => s.setCurrentPlayer);
  const setIsHost = useGameStore((s) => s.setIsHost);
  const clearGameState = useGameStore((s) => s.clearGameState);

  const [joinCode, setJoinCode] = useState(
    searchParams.get("code")?.toUpperCase() ?? ""
  );
  const [displayName, setDisplayName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill from URL param
  useEffect(() => {
    const code = searchParams.get("code");
    if (code) setJoinCode(code.toUpperCase());
  }, [searchParams]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCode = joinCode.trim().toUpperCase();
    const trimmedName = displayName.trim();

    if (trimmedCode.length !== 6) {
      setError("Enter a 6-character game code");
      return;
    }
    if (!trimmedName) {
      setError("Enter your display name");
      return;
    }

    setIsJoining(true);
    try {
      const { session, player } = await joinGameSession(
        trimmedCode,
        trimmedName,
        user?.id
      );

      clearGameState();
      setGameSession(session);
      setCurrentPlayer(player);
      setIsHost(false);

      navigate(`/play/game/${session.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join game");
    } finally {
      setIsJoining(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-8 pt-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Gamepad2 className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Join a Game
        </h1>
        <p className="text-sm text-muted-foreground">
          Enter the code shown on the host's screen
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleJoin} className="space-y-4">
        {/* Join code */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Game Code
          </label>
          <input
            type="text"
            value={joinCode}
            onChange={(e) =>
              setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))
            }
            placeholder="ABC123"
            maxLength={6}
            autoFocus
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-center text-2xl font-bold tracking-[0.3em] text-foreground placeholder:text-muted-foreground/30 placeholder:tracking-[0.3em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Display name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Your Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value.slice(0, 20))}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full rounded-xl border border-border bg-white px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="rounded-xl bg-destructive/10 px-4 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Submit */}
        <Button
          type="submit"
          size="lg"
          disabled={isJoining || joinCode.length !== 6 || !displayName.trim()}
          className="w-full gap-2 rounded-full shadow-lg shadow-primary/25"
        >
          {isJoining ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Gamepad2 className="h-5 w-5" />
          )}
          Join Game
        </Button>
      </form>
    </div>
  );
}
