// src/components/layout/AppHeader.tsx

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { AuthModal } from "@/components/auth/AuthModal";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, History, Home, User, Plus, Gamepad2 } from "lucide-react";

export function AppHeader() {
  const { user, isLoading, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-md print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          {/* Left — Branding */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              Quiz Whizz
            </span>
          </Link>

          {/* Right — Nav + Auth */}
          <div className="flex items-center gap-1">
            {/* Nav links */}
            <Link to="/">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 rounded-full text-sm ${
                  isActive("/")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Home className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Home</span>
              </Button>
            </Link>

            <Link to="/create">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 rounded-full text-sm ${
                  isActive("/create")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Create</span>
              </Button>
            </Link>

            <Link to="/play/join">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-1.5 rounded-full text-sm ${
                  isActive("/play/join")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Join Game</span>
              </Button>
            </Link>

            {user && (
              <>
                <Link to="/history">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 rounded-full text-sm ${
                      isActive("/history")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <History className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">My Quizzes</span>
                  </Button>
                </Link>

                <Link to="/profile">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-1.5 rounded-full text-sm ${
                      isActive("/profile")
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    <User className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Profile</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Separator */}
            <div className="mx-1 h-5 w-px bg-border" />

            {/* Auth area */}
            {isLoading ? (
              <div className="h-8 w-20 animate-pulse rounded-full bg-muted/50" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1 text-xs text-muted-foreground sm:flex">
                  <span className="max-w-[120px] truncate">
                    {user.email}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 rounded-full text-sm text-muted-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-full text-sm"
                onClick={() => setAuthOpen(true)}
              >
                <User className="h-3.5 w-3.5" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </>
  );
}
