"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { isValidEmail, validatePhone } from "@/lib/validation";
import { REPRESENTATIVE_ID_TYPES, REPRESENTATIVE_ID_LABELS } from "@/lib/recoveryKyc";
import { RECOVERY_TERMS } from "@/lib/policies/recoveryTerms";
import { AUTHORIZATION_METHOD_LABELS, type AuthorizationMethod } from "@/lib/recoveryLoa";
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
  FileSignature,
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
  // Feature 5 — registered business address
  regAddressLine1: string;
  regAddressLine2: string;
  regAddressCity: string;
  regAddressState: string;
  regAddressCountry: string;
  regAddressPostalCode: string;
  // Feature 5 — authorized representative ID type
  representativeIdType: string;
  // Feature 4 — loan / facility status
  hasActiveOrPendingFacility: boolean | null;
  hasPriorBankDispute: boolean | null;
  engagementContext: string;
  // Feature 3 — Letter-of-Authorization
  companyHasSoleDirector: boolean | null;
  authorizationMethod: "" | AuthorizationMethod;
  loaSignatories: { name: string; title: string }[];
  // Feature 1 — Terms acceptance
  termsAccepted: boolean;
  termsSignerName: string;
  termsSignerTitle: string;
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
  "₦5M – ₦49M",
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
  regAddressLine1: "",
  regAddressLine2: "",
  regAddressCity: "",
  regAddressState: "",
  regAddressCountry: "Nigeria",
  regAddressPostalCode: "",
  representativeIdType: "",
  hasActiveOrPendingFacility: null,
  hasPriorBankDispute: null,
  engagementContext: "",
  companyHasSoleDirector: null,
  authorizationMethod: "",
  loaSignatories: [{ name: "", title: "" }],
  termsAccepted: false,
  termsSignerName: "",
  termsSignerTitle: "",
};

