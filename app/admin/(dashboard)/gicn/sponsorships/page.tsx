import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HeartHandshake } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import SponsorshipsAdmin from "./SponsorshipsAdmin";

export const dynamic = "force-dynamic";

export default async function AdminGicnSponsorshipsPage() {
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "gicn.manage")) redirect("/admin");

  const sponsorships = await db.sponsorship.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, sponsorName: true, sponsorEmail: true, amountKobo: true, status: true, createdAt: true,
      program: { select: { title: true } },
    },
  });

  const totals = sponsorships.reduce(
    (acc, s) => {
      const ngn = Number(s.amountKobo) / 100;
      acc.pledged += ngn;
      if (s.status === "paid") acc.paid += ngn;
      return acc;
    },
    { pledged: 0, paid: 0 }
  );

  const rows = sponsorships.map((s) => ({
    id: s.id,
    sponsorName: s.sponsorName,
    sponsorEmail: s.sponsorEmail,
    amountNgn: Number(s.amountKobo) / 100,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    programTitle: s.program?.title ?? null,
  }));

  return (
    <div className="space-y-6">
      <Link href="/admin/gicn" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> GICN
      </Link>

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><HeartHandshake size={20} /></div>
        <div>
          <h1 className="text-xl font-black text-slate-900">Sponsorship ledger</h1>
          <p className="text-xs text-slate-500">
            ₦{totals.paid.toLocaleString("en-NG")} paid of ₦{totals.pledged.toLocaleString("en-NG")} pledged · {sponsorships.length} record{sponsorships.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <SponsorshipsAdmin rows={rows} />
    </div>
  );
}
