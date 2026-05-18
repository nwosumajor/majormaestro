import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ArrowLeft, UserCircle, ShieldAlert } from "lucide-react";
import { db } from "@/lib/db";
import { getClientUserFromCookies } from "@/lib/auth";
import AccountForms from "./AccountForms";
import EmailChangePanel from "./EmailChangePanel";
import ConnectionsPanel from "./ConnectionsPanel";
import SessionsPanel from "./SessionsPanel";

export const dynamic = "force-dynamic";

export default async function ClientAccountPage() {
  const me = await getClientUserFromCookies();
  if (!me) {
    redirect(`/client/signin?next=${encodeURIComponent("/client/account")}`);
  }
  if (!db) return <p className="p-12 text-center text-sm text-red-700">Database not configured.</p>;

  const user = await db.user.findUnique({
    where: { id: me.id },
    select: {
      id: true,
      email: true,
      name: true,
      imageUrl: true,
      googleSub: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });
  if (!user) {
    redirect(`/client/signin?next=${encodeURIComponent("/client/account")}`);
  }

  const linkedComplaintCount = await db.recoveryComplaint.count({ where: { userId: user.id } });
  const savedClassifications = await db.savedClassification.count({ where: { userId: user.id } });
  const savedRoadmaps = await db.savedRoadmap.count({ where: { userId: user.id } });

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/client/dashboard" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
            <ArrowLeft size={13} /> Back to dashboard
          </Link>
          <p className="text-xs font-bold tracking-tight text-slate-900">Account &amp; Settings</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 space-y-8">
        {/* Profile header */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {user.imageUrl ? (
              <Image src={user.imageUrl} alt={user.name ?? user.email} width={64} height={64} className="rounded-full" unoptimized />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <UserCircle size={36} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-slate-900 truncate">{user.name ?? "(no display name)"}</p>
              <p className="text-sm text-slate-500 truncate">{user.email}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {user.googleSub && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">Google linked</span>
                )}
                {user.emailVerified && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Email verified</span>
                )}
              </div>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2">
            <Stat label="Account created" value={user.createdAt.toLocaleDateString("en-NG", { dateStyle: "long" })} />
            <Stat label="Last sign-in" value={user.lastLoginAt?.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" }) ?? "—"} />
            <Stat label="Linked recovery cases" value={String(linkedComplaintCount)} />
            <Stat label="Saved insights" value={`${savedClassifications + savedRoadmaps}`} />
          </dl>
        </section>

        <AccountForms
          initialName={user.name}
          email={user.email}
          linkedComplaintCount={linkedComplaintCount}
        />

        <Suspense fallback={null}>
          <EmailChangePanel currentEmail={user.email} />
        </Suspense>

        <ConnectionsPanel
          googleLinked={!!user.googleSub}
          emailVerified={!!user.emailVerified}
        />

        <SessionsPanel />

        {/* Privacy notice */}
        <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 text-xs text-blue-900">
          <p className="flex items-center gap-2 font-bold">
            <ShieldAlert size={14} /> NDPA 2023
          </p>
          <p className="mt-1">
            We store your account under the Nigeria Data Protection Act 2023. To request a copy of all data we hold on you, visit each case&apos;s tracking page and use &ldquo;Request data export&rdquo;. Recovery complaints are retained even if you delete your account (legal obligation), but are detached from your identity.
          </p>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
