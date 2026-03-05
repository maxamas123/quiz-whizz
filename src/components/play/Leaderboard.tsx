// src/components/play/Leaderboard.tsx
//
// Ranked leaderboard used between questions and at game end.

import { Trophy, Medal } from "lucide-react";
import type { LeaderboardEntry } from "@/types/gameSession";

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  /** Highlight a specific player (e.g., the current player) */
  highlightPlayerId?: string;
  /** Show as compact (for between-question view) or full (for final results) */
  variant?: "compact" | "full";
  /** Title override */
  title?: string;
}

const RANK_STYLES: Record<number, string> = {
  1: "bg-amber-100 text-amber-700 ring-2 ring-amber-300",
  2: "bg-gray-100 text-gray-600 ring-2 ring-gray-300",
  3: "bg-orange-100 text-orange-700 ring-2 ring-orange-300",
};

const RANK_BADGES: Record<number, string> = {
  1: "bg-amber-500",
  2: "bg-gray-400",
  3: "bg-orange-500",
};

export function Leaderboard({
  entries,
  highlightPlayerId,
  variant = "compact",
  title,
}: LeaderboardProps) {
  if (entries.length === 0) return null;

  const displayEntries =
    variant === "compact" ? entries.slice(0, 8) : entries;

  return (
    <div className="rounded-2xl bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-center gap-2">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-lg font-bold text-foreground">
          {title ?? "Leaderboard"}
        </h3>
      </div>

      {/* Podium (top 3) — only in full variant */}
      {variant === "full" && entries.length >= 3 && (
        <div className="mb-6 flex items-end justify-center gap-3">
          {/* 2nd place */}
          <PodiumSpot entry={entries[1]} height="h-20" />
          {/* 1st place */}
          <PodiumSpot entry={entries[0]} height="h-28" isFirst />
          {/* 3rd place */}
          <PodiumSpot entry={entries[2]} height="h-16" />
        </div>
      )}

      {/* List */}
      <div className="space-y-1.5">
        {displayEntries.map((entry) => {
          const isHighlighted = entry.playerId === highlightPlayerId;
          const rankStyle = RANK_STYLES[entry.rank];

          return (
            <div
              key={entry.playerId}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                isHighlighted
                  ? "bg-primary/10 ring-1 ring-primary/30"
                  : rankStyle ?? "bg-muted/20"
              }`}
            >
              {/* Rank */}
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                  RANK_BADGES[entry.rank] ?? "bg-muted-foreground/30"
                }`}
              >
                {entry.rank}
              </span>

              {/* Name */}
              <span
                className={`flex-1 truncate text-sm font-semibold ${
                  isHighlighted ? "text-primary" : "text-foreground"
                }`}
              >
                {entry.displayName}
                {isHighlighted && (
                  <span className="ml-1.5 text-xs font-normal text-primary/60">
                    (you)
                  </span>
                )}
              </span>

              {/* Score */}
              <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                {entry.totalScore.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      {/* Show more indicator */}
      {variant === "compact" && entries.length > 8 && (
        <p className="mt-2 text-center text-xs text-muted-foreground">
          +{entries.length - 8} more player{entries.length - 8 !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}

/** Mini podium block for top 3 */
function PodiumSpot({
  entry,
  height,
  isFirst,
}: {
  entry: LeaderboardEntry;
  height: string;
  isFirst?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      {isFirst && <Medal className="h-6 w-6 text-amber-500" />}
      <p className="max-w-[80px] truncate text-xs font-semibold text-foreground">
        {entry.displayName}
      </p>
      <div
        className={`${height} w-20 rounded-t-xl ${
          isFirst
            ? "bg-amber-400"
            : entry.rank === 2
              ? "bg-gray-300"
              : "bg-orange-400"
        } flex items-end justify-center pb-2`}
      >
        <span className="text-lg font-black text-white">{entry.rank}</span>
      </div>
      <p className="text-xs font-bold tabular-nums text-muted-foreground">
        {entry.totalScore.toLocaleString()}
      </p>
    </div>
  );
}
