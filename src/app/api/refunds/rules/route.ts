import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getRefundRulesByShopId, createRefundRule, deleteRefundRule } from "@/lib/db/refund-rules";

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

    const rules = await getRefundRulesByShopId(shop.id);
    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error("Get refund rules error:", error);
    return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain, name, conditions, actions } = body;

    if (!shopDomain || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const rule = await createRefundRule({
      shop_id: shop.id,
      name,
      is_active: true,
      conditions: conditions || {},
      actions: actions || { auto_refund: true, restock: false, notify_customer: true, refund_shipping: false },
      priority: 0,
    });

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error("Create refund rule error:", error);
    return NextResponse.json({ error: "Failed to create rule" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const ruleId = searchParams.get("id");
  const shopDomain = searchParams.get("shop");

  if (!ruleId || !shopDomain) {
    return NextResponse.json({ error: "Missing rule id or shop parameter" }, { status: 400 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    await deleteRefundRule(ruleId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete refund rule error:", error);
    return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 });
  }
}
