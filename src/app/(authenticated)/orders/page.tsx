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
} from "@shopify/polaris";

interface Order {
  id: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string | null;
  total_price: number;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  created_at: string;
}

const statusOptions = [
  { label: "All statuses", value: "" },
  { label: "Paid", value: "paid" },
  { label: "Pending", value: "pending" },
  { label: "Refunded", value: "refunded" },
  { label: "Partially Refunded", value: "partially_refunded" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "paid": return <Badge status="success">Paid</Badge>;
    case "pending": return <Badge status="warning">Pending</Badge>;
    case "refunded": return <Badge status="critical">Refunded</Badge>;
    case "partially_refunded": return <Badge status="attention">Partial</Badge>;
    default: return <Badge>{status || "Unknown"}</Badge>;
  }
}

function getFulfillmentBadge(status: string | null) {
  switch (status) {
    case "fulfilled": return <Badge status="success">Fulfilled</Badge>;
    case "unfulfilled": return <Badge status="attention">Unfulfilled</Badge>;
    case "partial": return <Badge status="warning">Partial</Badge>;
    default: return <Badge>{status || "N/A"}</Badge>;
  }
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const shopDomain = searchParams.get("shop") || "";

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ shop: shopDomain });
        if (statusFilter) params.set("status", statusFilter);
        const res = await fetch(`/api/orders?${params}`);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoading(false);
      }
    }

    if (shopDomain) fetchOrders();
  }, [shopDomain, statusFilter]);

  const filteredOrders = orders.filter((order) => {
    if (!search) return true;
    return (
      order.customer_email?.includes(search) ||
      order.order_number.includes(search) ||
      order.customer_name?.includes(search)
    );
  });

  return (
    <Page title="Orders">
      <LegacyCard>
        <div style={{ padding: "16px" }}>
          <HorizontalStack gap="400">
            <div style={{ flex: 1 }}>
              <TextField
                label="Search"
                labelHidden
                value={search}
                onChange={setSearch}
                placeholder="Search by order number, email, or name..."
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
          ) : (
            <IndexTable
              resourceName={{ singular: "order", plural: "orders" }}
              itemCount={filteredOrders.length}
              headings={[
                { title: "Order" },
                { title: "Customer" },
                { title: "Total" },
                { title: "Status" },
                { title: "Fulfillment" },
                { title: "Date" },
              ]}
              selectable={false}
            >
              {filteredOrders.map((order, index) => (
                <IndexTable.Row key={order.id} id={order.id} position={index}>
                  <IndexTable.Cell>
                    <Text variant="bodyMd" as="span" fontWeight="bold">
                      {order.order_number}
                    </Text>
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    {order.customer_name || order.customer_email || "Unknown"}
                  </IndexTable.Cell>
                  <IndexTable.Cell>
                    ${order.total_price.toFixed(2)} {order.currency}
                  </IndexTable.Cell>
                  <IndexTable.Cell>{getStatusBadge(order.financial_status)}</IndexTable.Cell>
                  <IndexTable.Cell>{getFulfillmentBadge(order.fulfillment_status)}</IndexTable.Cell>
                  <IndexTable.Cell>
                    <Text variant="bodySm" as="span" color="subdued">
                      {new Date(order.created_at).toLocaleDateString()}
                    </Text>
                  </IndexTable.Cell>
                </IndexTable.Row>
              ))}
            </IndexTable>
          )}
        </LegacyCard>
      </div>
    </Page>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <OrdersContent />
    </Suspense>
  );
}
