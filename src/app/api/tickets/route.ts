import { NextRequest, NextResponse } from "next/server";
import { getShopByDomain } from "@/lib/db/shops";
import { createTicket, getTicketsByShopId, addTicketMessage, updateTicket, getTicketMessages } from "@/lib/db/tickets";
import { getOrderById } from "@/lib/db/orders";
import { categorizeTicket, generateSupportResponse } from "@/lib/ai/support-engine";

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

    const tickets = await getTicketsByShopId(shop.id, status);
    return NextResponse.json({ tickets });
  } catch (error: any) {
    console.error("Get tickets error:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shopDomain, customerEmail, customerName, subject, message, orderId } = body;

    if (!shopDomain || !customerEmail || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const shop = await getShopByDomain(shopDomain);
    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    // Auto-categorize
    const { category, priority } = await categorizeTicket(subject, message);

    // Create ticket
    const ticket = await createTicket({
      shop_id: shop.id,
      order_id: orderId || null,
      customer_email: customerEmail,
      customer_name: customerName || null,
      subject,
      category,
      priority,
    });

    // Add initial customer message
    await addTicketMessage({
      ticket_id: ticket.id,
      sender_type: "customer",
      sender_email: customerEmail,
      content: message,
    });

    // Auto-respond if enabled
    if (shop.auto_respond && shop.ai_enabled) {
      try {
        let order = null;
        if (orderId) {
          order = await getOrderById(orderId);
        }
        const messages = await getTicketMessages(ticket.id);

        const aiResponse = await generateSupportResponse({
          ticket,
          order,
          messages,
          shopName: shop.shop_name || shop.shopify_domain.replace(".myshopify.com", ""),
          shopPolicies: shop.return_policy || "Standard 30-day return policy.",
        });

        await updateTicket(ticket.id, {
          ai_response: aiResponse,
          ai_responded_at: new Date().toISOString(),
          status: "pending",
        });

        await addTicketMessage({
          ticket_id: ticket.id,
          sender_type: "ai",
          content: aiResponse,
        });
      } catch (err) {
        console.error("Auto-respond failed:", err);
      }
    }

    return NextResponse.json({ ticket });
  } catch (error: any) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
