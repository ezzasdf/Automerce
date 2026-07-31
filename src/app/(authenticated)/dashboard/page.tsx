"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Page,
  Layout,
  LegacyCard,
  Text,
  Spinner,
  VerticalStack,
  HorizontalStack,
  Badge,
  IndexTable,
} from "@shopify/polaris";

interface DashboardStats {
  totalOrders: number;
  openTickets: number;
  pendingRefunds: number;
  resolvedToday: number;
}

interface RecentTicket {
  id: string;
  subject: string;
  status: string;
  category: string | null;
  created_at: string;
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentTickets, setRecentTickets] = useState<RecentTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopDomain) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        const res = await fetch(`/api/dashboard?shop=${shopDomain}`);
        const data = await res.json();
        setStats(data.stats);
        setRecentTickets(data.recentTickets || []);
      } catch (err) {
        console.error("Failed to fetch dashboard stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [shopDomain]);

  if (loading) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Spinner size="large" />
              </div>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  if (!shopDomain) {
    return (
      <Page title="Dashboard">
        <Layout>
          <Layout.Section>
            <LegacyCard>
              <div style={{ padding: "40px", textAlign: "center" }}>
                <Text variant="headingMd" as="h2">Welcome to Support Auto</Text>
                <Text variant="bodyMd" as="p" color="subdued">
                  Install the app from your Shopify admin to get started.
                </Text>
              </div>
            </LegacyCard>
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            <LegacyCard>
              <div style={{ padding: "20px" }}>
                <VerticalStack gap="200">
                  <Text variant="headingSm" as="h3" color="subdued">Total Orders</Text>
                  <Text variant="headingXl" as="p">{stats?.totalOrders.toLocaleString() || "0"}</Text>
                </VerticalStack>
              </div>
            </LegacyCard>
            <LegacyCard>
              <div style={{ padding: "20px" }}>
                <VerticalStack gap="200">
                  <Text variant="headingSm" as="h3" color="subdued">Open Tickets</Text>
                  <HorizontalStack gap="100" align="center">
                    <Text variant="headingXl" as="p">{stats?.openTickets || "0"}</Text>
                    {(stats?.openTickets || 0) > 0 && <Badge status="attention">Needs attention</Badge>}
                  </HorizontalStack>
                </VerticalStack>
              </div>
            </LegacyCard>
            <LegacyCard>
              <div style={{ padding: "20px" }}>
                <VerticalStack gap="200">
                  <Text variant="headingSm" as="h3" color="subdued">Pending Refunds</Text>
                  <Text variant="headingXl" as="p">{stats?.pendingRefunds || "0"}</Text>
                </VerticalStack>
              </div>
            </LegacyCard>
            <LegacyCard>
              <div style={{ padding: "20px" }}>
                <VerticalStack gap="200">
                  <Text variant="headingSm" as="h3" color="subdued">Resolved</Text>
                  <Text variant="headingXl" as="p">{stats?.resolvedToday || "0"}</Text>
                </VerticalStack>
              </div>
            </LegacyCard>
          </div>
        </Layout.Section>

        <Layout.Section>
          <LegacyCard title="Recent Tickets">
            {recentTickets.length > 0 ? (
              <IndexTable
                resourceName={{ singular: "ticket", plural: "tickets" }}
                itemCount={recentTickets.length}
                headings={[
                  { title: "Subject" },
                  { title: "Category" },
                  { title: "Status" },
                  { title: "Created" },
                ]}
                selectable={false}
              >
                {recentTickets.map((ticket, index) => (
                  <IndexTable.Row key={ticket.id} id={ticket.id} position={index}>
                    <IndexTable.Cell>
                      <Text variant="bodyMd" as="span" fontWeight="bold">
                        <a href={`/tickets/${ticket.id}?shop=${shopDomain}`} style={{ textDecoration: "none", color: "#008060" }}>
                          {ticket.subject}
                        </a>
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge>{ticket.category || "Uncategorized"}</Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Badge status={ticket.status === "open" ? "attention" : ticket.status === "resolved" ? "success" : "warning"}>
                        {ticket.status}
                      </Badge>
                    </IndexTable.Cell>
                    <IndexTable.Cell>
                      <Text variant="bodySm" as="span" color="subdued">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </Text>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))}
              </IndexTable>
            ) : (
              <div style={{ padding: "20px", textAlign: "center" }}>
                <Text variant="bodyMd" as="span" color="subdued">
                  No tickets yet. Support tickets will appear here.
                </Text>
              </div>
            )}
          </LegacyCard>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
