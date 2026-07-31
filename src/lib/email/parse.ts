import type { Shop, Ticket, TicketMessage } from "@/types";

export interface InboundEmail {
  from: string;
  fromName: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  headers: Record<string, string>;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

export interface EmailParseResult {
  shopDomain: string;
  customerEmail: string;
  customerName: string;
  subject: string;
  body: string;
  inReplyTo: string | null;
  references: string[];
}

export function parseInboundEmail(email: InboundEmail): EmailParseResult {
  const fromName = email.fromName || extractNameFromEmail(email.from);
  const customerEmail = extractEmail(email.from);

  const body = email.text || stripHtml(email.html || "");

  const inReplyTo = email.headers["in-reply-to"] || email.headers["In-Reply-To"] || null;
  const referencesHeader = email.headers["references"] || email.headers["References"] || "";
  const references = referencesHeader ? referencesHeader.split(/\s+/).filter(Boolean) : [];

  const toEmail = extractEmail(email.to);
  const shopDomain = extractShopDomainFromEmail(toEmail);

  return {
    shopDomain,
    customerEmail,
    customerName: fromName,
    subject: cleanSubject(email.subject),
    body: body.trim(),
    inReplyTo,
    references,
  };
}

function extractEmail(emailStr: string): string {
  const match = emailStr.match(/<([^>]+)>/);
  return match ? match[1] : emailStr.trim().toLowerCase();
}

function extractNameFromEmail(emailStr: string): string {
  const match = emailStr.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : "";
}

function extractShopDomainFromEmail(toEmail: string): string {
  const match = toEmail.match(/@([a-z0-9-]+)\.myshopify\.com/i);
  if (match) return `${match[1]}.myshopify.com`;

  const supportMatch = toEmail.match(/support@([a-z0-9-]+)/i);
  if (supportMatch) return `${supportMatch[1]}.myshopify.com`;

  return "";
}

function cleanSubject(subject: string): string {
  return subject
    .replace(/^(re:|fw:|fwd:|forward:)\s*/gi, "")
    .trim();
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
