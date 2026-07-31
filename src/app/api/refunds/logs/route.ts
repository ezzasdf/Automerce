import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getRefundLogsByShopId } from "@/lib/db/refund-rules";

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

    const logs = await getRefundLogsByShopId(shop.id);
    return NextResponse.json({ logs });
  } catch (error: any) {
    console.error("Get refund logs error:", error);
    return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
  }
}
