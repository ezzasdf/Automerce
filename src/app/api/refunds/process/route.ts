import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getOrderById } from "@/lib/db/orders";
import { getTicketById, updateTicket } from "@/lib/db/tickets";
import { evaluateRules } from "@/lib/refunds/rule-engine";
import { processRefund } from "@/lib/refunds/processor";
import { createRefundLog, getRefundRulesByShopId } from "@/lib/db/refund-rules";
import { getShopifyClient } from "@/lib/shopify";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, orderId, shopDomain, manual = false } = body;

    if (!shopDomain) {
      return NextResponse.json({ error: "Missing shopDomain" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    let ticket = null;
    if (ticketId) {
      ticket = await getTicketById(ticketId);
    }

    const order = orderId ? await getOrderById(orderId) : ticket?.order_id ? await getOrderById(ticket.order_id) : null;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check rules if not manual
    if (!manual) {
      const rules = await getRefundRulesByShopId(shop.id);
      const evaluation = ticket ? evaluateRules(ticket, order, rules) : null;

      if (!evaluation?.shouldAutoRefund) {
        return NextResponse.json({
          success: false,
          message: "No matching auto-refund rules. Use manual mode to process.",
          evaluation,
        });
      }
    }

    // Process refund via Shopify
    const admin = getShopifyClient(shop.access_token, shop.shopify_domain);

    const lineItems = order.line_items.map((item: any) => ({
      lineItemId: item.variant_id || "",
      quantity: item.quantity,
    }));

    const refundResult = await processRefund(admin, {
      orderId: order.shopify_order_id,
      lineItems,
      note: `Refund processed${ticket ? ` for ticket: ${ticket.subject}` : ""}`,
      restock: false,
      refundShipping: false,
    });

    // Log refund
    await createRefundLog({
      shop_id: shop.id,
      ticket_id: ticketId || null,
      order_id: order.id,
      rule_id: null,
      refund_type: manual ? "manual" : "auto",
      amount: refundResult.amount,
      shopify_refund_id: refundResult.refundId,
      status: refundResult.success ? "completed" : "failed",
      reason: refundResult.error || "Refund processed",
    });

    // Update ticket if linked
    if (ticket && refundResult.success) {
      await updateTicket(ticket.id, {
        status: "resolved",
        resolved_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: refundResult.success,
      refundId: refundResult.refundId,
      amount: refundResult.amount,
      error: refundResult.error,
    });
  } catch (error: any) {
    console.error("Refund processing error:", error);
    return NextResponse.json({ error: "Failed to process refund" }, { status: 500 });
  }
}
