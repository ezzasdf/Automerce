import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getShopifyClient } from "@/lib/shopify";
import { syncShopifyConversations } from "@/lib/shopify-messages/sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain } = body;

    if (!shopDomain) {
      return NextResponse.json({ error: "Missing shopDomain" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const admin = getShopifyClient(shop.access_token, shop.shopify_domain);

    const result = await syncShopifyConversations(admin, shop.id);

    return NextResponse.json({
      success: true,
      synced: result.synced,
      errors: result.errors,
      details: result.details,
    });
  } catch (error: any) {
    console.error("Shopify sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}
