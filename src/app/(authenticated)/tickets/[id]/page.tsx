"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Page,
  LegacyCard,
  Text,
  Badge,
  VerticalStack,
  HorizontalStack,
  Button,
  TextField,
  Spinner,
  Banner,
} from "@shopify/polaris";

interface TicketMessage {
  id: string;
  sender_type: string;
  sender_email: string | null;
  content: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  customer_email: string;
  customer_name: string | null;
  status: string;
  priority: string;
  category: string | null;
  ai_response: string | null;
  created_at: string;
  order_id: string | null;
}

function TicketDetailContent({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [processingRefund, setProcessingRefund] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${params.id}?shop=${shopDomain}`);
      const data = await res.json();
      setTicket(data.ticket);
      setMessages(data.messages || []);
    } catch (err) {
      setError("Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [params.id, shopDomain]);

  useEffect(() => {
    if (shopDomain) fetchTicket();
  }, [shopDomain, fetchTicket]);

  async function handleGenerateAI() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets/${params.id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopDomain }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTicket();
      } else {
        setError(data.error || "Failed to generate response");
      }
    } catch (err) {
      setError("Failed to generate AI response");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSendReply() {
    if (!reply.trim() || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${params.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          message: reply,
          sendVia: ticket?.order_id ? "shopify" : "internal",
        }),
      });
      const data = await res.json();
      setReply("");
      await fetchTicket();
      if (data.shopifySent) {
        setError(null);
      }
    } catch (err) {
      setError("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleProcessRefund() {
    setProcessingRefund(true);
    setError(null);
    try {
      const res = await fetch("/api/refunds/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: ticket?.id,
          orderId: ticket?.order_id,
          shopDomain,
          manual: true,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchTicket();
      } else {
        setError(data.error || data.message || "Failed to process refund");
      }
    } catch (err) {
      setError("Failed to process refund");
    } finally {
      setProcessingRefund(false);
    }
  }

  async function handleResolve() {
    try {
      await fetch(`/api/tickets/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolved_at: new Date().toISOString(),
        }),
      });
      await fetchTicket();
    } catch (err) {
      setError("Failed to resolve ticket");
    }
  }

  if (loading) {
    return (
      <Page title="Loading...">
        <LegacyCard>
          <div style={{ padding: "40px", textAlign: "center" }}>
            <Spinner size="large" />
          </div>
        </LegacyCard>
      </Page>
    );
  }

  if (!ticket) {
    return (
      <Page title="Ticket Not Found" backAction={{ content: "Tickets", url: `/tickets?shop=${shopDomain}` }}>
        <LegacyCard>
          <div style={{ padding: "20px" }}>
            <Text variant="bodyMd" as="span">This ticket could not be found.</Text>
          </div>
        </LegacyCard>
      </Page>
    );
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "open": return <Badge status="attention">Open</Badge>;
      case "pending": return <Badge status="warning">Pending</Badge>;
      case "resolved": return <Badge status="success">Resolved</Badge>;
      case "closed": return <Badge>Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  }

  function getPriorityBadge(priority: string) {
    switch (priority) {
      case "urgent": return <Badge status="critical">Urgent</Badge>;
      case "high": return <Badge status="attention">High</Badge>;
      case "normal": return <Badge>Normal</Badge>;
      case "low": return <Badge>Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  }

  return (
    <Page
      title={ticket.subject}
      backAction={{ content: "Tickets", url: `/tickets?shop=${shopDomain}` }}
      primaryAction={{
        content: "Resolve",
        onAction: handleResolve,
        disabled: ticket.status === "resolved",
      }}
    >
      {error && (
        <div style={{ marginBottom: "16px" }}>
          <Banner status="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        </div>
      )}

      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ flex: "0 0 400px" }}>
          <LegacyCard title="Ticket Details">
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text variant="bodyMd" as="span" color="subdued">Status</Text>
                  {getStatusBadge(ticket.status)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text variant="bodyMd" as="span" color="subdued">Priority</Text>
                  {getPriorityBadge(ticket.priority)}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text variant="bodyMd" as="span" color="subdued">Category</Text>
                  <Badge>{ticket.category || "Uncategorized"}</Badge>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text variant="bodyMd" as="span" color="subdued">Customer</Text>
                  <Text variant="bodyMd" as="span">{ticket.customer_name || ticket.customer_email}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Text variant="bodyMd" as="span" color="subdued">Email</Text>
                  <Text variant="bodyMd" as="span">{ticket.customer_email}</Text>
                </div>
              </VerticalStack>
            </div>
          </LegacyCard>

          <div style={{ marginTop: "16px" }}>
            <LegacyCard title="Quick Actions">
              <div style={{ padding: "16px" }}>
                <VerticalStack gap="400">
                  <Button
                    fullWidth
                    primary
                    onClick={handleProcessRefund}
                    loading={processingRefund}
                    disabled={ticket.status === "resolved" || !ticket.order_id}
                  >
                    {ticket.order_id ? "Process Refund" : "No Order Linked"}
                  </Button>
                  <Button
                    fullWidth
                    onClick={handleGenerateAI}
                    loading={generating}
                    disabled={ticket.status === "resolved"}
                  >
                    Generate AI Response
                  </Button>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <LegacyCard title="Conversation">
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      backgroundColor: msg.sender_type === "customer" ? "#f1f2f4" : msg.sender_type === "ai" ? "#e3f2fd" : "#e8f5e9",
                    }}
                  >
                    <HorizontalStack gap="100" align="center">
                      <Badge status={msg.sender_type === "customer" ? "attention" : msg.sender_type === "ai" ? "success" : "warning"}>
                        {msg.sender_type === "customer" ? "Customer" : msg.sender_type === "ai" ? "AI Agent" : "Support Agent"}
                      </Badge>
                      <Text variant="bodySm" as="span" color="subdued">
                        {new Date(msg.created_at).toLocaleString()}
                      </Text>
                    </HorizontalStack>
                    <div style={{ marginTop: "8px" }}>
                      <Text variant="bodyMd" as="span">{msg.content}</Text>
                    </div>
                  </div>
                ))}

                {messages.length === 0 && (
                  <Text variant="bodyMd" as="span" color="subdued">
                    No messages yet. Generate an AI response or send a reply.
                  </Text>
                )}
              </VerticalStack>

              <div style={{ marginTop: "16px" }}>
                <TextField
                  label="Reply"
                  labelHidden
                  value={reply}
                  onChange={setReply}
                  placeholder="Type your reply..."
                  multiline={3}
                  autoComplete="off"
                />
                <div style={{ marginTop: "8px" }}>
                  <HorizontalStack gap="200" align="center">
                    <Button primary onClick={handleSendReply} loading={sendingReply} disabled={!reply.trim()}>
                      {ticket.order_id ? "Send via Shopify" : "Send Reply"}
                    </Button>
                    {ticket.order_id && (
                      <Text variant="bodySm" as="span" color="subdued">
                        Will be sent as order note
                      </Text>
                    )}
                  </HorizontalStack>
                </div>
              </div>
            </div>
          </LegacyCard>
        </div>
      </div>
    </Page>
  );
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketDetailContent params={params} />
    </Suspense>
  );
}
