// src/components/quiz/QuizGenerating.tsx

import { useState, useEffect, useMemo } from "react";
import { Loader2, Sparkles, CheckCircle2 } from "lucide-react";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";

interface Props {
  config: QuizConfigFormValues;
}

const PHASES = [
  { label: "Crafting questions", icon: "sparkle" },
  { label: "Polishing results", icon: "check" },
  { label: "Organising rounds", icon: "sparkle" },
] as const;

export function QuizGenerating({ config }: Props) {
  const [elapsed, setElapsed] = useState(0);
  const [activePhase, setActivePhase] = useState(0);

  const totalQuestions = config.numberOfRounds * config.questionsPerRound;
  const estimatedSeconds = Math.round(totalQuestions * 0.8 + 3);

  // Tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through phases
  useEffect(() => {
    const phaseTime = Math.max(3, Math.floor(estimatedSeconds / 3));
    const interval = setInterval(() => {
      setActivePhase((prev) => Math.min(prev + 1, PHASES.length - 1));
    }, phaseTime * 1000);
    return () => clearInterval(interval);
  }, [estimatedSeconds]);

  const remaining = Math.max(0, estimatedSeconds - elapsed);
  const progress = Math.min(100, (elapsed / estimatedSeconds) * 100);

  // Animated topic pills
  const topicPills = useMemo(() => config.topics, [config.topics]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
      <div className="mx-auto w-full max-w-md space-y-8 px-6 text-center">
        {/* Spinner */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Generating your quiz
          </h2>
          <p className="text-sm text-muted-foreground">
            {totalQuestions} questions across {config.numberOfRounds} round
            {config.numberOfRounds !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Topic pills — animate in */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {topicPills.map((topic, i) => (
            <span
              key={topic}
              className="animate-in fade-in slide-in-from-bottom-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
              style={{ animationDelay: `${i * 200}ms`, animationFillMode: "both" }}
            >
              {topic}
            </span>
          ))}
        </div>

        {/* Difficulty badges */}
        <div className="flex items-center justify-center gap-2">
          {config.globalDifficulties.map((d) => (
            <span
              key={d}
              className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700"
            >
              {d}
            </span>
          ))}
          <span className="text-xs text-muted-foreground">
            {config.roundMode === "topic-specific"
              ? "Topic-Specific Rounds"
              : "Mixed Rounds"}
          </span>
        </div>

        {/* Phase indicators */}
        <div className="space-y-2">
          {PHASES.map((phase, i) => (
            <div
              key={phase.label}
              className={`flex items-center justify-center gap-2 text-sm transition-all duration-500 ${
                i < activePhase
                  ? "text-emerald-600"
                  : i === activePhase
                    ? "font-medium text-foreground"
                    : "text-muted-foreground/40"
              }`}
            >
              {i < activePhase ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : i === activePhase ? (
                <Sparkles className="h-4 w-4 animate-pulse text-primary" />
              ) : (
                <span className="h-4 w-4" />
              )}
              {phase.label}
              {i === activePhase && (
                <span className="ml-1 inline-block h-1 w-1 animate-pulse rounded-full bg-primary" />
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-primary transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs tabular-nums text-muted-foreground">
            {remaining > 0
              ? `~${remaining}s remaining`
              : "Almost there..."}
          </p>
        </div>
      </div>
    </div>
  );
}
