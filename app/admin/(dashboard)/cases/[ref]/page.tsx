import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Download, Building2, User, Phone, Mail, Users, CheckCircle2, Clock, MessageSquare, FileSpreadsheet, MapPin, BadgeCheck, AlertTriangle, Landmark } from "lucide-react";
import { db } from "@/lib/db";
import { getAdminFromCookies } from "@/lib/auth";
import { normalizeRole, can } from "@/lib/rbac";
import { STEP_KEYS, STEP_DEFS, type StepKey } from "@/lib/recoverySteps";
import { representativeIdLabel } from "@/lib/recoveryKyc";
import { authorizationMethodLabel, type LoaSignatory } from "@/lib/recoveryLoa";
import AdvanceForm from "./AdvanceForm";
import NotesPanel from "./NotesPanel";
import FindingsEditor from "./FindingsEditor";

export const dynamic = "force-dynamic";

function fmtDate(d: Date) {
  return d.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });
}

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function AdminCaseDetailPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  if (!db) return <p className="text-sm text-red-700">Database not configured.</p>;

  // Server-side role guard — match the cases list/analytics/audit pages so a
  // GICN-only admin can't read a recovery case's PII via a direct URL.
  const role = normalizeRole((await getAdminFromCookies())?.role);
  if (!can(role, "cases.read")) redirect("/admin/gicn");

  const referenceId = ref.toUpperCase();
  const complaint = await db.recoveryComplaint.findUnique({
    where: { referenceId },
    include: {
      statusEvents: { orderBy: { reachedAt: "asc" } },
      documents: { orderBy: { uploadedAt: "asc" } },
      notes: { orderBy: { createdAt: "desc" } },
      referral: true,
      termsAcceptance: true,
      feedback: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!complaint) notFound();

  const reachedSteps = complaint.statusEvents.map((e) => e.step);
  const reachedMap = new Map(complaint.statusEvents.map((e) => [e.step, e]));
  const currentIdx = STEP_KEYS.reduce(
    (last, k, i) => (reachedSteps.includes(k) ? i + 1 : last),
    0
  );

  return (
    <div className="space-y-6">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900">
        <ArrowLeft size={13} />Back to cases
      </Link>

      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold text-slate-500">{complaint.referenceId}</p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">{complaint.companyName}</h1>
            <p className="mt-1 text-sm text-slate-600">RC {complaint.rcNumber} · {complaint.turnoverBand}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
              {STEP_DEFS[complaint.status as StepKey]?.label ?? complaint.status}
            </span>
            {complaint.hasActiveOrPendingFacility && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <AlertTriangle size={12} /> Sensitive — active/pending facility
              </span>
            )}
            <p className="mt-2 text-xs text-slate-500">Received {fmtDate(complaint.createdAt)}</p>
            <p className="text-xs text-slate-500">Team: {complaint.assignedTeam ?? "—"}</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <Info icon={User} label="Contact">
            {complaint.contactName} · {complaint.contactTitle}
          </Info>
          <Info icon={Mail} label="Email">
            <a href={`mailto:${complaint.contactEmail}`} className="text-blue-700 hover:underline">{complaint.contactEmail}</a>
          </Info>
          <Info icon={Phone} label="Phone">
            <a href={`tel:${complaint.contactPhone}`} className="text-blue-700 hover:underline">{complaint.contactPhone}</a>
          </Info>
          <Info icon={Building2} label="Banks to audit">
            {complaint.banks.join(", ")}
          </Info>
          {complaint.referral && (
            <Info icon={Users} label="Referred by">
              {complaint.referral.referrerName} <span className="font-mono text-xs text-slate-500">({complaint.referralCode})</span>
            </Info>
          )}
        </div>
      </div>

      {/* Post-recovery feedback (NPS) */}
      {complaint.feedback.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <CheckCircle2 size={14} /> Client Feedback (NPS)
          </h2>
          <div className="space-y-3">
            {complaint.feedback.map((fb) => (
              <div key={fb.id} className="flex items-start gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ${fb.score >= 9 ? "bg-emerald-100 text-emerald-700" : fb.score >= 7 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{fb.score}</span>
                <div className="min-w-0">
                  {fb.comment ? <p className="text-sm text-slate-700">{fb.comment}</p> : <p className="text-sm italic text-slate-400">No comment</p>}
                  <p className="mt-0.5 text-xs text-slate-400">{fmtDate(fb.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* KYC & engagement context (Features 3, 4 & 5) */}
      {(complaint.regAddressLine1 || complaint.representativeIdType || complaint.hasActiveOrPendingFacility != null || complaint.authorizationMethod) && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">KYC & Engagement</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info icon={MapPin} label="Registered address">
              {[complaint.regAddressLine1, complaint.regAddressLine2, complaint.regAddressCity, complaint.regAddressState, complaint.regAddressCountry, complaint.regAddressPostalCode].filter(Boolean).join(", ") || "—"}
            </Info>
            <Info icon={BadgeCheck} label="Representative ID">
              {representativeIdLabel(complaint.representativeIdType)}
              {complaint.documents.some((d) => d.documentType === "representative-id")
                ? <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">document on file</span>
                : <span className="ml-2 text-xs text-slate-400">(no document)</span>}
            </Info>
            <Info icon={Landmark} label="Active/pending facility">
              {complaint.hasActiveOrPendingFacility == null ? "—" : complaint.hasActiveOrPendingFacility ? "Yes" : "No"}
            </Info>
            <Info icon={AlertTriangle} label="Prior bank dispute">
              {complaint.hasPriorBankDispute == null ? "—" : complaint.hasPriorBankDispute ? "Yes" : "No"}
            </Info>
            <Info icon={BadgeCheck} label="Authorisation method">
              {authorizationMethodLabel(complaint.authorizationMethod)}
              {(() => {
                const sigs = (complaint.loaSignatories as LoaSignatory[] | null) ?? [];
                return sigs.length > 0 ? (
                  <span className="block text-xs text-slate-500">
                    {sigs.map((s) => (s.title ? `${s.name} (${s.title})` : s.name)).join("; ")}
                  </span>
                ) : null;
              })()}
            </Info>
            {complaint.engagementContext && (
              <div className="sm:col-span-2">
                <Info icon={MessageSquare} label="Engagement notes">
                  {complaint.engagementContext}
                </Info>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Terms & Data-Protection acceptance (Feature 1) */}
      {complaint.termsAcceptance && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
            <FileText size={14} /> Terms Acceptance
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info icon={User} label="Accepted by">
              {complaint.termsAcceptance.acceptedByName}
              {complaint.termsAcceptance.acceptedByTitle ? ` · ${complaint.termsAcceptance.acceptedByTitle}` : ""}
            </Info>
            <Info icon={Clock} label="Accepted at">
              {fmtDate(complaint.termsAcceptance.acceptedAt)}
            </Info>
            <Info icon={BadgeCheck} label="Policy version">
              {complaint.termsAcceptance.policyVersion} · {complaint.termsAcceptance.signatureType}
            </Info>
            <Info icon={MapPin} label="IP / device">
              {complaint.termsAcceptance.ipAddress ?? "—"}
              {complaint.termsAcceptance.userAgent ? <span className="block truncate text-xs text-slate-400" title={complaint.termsAcceptance.userAgent}>{complaint.termsAcceptance.userAgent}</span> : null}
            </Info>
            <div className="sm:col-span-2">
              <Info icon={FileText} label="Acknowledgement hash (SHA-256)">
                <span className="break-all font-mono text-xs text-slate-600">{complaint.termsAcceptance.acknowledgementHash}</span>
              </Info>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Case Timeline</h2>
          <div className="space-y-0">
            {STEP_KEYS.map((key, i) => {
              const ev = reachedMap.get(key);
              const done = i < currentIdx;
              const active = i === currentIdx;
              const def = STEP_DEFS[key];
              return (
                <div key={key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${done ? "border-emerald-500 bg-emerald-500 text-white" : active ? "border-blue-700 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-300"}`}>
                      {done ? <CheckCircle2 size={15} /> : active ? <Clock size={14} /> : <div className="h-2 w-2 rounded-full bg-current" />}
                    </div>
                    {i < STEP_KEYS.length - 1 && (
                      <div className={`mt-1 w-0.5 flex-1 min-h-[40px] ${done ? "bg-emerald-400" : "bg-slate-200"}`} />
                    )}
                  </div>
                  <div className={`flex-1 pb-6 ${i === STEP_KEYS.length - 1 ? "pb-0" : ""}`}>
                    <div className="flex flex-wrap items-baseline gap-2">
                      <p className={`text-sm font-bold ${done ? "text-emerald-700" : active ? "text-blue-900" : "text-slate-400"}`}>
                        {def.label}
                      </p>
                      {ev && <span className="text-xs text-slate-400">{fmtDate(ev.reachedAt)}</span>}
                    </div>
                    {(done || active) && <p className="mt-0.5 text-sm text-slate-600">{def.description}</p>}
                    {ev?.note && (
                      <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
                        <span className="font-semibold">Note:</span> {ev.note}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: advance + documents */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Advance Case</h2>
            <AdvanceForm
              referenceId={complaint.referenceId}
              currentStatus={complaint.status}
              reachedSteps={reachedSteps}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <FileSpreadsheet size={13} /> Findings & Recovery
            </h2>
            <FindingsEditor
              referenceId={complaint.referenceId}
              initialFindings={complaint.findingsSummary}
              initialRecoveryAmountKobo={complaint.recoveryAmountKobo?.toString() ?? null}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500">
              <MessageSquare size={13} /> Internal Notes
            </h2>
            <NotesPanel
              referenceId={complaint.referenceId}
              initialNotes={complaint.notes.map((n) => ({
                id: n.id,
                authorEmail: n.authorEmail,
                body: n.body,
                createdAt: n.createdAt.toISOString(),
              }))}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500">Documents</h2>
            {complaint.documents.length === 0 ? (
              <p className="text-sm text-slate-400">No documents uploaded by the client.</p>
            ) : (
              <ul className="space-y-2">
                {complaint.documents.map((d) => (
                  <li key={d.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="shrink-0 text-slate-400" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{d.fileName}</p>
                        <p className="text-xs text-slate-500">{d.documentType} · {fmtBytes(d.fileSize)}</p>
                      </div>
                    </div>
                    <a
                      href={`/api/admin/cases/${complaint.referenceId}/documents/${d.id}`}
                      className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                      <Download size={11} />Download
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-700">{children}</p>
      </div>
    </div>
  );
}
