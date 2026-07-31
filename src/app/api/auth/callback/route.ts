import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain, createShop, updateShopAccessToken } from "@/lib/db/shops";

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
  try {
    const shopify = getShopify();
    const callbackData = await shopify.auth.callback({
      rawRequest: request as any,
      rawResponse: new NextResponse(),
    });

    const { session } = callbackData;
    const shopDomain = session.shop;
    const accessToken = session.accessToken || "";

    const existingShop = await getShopByDomain(shopDomain);

    if (existingShop) {
      await updateShopAccessToken(shopDomain, accessToken, session.scope || "");
    } else {
      await createShop({
        shopify_domain: shopDomain,
        access_token: accessToken,
        scope: session.scope || "",
        is_active: true,
      });
    }

    const dashboardUrl = new URL("/dashboard", request.url);
    dashboardUrl.searchParams.set("shop", shopDomain);
    dashboardUrl.searchParams.set("host", request.nextUrl.searchParams.get("host") || "");
    return NextResponse.redirect(dashboardUrl);
  } catch (error: any) {
    console.error("Callback error:", error);
    return NextResponse.json(
      { error: "Callback failed", details: error.message },
      { status: 500 }
    );
  }
}
