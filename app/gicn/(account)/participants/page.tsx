import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import ParticipantsClient from "./ParticipantsClient";

export const dynamic = "force-dynamic";

export default async function GicnParticipantsPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/participants");
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const profile = await db.gicnProfile.findUnique({ where: { userId: me.id }, select: { kind: true } });
  if (!profile) redirect("/gicn/register");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">{profile.kind === "school" ? "Students" : "Your children"}</h1>
        <p className="mt-1 text-sm text-slate-500">
          Each record is a dependent participant under your account. You grant consent on their behalf as the responsible adult.
        </p>
      </div>
      <ParticipantsClient isSchool={profile.kind === "school"} />
    </div>
  );
}
