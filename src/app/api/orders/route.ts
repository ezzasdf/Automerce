import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getOrdersByShopId } from "@/lib/db/orders";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const shopDomain = searchParams.get("shop");
  const status = searchParams.get("status") || undefined;

  if (!shopDomain) {
    return NextResponse.json({ error: "Missing shop parameter" }, { status: 400 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let orders = await getOrdersByShopId(shop.id);

    if (status) {
      orders = orders.filter((o) => o.financial_status === status);
    }

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("Get orders error:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
