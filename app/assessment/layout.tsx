import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";

// CHANGE 1: gate the individual classification flow behind client auth, using
// the same server-guard pattern as /client/dashboard (DB-backed sessions can't
// be verified in proxy.ts). /api/classify enforces the same guard server-side.
export default async function AssessmentLayout({ children }: { children: React.ReactNode }) {
  const me = await getClientUserFromCookies();
  if (!me) {
    redirect(`/client/signin?next=${encodeURIComponent("/assessment")}`);
  }
  return <>{children}</>;
}
