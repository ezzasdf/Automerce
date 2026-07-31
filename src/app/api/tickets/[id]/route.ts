import { NextRequest, NextResponse } from "next/server";
import { getTicketById, updateTicket, getTicketMessages } from "@/lib/db/tickets";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ticket = await getTicketById(params.id);
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const messages = await getTicketMessages(params.id);
    return NextResponse.json({ ticket, messages });
  } catch (error: any) {
    console.error("Get ticket error:", error);
    return NextResponse.json({ error: "Failed to fetch ticket" }, { status: 500 });
  }
}

const ALLOWED_FIELDS = ["status", "category", "priority", "ai_response", "ai_responded_at", "human_response", "resolved_at"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const safeUpdates: Record<string, any> = {};
    for (const key of ALLOWED_FIELDS) {
      if (key in body) {
        safeUpdates[key] = body[key];
      }
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await updateTicket(params.id, safeUpdates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
