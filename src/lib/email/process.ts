import { getSupabaseClient } from "@/lib/supabase";
import { getShopByDomain } from "@/lib/db/shops";
import { categorizeTicket, generateSupportResponse } from "@/lib/ai/support-engine";
import { addTicketMessage, updateTicket, getTicketById, getTicketMessages } from "@/lib/db/tickets";
import { getOrderById } from "@/lib/db/orders";
import type { InboundEmail } from "./parse";
import { parseInboundEmail } from "./parse";

export async function processInboundEmail(rawEmail: InboundEmail) {
  const parsed = parseInboundEmail(rawEmail);

  if (!parsed.shopDomain || !parsed.customerEmail) {
    console.error("[Email] Missing shop domain or customer email");
    return { success: false, error: "Missing shop domain or customer email" };
  }

  const shop = await getShopByDomain(parsed.shopDomain);
  if (!shop) {
    console.error(`[Email] Shop not found: ${parsed.shopDomain}`);
    return { success: false, error: "Shop not found" };
  }

  const db = getSupabaseClient();

  // Check if this is a reply to an existing ticket
  if (parsed.inReplyTo || parsed.references.length > 0) {
    const existingTicketId = await findTicketByMessageId(db, shop.id, parsed.inReplyTo, parsed.references);
    if (existingTicketId) {
      const result = await addMessageToExistingTicket(db, existingTicketId, parsed, shop.auto_respond);
      return result;
    }
  }

  // Find or link to an existing order
  const orderId = await findLinkedOrderId(db, shop.id, parsed.customerEmail);

  // Auto-categorize
  let category = "inquiry";
  let priority = "normal";
  try {
    const categorization = await categorizeTicket(parsed.subject, parsed.body);
    category = categorization.category;
    priority = categorization.priority;
  } catch (err) {
    console.error("[Email] Categorization failed, using defaults:", err);
  }

  // Create new ticket
  const { data: ticket, error: ticketError } = await db
    .from("tickets")
    .insert({
      shop_id: shop.id,
      order_id: orderId,
      customer_email: parsed.customerEmail,
      customer_name: parsed.customerName || null,
      subject: parsed.subject,
      status: "open",
      priority,
      category,
    })
    .select()
    .single();

  if (ticketError) {
    console.error("[Email] Failed to create ticket:", ticketError);
    return { success: false, error: "Failed to create ticket" };
  }

  // Add the email as a customer message
  const { error: msgError } = await db
    .from("ticket_messages")
    .insert({
      ticket_id: ticket.id,
      sender_type: "customer",
      sender_email: parsed.customerEmail,
      content: parsed.body,
    });

  if (msgError) {
    console.error("[Email] Failed to add message:", msgError);
  }

  console.log(`[Email] Created ticket ${ticket.id} from ${parsed.customerEmail}`);

  // Auto-respond if enabled
  if (shop.auto_respond && shop.ai_enabled) {
    try {
      await autoRespondToTicket(ticket.id, shop);
    } catch (err) {
      console.error("[Email] Auto-respond failed:", err);
    }
  }

  return { success: true, ticketId: ticket.id };
}

async function autoRespondToTicket(ticketId: string, shop: any) {
  const ticket = await getTicketById(ticketId);
  if (!ticket) return;

  let order = null;
  if (ticket.order_id) {
    order = await getOrderById(ticket.order_id);
  }

  const messages = await getTicketMessages(ticketId);

  const aiResponse = await generateSupportResponse({
    ticket,
    order,
    messages,
    shopName: shop.shop_name || shop.shopify_domain.replace(".myshopify.com", ""),
    shopPolicies: shop.return_policy || "Standard 30-day return policy.",
  });

  await updateTicket(ticketId, {
    ai_response: aiResponse,
    ai_responded_at: new Date().toISOString(),
    status: "pending",
  });

  await addTicketMessage({
    ticket_id: ticketId,
    sender_type: "ai",
    content: aiResponse,
  });

  console.log(`[Email] Auto-responded to ticket ${ticketId}`);
}

async function addMessageToExistingTicket(
  db: any,
  ticketId: string,
  parsed: { customerEmail: string; body: string },
  autoRespond: boolean
) {
  const { error } = await db
    .from("ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_type: "customer",
      sender_email: parsed.customerEmail,
      content: parsed.body,
    });

  if (error) {
    console.error("[Email] Failed to add reply to ticket:", error);
    return { success: false, error: "Failed to add message" };
  }

  // Reopen ticket if it was resolved
  await db
    .from("tickets")
    .update({ status: "open", resolved_at: null })
    .eq("id", ticketId)
    .eq("status", "resolved");

  console.log(`[Email] Added reply to ticket ${ticketId}`);

  // Auto-respond if enabled
  if (autoRespond) {
    try {
      const ticket = await getTicketById(ticketId);
      if (ticket) {
        const shop = await getShopByDomain(
          (await db.from("shops").select("shopify_domain").eq("id", ticket.shop_id).single()).data?.shopify_domain
        );
        if (shop?.ai_enabled) {
          await autoRespondToTicket(ticketId, shop);
        }
      }
    } catch (err) {
      console.error("[Email] Auto-respond on reply failed:", err);
    }
  }

  return { success: true, ticketId };
}

async function findTicketByMessageId(
  db: any,
  shopId: string,
  inReplyTo: string | null,
  references: string[]
): Promise<string | null> {
  if (!inReplyTo && references.length === 0) return null;

  const messageIds = [inReplyTo, ...references].filter(Boolean);

  const { data } = await db
    .from("ticket_messages")
    .select("ticket_id")
    .in("content", messageIds)
    .limit(1);

  return data?.[0]?.ticket_id || null;
}

async function findLinkedOrderId(
  db: any,
  shopId: string,
  customerEmail: string
): Promise<string | null> {
  const { data } = await db
    .from("orders")
    .select("id")
    .eq("shop_id", shopId)
    .ilike("customer_email", customerEmail)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data?.id || null;
}
