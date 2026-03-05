// src/components/quiz/PurchaseModal.tsx

import { useState } from "react";
import { createCheckoutSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Sparkles, CreditCard, Loader2 } from "lucide-react";

interface PurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCredits: number;
}

export function PurchaseModal({
  open,
  onOpenChange,
  currentCredits,
}: PurchaseModalProps) {
  const [quizCount, setQuizCount] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pricePounds = quizCount; // £1 per quiz

  async function handlePurchase() {
    setIsLoading(true);
    setError(null);
    try {
      const url = await createCheckoutSession(quizCount);
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start checkout");
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Get More Quiz Credits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Current credits */}
          <div className="rounded-xl bg-muted/30 px-4 py-3 text-center">
            <p className="text-sm text-muted-foreground">
              You have{" "}
              <span className="font-bold text-foreground">
                {currentCredits}
              </span>{" "}
              credit{currentCredits !== 1 ? "s" : ""} remaining
            </p>
          </div>

          {/* Quiz count slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                Quiz Credits
              </label>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                {quizCount}
              </span>
            </div>
            <Slider
              min={2}
              max={20}
              step={1}
              value={[quizCount]}
              onValueChange={([val]) => setQuizCount(val)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>2</span>
              <span>20</span>
            </div>
          </div>

          {/* Price display */}
          <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 p-5 text-center">
            <p className="text-sm text-muted-foreground">Total price</p>
            <p className="mt-1 text-4xl font-extrabold text-foreground">
              £{pricePounds}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              £1 per quiz credit
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          {/* Buy button */}
          <Button
            size="lg"
            className="w-full gap-2 rounded-full text-base"
            onClick={handlePurchase}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CreditCard className="h-5 w-5" />
            )}
            {isLoading ? "Redirecting to Stripe..." : `Buy ${quizCount} Credits for £${pricePounds}`}
          </Button>

          <p className="text-center text-[11px] text-muted-foreground">
            Secure payment powered by Stripe. Credits never expire.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
