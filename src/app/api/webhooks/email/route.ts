import { NextRequest, NextResponse } from "next/server";
import { processInboundEmail } from "@/lib/email/process";
import type { InboundEmail } from "@/lib/email/parse";

// Supports: SendGrid Inbound Parse, Mailgun Routes, Postmark Inbound, generic webhook
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let rawEmail: InboundEmail;

    if (contentType.includes("multipart/form-data")) {
      // SendGrid Inbound Parse format
      const formData = await request.formData();
      rawEmail = parseSendGridFormData(formData);
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Mailgun / Postmark format
      const body = await request.text();
      rawEmail = parseFormEncoded(body);
    } else {
      // Generic JSON webhook format
      const body = await request.json();
      rawEmail = parseGenericWebhook(body);
    }

    const result = await processInboundEmail(rawEmail);

    if (result.success) {
      return NextResponse.json({ success: true, ticketId: result.ticketId });
    } else {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
  } catch (error: any) {
    console.error("[Email Webhook] Error:", error);
    return NextResponse.json({ error: "Failed to process email" }, { status: 500 });
  }
}

function parseSendGridFormData(formData: FormData): InboundEmail {
  const headers: Record<string, string> = {};
  const rawHeaders = formData.get("headers") as string | null;

  if (rawHeaders) {
    for (const line of rawHeaders.split("\n")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }
  }

  return {
    from: (formData.get("from") as string) || "",
    fromName: "",
    to: (formData.get("to") as string) || "",
    subject: (formData.get("subject") as string) || "",
    text: (formData.get("text") as string) || "",
    html: (formData.get("html") as string) || "",
    headers,
  };
}

function parseFormEncoded(body: string): InboundEmail {
  const params = new URLSearchParams(body);

  const headers: Record<string, string> = {};
  const rawHeaders = params.get("headers") || "";
  for (const line of rawHeaders.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      headers[line.substring(0, colonIndex).trim().toLowerCase()] = line.substring(colonIndex + 1).trim();
    }
  }

  return {
    from: params.get("sender") || params.get("from") || "",
    fromName: "",
    to: params.get("recipient") || params.get("to") || "",
    subject: params.get("subject") || "",
    text: params.get("body-plain") || params.get("text") || "",
    html: params.get("body-html") || params.get("html") || "",
    headers,
  };
}

function parseGenericWebhook(body: any): InboundEmail {
  return {
    from: body.from || body.sender || "",
    fromName: body.fromName || body.from_name || "",
    to: body.to || body.recipient || "",
    subject: body.subject || "",
    text: body.text || body.body || "",
    html: body.html || "",
    headers: body.headers || {},
    attachments: body.attachments,
  };
}
