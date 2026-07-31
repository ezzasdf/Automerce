import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@/lib/webhook-utils";
import { getShopByDomain } from "@/lib/db/shops";
import { getSupabaseClient } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const hmac = request.headers.get("X-Shopify-Hmac-Sha256");
  const topic = request.headers.get("X-Shopify-Topic");
  const shopDomain = request.headers.get("X-Shopify-Shop-Domain");

  if (!hmac || !shopDomain) {
    return NextResponse.json({ error: "Missing required headers" }, { status: 400 });
  }

  if (!verifyWebhook(body, hmac, process.env.SHOPIFY_API_SECRET!)) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getSupabaseClient();

  switch (topic) {
    case "customers/data-request":
      console.log(`[GDPR] Data request for customer ${payload.customer?.id} on ${shopDomain}`);
      break;

    case "customers/redact":
      console.log(`[GDPR] Data redaction for customer ${payload.customer?.id} on ${shopDomain}`);
      break;

    case "shop/redact":
      console.log(`[GDPR] Shop data redaction for ${shopDomain}`);
      try {
        const shop = await getShopByDomain(shopDomain);
        if (shop) {
          await db.from("refund_logs").delete().eq("shop_id", shop.id);
          await db.from("refund_rules").delete().eq("shop_id", shop.id);
          await db.from("ticket_messages").delete().in("ticket_id",
            (await db.from("tickets").select("id").eq("shop_id", shop.id)).data?.map((t: any) => t.id) || []
          );
          await db.from("tickets").delete().eq("shop_id", shop.id);
          await db.from("orders").delete().eq("shop_id", shop.id);
          await db.from("shops").delete().eq("id", shop.id);
        }
      } catch (err) {
        console.error("[GDPR] Shop redaction error:", err);
      }
      break;

    case "app/uninstalled":
      console.log(`[App] App uninstalled from ${shopDomain}`);
      try {
        const shop = await getShopByDomain(shopDomain);
        if (shop) {
          await db.from("shops").update({ is_active: false }).eq("id", shop.id);
        }
      } catch (err) {
        console.error("[App] Deactivation error:", err);
      }
      break;

    case "app/scopes_update":
      console.log(`[App] Scopes updated for ${shopDomain}: ${payload.approved_scopes}`);
      break;
  }

  return NextResponse.json({ success: true });
}
