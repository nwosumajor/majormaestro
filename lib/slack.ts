// Lightweight Slack Incoming Webhook notifier for internal team alerts. No-op
// when SLACK_WEBHOOK_URL is unset (graceful, like the SMS/Paystack stubs).
export function slackConfigured(): boolean {
  return Boolean(process.env.SLACK_WEBHOOK_URL);
}

export async function sendSlack(text: string): Promise<{ sent: boolean }> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url) return { sent: false };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      cache: "no-store",
    });
    return { sent: res.ok };
  } catch (err) {
    console.error("[slack] notify error:", err);
    return { sent: false };
  }
}
