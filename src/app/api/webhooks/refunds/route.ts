import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/webhook-utils";
import { getShopByDomain } from "@/lib/db/shops";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");

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

    const refund = JSON.parse(body);
    console.log(`[Webhook] Refund created on ${shopDomain}:`, refund.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Webhook] Refund error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
