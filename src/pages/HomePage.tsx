// src/pages/HomePage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useQuizStore } from "@/store/quizStore";
import { listUserQuizzes, loadSavedQuiz, getUserProfile, type SavedQuizMeta } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Trophy,
  History,
  Play,
  Eye,
  Loader2,
} from "lucide-react";

export function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setGeneratedQuiz, setSavedQuizId } = useQuizStore();

  const [recentQuizzes, setRecentQuizzes] = useState<SavedQuizMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [quizCredits, setQuizCredits] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    async function fetchRecent() {
      try {
        const [all, profile] = await Promise.all([
          listUserQuizzes(user!.id),
          getUserProfile(user!.id),
        ]);
        setRecentQuizzes(all.slice(0, 3));
        setQuizCredits(profile.quizCredits);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }

    fetchRecent();
  }, [user]);

  async function handleLoad(quizId: string) {
    setLoadingQuizId(quizId);
    try {
      const quiz = await loadSavedQuiz(quizId);
      setGeneratedQuiz(quiz);
      setSavedQuizId(quizId);
      navigate("/review");
    } catch {
      setLoadingQuizId(null);
    }
  }

  // Stats from recent quizzes
  const totalQuizzes = recentQuizzes.length;
  const bestScore = recentQuizzes.reduce<number | null>((best, q) => {
    if (!q.bestScore) return best;
    const pct = Math.round((q.bestScore.correct / q.bestScore.total) * 100);
    return best === null ? pct : Math.max(best, pct);
  }, null);

  const displayName = user?.email?.split("@")[0] || "there";

  return (
    <div className="mx-auto max-w-3xl space-y-8 pt-4">
      {/* Welcome */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Welcome back, {displayName}
        </h1>
        <p className="text-muted-foreground">
          Ready for another quiz?
        </p>
      </div>

      {/* Quick stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
            <p className="text-3xl font-bold text-foreground">{totalQuizzes}</p>
            <p className="mt-1 text-sm text-muted-foreground">Saved Quizzes</p>
          </div>
          <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
            <div className="flex items-center justify-center gap-1.5">
              <Trophy className="h-5 w-5 text-primary" />
              <p className="text-3xl font-bold text-foreground">
                {bestScore !== null ? `${bestScore}%` : "—"}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Best Score</p>
          </div>
          <div className="col-span-2 rounded-2xl bg-card p-5 text-center shadow-sm sm:col-span-1">
            <div className="flex items-center justify-center gap-1.5">
              <Sparkles className="h-5 w-5 text-primary" />
              <p className="text-3xl font-bold text-primary">
                {quizCredits !== null ? quizCredits : "—"}
              </p>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Credits Left</p>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          className="gap-2 rounded-full px-8 shadow-sm"
          onClick={() => navigate("/create")}
        >
          <Sparkles className="h-5 w-5" />
          Create New Quiz
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="gap-2 rounded-full px-6"
          onClick={() => navigate("/history")}
        >
          <History className="h-5 w-5" />
          My Quizzes
        </Button>
      </div>

      {/* Recent quizzes */}
      {recentQuizzes.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Quizzes
          </h2>
          {recentQuizzes.map((quiz) => {
            const isLoadingThis = loadingQuizId === quiz.id;
            return (
              <div
                key={quiz.id}
                className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {quiz.name || "Untitled Quiz"}
                  </h3>
                  {quiz.bestScore && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Best: {Math.round((quiz.bestScore.correct / quiz.bestScore.total) * 100)}%
                      ({quiz.bestScore.correct}/{quiz.bestScore.total})
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-full text-xs"
                    onClick={() => handleLoad(quiz.id)}
                    disabled={!!loadingQuizId}
                  >
                    {isLoadingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                    Review
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="gap-1.5 rounded-full text-xs"
                    onClick={() => handleLoad(quiz.id)}
                    disabled={!!loadingQuizId}
                  >
                    {isLoadingThis ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="h-3.5 w-3.5" />
                    )}
                    Retry
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isLoading && (
        <div className="text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
