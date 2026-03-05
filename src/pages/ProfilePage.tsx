// src/pages/ProfilePage.tsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { listUserQuizzes, getUserProfile, type SavedQuizMeta } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  User,
  Trophy,
  BarChart3,
  Calendar,
  Loader2,
  Trash2,
  LogOut,
  Sparkles,
} from "lucide-react";

export function ProfilePage() {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<SavedQuizMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [quizCredits, setQuizCredits] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const [data, profile] = await Promise.all([
          listUserQuizzes(user!.id),
          getUserProfile(user!.id),
        ]);
        setQuizzes(data);
        setQuizCredits(profile.quizCredits);
      } catch {
        // Silently fail
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, [user, authLoading]);

  async function handleDeleteAccount() {
    if (!user) return;
    setIsDeleting(true);
    try {
      // Delete user's quizzes first (cascade handles questions + attempts)
      await supabase.from("quizzes").delete().eq("user_id", user.id);
      // Sign out — actual account deletion requires admin or edge function
      await signOut();
      navigate("/");
    } catch {
      setIsDeleting(false);
    }
  }

  // ── Not logged in ──
  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 text-center pt-12">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Sign in to view your profile
        </h1>
        <p className="text-muted-foreground">
          Create an account or sign in to access your profile and stats.
        </p>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading || authLoading) {
    return (
      <div className="mx-auto max-w-3xl pt-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  // Compute stats
  const totalQuizzes = quizzes.length;
  const totalAttempts = quizzes.filter((q) => q.bestScore !== null).length;
  const scores = quizzes
    .filter((q) => q.bestScore !== null)
    .map((q) => Math.round((q.bestScore!.correct / q.bestScore!.total) * 100));
  const avgScore =
    scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;
  const bestScore = scores.length > 0 ? Math.max(...scores) : null;

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Unknown";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Profile
        </h1>
        <p className="text-muted-foreground">{user?.email}</p>
      </div>

      {/* Account info */}
      <div className="rounded-2xl bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{user?.email}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">
              Joined {createdAt}
            </span>
          </div>
        </div>
      </div>

      {/* Quiz Credits */}
      {quizCredits !== null && (
        <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 text-center">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-3xl font-bold text-primary">{quizCredits}</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Quiz Credit{quizCredits !== 1 ? "s" : ""} Remaining
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-foreground">{totalQuizzes}</p>
          <p className="mt-1 text-xs text-muted-foreground">Quizzes Saved</p>
        </div>
        <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
          <p className="text-3xl font-bold text-foreground">{totalAttempts}</p>
          <p className="mt-1 text-xs text-muted-foreground">Attempts</p>
        </div>
        <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1">
            <BarChart3 className="h-5 w-5 text-primary" />
            <p className="text-3xl font-bold text-foreground">
              {avgScore !== null ? `${avgScore}%` : "—"}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Avg Score</p>
        </div>
        <div className="rounded-2xl bg-card p-5 text-center shadow-sm">
          <div className="flex items-center justify-center gap-1">
            <Trophy className="h-5 w-5 text-primary" />
            <p className="text-3xl font-bold text-foreground">
              {bestScore !== null ? `${bestScore}%` : "—"}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Best Score</p>
        </div>
      </div>

      {/* Danger zone */}
      <div className="rounded-2xl border-2 border-dashed border-rose-200 bg-rose-50/30 p-6">
        <h2 className="mb-2 text-sm font-semibold text-rose-700">
          Danger Zone
        </h2>
        <p className="mb-4 text-sm text-rose-600/80">
          Signing out will end your session. Deleting your data will remove all
          saved quizzes and attempts permanently.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-full"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2 rounded-full"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete All Data
          </Button>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete all data?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete all your saved quizzes, questions, and
            attempt history. This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-2 rounded-full"
              onClick={handleDeleteAccount}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete Everything
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
