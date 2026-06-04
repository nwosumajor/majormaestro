import { STEP_DEFS, type StepKey } from "@/lib/recoverySteps";

interface CaseForPdf {
  referenceId: string;
  companyName: string;
  rcNumber: string;
  turnoverBand: string;
  banks: string[];
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  status: string;
  assignedTeam: string | null;
  createdAt: Date;
  closedAt: Date | null;
  findingsSummary: string | null;
  recoveryAmountKobo: bigint | null;
  statusEvents: { step: string; reachedAt: Date; note: string | null }[];
  notes: { authorEmail: string; body: string; createdAt: Date }[];
  documents: { fileName: string; documentType: string; fileSize: number; uploadedAt: Date }[];
}

function fmtDate(d: Date): string {
  return d.toLocaleString("en-NG", { dateStyle: "long", timeStyle: "short" });
}

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtNgn(kobo: bigint | null): string {
  if (kobo === null) return "—";
  const naira = Number(kobo) / 100;
  return `₦${naira.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

interface RenderOptions {
  includeInternalNotes: boolean;
}

export async function renderCaseReport(
  data: CaseForPdf,
  opts: RenderOptions = { includeInternalNotes: false }
): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const PAGE_W = doc.internal.pageSize.getWidth();
  const PAGE_H = doc.internal.pageSize.getHeight();
  const MARGIN = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  function ensureSpace(needed: number) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function rule() {
    ensureSpace(6);
    doc.setDrawColor(220);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;
  }

  function heading(text: string) {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(text, MARGIN, y);
    y += 18;
  }

  function para(text: string, size = 10) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(text, CONTENT_W) as string[];
    for (const line of lines) {
      ensureSpace(size + 4);
      doc.text(line, MARGIN, y);
      y += size + 4;
    }
  }

  function row(label: string, value: string) {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label.toUpperCase(), MARGIN, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    const lines = doc.splitTextToSize(value || "—", CONTENT_W - 140) as string[];
    for (let i = 0; i < lines.length; i++) {
      doc.text(lines[i], MARGIN + 140, y);
      if (i < lines.length - 1) {
        y += 12;
        ensureSpace(12);
      }
    }
    y += 14;
  }

  // ─── Cover ───────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, PAGE_W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("MajorGBN", MARGIN, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text("Forensic Recovery — Case Status Report", MARGIN, 70);
  y = 120;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42);
  doc.text(data.companyName, MARGIN, y);
  y += 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Reference ${data.referenceId} · Generated ${fmtDate(new Date())}`, MARGIN, y);
  y += 24;
  rule();

  // ─── Case Summary ────────────────────────────────────────────────────
  heading("Case Summary");
  row("Status", STEP_DEFS[data.status as StepKey]?.label ?? data.status);
  row("RC Number", data.rcNumber);
  row("Annual Turnover Band", data.turnoverBand);
  row("Banks under audit", data.banks.join(", "));
  row("Assigned Team", data.assignedTeam ?? "—");
  row("Received", fmtDate(data.createdAt));
  if (data.closedAt) row("Closed / Recovered", fmtDate(data.closedAt));
  if (data.recoveryAmountKobo !== null) row("Recovery Amount", fmtNgn(data.recoveryAmountKobo));
  y += 6;
  rule();

  // ─── Contact ─────────────────────────────────────────────────────────
  heading("Authorised Contact");
  row("Name", data.contactName);
  row("Title", data.contactTitle);
  row("Email", data.contactEmail);
  row("Phone", data.contactPhone);
  y += 6;
  rule();

  // ─── Timeline ────────────────────────────────────────────────────────
  heading("Case Timeline");
  if (data.statusEvents.length === 0) {
    para("No status events recorded.");
  } else {
    for (const ev of data.statusEvents) {
      const def = STEP_DEFS[ev.step as StepKey];
      ensureSpace(36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(29, 78, 216);
      doc.text(def?.label ?? ev.step, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(fmtDate(ev.reachedAt), PAGE_W - MARGIN, y, { align: "right" });
      y += 13;
      if (def?.description) para(def.description, 9);
      if (ev.note) {
        doc.setFont("helvetica", "italic");
        doc.setTextColor(71, 85, 105);
        para(`Note: ${ev.note}`, 9);
        doc.setFont("helvetica", "normal");
      }
      y += 4;
    }
  }
  y += 6;
  rule();

  // ─── Findings ────────────────────────────────────────────────────────
  heading("Forensic Findings");
  if (data.findingsSummary) {
    para(data.findingsSummary);
  } else {
    doc.setFont("helvetica", "italic");
    para("Forensic findings have not yet been entered for this case. This section will be populated once the forensic audit concludes.", 10);
    doc.setFont("helvetica", "normal");
  }
  y += 6;
  rule();

  // ─── Documents ───────────────────────────────────────────────────────
  heading("Supporting Documents");
  if (data.documents.length === 0) {
    para("No documents on file for this case.");
  } else {
    for (const d of data.documents) {
      ensureSpace(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(d.fileName, MARGIN, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`${d.documentType} · ${fmtBytes(d.fileSize)} · ${fmtDate(d.uploadedAt)}`, PAGE_W - MARGIN, y, { align: "right" });
      y += 14;
    }
  }
  y += 6;

  // ─── Internal Notes (admin variant only) ─────────────────────────────
  if (opts.includeInternalNotes && data.notes.length > 0) {
    rule();
    heading("Internal Notes (Admin Only)");
    for (const n of data.notes) {
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`${n.authorEmail} · ${fmtDate(n.createdAt)}`, MARGIN, y);
      y += 12;
      para(n.body, 9);
      y += 4;
    }
  }

  // ─── Footer ──────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `MajorGBN Forensic Recovery · Page ${i} of ${pageCount} · Confidential under NDPA 2023 and NDA`,
      PAGE_W / 2,
      PAGE_H - 24,
      { align: "center" }
    );
  }

  const arr = doc.output("arraybuffer");
  return Buffer.from(arr);
}

