// src/components/quiz/TimePerQuestionControl.tsx
//
// Timer configuration for Play mode — lets host set seconds per question.
// Only visible when outputMode === "play".

import { useFormContext } from "react-hook-form";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Timer } from "lucide-react";

const TIME_OPTIONS = [
  { seconds: 15, label: "15s", description: "Fast" },
  { seconds: 30, label: "30s", description: "Standard" },
  { seconds: 60, label: "60s", description: "Relaxed" },
] as const;

export function TimePerQuestionControl() {
  const { watch, setValue } = useFormContext<QuizConfigFormValues>();
  const outputMode = watch("outputMode");
  const timePerQuestion = watch("timePerQuestionSeconds") ?? 30;

  // Only show for play mode
  if (outputMode !== "play") return null;

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Timer className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Time Per Question
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How long do players have to answer each question?
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {TIME_OPTIONS.map(({ seconds, label, description }) => (
            <button
              key={seconds}
              type="button"
              onClick={() =>
                setValue("timePerQuestionSeconds", seconds, {
                  shouldValidate: true,
                })
              }
              className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 transition-all duration-200 ${
                timePerQuestion === seconds
                  ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                  : "border-transparent bg-muted/30 hover:bg-muted/60 hover:shadow-sm"
              }`}
            >
              <span
                className={`text-lg font-bold ${
                  timePerQuestion === seconds
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
              <span className="text-xs text-muted-foreground">
                {description}
              </span>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
