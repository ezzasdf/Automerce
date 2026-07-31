import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain, createShop, updateShopAccessToken } from "@/lib/db/shops";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");

    if (!code || !shop) {
      return NextResponse.json({ error: "Missing OAuth parameters" }, { status: 400 });
    }

    const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

    const tokenResponse = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_API_KEY!,
        client_secret: process.env.SHOPIFY_API_SECRET!,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error("Token exchange failed:", errText);
      return NextResponse.json({ error: "Token exchange failed", details: errText }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const scope = tokenData.scope || "";

    const existingShop = await getShopByDomain(shopDomain);

    if (existingShop) {
      await updateShopAccessToken(shopDomain, accessToken, scope);
    } else {
      await createShop({
        shopify_domain: shopDomain,
        access_token: accessToken,
        scope,
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

    return NextResponse.redirect(dashboardUrl);
  } catch (error: any) {
    console.error("Callback error:", error);
    return NextResponse.json(
      { error: "Callback failed", details: error.message },
      { status: 500 }
    );
  }
}