// ─── GICN certificate (participation / award) ──────────────────────────────

export async function renderGicnCertificate(opts: {
  participantName: string;
  programTitle: string;
  variant: "participation" | "award";
  awardAmount?: string; // formatted ₦ string, for awards
  dateLabel: string;
}): Promise<Buffer> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();

  doc.setDrawColor(5, 150, 105);
  doc.setLineWidth(3);
  doc.rect(24, 24, W - 48, H - 48);
  doc.setDrawColor(11, 18, 32);
  doc.setLineWidth(1);
  doc.rect(34, 34, W - 68, H - 68);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 18, 32);
  doc.setFontSize(14);
  doc.text("GLOBAL IMPACT CHRISTIAN NETWORK", W / 2, 92, { align: "center" });

  doc.setTextColor(5, 150, 105);
  doc.setFontSize(28);
  doc.text(opts.variant === "award" ? "Certificate of Award" : "Certificate of Participation", W / 2, 142, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(13);
  doc.text("This certificate is proudly presented to", W / 2, 188, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setTextColor(11, 18, 32);
  doc.setFontSize(34);
  doc.text(opts.participantName, W / 2, 238, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(13);
  const line =
    opts.variant === "award"
      ? `for being awarded ${opts.awardAmount ?? ""} under ${opts.programTitle}`.trim()
      : `for participating in ${opts.programTitle}`;
  doc.text(line, W / 2, 282, { align: "center", maxWidth: W - 160 });

  doc.setFontSize(11);
  doc.setTextColor(148, 163, 184);
  doc.text(opts.dateLabel, W / 2, H - 92, { align: "center" });
  doc.text("MajorGBN Enterprise Platform · Global Impact Christian Network", W / 2, H - 62, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
