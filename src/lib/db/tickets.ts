import { supabase } from "@/lib/supabase";
import type { Ticket, TicketMessage, TicketStatus } from "@/types";

export async function createTicket(ticket: {
  shop_id: string;
  order_id?: string;
  customer_email: string;
  customer_name?: string;
  subject: string;
  status?: TicketStatus;
  category?: string;
  priority?: string;
}): Promise<Ticket> {
  const { data, error } = await supabase
    .from("tickets")
    .insert({
      shop_id: ticket.shop_id,
      order_id: ticket.order_id || null,
      customer_email: ticket.customer_email,
      customer_name: ticket.customer_name || null,
      subject: ticket.subject,
      status: ticket.status || "open",
      category: ticket.category || null,
      priority: ticket.priority || "normal",
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create ticket: ${error.message}`);
  return data;
}

export async function getTicketsByShopId(
  shopId: string,
  status?: string,
  limit = 50
): Promise<Ticket[]> {
  let query = supabase
    .from("tickets")
    .select("*")
    .eq("shop_id", shopId);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch tickets: ${error.message}`);
  return data || [];
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateTicket(
  ticketId: string,
  updates: Partial<{
    status: TicketStatus;
    category: string;
    priority: string;
    ai_response: string;
    ai_responded_at: string;
    human_response: string;
    resolved_at: string;
  }>
): Promise<void> {
  const { error } = await supabase
    .from("tickets")
    .update(updates)
    .eq("id", ticketId);

  if (error) throw new Error(`Failed to update ticket: ${error.message}`);
}

export async function addTicketMessage(message: {
  ticket_id: string;
  sender_type: "customer" | "ai" | "human";
  sender_email?: string;
  content: string;
}): Promise<TicketMessage> {
  const { data, error } = await supabase
    .from("ticket_messages")
    .insert({
      ticket_id: message.ticket_id,
      sender_type: message.sender_type,
      sender_email: message.sender_email || null,
      content: message.content,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add message: ${error.message}`);
  return data;
}

export async function getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
  const { data, error } = await supabase
    .from("ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch messages: ${error.message}`);
  return data || [];
}
