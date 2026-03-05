// src/types/gameSession.ts

import type { QuizConfiguration } from "@/types/quiz";

/** ── Game Session Status ── */
export type GameSessionStatus = "waiting" | "in_progress" | "finished";

/** ── Game Phase (client-side UI state) ── */
export type GamePhase = "lobby" | "question" | "results" | "leaderboard" | "finished";

/** ── Game Session ── */
export interface GameSession {
  id: string;
  quizId: string;
  hostUserId: string;
  joinCode: string;
  status: GameSessionStatus;
  currentQuestionIndex: number; // -1 = lobby
  timePerQuestionSeconds: number;
  totalPlayersConnected: number;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  quizConfig?: QuizConfiguration;
  quizName?: string;
}

/** ── Game Player ── */
export interface GamePlayer {
  id: string;
  gameSessionId: string;
  userId: string | null; // null for anonymous players
  displayName: string;
  joinOrder: number;
  totalScore: number;
  createdAt: string;
}

/** ── Game Response ── */
export interface GameResponse {
  id: string;
  gameSessionId: string;
  gamePlayerId: string;
  questionIndex: number;
  selectedAnswer: string; // "A", "B", "C", "D"
  isCorrect: boolean;
  responseTimeMs: number | null;
  pointsAwarded: number;
  createdAt: string;
}

/** ── Leaderboard Entry ── */
export interface LeaderboardEntry {
  playerId: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

/** ── Question Result (per-player) ── */
export interface PlayerQuestionResult {
  playerId: string;
  displayName: string;
  answer: string;
  isCorrect: boolean;
  responseTimeMs: number;
  pointsAwarded: number;
}

// ─── Realtime Broadcast Event Payloads ────────────────

/** Sent when host reveals the next question */
export interface QuestionRevealedPayload {
  questionIndex: number;
  question: {
    questionText: string;
    options: string[];
    topic: string;
    difficulty: string;
  };
  countdownEndTimestamp: number; // Unix ms — all clients compute local timer from this
  totalQuestions: number;
}

/** Sent when a player submits an answer (broadcast to all so host can count) */
export interface PlayerAnsweredPayload {
  playerId: string;
  displayName: string;
  questionIndex: number;
}

/** Sent when host reveals results for a question */
export interface QuestionResultsPayload {
  questionIndex: number;
  correctAnswer: string;
  explanation: string;
  playerResults: PlayerQuestionResult[];
  leaderboard: LeaderboardEntry[];
}

/** Sent when the game is finished */
export interface GameFinishedPayload {
  finalLeaderboard: LeaderboardEntry[];
}

/** Sent when host advances to leaderboard view between questions */
export interface ShowLeaderboardPayload {
  leaderboard: LeaderboardEntry[];
  nextQuestionIndex: number; // -1 if this was the last question
}
