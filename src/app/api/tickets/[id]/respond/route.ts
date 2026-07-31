import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { getTicketById, getTicketMessages, updateTicket, addTicketMessage } from "@/lib/db/tickets";
import { getOrderById, searchOrdersByEmail } from "@/lib/db/orders";
import { generateSupportResponse } from "@/lib/ai/support-engine";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { shopDomain } = body;

  if (!shopDomain) {
    return NextResponse.json({ error: "Missing shopDomain" }, { status: 400 });
  }

  try {
    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    const ticket = await getTicketById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Find linked order
    let order = null;
    if (ticket.order_id) {
      order = await getOrderById(ticket.order_id);
    } else {
      const orders = await searchOrdersByEmail(shop.id, ticket.customer_email);
      if (orders.length > 0) {
        order = orders[0];
      }
    }

    const messages = await getTicketMessages(params.id);

    const aiResponse = await generateSupportResponse({
      ticket,
      order,
      messages,
      shopName: shop.shopify_domain.replace(".myshopify.com", ""),
      shopPolicies: "Standard 30-day return policy. Free returns for defective items.",
    });

    // Save AI response
    await updateTicket(params.id, {
      ai_response: aiResponse,
      ai_responded_at: new Date().toISOString(),
      status: "pending",
    });

    await addTicketMessage({
      ticket_id: params.id,
      sender_type: "ai",
      content: aiResponse,
    });

    return NextResponse.json({ success: true, response: aiResponse });
  } catch (error: any) {
    console.error("AI respond error:", error);
    return NextResponse.json({ error: "Failed to generate response" }, { status: 500 });
  }
}
