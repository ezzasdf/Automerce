import { NextRequest, NextResponse } from "next/server";
import { getShopify } from "@/lib/shopify";
import { getShopByDomain, createShop, updateShopAccessToken } from "@/lib/db/shops";

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
        auto_respond: false,
        ai_enabled: true,
        notify_on_ticket: true,
        return_policy: "30-day return policy for unused items in original packaging.",
        shop_name: "",
        email_enabled: true,
        shopify_sync_enabled: true,
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
