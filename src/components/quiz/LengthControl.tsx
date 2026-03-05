// src/components/quiz/LengthControl.tsx

import { useFormContext } from "react-hook-form";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ListOrdered, Layers, Shuffle, AlertCircle } from "lucide-react";
import type { RoundMode } from "@/types/quiz";

export function LengthControl() {
  const { watch, setValue, formState } = useFormContext<QuizConfigFormValues>();

  const numberOfRounds = watch("numberOfRounds");
  const questionsPerRound = watch("questionsPerRound");
  const roundMode = watch("roundMode");

  const totalQuestions = numberOfRounds * questionsPerRound;

  // Check if there's a validation error on numberOfRounds (topic-specific constraint)
  const roundError = formState.errors.numberOfRounds?.message;

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ListOrdered className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Rounds & Questions
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Configure how your quiz is structured
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Round mode toggle */}
        <div className="space-y-3">
          <Label className="text-sm text-muted-foreground">Round Mode</Label>
          <ToggleGroup
            type="single"
            value={roundMode}
            onValueChange={(val) => {
              if (val)
                setValue("roundMode", val as RoundMode, {
                  shouldValidate: true,
                });
            }}
            className="inline-flex rounded-full bg-muted/50 p-1"
          >
            <ToggleGroupItem
              value="topic-specific"
              className="gap-1.5 rounded-full px-5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
            >
              <Layers className="h-4 w-4" />
              Topic-Specific
            </ToggleGroupItem>
            <ToggleGroupItem
              value="mixed"
              className="gap-1.5 rounded-full px-5 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
            >
              <Shuffle className="h-4 w-4" />
              Mixed
            </ToggleGroupItem>
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            {roundMode === "topic-specific"
              ? "Each round focuses on a single topic. Requires at least one round per topic."
              : "Questions from all topics are shuffled across rounds."}
          </p>
        </div>

        {/* Rounds slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              Number of Rounds
            </Label>
            <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
              {numberOfRounds}
            </span>
          </div>
          <Slider
            min={1}
            max={10}
            step={1}
            value={[numberOfRounds]}
            onValueChange={([val]) =>
              setValue("numberOfRounds", val, { shouldValidate: true })
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>10</span>
          </div>
          {roundError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              {roundError}
            </p>
          )}
        </div>

        {/* Questions per round slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm text-muted-foreground">
              Questions per Round
            </Label>
            <span className="rounded-lg bg-primary/10 px-3 py-1 text-sm font-bold tabular-nums text-primary">
              {questionsPerRound}
            </span>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={[questionsPerRound]}
            onValueChange={([val]) =>
              setValue("questionsPerRound", val, { shouldValidate: true })
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        {/* Total badge */}
        <div className="flex items-center justify-center">
          <div className="rounded-full bg-primary/10 px-5 py-2 text-center">
            <span className="text-sm font-bold text-primary">
              {totalQuestions} question{totalQuestions !== 1 ? "s" : ""}
            </span>
            <span className="ml-1.5 text-xs text-primary/70">
              ({numberOfRounds} round{numberOfRounds !== 1 ? "s" : ""} &times;{" "}
              {questionsPerRound} each)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
