// src/components/quiz/DifficultyControl.tsx

import { useFormContext } from "react-hook-form";
import { DIFFICULTIES } from "@/types/quiz";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Gauge, Settings2 } from "lucide-react";
import type { Difficulty } from "@/types/quiz";

export function DifficultyControl() {
  const { watch, setValue } = useFormContext<QuizConfigFormValues>();

  const globalDifficulties = watch("globalDifficulties");
  const usePerTopic = watch("usePerTopicDifficulty");
  const topics = watch("topics") ?? [];
  const overrides = watch("topicDifficultyOverrides") ?? [];

  function setOverrideDifficulties(topic: string, difficulties: Difficulty[]) {
    if (difficulties.length === 0) return; // must keep at least one
    const next = overrides.filter((o) => o.topic !== topic);
    next.push({ topic, difficulties });
    setValue("topicDifficultyOverrides", next, { shouldValidate: true });
  }

  function getOverrideFor(topic: string): Difficulty[] {
    return (
      overrides.find((o) => o.topic === topic)?.difficulties ??
      globalDifficulties
    );
  }

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Gauge className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Difficulty</CardTitle>
            <p className="text-sm text-muted-foreground">
              Select one or more levels — questions will mix across them
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global multi-select toggle */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-muted-foreground">
            Global Level{globalDifficulties.length > 1 ? "s" : ""}
          </Label>
          <ToggleGroup
            type="multiple"
            value={globalDifficulties}
            onValueChange={(val) => {
              if (val.length > 0) {
                setValue("globalDifficulties", val as Difficulty[], {
                  shouldValidate: true,
                });
              }
            }}
            className="inline-flex rounded-full bg-muted/50 p-1"
          >
            {DIFFICULTIES.map((d) => (
              <ToggleGroupItem
                key={d}
                value={d}
                className="rounded-full px-6 text-sm data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
              >
                {d}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Per-topic toggle */}
        {topics.length > 1 && (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="per-topic-toggle"
                checked={usePerTopic}
                onCheckedChange={(checked) => {
                  setValue("usePerTopicDifficulty", checked, {
                    shouldValidate: true,
                  });
                  if (checked) {
                    const seeded = topics.map((t) => ({
                      topic: t,
                      difficulties: [...globalDifficulties],
                    }));
                    setValue("topicDifficultyOverrides", seeded, {
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <Label
                htmlFor="per-topic-toggle"
                className="flex cursor-pointer items-center gap-1.5 text-sm"
              >
                <Settings2 className="h-4 w-4" />
                Advanced: set per topic
              </Label>
            </div>

            {/* Per-topic overrides */}
            {usePerTopic && topics.length > 0 && (
              <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                {topics.map((topic) => {
                  const current = getOverrideFor(topic);
                  return (
                    <div
                      key={topic}
                      className="flex items-center justify-between gap-4"
                    >
                      <span className="text-sm font-medium">{topic}</span>
                      <ToggleGroup
                        type="multiple"
                        value={current}
                        onValueChange={(val) => {
                          if (val.length > 0) {
                            setOverrideDifficulties(topic, val as Difficulty[]);
                          }
                        }}
                        className="inline-flex rounded-full bg-muted/50 p-0.5"
                      >
                        {DIFFICULTIES.map((d) => (
                          <ToggleGroupItem
                            key={d}
                            value={d}
                            className="rounded-full px-3 py-1 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                          >
                            {d}
                          </ToggleGroupItem>
                        ))}
                      </ToggleGroup>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
