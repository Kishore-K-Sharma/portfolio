"use client";

import { useEffect, useState } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";

interface ShareBarProps {
  url: string;
  title: string;
  description?: string;
  /** Compact variant — no eyebrow, tighter spacing. Used at the top of articles. */
  compact?: boolean;
}

export function ShareBar({ url, title, description, compact = false }: ShareBarProps) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const onShare = async () => {
    try {
      await navigator.share({ title, text: description, url });
    } catch {
      // user cancelled — silently no-op
    }
  };

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for older browsers / restrictive contexts.
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand("copy");
      } catch {
        // give up silently
      } finally {
        document.body.removeChild(textarea);
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const buttonClass = compact
    ? "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md border border-subtle/60 font-mono text-[0.72rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
    : "inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md border border-subtle/60 font-mono text-[0.78rem] text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors";

  const wrapperClass = compact ? "mt-8" : "mt-16 pt-8 border-t border-subtle/60";
  const iconSize = compact ? 12 : 14;

  return (
    <div className={wrapperClass}>
      {!compact && (
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground mb-4">
          /share
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canNativeShare && (
          <button
            type="button"
            onClick={onShare}
            className={buttonClass}
            aria-label="Share this post"
          >
            <Share2 size={iconSize} aria-hidden />
            <span>{compact ? "share" : "Share"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onCopy}
          className={buttonClass}
          aria-label="Copy link to clipboard"
          aria-live="polite"
        >
          {copied ? (
            <>
              <Check size={iconSize} aria-hidden className="text-accent" />
              <span className="text-foreground">{compact ? "copied!" : "Copied!"}</span>
            </>
          ) : (
            <>
              <LinkIcon size={iconSize} aria-hidden />
              <span>{compact ? "copy link" : "Copy link"}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
