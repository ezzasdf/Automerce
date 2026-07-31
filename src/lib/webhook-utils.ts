import crypto from "crypto";

export function verifyWebhook(body: string, hmacHeader: string, secret: string): boolean {
  const hash = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return hash === hmacHeader;
}

export function getWebhookId(requestId: string | null): string {
  return requestId || crypto.randomUUID();
}
