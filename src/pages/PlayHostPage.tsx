// src/pages/PlayHostPage.tsx
//
// Entry point for hosts: creates a game session from the quiz in the store,
// then immediately navigates to the game page.

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuizStore } from "@/store/quizStore";
import { useGameStore } from "@/store/gameStore";
import { useAuth } from "@/lib/auth";
import { createGameSession } from "@/lib/gameApi";
import { saveQuiz as saveQuizToDB } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function PlayHostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const generatedQuiz = useQuizStore((s) => s.generatedQuiz);
  const savedQuizId = useQuizStore((s) => s.savedQuizId);
  const setSavedQuizId = useQuizStore((s) => s.setSavedQuizId);
  const setGameSession = useGameStore((s) => s.setGameSession);
  const setIsHost = useGameStore((s) => s.setIsHost);
  const clearGameState = useGameStore((s) => s.clearGameState);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!generatedQuiz || !user) {
      navigate("/create");
      return;
    }

    let cancelled = false;

    async function setup() {
      try {
        // Ensure quiz is saved to DB first (need quiz_id for the session)
        let quizId = savedQuizId;
        if (!quizId) {
          const saved = await saveQuizToDB(generatedQuiz!, user!.id);
          quizId = saved;
          setSavedQuizId(saved);
        }

        if (cancelled) return;

        const config = generatedQuiz!.config;
        const session = await createGameSession(
          quizId,
          user!.id,
          config.timePerQuestionSeconds ?? 30,
          config.quizName || "Quiz Game",
          config
        );

        if (cancelled) return;

        // Set up game store
        clearGameState();
        setGameSession(session);
        setIsHost(true);

        // Navigate to the game page
        navigate(`/play/game/${session.id}`, { replace: true });
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to create game"
          );
        }
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div className="mx-auto max-w-md pt-20 text-center">
        <div className="rounded-2xl bg-destructive/10 p-6">
          <h2 className="mb-2 text-lg font-bold text-destructive">
            Failed to create game
          </h2>
          <p className="mb-4 text-sm text-destructive/80">{error}</p>
          <button
            className="text-sm font-medium text-primary hover:underline"
            onClick={() => navigate("/create")}
          >
            Go back to quiz creator
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pt-20 text-center">
      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
      <p className="mt-3 text-sm text-muted-foreground">
        Setting up your game...
      </p>
    </div>
  );
}
