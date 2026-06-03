import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Consistent max-width container used across every public section. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)}>{children}</div>;
}

type Surface = "white" | "slate" | "ink";

const surfaces: Record<Surface, string> = {
  white: "bg-white",
  slate: "bg-slate-50",
  ink: "bg-ink text-white",
};

/** A page band with consistent vertical rhythm + surface. */
export function Section({
  children,
  surface = "white",
  bordered = true,
  className,
  id,
}: {
  children: ReactNode;
  surface?: Surface;
  bordered?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "py-16 sm:py-24",
        surfaces[surface],
        bordered && surface !== "ink" && "border-b border-slate-200",
        className
      )}
    >
      {children}
    </section>
  );
}

/** Eyebrow + serif display heading + optional lede — the standard section header. */
export function SectionHeading({
  eyebrow,
  title,
  lede,
  align = "center",
  onDark = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  align?: "center" | "left";
  onDark?: boolean;
}) {
  return (
    <div className={cn("mb-10", align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl")}>
      {eyebrow && (
        <p className={cn("mb-2 text-xs font-bold uppercase tracking-[0.2em]", onDark ? "text-accent-bright" : "text-accent")}>
          {eyebrow}
        </p>
      )}
      <h2
        className={cn(
          "font-display text-3xl font-semibold tracking-tight sm:text-4xl",
          onDark ? "text-white" : "text-ink"
        )}
      >
        {title}
      </h2>
      {lede && <p className={cn("mt-3 text-base leading-7", onDark ? "text-slate-300" : "text-slate-600")}>{lede}</p>}
    </div>
  );
}
