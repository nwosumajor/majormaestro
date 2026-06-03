import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "ink" | "outline" | "outlineLight" | "ghost";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  // emerald = money / recovery — the single highest-intent action
  primary:
    "bg-accent text-white shadow-lg shadow-emerald-900/20 hover:bg-accent-bright hover:-translate-y-0.5 active:translate-y-0",
  ink: "bg-ink text-white shadow-sm hover:bg-ink-700 hover:-translate-y-0.5 active:translate-y-0",
  outline:
    "border border-slate-300 bg-white text-ink shadow-sm hover:border-ink hover:bg-slate-50",
  outlineLight:
    "border border-white/25 bg-white/5 text-white backdrop-blur-sm hover:bg-white/15",
  ghost: "text-ink hover:bg-slate-100",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-sm sm:text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type ButtonAsButton = CommonProps & Omit<ComponentProps<"button">, "className" | "children"> & { href?: undefined };
type ButtonAsLink = CommonProps & { href: string; external?: boolean } & Omit<ComponentProps<"a">, "href" | "className" | "children">;

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], className);

  if ("href" in props && props.href) {
    const { href, external, variant: _v, size: _s, className: _c, children: _ch, ...rest } = props;
    if (external) {
      return (
        <a href={href} className={classes} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, className: _c, children: _ch, ...rest } = props as ButtonAsButton;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
