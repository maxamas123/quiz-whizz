// src/components/quiz/TimePeriodSlider.tsx

import { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { TOPICS, TIME_PERIOD_RANGES, TIME_PERIOD_DEFAULTS, formatYear } from "@/types/quiz";
import type { Topic } from "@/types/quiz";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  CalendarRange,
  Trophy,
  Music,
  Landmark,
  BookOpen,
  FlaskConical,
  Globe,
  Film,
  UtensilsCrossed,
  Palette,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TOPIC_ICON: Record<string, LucideIcon> = {
  "General Knowledge": BookOpen,
  Sport: Trophy,
  History: Landmark,
  Music: Music,
  "Science & Technology": FlaskConical,
  Geography: Globe,
  "Film & TV": Film,
  "Food & Drink": UtensilsCrossed,
  "Art & Literature": Palette,
};

export function TimePeriodSlider() {
  const { watch, setValue } = useFormContext<QuizConfigFormValues>();
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const topics = watch("topics") ?? [];
  const topicTimePeriods = watch("topicTimePeriods") ?? [];

  // Auto-populate time periods for ALL newly selected topics.
  // Topics with custom defaults (Sport, Film & TV) get their overridden start year;
  // other topics get the full range. This ensures form state always has explicit entries.
  useEffect(() => {
    const current = topicTimePeriods;
    const additions: { topic: string; from: number; to: number }[] = [];

    for (const topic of topics) {
      const tpKey = topic as Topic;
      const ranges = TIME_PERIOD_RANGES[tpKey];
      if (!ranges) continue; // custom topic — no time range
      if (current.some((tp) => tp.topic === topic)) continue; // already set

      const defaultFrom = TIME_PERIOD_DEFAULTS[tpKey] ?? ranges.min;
      additions.push({ topic, from: defaultFrom, to: ranges.max });
    }

    if (additions.length > 0) {
      setValue("topicTimePeriods", [...current, ...additions], {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [topics.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  if (topics.length === 0) return null;

  function getRange(topic: Topic) {
    const entry = topicTimePeriods.find((tp) => tp.topic === topic);
    const defaults = TIME_PERIOD_RANGES[topic as Topic];
    if (!defaults) return null;
    if (entry) return { from: entry.from, to: entry.to };
    // Use custom default start if specified, otherwise the full range min
    const defaultFrom = TIME_PERIOD_DEFAULTS[topic as Topic] ?? defaults.min;
    return { from: defaultFrom, to: defaults.max };
  }

  function setRange(topic: string, from: number, to: number) {
    const next = topicTimePeriods.filter((tp) => tp.topic !== topic);
    next.push({ topic, from, to });
    setValue("topicTimePeriods", next, { shouldValidate: true });
  }

  function isCustomised(topic: Topic) {
    const range = getRange(topic);
    if (!range) return false;
    const defaults = TIME_PERIOD_RANGES[topic as Topic];
    if (!defaults) return false;
    const defaultFrom = TIME_PERIOD_DEFAULTS[topic as Topic] ?? defaults.min;
    return range.from !== defaultFrom || range.to !== defaults.max;
  }

  function toggleTopic(topic: string) {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topic)) next.delete(topic);
      else next.add(topic);
      return next;
    });
  }

  // Render topics in canonical TOPICS order, not selection order
  const orderedTopics = TOPICS.filter((t) => topics.includes(t));

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <CalendarRange className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base font-semibold">
              Time Period
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Narrow the era for each topic
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-1.5 pt-0">
        {orderedTopics.map((topic) => {
          const Icon = TOPIC_ICON[topic] ?? CalendarRange;
          const range = getRange(topic);
          const bounds = TIME_PERIOD_RANGES[topic];
          if (!range || !bounds) return null; // skip custom topics without time ranges
          const isExpanded = expandedTopics.has(topic);
          const customised = isCustomised(topic);

          return (
            <div key={topic}>
              {/* Collapsed row — always visible */}
              <button
                type="button"
                onClick={() => toggleTopic(topic)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-muted/40"
              >
                <Icon className="h-4 w-4 text-primary" />
                <span className="flex-1 text-sm font-medium">{topic}</span>
                {/* Always show the current range pill */}
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    customised
                      ? "bg-primary/10 text-primary"
                      : "bg-muted/60 text-muted-foreground"
                  }`}
                >
                  {formatYear(range.from)} – {formatYear(range.to)}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Expanded slider */}
              {isExpanded && (
                <div className="mx-3 mb-2 rounded-xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground/70">
                      Full range: {formatYear(bounds.min)} – {formatYear(bounds.max)}
                    </span>
                  </div>
                  <Slider
                    min={bounds.min}
                    max={bounds.max}
                    step={topic === "History" ? 10 : 1}
                    value={[range.from, range.to]}
                    onValueChange={([from, to]) =>
                      setRange(topic, from, to)
                    }
                    className="w-full"
                  />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="rounded-lg bg-white px-3 py-1 font-semibold tabular-nums shadow-sm">
                      {formatYear(range.from)}
                    </span>
                    <span className="text-xs text-muted-foreground">to</span>
                    <span className="rounded-lg bg-white px-3 py-1 font-semibold tabular-nums shadow-sm">
                      {formatYear(range.to)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
