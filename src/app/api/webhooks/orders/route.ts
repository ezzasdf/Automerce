import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/webhook-utils";
import { getShopByDomain } from "@/lib/db/shops";
import { upsertOrder } from "@/lib/db/orders";
import type { WebhookOrder } from "@/types";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");
  const topic = request.headers.get("X-Shopify-Topic");

  if (!hmac || !shopDomain) {
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  if (!verifyWebhook(body, hmac, process.env.SHOPIFY_API_SECRET!)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const order: WebhookOrder = JSON.parse(body);
    await upsertOrder(shop.id, order);

    console.log(`[Webhook] ${topic} processed for order ${order.name} on ${shopDomain}`);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error(`[Webhook] Error processing ${topic}:`, error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
