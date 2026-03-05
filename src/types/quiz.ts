// src/types/quiz.ts

/** ── Topic Catalogue ── */
export const TOPICS = [
  "General Knowledge",
  "Sport",
  "History",
  "Music",
  "Science & Technology",
  "Geography",
  "Film & TV",
  "Food & Drink",
  "Art & Literature",
] as const;

export type Topic = (typeof TOPICS)[number];

/** ── Per-topic time-period ranges ── */
export const TIME_PERIOD_RANGES: Record<Topic, { min: number; max: number }> = {
  History:                 { min: -3000, max: 2026 },
  "Art & Literature":      { min: 1400,  max: 2026 },
  Music:                   { min: 1600,  max: 2026 },
  "Science & Technology":  { min: 1600,  max: 2026 },
  Geography:               { min: 1800,  max: 2026 },
  "Food & Drink":          { min: 1800,  max: 2026 },
  Sport:                   { min: 1850,  max: 2026 },
  "Film & TV":             { min: 1890,  max: 2026 },
  "General Knowledge":     { min: 1900,  max: 2026 },
};

/**
 * Default starting year for the time period slider.
 * Only topics that need a different default from their min are listed here.
 * Missing topics default to TIME_PERIOD_RANGES[topic].min.
 */
export const TIME_PERIOD_DEFAULTS: Partial<Record<Topic, number>> = {
  Sport:       1990,
  "Film & TV": 1990,
};

/** Format a year number for display (handles BCE) */
export function formatYear(year: number): string {
  if (year < 0) return `${Math.abs(year)} BC`;
  return String(year);
}

/** ── Difficulty Levels ── */
export const DIFFICULTIES = ["Easy", "Medium", "Hard", "Insane"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** ── Round Mode ── */
export type RoundMode = "topic-specific" | "mixed";

/** ── Output Mode ── */
export type OutputMode = "print" | "play";

/** ── Per-topic difficulty override (multi-select) ── */
export interface TopicDifficultyOverride {
  topic: string;
  difficulties: Difficulty[];
}

/** ── Time-period range ── */
export interface TimePeriod {
  from: number;
  to: number;
}

/** ── Per-topic time-period override ── */
export interface TopicTimePeriod {
  topic: string;
  from: number;
  to: number;
}

/** ── Generated Question ── */
export interface GeneratedQuestion {
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  topic: string;
  difficulty: Difficulty;
}

/** ── Generated Round ── */
export interface GeneratedRound {
  roundNumber: number;
  topic?: string;
  questions: GeneratedQuestion[];
}

/** ── Generated Quiz ── */
export interface GeneratedQuiz {
  id: string;
  rounds: GeneratedRound[];
  questions: GeneratedQuestion[];
  config: QuizConfiguration;
  createdAt: string;
}

/**
 * ── QuizConfiguration ──
 * The complete shape of the data the wizard collects.
 */
export interface QuizConfiguration {
  /** Optional quiz name */
  quizName: string;

  /** At least one topic is required (built-in or custom) */
  topics: string[];

  /** Per-topic time periods (optional per topic) */
  topicTimePeriods: TopicTimePeriod[];

  /** Global difficulty levels (multi-select — at least one required) */
  globalDifficulties: Difficulty[];

  /** If true, per-topic overrides are active */
  usePerTopicDifficulty: boolean;

  /** Per-topic overrides (only used when usePerTopicDifficulty is true) */
  topicDifficultyOverrides: TopicDifficultyOverride[];

  /** Number of rounds (1-10) */
  numberOfRounds: number;

  /** Questions per round (1-20) */
  questionsPerRound: number;

  /** Whether rounds are topic-specific or mixed */
  roundMode: RoundMode;

  /** Output format */
  outputMode: OutputMode;

  /** Time per question in seconds for play mode (15, 30, or 60) */
  timePerQuestionSeconds?: number;

  /** Questions to exclude from generation (for deduplication) */
  excludeQuestions?: string[];
}
