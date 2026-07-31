import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/shopify";
import { getShopByDomain } from "@/lib/db/shops";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

  if (!/^[a-z0-9-]+\.myshopify\.com$/.test(shopDomain)) {
    return NextResponse.json({ error: "Invalid shop domain" }, { status: 400 });
  }

  try {
    const existingShop = await getShopByDomain(shopDomain);

    if (existingShop) {
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("shop", shopDomain);
      return NextResponse.redirect(dashboardUrl);
    }

    const state = crypto.randomBytes(16).toString("hex");
    const authUrl = buildAuthUrl(shopDomain, state);

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed", details: error.message },
      { status: 500 }
    );
  }
}
