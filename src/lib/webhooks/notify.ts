/**
 * Webhook notifications for provisioning events
 * Reads WEBHOOK_URL env var (global) or per-client webhookUrl (future)
 */

export type WebhookEvent =
  | "phone.provisioned"
  | "phone.provision.failed"
  | "phone.rebooted"
  | "phone.config.changed"
  | "firmware.uploaded";

export type WebhookPayload = {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
};

export async function sendWebhook(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  const webhookUrl = process.env.WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.WEBHOOK_SECRET ? { "x-webhook-secret": process.env.WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // Silently fail — webhooks are best-effort
  }
}
