import { NextRequest, NextResponse } from "next/server";
import { getShopifyClient } from "@/lib/shopify";
import { getShopByDomain } from "@/lib/db/shops";

// Lazy load shopify to avoid build-time initialization
function getShopify() {
  const { shopifyApi, ApiVersion } = require("@shopify/shopify-api");
  require("@shopify/shopify-api/adapters/node");
  return shopifyApi({
    apiKey: process.env.SHOPIFY_API_KEY!,
    apiSecretKey: process.env.SHOPIFY_API_SECRET!,
    scopes: (process.env.SHOPIFY_SCOPES || "read_orders,write_orders,read_customers").split(","),
    hostName: (process.env.SHOPIFY_APP_URL || "http://localhost:3000").replace(/https?:\/\//, ""),
    apiVersion: ApiVersion.October24,
    isEmbeddedApp: true,
  });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shop = searchParams.get("shop");

  if (!shop) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

  try {
    const existingShop = await getShopByDomain(shopDomain);

    if (existingShop) {
      const dashboardUrl = new URL("/dashboard", request.url);
      dashboardUrl.searchParams.set("shop", shopDomain);
      return NextResponse.redirect(dashboardUrl);
    }

    const shopify = getShopify();
    const authRoute = await shopify.auth.begin({
      shop: shopDomain,
      callbackPath: "/api/auth/callback",
      isOnline: true,
      rawRequest: request as any,
    });

    return NextResponse.redirect(authRoute);
  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { error: "Authentication failed", details: error.message },
      { status: 500 }
    );
  }
}
