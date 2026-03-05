// src/components/quiz/OutputModeSelector.tsx

import { useFormContext } from "react-hook-form";
import type { QuizConfigFormValues } from "@/schemas/quizConfigSchema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Printer, Gamepad2, Monitor } from "lucide-react";

export function OutputModeSelector() {
  const { watch, setValue } = useFormContext<QuizConfigFormValues>();
  const outputMode = watch("outputMode");

  return (
    <Card className="overflow-hidden border-none bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Monitor className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">
              Output Mode
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              How should the quiz be presented?
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {/* Print mode */}
          <button
            type="button"
            onClick={() =>
              setValue("outputMode", "print", { shouldValidate: true })
            }
            className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
              outputMode === "print"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-transparent bg-muted/30 hover:bg-muted/60 hover:shadow-sm"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                outputMode === "print" ? "bg-primary/15" : "bg-muted/60"
              }`}
            >
              <Printer
                className={`h-6 w-6 ${
                  outputMode === "print"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  outputMode === "print"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Print Mode
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                View, toggle answers & print
              </p>
            </div>
          </button>

          {/* Play mode */}
          <button
            type="button"
            onClick={() =>
              setValue("outputMode", "play", { shouldValidate: true })
            }
            className={`flex flex-col items-center gap-3 rounded-2xl border-2 p-5 text-center transition-all duration-200 ${
              outputMode === "play"
                ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                : "border-transparent bg-muted/30 hover:bg-muted/60 hover:shadow-sm"
            }`}
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors ${
                outputMode === "play" ? "bg-primary/15" : "bg-muted/60"
              }`}
            >
              <Gamepad2
                className={`h-6 w-6 ${
                  outputMode === "play"
                    ? "text-primary"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <p
                className={`text-sm font-semibold ${
                  outputMode === "play"
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                Play Mode
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Live multiplayer on mobile
              </p>
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
