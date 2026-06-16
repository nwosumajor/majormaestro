import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import { GICN_AGREEMENTS } from "@/lib/policies/gicnAgreements";
import RegisterClient from "./RegisterClient";

export const dynamic = "force-dynamic";

export default async function GicnRegisterPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/register");

  let existing: Record<string, string | null> | null = null;
  let agreementsAccepted = false;
  if (db) {
    existing = await db.gicnProfile.findUnique({
      where: { userId: me.id },
      select: {
        kind: true, organizationName: true, phone: true, fullName: true, relationshipToChild: true,
        contactPersonName: true, contactPersonRole: true, contactEmail: true,
        safeguardingLeadName: true, safeguardingLeadContact: true,
        addressLine: true, city: true, state: true, country: true,
      },
    });
    const acc = await db.gicnAgreementAcceptance.findFirst({
      where: { userId: me.id, bundleVersion: GICN_AGREEMENTS.version },
      select: { id: true },
    });
    agreementsAccepted = !!acc;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{existing ? "Your GICN profile" : "Register with GICN"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Tell us whether you&apos;re a parent/guardian registering your own children, or a school partner registering students on their behalf, and complete your formal registration.
        </p>
      </div>
      <RegisterClient existing={existing} agreementsAccepted={agreementsAccepted} />
    </div>
  );
}
