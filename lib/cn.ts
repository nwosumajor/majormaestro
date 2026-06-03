/** Tiny classNames joiner — filters falsy values. No runtime deps. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
