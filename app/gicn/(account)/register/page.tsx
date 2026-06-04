import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import RegisterClient from "./RegisterClient";

export const dynamic = "force-dynamic";

export default async function GicnRegisterPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/register");

  let existing: { kind: string; organizationName: string | null; phone: string | null } | null = null;
  if (db) {
    existing = await db.gicnProfile.findUnique({
      where: { userId: me.id },
      select: { kind: true, organizationName: true, phone: true },
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{existing ? "Your GICN profile" : "Set up your GICN account"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us whether you&apos;re a parent/guardian registering your own children, or a school partner registering students on their behalf.
        </p>
      </div>
      <RegisterClient existing={existing} />
    </div>
  );
}
