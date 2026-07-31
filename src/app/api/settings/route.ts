import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shopDomain = searchParams.get("shop");

  if (!shopDomain) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({
      settings: {
        shopName: shop.shop_name || shop.shopify_domain.replace(".myshopify.com", ""),
        returnPolicy: shop.return_policy || "30-day return policy for unused items in original packaging.",
        aiEnabled: shop.ai_enabled ?? true,
        autoRespond: shop.auto_respond ?? false,
        notifyOnNewTicket: shop.notify_on_ticket ?? true,
        emailEnabled: shop.email_enabled ?? true,
        shopifySyncEnabled: shop.shopify_sync_enabled ?? true,
      },
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

const ALLOWED_FIELDS = [
  "shop_name",
  "return_policy",
  "ai_enabled",
  "auto_respond",
  "notify_on_ticket",
  "email_enabled",
  "shopify_sync_enabled",
];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain, ...settings } = body;

    if (!shopDomain) {
      return NextResponse.json({ error: "Missing shopDomain" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const db = getSupabaseClient();

    const updates: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in settings) {
        updates[key] = settings[key];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { error } = await db
      .from("shops")
      .update(updates)
      .eq("id", shop.id);

    if (error) {
      console.error("Update settings error:", error);
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
