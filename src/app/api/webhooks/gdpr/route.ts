import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/webhook-utils";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");

  if (!hmac || !shopDomain) {
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  if (!verifyWebhook(body, hmac, process.env.SHOPIFY_API_SECRET!)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  const payload = JSON.parse(body);

  switch (topic) {
    case "customers/data-request":
      // GDPR: Respond with customer data within 30 days
      console.log(`[GDPR] Data request for customer ${payload.customer?.id} on ${shopDomain}`);
      // In production: collect all customer data and email to store owner
      break;

    case "customers/redact":
      // GDPR: Delete customer data within 30 days
      console.log(`[GDPR] Data redaction for customer ${payload.customer?.id} on ${shopDomain}`);
      // In production: delete customer data from your database
      break;

    case "shop/redact":
      // GDPR: Delete shop data within 30 days of uninstall
      console.log(`[GDPR] Shop data redaction for ${shopDomain}`);
      // In production: delete all shop data from your database
      break;

    case "app/uninstalled":
      console.log(`[App] App uninstalled from ${shopDomain}`);
      // In production: mark shop as inactive, clean up data
      break;

    case "app/scopes_update":
      console.log(`[App] Scopes updated for ${shopDomain}: ${payload.approved_scopes}`);
      break;
  }

  return NextResponse.json({ success: true });
}
