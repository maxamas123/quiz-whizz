// src/components/play/GameTimer.tsx
//
// Countdown timer bar synced to a server-provided end timestamp.
// Ticks down locally via setInterval for smooth animation.

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/gameStore";

interface GameTimerProps {
  /** Total time in seconds for this question */
  totalSeconds: number;
  /** Whether to show the large seconds number */
  showNumber?: boolean;
  /** Size variant */
  size?: "sm" | "lg";
}

export function GameTimer({
  totalSeconds,
  showNumber = true,
  size = "lg",
}: GameTimerProps) {
  const countdownEndTimestamp = useGameStore((s) => s.countdownEndTimestamp);
  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const setTimeRemaining = useGameStore((s) => s.setTimeRemaining);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!countdownEndTimestamp) {
      setTimeRemaining(0);
      return;
    }

    function tick() {
      const now = Date.now();
      const remaining = Math.max(
        0,
        Math.ceil((countdownEndTimestamp! - now) / 1000)
      );
      setTimeRemaining(remaining);

      if (remaining <= 0 && intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    tick(); // initial tick
    intervalRef.current = setInterval(tick, 250); // tick every 250ms for smooth updates

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [countdownEndTimestamp, setTimeRemaining]);

  const fraction = totalSeconds > 0 ? timeRemaining / totalSeconds : 0;

  // Color transitions: green → yellow → red
  let barColor = "bg-emerald-500";
  let textColor = "text-emerald-600";
  if (fraction <= 0.25) {
    barColor = "bg-rose-500";
    textColor = "text-rose-600";
  } else if (fraction <= 0.5) {
    barColor = "bg-amber-500";
    textColor = "text-amber-600";
  }

  const barHeight = size === "lg" ? "h-3" : "h-1.5";

  return (
    <div className="w-full space-y-2">
      {showNumber && (
        <div className="text-center">
          <span
            className={`text-4xl font-black tabular-nums ${textColor} transition-colors`}
          >
            {timeRemaining}
          </span>
        </div>
      )}
      <div className={`w-full overflow-hidden rounded-full bg-muted/30 ${barHeight}`}>
        <div
          className={`${barHeight} rounded-full ${barColor} transition-all duration-300 ease-linear`}
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
    </div>
  );
}
