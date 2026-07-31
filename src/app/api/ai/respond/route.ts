import { NextRequest, NextResponse } from "next/server";
import { generateSupportResponse, categorizeTicket } from "@/lib/ai/support-engine";
import { getShopByDomain } from "@/lib/db/shops";
import { getOrderById, searchOrdersByEmail } from "@/lib/db/orders";
import { getTicketById, getTicketMessages, updateTicket, addTicketMessage } from "@/lib/db/tickets";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ticketId, shopDomain } = body;

  if (!ticketId || !shopDomain) {
    return NextResponse.json({ error: "Missing ticketId or shopDomain" }, { status: 400 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const ticket = await getTicketById(ticketId);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Get order if linked
    let order = null;
    if (ticket.order_id) {
      order = await getOrderById(ticket.order_id);
    } else {
      // Try to find order by customer email
      const orders = await searchOrdersByEmail(shop.id, ticket.customer_email);
      if (orders.length > 0) {
        order = orders[0];
      }
    }

    // Get conversation history
    const messages = await getTicketMessages(ticketId);

    // Auto-categorize if not set
    if (!ticket.category && messages.length > 0) {
      const lastCustomerMsg = messages.filter((m) => m.sender_type === "customer").pop();
      if (lastCustomerMsg) {
        const { category, priority } = await categorizeTicket(ticket.subject, lastCustomerMsg.content);
        await updateTicket(ticketId, { category, priority });
        ticket.category = category as any;
        ticket.priority = priority as any;
      }
    }

    // Generate AI response
    const aiResponse = await generateSupportResponse({
      ticket,
      order,
      messages,
      shopName: shop.shopify_domain.replace(".myshopify.com", ""),
      shopPolicies: "Standard 30-day return policy. Free returns for defective items.",
    });

    // Save AI response
    await updateTicket(ticketId, {
      ai_response: aiResponse,
      ai_responded_at: new Date().toISOString(),
      status: "pending",
    });

    // Add AI message to conversation
    await addTicketMessage({
      ticket_id: ticketId,
      sender_type: "ai",
      content: aiResponse,
    });

    return NextResponse.json({ success: true, response: aiResponse });
  } catch (error: any) {
    console.error("AI response error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
