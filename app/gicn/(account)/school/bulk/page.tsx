import { redirect } from "next/navigation";
import { getClientUserFromCookies } from "@/lib/auth";
import { db } from "@/lib/db";
import BulkUploadClient from "./BulkUploadClient";

export const dynamic = "force-dynamic";

export default async function GicnBulkPage() {
  const me = await getClientUserFromCookies();
  if (!me) redirect("/client/signin?next=/gicn/school/bulk");
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  const profile = await db.gicnProfile.findUnique({ where: { userId: me.id }, select: { kind: true } });
  if (!profile) redirect("/gicn/register");
  if (profile.kind !== "school") redirect("/gicn/dashboard");

  const programs = await db.program.findMany({
    where: { status: "OPEN" },
    orderBy: { startsAt: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">Bulk register students</h1>
        <p className="mt-1 text-sm text-slate-500">
          Upload a spreadsheet of students to register them into an open programme. Each row must carry explicit
          guardian consent (<code className="rounded bg-slate-100 px-1">guardianConsent = yes</code>) — rows without it
          are rejected, not registered.
        </p>
      </div>
      <BulkUploadClient programs={programs} />
    </div>
  );
}
