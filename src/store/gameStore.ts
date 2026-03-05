// src/store/gameStore.ts
//
// Zustand store for multiplayer Play Mode state.

import { create } from "zustand";
import type {
  GameSession,
  GamePlayer,
  GamePhase,
  LeaderboardEntry,
  PlayerQuestionResult,
} from "@/types/gameSession";
import type { GeneratedQuestion } from "@/types/quiz";

interface GameStore {
  // ── Session ──
  gameSession: GameSession | null;
  gamePlayers: GamePlayer[];
  isHost: boolean;
  currentPlayer: GamePlayer | null;

  // ── Game Phase ──
  phase: GamePhase;

  // ── Question State ──
  currentQuestion: GeneratedQuestion | null;
  currentQuestionIndex: number;
  totalQuestions: number;
  countdownEndTimestamp: number | null; // Unix ms
  timeRemaining: number; // seconds — ticked down locally
  selectedAnswer: string | null;
  isAnswered: boolean;
  answeredCount: number; // how many players have answered this question

  // ── Results ──
  questionResults: PlayerQuestionResult[];
  correctAnswer: string | null;
  explanation: string | null;
  leaderboard: LeaderboardEntry[];
  finalLeaderboard: LeaderboardEntry[];

  // ── UI State ──
  isJoining: boolean;
  joinError: string | null;

  // ── Actions ──
  setGameSession: (session: GameSession) => void;
  setGamePlayers: (players: GamePlayer[]) => void;
  addGamePlayer: (player: GamePlayer) => void;
  removeGamePlayer: (playerId: string) => void;
  setIsHost: (isHost: boolean) => void;
  setCurrentPlayer: (player: GamePlayer) => void;
  setPhase: (phase: GamePhase) => void;

  setCurrentQuestion: (q: GeneratedQuestion | null) => void;
  setCurrentQuestionIndex: (idx: number) => void;
  setTotalQuestions: (total: number) => void;
  setCountdownEndTimestamp: (ts: number | null) => void;
  setTimeRemaining: (seconds: number) => void;
  selectAnswer: (letter: string) => void;
  markAnswered: () => void;
  incrementAnsweredCount: () => void;
  resetAnsweredCount: () => void;

  setQuestionResults: (results: PlayerQuestionResult[]) => void;
  setCorrectAnswer: (answer: string | null) => void;
  setExplanation: (explanation: string | null) => void;
  setLeaderboard: (board: LeaderboardEntry[]) => void;
  setFinalLeaderboard: (board: LeaderboardEntry[]) => void;

  setIsJoining: (val: boolean) => void;
  setJoinError: (err: string | null) => void;

  /** Reset question-level state for the next question */
  resetForNextQuestion: () => void;

  /** Clear everything */
  clearGameState: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  gameSession: null,
  gamePlayers: [],
  isHost: false,
  currentPlayer: null,
  phase: "lobby",
  currentQuestion: null,
  currentQuestionIndex: -1,
  totalQuestions: 0,
  countdownEndTimestamp: null,
  timeRemaining: 0,
  selectedAnswer: null,
  isAnswered: false,
  answeredCount: 0,
  questionResults: [],
  correctAnswer: null,
  explanation: null,
  leaderboard: [],
  finalLeaderboard: [],
  isJoining: false,
  joinError: null,

  // Actions
  setGameSession: (session) => set({ gameSession: session }),
  setGamePlayers: (players) => set({ gamePlayers: players }),
  addGamePlayer: (player) =>
    set((s) => ({
      gamePlayers: [...s.gamePlayers.filter((p) => p.id !== player.id), player],
    })),
  removeGamePlayer: (playerId) =>
    set((s) => ({
      gamePlayers: s.gamePlayers.filter((p) => p.id !== playerId),
    })),
  setIsHost: (isHost) => set({ isHost }),
  setCurrentPlayer: (player) => set({ currentPlayer: player }),
  setPhase: (phase) => set({ phase }),

  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setCurrentQuestionIndex: (idx) => set({ currentQuestionIndex: idx }),
  setTotalQuestions: (total) => set({ totalQuestions: total }),
  setCountdownEndTimestamp: (ts) => set({ countdownEndTimestamp: ts }),
  setTimeRemaining: (seconds) => set({ timeRemaining: seconds }),
  selectAnswer: (letter) =>
    set((s) => {
      if (s.isAnswered || s.timeRemaining <= 0) return s;
      return { selectedAnswer: letter };
    }),
  markAnswered: () => set({ isAnswered: true }),
  incrementAnsweredCount: () =>
    set((s) => ({ answeredCount: s.answeredCount + 1 })),
  resetAnsweredCount: () => set({ answeredCount: 0 }),

  setQuestionResults: (results) => set({ questionResults: results }),
  setCorrectAnswer: (answer) => set({ correctAnswer: answer }),
  setExplanation: (explanation) => set({ explanation }),
  setLeaderboard: (board) => set({ leaderboard: board }),
  setFinalLeaderboard: (board) => set({ finalLeaderboard: board }),

  setIsJoining: (val) => set({ isJoining: val }),
  setJoinError: (err) => set({ joinError: err }),

  resetForNextQuestion: () =>
    set({
      currentQuestion: null,
      selectedAnswer: null,
      isAnswered: false,
      answeredCount: 0,
      questionResults: [],
      correctAnswer: null,
      explanation: null,
      countdownEndTimestamp: null,
      timeRemaining: 0,
    }),

  clearGameState: () =>
    set({
      gameSession: null,
      gamePlayers: [],
      isHost: false,
      currentPlayer: null,
      phase: "lobby",
      currentQuestion: null,
      currentQuestionIndex: -1,
      totalQuestions: 0,
      countdownEndTimestamp: null,
      timeRemaining: 0,
      selectedAnswer: null,
      isAnswered: false,
      answeredCount: 0,
      questionResults: [],
      correctAnswer: null,
      explanation: null,
      leaderboard: [],
      finalLeaderboard: [],
      isJoining: false,
      joinError: null,
    }),
}));
