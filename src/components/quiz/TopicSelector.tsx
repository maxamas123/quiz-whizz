// src/components/quiz/TopicSelector.tsx

import { useState, useRef } from "react";
import { useFormContext } from "react-hook-form";
import { TOPICS } from "@/types/quiz";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  BookOpen,
  Trophy,
  Landmark,
  Music,
  FlaskConical,
  Globe,
  Film,
  UtensilsCrossed,
  Palette,
  LayoutGrid,
  Plus,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const TOPIC_ICONS: Record<string, LucideIcon> = {
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

export function TopicSelector() {
  const {
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<QuizConfigFormValues>();

  const selectedTopics = watch("topics") ?? [];
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const customInputRef = useRef<HTMLInputElement>(null);

  // Separate built-in and custom topics
  const builtInTopics = TOPICS as readonly string[];
  const customTopics = selectedTopics.filter((t) => !builtInTopics.includes(t));

  function toggleTopic(topic: string) {
    const current = selectedTopics;
    const next = current.includes(topic)
      ? current.filter((t) => t !== topic)
      : [...current, topic];
    setValue("topics", next, { shouldValidate: true });
  }

  /** Capitalise each word: "serial killers" → "Serial Killers" */
  function titleCase(str: string): string {
    return str.replace(
      /\b\w+/g,
      (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    );
  }

  function addCustomTopic() {
    const trimmed = customValue.trim();
    if (!trimmed) return;
    const capitalised = titleCase(trimmed);
    // Don't add duplicates (case-insensitive check)
    const exists = selectedTopics.some(
      (t) => t.toLowerCase() === capitalised.toLowerCase()
    );
    if (exists) {
      setCustomValue("");
      return;
    }
    setValue("topics", [...selectedTopics, capitalised], { shouldValidate: true });
    setCustomValue("");
  }

  function removeCustomTopic(topic: string) {
    setValue(
      "topics",
      selectedTopics.filter((t) => t !== topic),
      { shouldValidate: true }
    );
  }

  function handleCustomKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomTopic();
    } else if (e.key === "Escape") {
      setShowCustomInput(false);
      setCustomValue("");
    }
  }

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <LayoutGrid className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Topics</CardTitle>
            <p className="text-sm text-muted-foreground">
              Choose one or more quiz categories
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {TOPICS.map((topic) => {
            const Icon = TOPIC_ICONS[topic] ?? BookOpen;
            const isSelected = selectedTopics.includes(topic);

            return (
              <Label
                key={topic}
                htmlFor={`topic-${topic}`}
                className={`
                  flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4
                  text-center transition-all duration-200 select-none
                  ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                      : "border-transparent bg-muted/30 hover:bg-muted/60 hover:shadow-sm"
                  }
                `}
              >
                <Checkbox
                  id={`topic-${topic}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleTopic(topic)}
                  className="sr-only"
                />
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isSelected ? "bg-primary/15" : "bg-muted/60"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <span
                  className={`text-xs font-medium leading-tight ${
                    isSelected ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {topic}
                </span>
              </Label>
            );
          })}

          {/* Custom topic card */}
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(true);
              setTimeout(() => customInputRef.current?.focus(), 50);
            }}
            className="flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-border/60 p-4 text-center transition-all duration-200 select-none hover:border-primary/40 hover:bg-muted/30"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/60">
              <Plus className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-xs font-medium leading-tight text-muted-foreground">
              Custom Topic
            </span>
          </button>
        </div>

        {/* Custom topic input */}
        {showCustomInput && (
          <div className="mt-3 flex items-center gap-2">
            <input
              ref={customInputRef}
              type="text"
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              onKeyDown={handleCustomKeyDown}
              placeholder="Type a topic name and press Enter"
              className="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <button
              type="button"
              onClick={addCustomTopic}
              disabled={!customValue.trim()}
              className="shrink-0 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => { setShowCustomInput(false); setCustomValue(""); }}
              className="shrink-0 rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Custom topic pills */}
        {customTopics.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {customTopics.map((topic) => (
              <span
                key={topic}
                className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
              >
                {topic}
                <button
                  type="button"
                  onClick={() => removeCustomTopic(topic)}
                  className="rounded-full p-0.5 transition-colors hover:bg-primary/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {errors.topics && (
          <p className="mt-3 text-sm text-destructive">
            {errors.topics.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
