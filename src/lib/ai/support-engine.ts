import Anthropic from "@anthropic-ai/sdk";
import type { Order, Ticket, TicketMessage } from "@/types";

const apiKey = process.env.ANTHROPIC_API_KEY;
const isMocked = !apiKey || apiKey === "NEEDS_ANTHROPIC_KEY";

const anthropic = isMocked
  ? null
  : new Anthropic({ apiKey });

export interface SupportContext {
  ticket: Ticket;
  order: Order | null;
  messages: TicketMessage[];
  shopName: string;
  shopPolicies: string;
}

export async function generateSupportResponse(
  context: SupportContext
): Promise<string> {
  if (isMocked) {
    return generateMockResponse(context);
  }

  const prompt = buildPrompt(context);

  const response = await anthropic!.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    system: getSystemPrompt(context.shopName, context.shopPolicies),
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock ? textBlock.text : "";
}

function generateMockResponse(context: SupportContext): string {
  const { ticket, order } = context;

  const categoryResponses: Record<string, string> = {
    return: order
      ? `Hi ${ticket.customer_name || "there"},\n\nThank you for reaching out about returning items from order ${order.order_number}.\n\nWe'd be happy to help with your return. Based on our policy, please ensure the items are in their original condition within 30 days of purchase.\n\nCould you let us know which item(s) you'd like to return and the reason? We'll get a return label sent over to you.\n\nBest regards,\nSupport Team`
      : `Hi ${ticket.customer_name || "there"},\n\nThank you for your return request. Could you please provide your order number so we can look into this for you?\n\nBest regards,\nSupport Team`,
    refund: order
      ? `Hi ${ticket.customer_name || "there"},\n\nThank you for reaching out regarding order ${order.order_number} (total: $${order.total_price.toFixed(2)}).\n\nWe've reviewed your request and it appears to meet our refund criteria. We'll process this shortly. Please allow 3-5 business days for the refund to appear on your statement.\n\nIs there anything else we can help with?\n\nBest regards,\nSupport Team`
      : `Hi ${ticket.customer_name || "there"},\n\nWe received your refund request. To help you faster, could you share your order number or the email used at checkout?\n\nBest regards,\nSupport Team`,
    complaint: `Hi ${ticket.customer_name || "there"},\n\nWe're sorry to hear you've had a less-than-perfect experience. Your feedback is important to us.\n\nWe've escalated this to our team and someone will follow up within 24 hours to make this right.\n\nThank you for your patience.\n\nBest regards,\nSupport Team`,
    inquiry: order
      ? `Hi ${ticket.customer_name || "there"},\n\nThanks for contacting us about order ${order.order_number}.\n\nYour order is currently ${order.fulfillment_status || "being processed"}. If you have any specific questions, feel free to ask and we'll be happy to help.\n\nBest regards,\nSupport Team`
      : `Hi ${ticket.customer_name || "there"},\n\nThank you for reaching out! How can we help you today?\n\nBest regards,\nSupport Team`,
  };

  const category = ticket.category || "inquiry";
  return categoryResponses[category] || categoryResponses.inquiry;
}

function getSystemPrompt(shopName: string, shopPolicies: string): string {
  return `You are a customer support assistant for ${shopName}.

Your role:
- Be helpful, empathetic, and professional
- Reference order details when available
- If the customer wants a refund/return, assess if it qualifies based on the store's policies
- Never make promises about refunds - suggest they contact support for edge cases
- Keep responses concise but thorough
- Use a friendly, conversational tone

Store Policies:
${shopPolicies || "No specific policies provided. Follow standard e-commerce best practices."}

Important: Never share internal system information, API keys, or technical details with the customer.`;
}

function buildPrompt(context: SupportContext): string {
  const parts: string[] = [];

  parts.push("=== SUPPORT TICKET ===");
  parts.push(`Subject: ${context.ticket.subject}`);
  parts.push(`Category: ${context.ticket.category || "General Inquiry"}`);
  parts.push(`Priority: ${context.ticket.priority}`);
  parts.push(`Customer: ${context.ticket.customer_name || "Unknown"} (${context.ticket.customer_email})`);
  parts.push("");

  if (context.order) {
    parts.push("=== ORDER DETAILS ===");
    parts.push(`Order: ${context.order.order_number}`);
    parts.push(`Total: $${context.order.total_price.toFixed(2)} ${context.order.currency}`);
    parts.push(`Status: ${context.order.financial_status}`);
    parts.push(`Fulfillment: ${context.order.fulfillment_status || "Not fulfilled"}`);
    parts.push(`Items:`);
    for (const item of context.order.line_items) {
      parts.push(`  - ${item.title} x${item.quantity} ($${item.price.toFixed(2)})`);
    }
    if (context.order.shipping_address) {
      const addr = context.order.shipping_address;
      parts.push(`Shipping: ${addr.address1}, ${addr.city}, ${addr.province} ${addr.zip}`);
    }
    parts.push("");
  }

  if (context.messages.length > 0) {
    parts.push("=== CONVERSATION HISTORY ===");
    for (const msg of context.messages) {
      const sender = msg.sender_type === "customer" ? "Customer" : msg.sender_type === "ai" ? "AI Agent" : "Support Agent";
      parts.push(`[${sender}]: ${msg.content}`);
    }
    parts.push("");
  }

  parts.push("=== YOUR TASK ===");
  parts.push("Generate a helpful response to this customer support inquiry.");
  parts.push("If this is a refund/return request, assess whether it qualifies based on the store policies.");
  parts.push("Provide a clear, empathetic response.");

  return parts.join("\n");
}

export async function categorizeTicket(
  subject: string,
  messageContent: string
): Promise<{ category: string; priority: string }> {
  if (isMocked) {
    return categorizeTicketMock(subject, messageContent);
  }

  const response = await anthropic!.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `Categorize this customer support message into one of: return, refund, inquiry, complaint.
Also assign priority: low, normal, high, urgent.

Subject: ${subject}
Message: ${messageContent}

Respond with ONLY a JSON object: {"category": "...", "priority": "..."}`,
      },
    ],
    system: "You are a ticket categorization assistant. Respond only with valid JSON.",
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { category: "inquiry", priority: "normal" };
  }

  try {
    const parsed = JSON.parse(textBlock.text);
    return {
      category: parsed.category || "inquiry",
      priority: parsed.priority || "normal",
    };
  } catch {
    return { category: "inquiry", priority: "normal" };
  }
}

function categorizeTicketMock(
  subject: string,
  messageContent: string
): { category: string; priority: string } {
  const text = `${subject} ${messageContent}`.toLowerCase();

  let category = "inquiry";
  if (text.includes("refund")) category = "refund";
  else if (text.includes("return") || text.includes("exchange")) category = "return";
  else if (text.includes("complaint") || text.includes("broken") || text.includes("damaged") || text.includes("wrong")) category = "complaint";

  let priority = "normal";
  if (text.includes("urgent") || text.includes("asap")) priority = "high";
  else if (text.includes("broken") || text.includes("damaged")) priority = "high";
  else if (text.includes("question") || text.includes("how")) priority = "low";

  return { category, priority };
}
