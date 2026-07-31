import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getSupabaseClient } from "@/lib/supabase";

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

    const db = getSupabaseClient();

    const [ordersResult, ticketsResult, refundResult, resolvedResult] = await Promise.all([
      db.from("orders").select("id", { count: "exact", head: true }).eq("shop_id", shop.id),
      db.from("tickets").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "open"),
      db.from("refund_logs").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "pending"),
      db.from("tickets").select("id", { count: "exact", head: true }).eq("shop_id", shop.id).eq("status", "resolved"),
    ]);

    const { data: recentTickets } = await db
      .from("tickets")
      .select("id, subject, status, category, created_at")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: recentRefunds } = await db
      .from("refund_logs")
      .select("id, amount, status, refund_type, processed_at")
      .eq("shop_id", shop.id)
      .order("processed_at", { ascending: false })
      .limit(5);

    return NextResponse.json({
      stats: {
        totalOrders: ordersResult.count || 0,
        openTickets: ticketsResult.count || 0,
        pendingRefunds: refundResult.count || 0,
        resolvedToday: resolvedResult.count || 0,
      },
      recentTickets: recentTickets || [],
      recentRefunds: recentRefunds || [],
    });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
