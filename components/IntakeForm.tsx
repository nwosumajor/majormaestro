"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import {
  Building2,
  User,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Plus,
  X,
  Upload,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Lock,
  Paperclip,
} from "lucide-react";

interface FormState {
  companyName: string;
  rcNumber: string;
  turnoverBand: string;
  banks: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  confirmedSignatory: boolean;
  agreedNDPA: boolean;
}

interface UploadedFile {
  documentType: string;
  fileName: string;
  storedAs: string;
  storageBackend?: "local" | "s3";
  size: number;
  mimeType: string;
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

const TURNOVER_OPTIONS = [
  "₦50M – ₦200M",
  "₦200M – ₦1B",
  "₦1B – ₦5B",
  "Above ₦5B",
];

const DRAFT_KEY = "gbn_intake_draft";

const INITIAL_STATE: FormState = {
  companyName: "",
  rcNumber: "",
  turnoverBand: "",
  banks: [""],
  contactName: "",
  contactTitle: "",
  contactEmail: "",
  contactPhone: "",
  confirmedSignatory: false,
  agreedNDPA: false,
};

const STEPS = [
  { label: "Organisation", icon: Building2 },
  { label: "Contact", icon: User },
  { label: "Compliance", icon: ShieldCheck },
];

const UPLOAD_SLOTS = [
  {
    key: "bank-statements",
    label: "Bank Statements (last 3–5 years)",
    hint: "PDF or Excel · Max 50 MB per file",
    accept: ".pdf,.xls,.xlsx,.csv",
  },
  {
    key: "letter-of-authority",
    label: "Letter of Authority",
    hint: "Signed by authorised signatory · PDF only",
    accept: ".pdf",
  },
] as const;

type SlotKey = (typeof UPLOAD_SLOTS)[number]["key"];

interface SuccessState {
  referenceId: string;
  message: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function IntakeForm({ referralCode }: { referralCode?: string }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  // On mount: fire the funnel event, restore any saved draft (org-level fields
  // only — no contact PII or compliance acknowledgments are ever persisted),
  // and pre-fill the turnover band if the visitor came from the estimator.
  useEffect(() => {
    track("intake_start", referralCode ? { referred: true } : undefined);
    setForm((prev) => {
      let next = prev;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as Partial<FormState>;
          next = {
            ...next,
            companyName: d.companyName || next.companyName,
            rcNumber: d.rcNumber || next.rcNumber,
            turnoverBand: d.turnoverBand || next.turnoverBand,
            banks: Array.isArray(d.banks) && d.banks.length ? d.banks : next.banks,
          };
        }
      } catch {
        /* ignore malformed draft */
      }
      try {
        const band = sessionStorage.getItem("gbn_turnover"); // set by RecoveryEstimator
        if (band && TURNOVER_OPTIONS.includes(band)) next = { ...next, turnoverBand: band };
      } catch {
        /* storage blocked */
      }
      return next;
    });
  }, [referralCode]);

