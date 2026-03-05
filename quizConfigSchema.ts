// src/schemas/quizConfigSchema.ts

import { z } from "zod";
import { DIFFICULTIES, TIME_PERIOD_RANGES } from "@/types/quiz";

/** Reusable enum schemas derived from the const arrays */
const topicString = z.string().min(1, "Topic name is required");
const difficultyEnum = z.enum(DIFFICULTIES);

/** Per-topic difficulty override (multi-select) */
const topicDifficultyOverrideSchema = z.object({
  topic: topicString,
  difficulties: z.array(difficultyEnum).min(1, "Select at least one difficulty"),
});

/** Per-topic time-period entry — dynamic min/max validated in superRefine */
const topicTimePeriodSchema = z.object({
  topic: topicString,
  from: z.number().int(),
  to: z.number().int(),
});

/**
 * ── QuizConfigurationSchema ──
 * Full Zod schema that validates the wizard form state.
 */
export const quizConfigSchema = z
  .object({
    quizName: z.string(),

    topics: z
      .array(topicString)
      .min(1, "Select at least one topic"),

    topicTimePeriods: z.array(topicTimePeriodSchema),

    globalDifficulties: z
      .array(difficultyEnum)
      .min(1, "Select at least one difficulty"),

    usePerTopicDifficulty: z.boolean(),

    topicDifficultyOverrides: z.array(topicDifficultyOverrideSchema),

    numberOfRounds: z
      .number()
      .int()
      .min(1, "Minimum 1 round")
      .max(10, "Maximum 10 rounds"),

    questionsPerRound: z
      .number()
      .int()
      .min(1, "Minimum 1 question per round")
      .max(20, "Maximum 20 questions per round"),

    roundMode: z.enum(["topic-specific", "mixed"]),

    outputMode: z.enum(["print", "play"]),

    timePerQuestionSeconds: z.number().int().default(30),
  })
  .superRefine((data, ctx) => {
    // When per-topic difficulty is on, every selected topic must have an override with at least one difficulty
    if (data.usePerTopicDifficulty) {
      const overriddenTopics = new Set(
        data.topicDifficultyOverrides.map((o) => o.topic)
      );
      for (const topic of data.topics) {
        if (!overriddenTopics.has(topic)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["topicDifficultyOverrides"],
            message: `Missing difficulty override for "${topic}"`,
          });
        }
      }
    }

    // Topic-specific mode requires at least as many rounds as topics
    if (
      data.roundMode === "topic-specific" &&
      data.numberOfRounds < data.topics.length
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["numberOfRounds"],
        message: `Topic-specific mode requires at least ${data.topics.length} round(s) — one per topic`,
      });
    }

    // Validate per-topic time period ranges (only for built-in topics with known ranges)
    for (const tp of data.topicTimePeriods) {
      if (tp.from > tp.to) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["topicTimePeriods"],
          message: `"${tp.topic}" start year must be ≤ end year`,
        });
      }
      const range = TIME_PERIOD_RANGES[tp.topic as keyof typeof TIME_PERIOD_RANGES];
      if (range) {
        if (tp.from < range.min || tp.to > range.max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["topicTimePeriods"],
            message: `"${tp.topic}" time period must be within ${range.min}–${range.max}`,
          });
        }
      }
    }
  });

export type QuizConfigFormValues = z.infer<typeof quizConfigSchema>;
