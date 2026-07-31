import { NextRequest, NextResponse } from "next/server";
import { getTicketById, updateTicket, getTicketMessages, addTicketMessage } from "@/lib/db/tickets";

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  try {
    await updateTicket(params.id, body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update ticket error:", error);
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 });
  }
}
