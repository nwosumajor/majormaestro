import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "ink" | "light" | "neutral" | "warning";

const tones: Record<Tone, string> = {
  accent: "border-emerald-300 bg-accent-soft text-emerald-800",
  ink: "border-ink/15 bg-slate-100 text-ink",
  light: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  neutral: "border-slate-200 bg-white text-slate-600",
  warning: "border-amber-300 bg-amber-50 text-amber-800",
};

export default function Badge({
  tone = "accent",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
