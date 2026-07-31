import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain, createShop, updateShopAccessToken } from "@/lib/db/shops";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const shop = searchParams.get("shop");
    const state = searchParams.get("state");

    const savedState = request.cookies.get("shopify_oauth_state")?.value;
    const savedShop = request.cookies.get("shopify_oauth_shop")?.value;

    if (!code || !shop || !state) {
      return NextResponse.json({ error: "Missing OAuth parameters" }, { status: 400 });
    }

    if (state !== savedState) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 403 });
    }

    const shopDomain = shop.includes(".myshopify.com") ? shop : `${shop}.myshopify.com`;

    const hmac = crypto.createHmac("sha256", process.env.SHOPIFY_API_SECRET!);
    const filteredParams = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (key !== "hmac") filteredParams.append(key, value);
    });
    hmac.update(filteredParams.toString());
    const calculatedHmac = hmac.digest("hex");
    const receivedHmac = searchParams.get("hmac");

    if (receivedHmac && !crypto.timingSafeEqual(Buffer.from(calculatedHmac), Buffer.from(receivedHmac))) {
      return NextResponse.json({ error: "HMAC verification failed" }, { status: 403 });
    }

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
    dashboardUrl.searchParams.set("host", request.nextUrl.searchParams.get("host") || "");

    const response = NextResponse.redirect(dashboardUrl);
    response.cookies.delete("shopify_oauth_state");
    response.cookies.delete("shopify_oauth_shop");

    return response;
  } catch (error: any) {
    console.error("Callback error:", error);
    return NextResponse.json(
      { error: "Callback failed", details: error.message },
      { status: 500 }
    );
  }
}
