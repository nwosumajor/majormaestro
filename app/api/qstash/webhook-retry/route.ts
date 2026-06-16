import { NextRequest, NextResponse, after } from "next/server";
import { verifyQstashSignature } from "@/lib/qstash";
import { processRetries } from "@/lib/webhooks";

// QStash calls this at a webhook delivery's backoff time. We verify the QStash
// signature, then re-attempt due deliveries after responding (so QStash gets a
// fast 200). The daily cron is still a backstop.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("upstash-signature");
  if (!(await verifyQstashSignature(signature, body))) {
    return NextResponse.json({ error: "Invalid or missing QStash signature." }, { status: 401 });
  }
  after(() => processRetries().catch((e) => console.error("[qstash/webhook-retry] processRetries error:", e)));
  return NextResponse.json({ ok: true });
}
