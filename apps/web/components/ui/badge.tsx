import { HTMLAttributes } from "react";
import { cx } from "./cx";

type Tone = "neutral" | "accent" | "success" | "danger" | "warning";

const tones: Record<Tone, string> = {
  neutral: "border border-border-strong text-ink-muted",
  accent: "bg-accent text-accent-foreground",
  success: "bg-emerald-500/15 text-emerald-300",
  danger: "bg-rose-500/15 text-rose-300",
  warning: "bg-amber-400/15 text-amber-300"
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.06em]",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}
