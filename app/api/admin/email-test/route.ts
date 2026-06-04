import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/rbac";
import { getEmailConfigStatus, sendPlain } from "@/lib/email";
import { recordAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const gate = await requireAdmin(req, "cases.read");
  if (gate.error) return gate.error;
  return NextResponse.json(getEmailConfigStatus());
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin(req, "ops.email_test");
  if (gate.error) return gate.error;
  const { admin } = gate;

  const status = getEmailConfigStatus();
  if (!status.configured) {
    return NextResponse.json({ error: status.problems.join(" ") }, { status: 503 });
  }

  let target = admin.email;
  try {
    const body = (await req.json().catch(() => ({}))) as { to?: string };
    if (body.to) target = body.to.trim();
  } catch {
    /* noop */
  }

  try {
    const result = await sendPlain({
      to: target,
      subject: "[MajorGBN] Email pipeline test",
      html: `<div style="font-family:Arial,sans-serif;padding:20px">
        <p><strong>This is a test email from your MajorGBN admin panel.</strong></p>
        <p>If you're reading this, the Resend integration is working.</p>
        <p style="color:#94a3b8;font-size:12px">Triggered by ${admin.email} at ${new Date().toISOString()}.</p>
      </div>`,
    });

    await recordAudit({
      action: "email_test",
      actorLabel: admin.email,
      metadata: { to: target, resendId: result.data?.id ?? null },
    });

    return NextResponse.json({ success: true, to: target, resendId: result.data?.id ?? null });
  } catch (err) {
    console.error("[/api/admin/email-test]", err);
    await recordAudit({
      action: "email_test",
      actorLabel: admin.email,
      metadata: { to: target, error: err instanceof Error ? err.message : "unknown" },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to send test email." },
      { status: 502 }
    );
  }
}
