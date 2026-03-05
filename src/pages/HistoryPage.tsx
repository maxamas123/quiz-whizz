// src/pages/HistoryPage.tsx

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useQuizStore } from "@/store/quizStore";
import {
  listUserQuizzes,
  loadSavedQuiz,
  deleteSavedQuiz,
  renameQuiz,
  type SavedQuizMeta,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  History,
  Trophy,
  Trash2,
  Play,
  Eye,
  Loader2,
  Sparkles,
  User,
  PenLine,
} from "lucide-react";
/** Topic colours for badges — built-in topics */
const TOPIC_COLORS: Record<string, string> = {
  Sport: "bg-orange-100 text-orange-700",
  History: "bg-amber-100 text-amber-700",
  "Science & Technology": "bg-blue-100 text-blue-700",
  Geography: "bg-emerald-100 text-emerald-700",
  Music: "bg-purple-100 text-purple-700",
  "Film & TV": "bg-pink-100 text-pink-700",
  "Food & Drink": "bg-red-100 text-red-700",
  "Art & Literature": "bg-indigo-100 text-indigo-700",
  "General Knowledge": "bg-gray-100 text-gray-700",
};

/** Colour palette for custom topics — deterministically assigned by name hash */
const CUSTOM_TOPIC_COLORS = [
  "bg-cyan-100 text-cyan-700",
  "bg-teal-100 text-teal-700",
  "bg-lime-100 text-lime-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-yellow-100 text-yellow-700",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function getTopicColor(topic: string): string {
  if (TOPIC_COLORS[topic]) return TOPIC_COLORS[topic];
  return CUSTOM_TOPIC_COLORS[hashString(topic) % CUSTOM_TOPIC_COLORS.length];
}

export function HistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { setGeneratedQuiz, setSavedQuizId } = useQuizStore();

  const [quizzes, setQuizzes] = useState<SavedQuizMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingQuizId, setLoadingQuizId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedQuizMeta | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Fetch quizzes on mount (only if authenticated)
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function fetch() {
      try {
        const data = await listUserQuizzes(user!.id);
        setQuizzes(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load quizzes");
      } finally {
        setIsLoading(false);
      }
    }

    fetch();
  }, [user, authLoading]);

  async function handleLoad(quizId: string, _mode: "review" | "retry") {
    setLoadingQuizId(quizId);
    try {
      const quiz = await loadSavedQuiz(quizId);
      setGeneratedQuiz(quiz);
      setSavedQuizId(quizId);
      navigate("/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load quiz");
      setLoadingQuizId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteSavedQuiz(deleteTarget.id, user!.id);
      setQuizzes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete quiz");
    } finally {
      setIsDeleting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function startRename(quiz: SavedQuizMeta) {
    setEditingId(quiz.id);
    setEditingValue(quiz.name || "");
    setTimeout(() => renameInputRef.current?.focus(), 50);
  }

  async function saveRename(quizId: string) {
    setEditingId(null);
    const trimmed = editingValue.trim();
    const oldQuiz = quizzes.find((q) => q.id === quizId);
    if (trimmed !== (oldQuiz?.name || "")) {
      try {
        await renameQuiz(quizId, trimmed, user!.id);
        setQuizzes((prev) =>
          prev.map((q) =>
            q.id === quizId ? { ...q, name: trimmed || null } : q
          )
        );
      } catch {
        // Silently fail on rename
      }
    }
  }

  // ── Not logged in ──
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center pt-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Sign in to view your quizzes</h1>
        <p className="text-muted-foreground">
          Create an account or sign in to save quizzes and track your scores.
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading || authLoading) {
    return (
      <div className="mx-auto max-w-3xl pt-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your quizzes...</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="mx-auto max-w-3xl pt-12 text-center">
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        <Button
          variant="outline"
          className="mt-4 rounded-full"
          onClick={() => { setError(null); setIsLoading(true); }}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <History className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          My Quizzes
        </h1>
        <p className="text-muted-foreground">
          {quizzes.length} saved quiz{quizzes.length !== 1 ? "zes" : ""}
        </p>
      </div>

      {/* Empty state */}
      {quizzes.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border/60 py-16 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground/30" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">
            No quizzes saved yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Generate a quiz and click "Save Quiz" to see it here.
          </p>
          <Button
            variant="default"
            className="mt-6 gap-2 rounded-full"
            onClick={() => navigate("/create")}
          >
            <Sparkles className="h-4 w-4" />
            Create a Quiz
          </Button>
        </div>
      )}

      {/* Quiz cards */}
      <div className="space-y-3">
        {quizzes.map((quiz) => {
          const topics = (quiz.config?.topics as string[]) ?? [];
          const isLoadingThis = loadingQuizId === quiz.id;

          return (
            <div
              key={quiz.id}
              className="rounded-2xl bg-card p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left — quiz info */}
                <div className="min-w-0 flex-1 space-y-2">
                  {editingId === quiz.id ? (
                    <input
                      ref={renameInputRef}
                      type="text"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onBlur={() => saveRename(quiz.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveRename(quiz.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="w-full rounded-lg border border-primary/30 bg-white px-2 py-1 text-lg font-bold text-foreground outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  ) : (
                    <h3 className="group flex items-center gap-1.5 text-lg font-bold text-foreground">
                      <span className="truncate">{quiz.name || "Untitled Quiz"}</span>
                      <button
                        type="button"
                        onClick={() => startRename(quiz)}
                        className="shrink-0 rounded-lg p-1 text-muted-foreground/30 transition-colors hover:text-primary group-hover:text-muted-foreground/50"
                        title="Rename quiz"
                      >
                        <PenLine className="h-3.5 w-3.5" />
                      </button>
                    </h3>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(quiz.createdAt)}
                  </p>

                  {/* Topic badges */}
                  {topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {topics.map((t) => (
                        <span
                          key={t}
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${getTopicColor(t)}`}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right — score + actions */}
                <div className="flex flex-col items-end gap-2">
                  {quiz.bestScore && (
                    <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1">
                      <Trophy className="h-3.5 w-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">
                        {Math.round(
                          (quiz.bestScore.correct / quiz.bestScore.total) * 100
                        )}
                        %
                      </span>
                      <span className="text-xs text-primary/60">
                        ({quiz.bestScore.correct}/{quiz.bestScore.total})
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-full text-xs"
                      onClick={() => handleLoad(quiz.id, "review")}
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
                      onClick={() => handleLoad(quiz.id, "retry")}
                      disabled={!!loadingQuizId}
                    >
                      {isLoadingThis ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Play className="h-3.5 w-3.5" />
                      )}
                      Retry
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-muted-foreground hover:text-rose-600"
                      onClick={() => setDeleteTarget(quiz)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete quiz?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete{" "}
            <span className="font-medium text-foreground">
              {deleteTarget?.name || "Untitled Quiz"}
            </span>{" "}
            and all attempts. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 rounded-full"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
