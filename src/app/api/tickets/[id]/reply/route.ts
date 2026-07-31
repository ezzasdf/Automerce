import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getTicketById, getTicketMessages, addTicketMessage, updateTicket } from "@/lib/db/tickets";
import { getOrderById } from "@/lib/db/orders";
import { getShopifyClient } from "@/lib/shopify";
import { sendShopifyNotification, sendCustomerEmail } from "@/lib/shopify-messages/sync";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ticketId, shopDomain, message, sendVia = "shopify" } = body;

    if (!ticketId || !shopDomain || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Save the reply to our system
    await addTicketMessage({
      ticket_id: ticketId,
      sender_type: "human",
      sender_email: undefined,
      content: message,
    });

    await updateTicket(ticketId, {
      human_response: message,
      status: "pending",
    });

    // Send via Shopify if we have an order linked
    let shopifyResult = null;
    if (ticket.order_id) {
      const order = await getOrderById(ticket.order_id);
      if (order) {
        const admin = getShopifyClient(shop.access_token, shop.shopify_domain);

        if (sendVia === "email" && order.customer_email) {
          shopifyResult = await sendCustomerEmail(
            admin,
            order.shopify_order_id,
            order.customer_email,
            `Re: ${ticket.subject}`,
            message
          );
        } else {
          shopifyResult = await sendShopifyNotification(
            admin,
            order.shopify_order_id,
            message
          );
        }
      }
    }

    return NextResponse.json({
      success: true,
      shopifySent: shopifyResult?.success || false,
      shopifyError: shopifyResult?.error || null,
    });
  } catch (error: any) {
    console.error("Reply error:", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}
