"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  Page,
  LegacyCard,
  Text,
  Badge,
  IndexTable,
  HorizontalStack,
  VerticalStack,
  Button,
  Spinner,
  Modal,
  TextField,
  Checkbox,
} from "@shopify/polaris";

interface RefundRule {
  id: string;
  name: string;
  is_active: boolean;
  conditions: any;
  actions: any;
  priority: number;
}

interface RefundLog {
  id: string;
  amount: number;
  refund_type: string;
  status: string;
  reason: string | null;
  processed_at: string;
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed": return <Badge status="success">Completed</Badge>;
    case "pending": return <Badge status="warning">Pending</Badge>;
    case "failed": return <Badge status="critical">Failed</Badge>;
    default: return <Badge>{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  switch (type) {
    case "auto": return <Badge status="success">Auto</Badge>;
    case "manual": return <Badge>Manual</Badge>;
    case "partial": return <Badge status="warning">Partial</Badge>;
    default: return <Badge>{type}</Badge>;
  }
}

function RefundsContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [activeTab, setActiveTab] = useState<"history" | "rules">("history");
  const [rules, setRules] = useState<RefundRule[]>([]);
  const [refundLogs, setRefundLogs] = useState<RefundLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRule, setNewRule] = useState({
    name: "",
    maxAmount: "",
    daysLimit: "",
    autoRefund: true,
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "rules") {
        const res = await fetch(`/api/refunds/rules?shop=${shopDomain}`);
        const data = await res.json();
        setRules(data.rules || []);
      } else {
        const res = await fetch(`/api/refunds/logs?shop=${shopDomain}`);
        const data = await res.json();
        setRefundLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRule() {
    try {
      await fetch("/api/refunds/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopDomain,
          name: newRule.name,
          conditions: {
            order_total_max: newRule.maxAmount ? parseFloat(newRule.maxAmount) : undefined,
            days_since_delivery_max: newRule.daysLimit ? parseInt(newRule.daysLimit) : undefined,
            category: "refund",
          },
          actions: {
            auto_refund: newRule.autoRefund,
            restock: false,
            notify_customer: true,
            refund_shipping: false,
          },
        }),
      });
      setCreateModalOpen(false);
      setNewRule({ name: "", maxAmount: "", daysLimit: "", autoRefund: true });
      await fetchData();
    } catch (err) {
      console.error("Failed to create rule:", err);
    }
  }

  return (
    <Page title="Refunds">
      <LegacyCard>
        <div style={{ padding: "16px", borderBottom: "1px solid #e1e3e5" }}>
          <HorizontalStack gap="400">
            <Button
              plain={activeTab !== "history"}
              onClick={() => setActiveTab("history")}
            >
              Refund History
            </Button>
            <Button
              plain={activeTab !== "rules"}
              onClick={() => setActiveTab("rules")}
            >
              Automation Rules
            </Button>
          </HorizontalStack>
        </div>
      </LegacyCard>

      <div style={{ marginTop: "16px" }}>
        {loading ? (
          <LegacyCard>
            <div style={{ padding: "40px", textAlign: "center" }}>
              <Spinner size="large" />
            </div>
          </LegacyCard>
        ) : activeTab === "history" ? (
          <LegacyCard>
            <IndexTable
              resourceName={{ singular: "refund", plural: "refunds" }}
              itemCount={refundLogs.length}
              headings={[
                { title: "Amount" },
                { title: "Type" },
                { title: "Status" },
                { title: "Reason" },
                { title: "Date" },
              ]}
              selectable={false}
            >
              {refundLogs.map((log, index) => (
                <IndexTable.Row key={log.id} id={log.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      ${log.amount.toFixed(2)}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>{getTypeBadge(log.refund_type)}</IndexTable.Cell>
                  <IndexTable.Cell>{getStatusBadge(log.status)}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text variant="bodySm" as="span" color="subdued">
                      {log.reason || "N/A"}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text variant="bodySm" as="span" color="subdued">
                      {new Date(log.processed_at).toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          </LegacyCard>
        ) : (
          <LegacyCard
            title="Automation Rules"
            primaryFooterAction={{
              content: "Create Rule",
              onAction: () => setCreateModalOpen(true),
            }}
          >
            <div style={{ padding: "16px" }}>
              <VerticalStack gap="400">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    style={{
                      padding: "16px",
                      border: "1px solid #e1e3e5",
                      borderRadius: "8px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <VerticalStack gap="100">
                        <HorizontalStack gap="100" align="center">
                          <Text variant="bodyMd" as="span" fontWeight="bold">{rule.name}</Text>
                          {rule.is_active ? (
                            <Badge status="success">Active</Badge>
                          ) : (
                            <Badge>Inactive</Badge>
                          )}
                        </HorizontalStack>
                        <Text variant="bodySm" as="span" color="subdued">
                          {rule.conditions?.order_total_max && `Max $${rule.conditions.order_total_max}`}
                          {rule.conditions?.days_since_delivery_max && ` | Within ${rule.conditions.days_since_delivery_max} days`}
                          {rule.actions?.auto_refund && " | Auto-refund"}
                        </Text>
                      </VerticalStack>
                      <HorizontalStack gap="100">
                        <Button size="slim">Edit</Button>
                        <Button size="slim" destructive>Delete</Button>
                      </HorizontalStack>
                    </div>
                  </div>
                ))}

                {rules.length === 0 && (
                  <Text variant="bodyMd" as="span" color="subdued" alignment="center">
                    No automation rules configured yet. Create one to get started.
                  </Text>
                )}
              </VerticalStack>
            </div>
          </LegacyCard>
        )}
      </div>

      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Refund Rule"
        primaryAction={{
          content: "Create",
          onAction: handleCreateRule,
        }}
        secondaryActions={[
          { content: "Cancel", onAction: () => setCreateModalOpen(false) },
        ]}
      >
        <Modal.Section>
          <VerticalStack gap="400">
            <TextField
              label="Rule Name"
              value={newRule.name}
              onChange={(val) => setNewRule({ ...newRule, name: val })}
              placeholder="e.g., Auto-refund small orders"
              autoComplete="off"
            />
            <TextField
              label="Max Order Amount ($)"
              value={newRule.maxAmount}
              onChange={(val) => setNewRule({ ...newRule, maxAmount: val })}
              placeholder="e.g., 50.00"
              type="number"
              autoComplete="off"
            />
            <TextField
              label="Days Since Delivery Limit"
              value={newRule.daysLimit}
              onChange={(val) => setNewRule({ ...newRule, daysLimit: val })}
              placeholder="e.g., 30"
              type="number"
              autoComplete="off"
            />
            <Checkbox
              label="Auto-process refunds"
              checked={newRule.autoRefund}
              onChange={(val) => setNewRule({ ...newRule, autoRefund: val })}
            />
          </VerticalStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}

export default function RefundsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RefundsContent />
    </Suspense>
  );
}