const STEPS = [
  { label: "Organisation", icon: Building2 },
  { label: "Contact", icon: User },
  { label: "Compliance", icon: ShieldCheck },
  { label: "Agreement", icon: FileSignature },
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
  {
    key: "representative-id",
    label: "Authorised Representative ID",
    hint: "Government-issued ID of the signatory · PDF only",
    accept: ".pdf",
  },
  {
    key: "board-resolution",
    label: "Board Resolution",
    hint: "Board resolution authorising this engagement · PDF only",
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

export default function IntakeForm({
  referralCode,
  referrerName,
  otpRequired = false,
  smsEnabled = false,
}: {
  referralCode?: string;
  referrerName?: string;
  otpRequired?: boolean;
  smsEnabled?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<SuccessState | null>(null);
  const [draftRestored, setDraftRestored] = useState(false);
  // Field-level errors (keyed by FormState field) — set on blur (client) and
  // from a server 422 response. Cleared as the user edits the offending field.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Feature 2b — contact-verification OTP (per channel). Verification is tied to
  // the value that was verified, so editing the field resets its verified state.
  type Channel = "email" | "sms";
  const [otpSent, setOtpSent] = useState<{ email: boolean; sms: boolean }>({ email: false, sms: false });
  const [otpCode, setOtpCode] = useState<{ email: string; sms: string }>({ email: "", sms: "" });
  const [otpVerified, setOtpVerified] = useState<{ email: string | null; sms: string | null }>({ email: null, sms: null });
  const [otpBusy, setOtpBusy] = useState<Channel | null>(null);
  const [otpMsg, setOtpMsg] = useState<{ email?: string; sms?: string }>({});

  const emailVerified = otpVerified.email !== null && otpVerified.email === form.contactEmail.trim().toLowerCase();
  const phoneVerified = otpVerified.sms !== null && otpVerified.sms === form.contactPhone.trim();

  async function requestOtp(channel: Channel) {
    const target = channel === "email" ? form.contactEmail.trim() : form.contactPhone.trim();
    setOtpBusy(channel);
    setOtpMsg((m) => ({ ...m, [channel]: undefined }));
    try {
      const res = await fetch("/api/recovery/otp/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, target }),
      });
      const data = await res.json();
      if (data.channelUnavailable) {
        setOtpMsg((m) => ({ ...m, [channel]: data.message ?? "Unavailable." }));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not send code.");
      setOtpSent((s) => ({ ...s, [channel]: true }));
      setOtpMsg((m) => ({ ...m, [channel]: "Code sent — check your messages." }));
    } catch (err) {
      setOtpMsg((m) => ({ ...m, [channel]: err instanceof Error ? err.message : "Could not send code." }));
    } finally {
      setOtpBusy(null);
    }
  }

  async function confirmOtp(channel: Channel) {
    const target = channel === "email" ? form.contactEmail.trim() : form.contactPhone.trim();
    setOtpBusy(channel);
    setOtpMsg((m) => ({ ...m, [channel]: undefined }));
    try {
      const res = await fetch("/api/recovery/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, target, code: otpCode[channel] }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Verification failed.");
      const verifiedValue = channel === "email" ? target.toLowerCase() : target;
      setOtpVerified((v) => ({ ...v, [channel]: verifiedValue }));
      setOtpMsg((m) => ({ ...m, [channel]: undefined }));
    } catch (err) {
      setOtpMsg((m) => ({ ...m, [channel]: err instanceof Error ? err.message : "Verification failed." }));
    } finally {
      setOtpBusy(null);
    }
  }

  function otpControls(channel: Channel) {
    const verified = channel === "email" ? emailVerified : phoneVerified;
    const valid = channel === "email" ? isValidEmail(form.contactEmail) : validatePhone(form.contactPhone).ok;
    const sent = otpSent[channel];
    const busy = otpBusy === channel;
    const label = channel === "email" ? "email" : "phone";
    if (verified) {
      return <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 size={13} /> Verified</p>;
    }
    return (
      <div className="mt-2 space-y-2">
        {!sent ? (
          <button type="button" disabled={!valid || busy} onClick={() => requestOtp(channel)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-accent/50 hover:text-accent disabled:opacity-50 transition-colors">
            {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={12} />} Verify {label}{otpRequired ? "" : " (optional)"}
          </button>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <input value={otpCode[channel]} onChange={(e) => setOtpCode((c) => ({ ...c, [channel]: e.target.value }))} inputMode="numeric" maxLength={6} placeholder="6-digit code" className="w-32 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-sm tracking-widest focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
            <button type="button" disabled={busy || otpCode[channel].trim().length < 4} onClick={() => confirmOtp(channel)} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent-bright disabled:opacity-50 transition-colors">
              {busy ? <Loader2 size={12} className="animate-spin" /> : null} Confirm
            </button>
            <button type="button" disabled={busy} onClick={() => requestOtp(channel)} className="text-xs font-medium text-slate-500 hover:text-accent">Resend</button>
          </div>
        )}
        {otpMsg[channel] && <p className="text-xs text-slate-500">{otpMsg[channel]}</p>}
      </div>
    );
  }

  // On mount: fire the funnel event, restore any saved draft (save-and-resume —
  // all data fields + the step, device-only; consent/terms are deliberately NOT
  // persisted so they must be re-affirmed), and pre-fill the turnover band if the
  // visitor came from the estimator.
  useEffect(() => {
    track("intake_start", referralCode ? { referred: true } : undefined);
    let restoredStep: number | null = null;
    setForm((prev) => {
      let next = prev;
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (raw) {
          const d = JSON.parse(raw) as { form?: Partial<FormState>; step?: number };
          if (d.form && typeof d.form === "object") {
            next = {
              ...next,
              ...d.form,
              // Never restore consent/terms — these must be re-affirmed each session.
              confirmedSignatory: false,
              agreedNDPA: false,
              termsAccepted: false,
              termsSignerName: "",
              termsSignerTitle: "",
              banks: Array.isArray(d.form.banks) && d.form.banks.length ? d.form.banks : next.banks,
            };
            if (next.companyName || next.contactName || next.regAddressLine1) {
              setDraftRestored(true);
              if (typeof d.step === "number") restoredStep = Math.max(0, Math.min(d.step, STEPS.length - 1));
            }
          }
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
    if (restoredStep !== null) setStep(restoredStep);
  }, [referralCode]);

  // Persist the in-progress application (data + step) so it survives an accidental
  // close or a "come back later". Device-only; consent/terms excluded; cleared on
  // successful submit.
  useEffect(() => {
    try {
      const { confirmedSignatory, agreedNDPA, termsAccepted, termsSignerName, termsSignerTitle, ...persist } = form;
      void confirmedSignatory; void agreedNDPA; void termsAccepted; void termsSignerName; void termsSignerTitle;
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form: persist, step, savedAt: Date.now() }));
    } catch {
      /* storage blocked */
    }
  }, [form, step]);

  function startOver() {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
    setForm(INITIAL_STATE);
    setStep(0);
    setFieldErrors({});
    setDraftRestored(false);
  }

  const [uploadedFiles, setUploadedFiles] = useState<Partial<Record<SlotKey, UploadedFile>>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<SlotKey, UploadStatus>>({
    "bank-statements": "idle",
    "letter-of-authority": "idle",
    "representative-id": "idle",
    "board-resolution": "idle",
  });
  const [uploadError, setUploadError] = useState<Partial<Record<SlotKey, string>>>({});

  const fileRefs = {
    "bank-statements": useRef<HTMLInputElement>(null),
    "letter-of-authority": useRef<HTMLInputElement>(null),
    "representative-id": useRef<HTMLInputElement>(null),
    "board-resolution": useRef<HTMLInputElement>(null),
  };

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear a field-level error as soon as the user edits that field. The terms
    // fields map to a single "terms" server error key.
    const errKey = typeof key === "string" && key.startsWith("terms") ? "terms" : (key as string);
    setFieldErrors((prev) => (prev[errKey] ? { ...prev, [errKey]: undefined } : prev));
  }

  function addBank() { update("banks", [...form.banks, ""]); }
  function updateBank(i: number, v: string) { update("banks", form.banks.map((b, j) => j === i ? v : b)); }
  function removeBank(i: number) { update("banks", form.banks.filter((_, j) => j !== i)); }

  function step1Valid() {
    return Boolean(
      form.companyName.trim() &&
        form.rcNumber.trim() &&
        form.turnoverBand &&
        form.banks.some((b) => b.trim()) &&
        form.regAddressLine1.trim() &&
        form.regAddressCity.trim() &&
        form.regAddressState.trim() &&
        form.regAddressCountry.trim()
    );
  }

  function step2Valid() {
    const base = Boolean(
      form.contactName.trim() &&
        form.contactTitle.trim() &&
        isValidEmail(form.contactEmail) &&
        validatePhone(form.contactPhone).ok
    );
    if (!base) return false;
    if (otpRequired) {
      if (!emailVerified) return false;
      if (smsEnabled && !phoneVerified) return false;
    }
    return true;
  }

  // Validate email/phone format on blur and surface a field-level message.
  function validateContactField(key: "contactEmail" | "contactPhone") {
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (key === "contactEmail") {
        next.contactEmail =
          form.contactEmail.trim() && !isValidEmail(form.contactEmail)
            ? "Enter a valid email address."
            : undefined;
      } else {
        next.contactPhone =
          form.contactPhone.trim() && !validatePhone(form.contactPhone).ok
            ? "Enter a valid phone number (e.g. 0803 123 4567 or +234…)."
            : undefined;
      }
      return next;
    });
  }

  function step3Valid() {
    return Boolean(
      form.confirmedSignatory &&
        form.agreedNDPA &&
        form.hasActiveOrPendingFacility !== null &&
        form.representativeIdType &&
        form.companyHasSoleDirector !== null &&
        form.authorizationMethod
    );
  }

  function addSignatory() { update("loaSignatories", [...form.loaSignatories, { name: "", title: "" }]); }
  function removeSignatory(i: number) { update("loaSignatories", form.loaSignatories.filter((_, j) => j !== i)); }
  function updateSignatory(i: number, field: "name" | "title", v: string) {
    update("loaSignatories", form.loaSignatories.map((s, j) => (j === i ? { ...s, [field]: v } : s)));
  }

  function step4Valid() {
    return Boolean(form.termsAccepted && form.termsSignerName.trim());
  }

  const LAST_STEP = STEPS.length - 1;
  function stepValid(s: number) {
    return s === 0 ? step1Valid() : s === 1 ? step2Valid() : s === 2 ? step3Valid() : step4Valid();
  }

  // Map a server 422 field key back to the step that owns it, so we can return
  // the user to the earliest step with an error.
  const STEP_FIELDS: Record<number, string[]> = {
    0: ["companyName", "rcNumber", "turnoverBand", "banks", "regAddressLine1", "regAddressCity", "regAddressState", "regAddressCountry"],
    1: ["contactName", "contactTitle", "contactEmail", "contactPhone"],
    2: ["hasActiveOrPendingFacility", "representativeIdType", "authorizationMethod", "companyHasSoleDirector", "authorization"],
    3: ["terms"],
  };
  function earliestErrorStep(keys: string[]): number {
    for (let s = 0; s <= LAST_STEP; s++) {
      if (keys.some((k) => STEP_FIELDS[s].includes(k))) return s;
    }
    return step;
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
    if (!step4Valid()) return;
    setError(null);
    setLoading(true);
    try {
      const payload = {
        ...form,
        banks: form.banks.filter((b) => b.trim()),
        documents: Object.values(uploadedFiles).filter(Boolean),
        terms: {
          accepted: form.termsAccepted,
          policyVersion: RECOVERY_TERMS.version,
          acceptedByName: form.termsSignerName.trim(),
          acceptedByTitle: form.termsSignerTitle.trim() || undefined,
          signatureType: "typed_signature" as const,
        },
        ...(referralCode ? { referralCode } : {}),
      };
      const res = await fetch("/api/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // Server-side field validation (422) — highlight fields + jump to the
        // earliest step that contains an error.
        if (res.status === 422 && data.fields) {
          setFieldErrors(data.fields);
          setStep(earliestErrorStep(Object.keys(data.fields)));
        }
        throw new Error(data.error ?? "Submission failed.");
      }
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
        <div className="mx-auto mb-6 w-fit rounded-xl border border-accent/20 bg-accent-soft px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Your Reference ID</p>
          <p className="mt-1 text-xl font-bold font-mono text-ink">{success.referenceId}</p>
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
      <div className="bg-ink px-6 py-5">
        <div className="flex items-center gap-2 mb-1">
          <Lock size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Secure Intake Portal</span>
        </div>
        <h3 className="text-base font-bold text-white">Lodge a Forensic Audit Complaint</h3>
        <p className="text-xs text-slate-400 mt-0.5">End-to-end encrypted · NDPA 2023 compliant · NDA protected</p>
      </div>

      {referralCode && (
        <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-6 py-2.5 text-xs text-emerald-800">
          <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
          <span>Referred {referrerName ? <>by <span className="font-semibold">{referrerName}</span></> : <>via <span className="font-mono font-semibold">{referralCode}</span></>} — they&apos;ll be credited on successful recovery.</span>
        </div>
      )}

      {/* Step indicator */}
      <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map(({ label, icon: Icon }, i) => (
            <div key={i} className="flex flex-1 items-center">
              <div className={`flex items-center gap-2 ${i <= step ? "text-ink" : "text-slate-400"}`}>
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${i < step ? "border-emerald-500 bg-emerald-500 text-white" : i === step ? "border-accent bg-accent text-white" : "border-slate-300 bg-white text-slate-400"}`}>
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

      {draftRestored && !success && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-100 bg-amber-50 px-6 py-2.5 text-xs text-amber-800">
          <span>We restored your saved progress on this device. You&apos;ll re-confirm the consents before submitting.</span>
          <button type="button" onClick={startOver} className="font-semibold underline hover:text-amber-900">Start over</button>
        </div>
      )}

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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
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
                className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
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
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition"
                    />
                    {form.banks.length > 1 && (
                      <button type="button" onClick={() => removeBank(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBank} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-bright transition-colors">
                <Plus size={13} />Add another bank
              </button>
            </div>

            {/* Registered business address (KYC) */}
            <div className="border-t border-slate-100 pt-4">
              <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                Registered Business Address <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-slate-500">As shown on your CAC registration.</p>
              <div className="space-y-2">
                <div>
                  <input type="text" value={form.regAddressLine1} onChange={(e) => update("regAddressLine1", e.target.value)} aria-invalid={!!fieldErrors.regAddressLine1} placeholder="Address line 1" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.regAddressLine1 ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
                  {fieldErrors.regAddressLine1 && <p className="mt-1 text-xs text-red-600">{fieldErrors.regAddressLine1}</p>}
                </div>
                <input type="text" value={form.regAddressLine2} onChange={(e) => update("regAddressLine2", e.target.value)} placeholder="Address line 2 (optional)" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <input type="text" value={form.regAddressCity} onChange={(e) => update("regAddressCity", e.target.value)} aria-invalid={!!fieldErrors.regAddressCity} placeholder="City" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.regAddressCity ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
                    {fieldErrors.regAddressCity && <p className="mt-1 text-xs text-red-600">{fieldErrors.regAddressCity}</p>}
                  </div>
                  <div>
                    <input type="text" value={form.regAddressState} onChange={(e) => update("regAddressState", e.target.value)} aria-invalid={!!fieldErrors.regAddressState} placeholder="State" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.regAddressState ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
                    {fieldErrors.regAddressState && <p className="mt-1 text-xs text-red-600">{fieldErrors.regAddressState}</p>}
                  </div>
                  <div>
                    <input type="text" value={form.regAddressCountry} onChange={(e) => update("regAddressCountry", e.target.value)} aria-invalid={!!fieldErrors.regAddressCountry} placeholder="Country" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.regAddressCountry ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
                    {fieldErrors.regAddressCountry && <p className="mt-1 text-xs text-red-600">{fieldErrors.regAddressCountry}</p>}
                  </div>
                  <input type="text" value={form.regAddressPostalCode} onChange={(e) => update("regAddressPostalCode", e.target.value)} placeholder="Postal code (optional)" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
                </div>
              </div>
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
                <input id="f-contactName" type="text" value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="e.g. Amaka Okonkwo" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
              <div>
                <label htmlFor="f-contactTitle" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Job Title / Role <span className="text-red-500">*</span>
                </label>
                <input id="f-contactTitle" type="text" value={form.contactTitle} onChange={(e) => update("contactTitle", e.target.value)} placeholder="e.g. Chief Financial Officer" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
            </div>
            <div>
              <label htmlFor="f-contactEmail" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <input id="f-contactEmail" type="email" value={form.contactEmail} onChange={(e) => update("contactEmail", e.target.value)} onBlur={() => validateContactField("contactEmail")} aria-invalid={!!fieldErrors.contactEmail} placeholder="e.g. a.okonkwo@company.com" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.contactEmail ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
              {fieldErrors.contactEmail && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.contactEmail}</p>}
              {otpControls("email")}
            </div>
            <div>
              <label htmlFor="f-contactPhone" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Direct Phone Number <span className="text-red-500">*</span>
              </label>
              <input id="f-contactPhone" type="tel" value={form.contactPhone} onChange={(e) => update("contactPhone", e.target.value)} onBlur={() => validateContactField("contactPhone")} aria-invalid={!!fieldErrors.contactPhone} placeholder="e.g. +234 801 234 5678" className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.contactPhone ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`} />
              {fieldErrors.contactPhone && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.contactPhone}</p>}
              {smsEnabled && otpControls("sms")}
            </div>
            <div className="rounded-xl border border-accent/20 bg-accent-soft px-4 py-3 text-xs text-accent">
              <Lock size={12} className="mr-1.5 inline text-accent" />
              Your contact details are encrypted and only used to schedule your forensic engagement call.
            </div>
          </div>
        )}

        {/* Step 3: Compliance & Documents */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Loan / facility status (engagement sensitivity) */}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Is the company currently applying for, or negotiating, any loan or credit facility with any bank? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {([["Yes", true], ["No", false]] as const).map(([lbl, val]) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => update("hasActiveOrPendingFacility", val)}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${form.hasActiveOrPendingFacility === val ? "border-accent bg-accent-soft text-ink" : "border-slate-300 bg-white text-slate-600 hover:border-accent/40"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {fieldErrors.hasActiveOrPendingFacility && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.hasActiveOrPendingFacility}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Has the company had any prior dispute correspondence with the bank(s)?
                </label>
                <div className="flex gap-2">
                  {([["Yes", true], ["No", false]] as const).map(([lbl, val]) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => update("hasPriorBankDispute", val)}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${form.hasPriorBankDispute === val ? "border-accent bg-accent-soft text-ink" : "border-slate-300 bg-white text-slate-600 hover:border-accent/40"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
              {(form.hasActiveOrPendingFacility || form.hasPriorBankDispute) && (
                <div>
                  <label htmlFor="f-engagementContext" className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Any context that may affect engagement strategy? <span className="font-normal text-slate-400">(optional)</span>
                  </label>
                  <textarea id="f-engagementContext" value={form.engagementContext} onChange={(e) => update("engagementContext", e.target.value)} rows={3} placeholder="e.g. facility approval expected next month with the same bank…" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
                </div>
              )}
            </div>

            {/* Authorised representative ID type (KYC) */}
            <div>
              <label htmlFor="f-representativeIdType" className="mb-1.5 block text-sm font-semibold text-slate-800">
                Authorised Representative&apos;s ID Type <span className="text-red-500">*</span>
              </label>
              <select
                id="f-representativeIdType"
                value={form.representativeIdType}
                onChange={(e) => update("representativeIdType", e.target.value)}
                aria-invalid={!!fieldErrors.representativeIdType}
                className={`w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 transition ${fieldErrors.representativeIdType ? "border-red-400 focus:border-red-500 focus:ring-red-200" : "border-slate-300 focus:border-accent focus:ring-accent/30"}`}
              >
                <option value="">— Select ID type —</option>
                {REPRESENTATIVE_ID_TYPES.map((t) => <option key={t} value={t}>{REPRESENTATIVE_ID_LABELS[t]}</option>)}
              </select>
              {fieldErrors.representativeIdType && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.representativeIdType}</p>}
              <p className="mt-1.5 text-xs text-slate-500">Upload the matching ID document below (optional, but speeds up verification).</p>
            </div>

            {/* Authorisation method (Letter of Authority) */}
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Does the company have a sole Director? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {([["Yes", true], ["No", false]] as const).map(([lbl, val]) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => {
                        // Reset the method if it no longer applies to the new answer.
                        const stillValid =
                          form.authorizationMethod === "board_resolution" ||
                          (val ? form.authorizationMethod === "sole_director" : form.authorizationMethod === "two_directors");
                        update("companyHasSoleDirector", val);
                        if (!stillValid) update("authorizationMethod", "");
                      }}
                      className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${form.companyHasSoleDirector === val ? "border-accent bg-accent-soft text-ink" : "border-slate-300 bg-white text-slate-600 hover:border-accent/40"}`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
                {fieldErrors.companyHasSoleDirector && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.companyHasSoleDirector}</p>}
              </div>

              {form.companyHasSoleDirector !== null && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    How is this engagement authorised? <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    {(form.companyHasSoleDirector ? (["sole_director", "board_resolution"] as const) : (["two_directors", "board_resolution"] as const)).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => update("authorizationMethod", m)}
                        className={`flex w-full items-center gap-2 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors ${form.authorizationMethod === m ? "border-accent bg-accent-soft text-ink" : "border-slate-300 bg-white text-slate-600 hover:border-accent/40"}`}
                      >
                        {form.authorizationMethod === m ? <CheckCircle2 size={15} className="shrink-0 text-accent" /> : <span className="h-[15px] w-[15px] shrink-0 rounded-full border border-slate-300" />}
                        {AUTHORIZATION_METHOD_LABELS[m]}
                      </button>
                    ))}
                  </div>
                  {fieldErrors.authorizationMethod && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.authorizationMethod}</p>}
                  {fieldErrors.authorization && <p className="mt-1.5 text-xs text-red-600">{fieldErrors.authorization}</p>}
                </div>
              )}

              {(form.authorizationMethod === "two_directors" || form.authorizationMethod === "sole_director") && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-800">
                    Signatory details {form.authorizationMethod === "two_directors" ? "(at least two Directors)" : "(sole Director)"}
                  </label>
                  <div className="space-y-2">
                    {form.loaSignatories.map((sig, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={sig.name} onChange={(e) => updateSignatory(i, "name", e.target.value)} placeholder="Director name" className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
                        <input type="text" value={sig.title} onChange={(e) => updateSignatory(i, "title", e.target.value)} placeholder="Title (e.g. Director)" className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
                        {form.loaSignatories.length > 1 && (
                          <button type="button" onClick={() => removeSignatory(i)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:border-red-300 hover:text-red-500 transition-colors">
                            <X size={15} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  {form.authorizationMethod === "two_directors" && (
                    <button type="button" onClick={addSignatory} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-bright transition-colors">
                      <Plus size={13} />Add another signatory
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Document uploads */}
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-800">Document Upload</h4>
              <p className="mb-4 text-xs text-slate-500">
                Upload supporting documents to accelerate the forensic review. All files are encrypted at rest using AES-256. Upload is optional — documents can also be submitted after your engagement call.
              </p>
              <div className="space-y-3">
                {UPLOAD_SLOTS.map((slot) => {
                  // Show only the document relevant to the chosen authorisation method.
                  if (slot.key === "board-resolution" && form.authorizationMethod !== "board_resolution") return null;
                  if (slot.key === "letter-of-authority" && form.authorizationMethod === "board_resolution") return null;
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
                          className={`w-full flex items-start justify-between rounded-xl border-2 border-dashed p-4 transition-colors text-left ${status === "error" ? "border-red-300 bg-red-50" : "border-slate-300 bg-slate-50 hover:border-accent/50 hover:bg-accent-soft"}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${status === "uploading" ? "border-accent/20 bg-accent-soft" : "border-slate-200 bg-white"}`}>
                              {status === "uploading" ? <Loader2 size={15} className="animate-spin text-accent" /> : <FileText size={15} className="text-slate-400" />}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{slot.label}</p>
                              <p className="text-xs text-slate-400">{slot.hint}</p>
                              {errMsg && <p className="mt-1 text-xs text-red-600">{errMsg}</p>}
                            </div>
                          </div>
                          <div className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${status === "uploading" ? "border-accent/20 text-accent" : "border-slate-300 bg-white text-slate-600"}`}>
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
                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${form.confirmedSignatory ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-accent/40"}`}>
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

                <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${form.agreedNDPA ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-accent/40"}`}>
                  <input
                    type="checkbox"
                    checked={form.agreedNDPA}
                    onChange={(e) => update("agreedNDPA", e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
                  />
                  <span className="text-sm text-slate-700">
                    <span className="font-semibold text-slate-900">NDPA 2023 & NDA: </span>
                    I agree to handling of all financial data under the{" "}
                    <span className="font-semibold text-ink">Nigeria Data Protection Act (NDPA) 2023</span>, and acknowledge that a mutual Non-Disclosure Agreement (NDA) governs all information exchanged during this engagement.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Terms & Data-Protection agreement */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">{RECOVERY_TERMS.title}</h4>
              <p className="text-xs text-slate-500">
                Version {RECOVERY_TERMS.version} · Effective {RECOVERY_TERMS.effectiveDate}
              </p>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="space-y-3">
                {RECOVERY_TERMS.sections.map((s) => (
                  <div key={s.heading}>
                    <p className="text-xs font-bold text-slate-800">{s.heading}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="f-termsSignerName" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Type your full name as signature <span className="text-red-500">*</span>
                </label>
                <input id="f-termsSignerName" type="text" value={form.termsSignerName} onChange={(e) => update("termsSignerName", e.target.value)} placeholder="e.g. Amaka Okonkwo" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
              <div>
                <label htmlFor="f-termsSignerTitle" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Title / Role <span className="font-normal text-slate-400">(optional)</span>
                </label>
                <input id="f-termsSignerTitle" type="text" value={form.termsSignerTitle} onChange={(e) => update("termsSignerTitle", e.target.value)} placeholder="e.g. Chief Financial Officer" className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 transition" />
              </div>
            </div>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border-2 p-4 transition-colors ${form.termsAccepted ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-accent/40"}`}>
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => update("termsAccepted", e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              <span className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">I accept the engagement terms &amp; data protection policy. </span>
                I have read and understood the terms above and accept them on behalf of the company; my typed name constitutes my electronic signature.
              </span>
            </label>
            {fieldErrors.terms && <p className="text-xs text-red-600">{fieldErrors.terms}</p>}
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

          {step < LAST_STEP ? (
            <button
              type="button"
              onClick={() => {
                track("intake_step", { from: step + 1, to: step + 2 });
                setStep((s) => s + 1);
              }}
              disabled={!stepValid(step)}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              Continue<ChevronRight size={16} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={loading || !step4Valid()}
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
