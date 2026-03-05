// src/lib/gameRealtime.ts
//
// Manages Supabase Realtime channels for multiplayer game sessions.
// Uses Broadcast for game events and Presence for player connection tracking.

import { supabase } from "@/lib/supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type {
  QuestionRevealedPayload,
  PlayerAnsweredPayload,
  QuestionResultsPayload,
  GameFinishedPayload,
  ShowLeaderboardPayload,
} from "@/types/gameSession";

/** All possible callback handlers for game events */
export interface GameRealtimeCallbacks {
  onQuestionRevealed?: (data: QuestionRevealedPayload) => void;
  onPlayerAnswered?: (data: PlayerAnsweredPayload) => void;
  onResultsShown?: (data: QuestionResultsPayload) => void;
  onShowLeaderboard?: (data: ShowLeaderboardPayload) => void;
  onGameFinished?: (data: GameFinishedPayload) => void;
  onGameStarted?: () => void;
  onPresenceSync?: (state: Record<string, unknown[]>) => void;
}

export class GameRealtimeManager {
  private channel: RealtimeChannel | null = null;
  private sessionId = "";

  /** Subscribe to a game session's Realtime channel */
  subscribe(sessionId: string, callbacks: GameRealtimeCallbacks): void {
    // Clean up any existing subscription
    this.unsubscribe();

    this.sessionId = sessionId;
    this.channel = supabase.channel(`game:${sessionId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: sessionId },
      },
    });

    this.channel
      .on("broadcast", { event: "game:started" }, () => {
        callbacks.onGameStarted?.();
      })
      .on("broadcast", { event: "game:question-revealed" }, ({ payload }) => {
        callbacks.onQuestionRevealed?.(payload as QuestionRevealedPayload);
      })
      .on("broadcast", { event: "game:player-answered" }, ({ payload }) => {
        callbacks.onPlayerAnswered?.(payload as PlayerAnsweredPayload);
      })
      .on("broadcast", { event: "game:results-shown" }, ({ payload }) => {
        callbacks.onResultsShown?.(payload as QuestionResultsPayload);
      })
      .on("broadcast", { event: "game:show-leaderboard" }, ({ payload }) => {
        callbacks.onShowLeaderboard?.(payload as ShowLeaderboardPayload);
      })
      .on("broadcast", { event: "game:finished" }, ({ payload }) => {
        callbacks.onGameFinished?.(payload as GameFinishedPayload);
      })
      .on("presence", { event: "sync" }, () => {
        const state = this.channel?.presenceState() ?? {};
        callbacks.onPresenceSync?.(state as Record<string, unknown[]>);
      });

    this.channel.subscribe();
  }

  /** Track this client's presence in the channel */
  async trackPresence(data: {
    id: string;
    displayName: string;
    isHost?: boolean;
  }): Promise<void> {
    if (!this.channel) return;
    await this.channel.track({
      userId: data.id,
      displayName: data.displayName,
      isHost: data.isHost ?? false,
      joinedAt: new Date().toISOString(),
    });
  }

  // ─── Broadcast Methods (Host sends these) ──────────────

  async broadcastGameStarted(): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:started",
      payload: {},
    });
  }

  async broadcastQuestionRevealed(
    data: QuestionRevealedPayload
  ): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:question-revealed",
      payload: data,
    });
  }

  async broadcastPlayerAnswered(data: PlayerAnsweredPayload): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:player-answered",
      payload: data,
    });
  }

  async broadcastResults(data: QuestionResultsPayload): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:results-shown",
      payload: data,
    });
  }

  async broadcastShowLeaderboard(data: ShowLeaderboardPayload): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:show-leaderboard",
      payload: data,
    });
  }

  async broadcastGameFinished(data: GameFinishedPayload): Promise<void> {
    await this.channel?.send({
      type: "broadcast",
      event: "game:finished",
      payload: data,
    });
  }

  /** Clean up subscription */
  unsubscribe(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
      this.sessionId = "";
    }
  }

  /** Get the current session ID */
  getSessionId(): string {
    return this.sessionId;
  }
}

/** Singleton instance — one manager per app */
export const gameRealtime = new GameRealtimeManager();
