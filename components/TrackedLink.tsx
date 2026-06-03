"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { track, type FunnelEvent } from "@/lib/analytics";

/**
 * A Button/link that fires a funnel event on click. Lets server components
 * (which can't pass onClick handlers) keep CTA analytics.
 */
export default function TrackedLink({
  href,
  event,
  label,
  variant,
  size,
  external,
  className,
  children,
}: {
  href: string;
  event: FunnelEvent;
  label: string;
  variant?: "primary" | "ink" | "outline" | "outlineLight" | "ghost";
  size?: "sm" | "md" | "lg";
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Button
      href={href}
      external={external}
      variant={variant}
      size={size}
      className={className}
      onClick={() => track(event, { label })}
    >
      {children}
    </Button>
  );
}
