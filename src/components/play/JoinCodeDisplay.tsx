// src/components/play/JoinCodeDisplay.tsx
//
// Large, bold display of the 6-character game join code with copy button.

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface JoinCodeDisplayProps {
  code: string;
  /** Optional join URL to show below the code */
  joinUrl?: string;
}

export function JoinCodeDisplay({ code, joinUrl }: JoinCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(joinUrl ?? code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API may not be available
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* The code */}
      <div className="flex items-center gap-1.5">
        {code.split("").map((char, i) => (
          <span
            key={i}
            className="flex h-14 w-11 items-center justify-center rounded-xl bg-primary/10 text-2xl font-black tracking-wider text-primary sm:h-16 sm:w-14 sm:text-3xl"
          >
            {char}
          </span>
        ))}
      </div>

      {/* Copy button */}
      <button
        type="button"
        onClick={handleCopy}
        className="flex items-center gap-1.5 rounded-full bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
      >
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            Copy code
          </>
        )}
      </button>

      {/* URL hint */}
      {joinUrl && (
        <p className="text-center text-xs text-muted-foreground/60">
          or share: <span className="font-medium">{joinUrl}</span>
        </p>
      )}
    </div>
  );
}
