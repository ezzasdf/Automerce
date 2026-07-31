"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Page,
  LegacyCard,
  Text,
  Badge,
  IndexTable,
  TextField,
  HorizontalStack,
  Select,
  Spinner,
  Button,
  Modal,
  VerticalStack,
  Banner,
} from "@shopify/polaris";

interface Ticket {
  id: string;
  subject: string;
  customer_email: string;
  status: string;
  priority: string;
  category: string | null;
  ai_responded_at: string | null;
  created_at: string;
}

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Open", value: "open" },
  { label: "Pending", value: "pending" },
  { label: "Resolved", value: "resolved" },
];

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

function TicketsContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", customerEmail: "", message: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  async function fetchTickets() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ shop: shopDomain });
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/tickets?${params}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError("Failed to load tickets");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTicket() {
    if (!newTicket.subject || !newTicket.customerEmail || !newTicket.message) return;
    setCreating(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          subject: newTicket.subject,
          customerEmail: newTicket.customerEmail,
          message: newTicket.message,
        }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        setNewTicket({ subject: "", customerEmail: "", message: "" });
        await fetchTickets();
      }
    } catch (err) {
      setError("Failed to create ticket");
    } finally {
      setCreating(false);
    }
  }

  const filteredTickets = tickets.filter((ticket) => {
    if (!search) return true;
    return ticket.customer_email.includes(search) || ticket.subject.includes(search);
  });

  return (
    <Page
      title="Support Tickets"
      primaryAction={{
        content: "Create Ticket",
        onAction: () => setCreateModalOpen(true),
      }}
    >
      {error && (
        <div style={{ marginBottom: "16px" }}>
          <Banner status="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        </div>
      )}

      <LegacyCard>
        <div style={{ padding: "16px" }}>
          <HorizontalStack gap="400">
            <div style={{ flex: 1 }}>
              <TextField
                label="Search"
                labelHidden
                value={search}
                onChange={setSearch}
                placeholder="Search tickets..."
                clearButton
                onClearButtonClick={() => setSearch("")}
                autoComplete="off"
              />
            </div>
            <div>
              <Select
                label="Filter"
                labelHidden
                options={statusOptions}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </div>
          </HorizontalStack>
        </div>
      </LegacyCard>

      <div style={{ marginTop: "16px" }}>
        <LegacyCard>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Spinner size="large" />
            </div>
          ) : filteredTickets.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Text variant="headingMd" as="h3">No tickets found</Text>
              <Text variant="bodyMd" as="p" color="subdued">
                {search ? "Try adjusting your search or filters." : "Create a ticket to get started with customer support."}
              </Text>
            </div>
          ) : (
            <IndexTable
              resourceName={{ singular: "ticket", plural: "tickets" }}
              itemCount={filteredTickets.length}
              headings={[
                { title: "Ticket" },
                { title: "Customer" },
                { title: "Category" },
                { title: "Priority" },
                { title: "Status" },
                { title: "AI" },
                { title: "Date" },
              ]}
              selectable={false}
            >
              {filteredTickets.map((ticket, index) => (
                <IndexTable.Row key={ticket.id} id={ticket.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      <a href={`/tickets/${ticket.id}?shop=${shopDomain}`} style={{ textDecoration: "none", color: "#008060" }}>
                        {ticket.subject}
                      </a>
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{ticket.customer_email}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Badge>{ticket.category || "Uncategorized"}</Badge>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{getPriorityBadge(ticket.priority)}</IndexTable.Cell>
                  <IndexTable.Cell>{getStatusBadge(ticket.status)}</IndexTable.Cell>
                  <IndexTable.Cell>
                    {ticket.ai_responded_at ? (
                      <Badge status="success">Responded</Badge>
                    ) : (
                      <Badge>Awaiting</Badge>
                    )}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text variant="bodySm" as="span" color="subdued">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </LegacyCard>
      </div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Support Ticket"
        primaryAction={{
          content: "Create",
          onAction: handleCreateTicket,
          loading: creating,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setCreateModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <VerticalStack gap="400">
            <TextField
              label="Subject"
              value={newTicket.subject}
              onChange={(val) => setNewTicket({ ...newTicket, subject: val })}
              autoComplete="off"
            />
            <TextField
              label="Customer Email"
              value={newTicket.customerEmail}
              onChange={(val) => setNewTicket({ ...newTicket, customerEmail: val })}
              autoComplete="off"
            />
            <TextField
              label="Message"
              value={newTicket.message}
              onChange={(val) => setNewTicket({ ...newTicket, message: val })}
              multiline={4}
              autoComplete="off"
            />
          </VerticalStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TicketsContent />
    </Suspense>
  );
}