  // Persist a lightweight draft so a half-filled form survives an accidental
  // close. Org fields only; cleared on successful submit.
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          companyName: form.companyName,
          rcNumber: form.rcNumber,
          turnoverBand: form.turnoverBand,
          banks: form.banks,
        })
      );
    } catch {
      /* storage blocked */
    }
  }, [form.companyName, form.rcNumber, form.turnoverBand, form.banks]);

  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<SlotKey, UploadedFile>>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<SlotKey, UploadStatus>>({
    "bank-statements": "idle",
    "letter-of-authority": "idle",
  });
  const [uploadError, setUploadError] = useState<Partial<Record<SlotKey, string>>>({});

  const fileRefs = {
    "bank-statements": useRef<HTMLInputElement>(null),
    "letter-of-authority": useRef<HTMLInputElement>(null),
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addBank() { update("banks", [...form.banks, ""]); }
  function updateBank(i: number, v: string) { update("banks", form.banks.map((b, j) => j === i ? v : b)); }
  function removeBank(i: number) { update("banks", form.banks.filter((_, j) => j !== i)); }

  function step1Valid() {
    return form.companyName.trim() && form.rcNumber.trim() && form.turnoverBand && form.banks.some((b) => b.trim());
  }

  function step2Valid() {
    return form.contactName.trim() && form.contactTitle.trim() && form.contactEmail.trim() && form.contactPhone.trim();
  }

  function step3Valid() {
    return form.confirmedSignatory && form.agreedNDPA;
  }

  async function handleFileChange(key: SlotKey, file: File | null) {
    if (!file) return;
    setUploadStatus((s) => ({ ...s, [key]: "uploading" }));
    setUploadError((e) => ({ ...e, [key]: undefined }));

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setUploadedFiles((prev) => ({
        ...prev,
        [key]: {
          documentType: key,
          fileName: data.fileName,
          storedAs: data.storedAs,
          storageBackend: data.storageBackend,
          size: data.size,
          mimeType: data.mimeType,
        },
      }));
      setUploadStatus((s) => ({ ...s, [key]: "done" }));
    } catch (err) {
      setUploadError((e) => ({
        ...e,
        [key]: err instanceof Error ? err.message : "Upload failed.",
      }));
      setUploadStatus((s) => ({ ...s, [key]: "error" }));
    }
  }

  function removeUpload(key: SlotKey) {
    setUploadedFiles((prev) => { const n = { ...prev }; delete n[key]; return n; });
    setUploadStatus((s) => ({ ...s, [key]: "idle" }));
    setUploadError((e) => ({ ...e, [key]: undefined }));
    if (fileRefs[key].current) fileRefs[key].current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!step3Valid()) return;
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        banks: form.banks.filter((b) => b.trim()),
        documents: Object.values(uploadedFiles).filter(Boolean),
        ...(referralCode ? { referralCode } : {}),
      };
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      track("intake_submit", {
        turnoverBand: form.turnoverBand,
        banks: payload.banks.length,
        documents: payload.documents.length,
        referred: !!referralCode,
      });
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setSuccess({ referenceId: data.referenceId, message: data.message });
    } catch (err) {
      track("intake_error", { message: err instanceof Error ? err.message : "unknown" });
      setError(err instanceof Error ? err.message : "Unexpected error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 size={32} className="text-emerald-600" />
        </div>
        <h3 className="mb-2 text-xl font-bold text-slate-900">Complaint Securely Received</h3>
        <p className="mb-5 text-sm text-slate-600">{success.message}</p>
        <div className="mx-auto mb-6 w-fit rounded-xl border border-blue-200 bg-blue-50 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Your Reference ID</p>
          <p className="mt-1 text-xl font-bold font-mono text-blue-900">{success.referenceId}</p>
          <p className="mt-1 text-xs text-slate-500">Save this to track your case at /recovery/track</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <Lock size={12} className="mr-1.5 inline" />
          All submitted information is encrypted and handled in strict confidence under NDPA 2023. A confirmation email has been sent to your registered address.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-950 px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Secure Intake Portal</span>
        </div>
        <h3 className="text-base font-bold text-white">Lodge a Forensic Audit Complaint</h3>
        <p className="text-xs text-blue-300 mt-0.5">End-to-end encrypted · NDPA 2023 compliant · NDA protected</p>
      </div>

      {referralCode && (
        <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-6 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
          <span>Referred via <span className="font-mono font-semibold">{referralCode}</span> — your introducer will be credited on successful recovery.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map(({ label, icon: Icon }, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className={`flex items-center gap-2 ${i <= step ? "text-blue-900" : "text-slate-400"}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${i < step ? "border-emerald-500 bg-emerald-500 text-white" : i === step ? "border-blue-800 bg-blue-800 text-white" : "border-slate-300 bg-white text-slate-400"}`}>
                  {i < step ? <CheckCircle2 size={14} /> : <Icon size={14} />}
                </div>
                <span className="hidden text-xs font-semibold sm:block">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`mx-3 flex-1 h-0.5 rounded transition-colors ${i < step ? "bg-emerald-400" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Step 1: Organisation */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="f-companyName" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Registered Company Name <span className="text-red-500">*</span>
              </label>
              <input
                id="f-companyName"
                type="text"
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="e.g. Acme Manufacturing Ltd"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div>
              <label htmlFor="f-rcNumber" className="mb-1.5 block text-sm font-semibold text-slate-800">
                RC Number (CAC) <span className="text-red-500">*</span>
              </label>
              <input
                id="f-rcNumber"
                type="text"
                value={form.rcNumber}
                onChange={(e) => update("rcNumber", e.target.value)}
                placeholder="e.g. RC 123456"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              />
            </div>
            <div>
              <label htmlFor="f-turnoverBand" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Annual Turnover Band <span className="text-red-500">*</span>
              </label>
              <select
                id="f-turnoverBand"
                value={form.turnoverBand}
                onChange={(e) => update("turnoverBand", e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
              >
                <option value="">— Select turnover band —</option>
                {TURNOVER_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Bank(s) to be Audited <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-slate-500">List each bank separately.</p>
              <div className="space-y-2">
                {form.banks.map((bank, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bank}
                      onChange={(e) => updateBank(i, e.target.value)}
                      placeholder="e.g. First Bank of Nigeria, GTBank…"
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition"
                    />
                    {form.banks.length > 1 && (
                      <button type="button" onClick={() => removeBank(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBank} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 hover:text-blue-900 transition-colors">
                <Plus size={13} />Add another bank
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Contact */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-contactName" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input id="f-contactName" type="text" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="e.g. Amaka Okonkwo" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition" />
              </div>
              <div>
                <label htmlFor="f-contactTitle" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Job Title / Role <span className="text-red-500">*</span>
                </label>
                <input id="f-contactTitle" type="text" value={form.contactTitle} onChange={(e) => update("contactTitle", e.target.value)} placeholder="e.g. Chief Financial Officer" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition" />
              </div>
            </div>
            <div>
              <label htmlFor="f-contactEmail" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <input id="f-contactEmail" type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} placeholder="e.g. a.okonkwo@company.com" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition" />
            </div>
            <div>
              <label htmlFor="f-contactPhone" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Direct Phone Number <span className="text-red-500">*</span>
              </label>
              <input id="f-contactPhone" type="tel" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} placeholder="e.g. +234 801 234 5678" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 transition" />
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
              <Lock size={12} className="mr-1.5 inline text-blue-500" />
              Your contact details are encrypted and only used to schedule your forensic engagement call.
            </div>
          </div>
        )}

        {/* Step 3: Compliance & Documents */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Document uploads */}
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-800">Document Upload</h4>
              <p className="mb-4 text-xs text-slate-500">
                Upload supporting documents to accelerate the forensic review. All files are encrypted at rest using AES-256. Upload is optional — documents can also be submitted after your engagement call.
              </p>
              <div className="space-y-3">
                {UPLOAD_SLOTS.map((slot) => {
                  const status = uploadStatus[slot.key];
                  const uploaded = uploadedFiles[slot.key];
                  const errMsg = uploadError[slot.key];

                  return (
                    <div key={slot.key}>
                      <input
                        ref={fileRefs[slot.key]}
                        type="file"
                        accept={slot.accept}
                        className="hidden"
                        onChange={(e) => handleFileChange(slot.key, e.target.files?.[0] ?? null)}
                      />

                      {status === "done" && uploaded ? (
                        <div className="flex items-center justify-between rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                            <div>
                              <p className="text-sm font-semibold text-emerald-800">{uploaded.fileName}</p>
                              <p className="text-xs text-emerald-600">{formatBytes(uploaded.size)} · Encrypted &amp; Stored</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeUpload(slot.key)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-400 hover:bg-emerald-100 hover:text-red-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => fileRefs[slot.key].current?.click()}
                          disabled={status === "uploading"}
                          className={`w-full flex items-start justify-between rounded-xl border-2 border-dashed p-4 transition-colors text-left ${status === "error" ? "border-red-300 bg-red-50" : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${status === "uploading" ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                              {status === "uploading" ? <Loader2 size={15} className="animate-spin text-blue-600" /> : <FileText size={15} className="text-slate-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{slot.label}</p>
                              <p className="text-xs text-slate-400">{slot.hint}</p>
                              {errMsg && <p className="mt-1 text-xs text-red-600">{errMsg}</p>}
                            </div>
                          </div>
                          <div className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${status === "uploading" ? "border-blue-200 text-blue-600" : "border-slate-300 bg-white text-slate-600"}`}>
                            {status === "uploading" ? <><Loader2 size={11} className="animate-spin" />Uploading…</> : <><Paperclip size={11} /><Upload size={11} />Choose File</>}
                          </div>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Compliance acknowledgments */}
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-800">Compliance Acknowledgments</h4>
              <p className="mb-4 text-xs text-slate-500">Both acknowledgments are mandatory to proceed.</p>
              <div className="space-y-3">
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${form.confirmedSignatory ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}>
                  <input
                    type="checkbox"
                    checked={form.confirmedSignatory}
                    onChange={(e) => update("confirmedSignatory", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">Authorised Signatory: </span>
                    I confirm that I am a duly authorised signatory or director of the above-named organisation, legally empowered to engage MajorGBN for forensic financial services on its behalf.
                  </span>
                </label>

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${form.agreedNDPA ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-blue-300"}`}>
                  <input
                    type="checkbox"
                    checked={form.agreedNDPA}
                    onChange={(e) => update("agreedNDPA", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">NDPA 2023 & NDA: </span>
                    I agree to handling of all financial data under the{" "}
                    <span className="font-semibold text-blue-800">Nigeria Data Protection Act (NDPA) 2023</span>, and acknowledge that a mutual Non-Disclosure Agreement (NDA) governs all information exchanged during this engagement.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {step > 0 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <ChevronLeft size={16} />Back
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              type="button"
              onClick={() => {
                track("intake_step", { from: step + 1, to: step + 2 });
                setStep((s) => s + 1);
              }}
              disabled={step === 0 ? !step1Valid() : !step2Valid()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              Continue<ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !step3Valid()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <><Loader2 size={16} className="animate-spin" />Submitting securely…</>
              ) : (
                <><ShieldCheck size={16} />Submit Complaint Securely</>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
