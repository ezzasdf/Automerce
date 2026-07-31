import { getSupabaseClient } from "@/lib/supabase";

interface ShopifyConversation {
  id: string;
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  messages: ShopifyMessage[];
}

interface ShopifyMessage {
  id: string;
  body: string;
  author: string;
  createdAt: string;
  isCustomerMessage: boolean;
}

export async function syncShopifyConversations(
  admin: any,
  shopId: string
): Promise<{ synced: number; errors: number }> {
  const db = getSupabaseClient();
  let synced = 0;
  let errors = 0;

  try {
    // Fetch recent orders with customer info using GraphQL
    const ordersQuery = `
      query {
        orders(first: 50, sortKey: UPDATED_AT, reverse: true) {
          edges {
            node {
              id
              name
              email
              customer { firstName lastName email }
              updatedAt
            }
          }
        }
      }
    `;

    const ordersResponse = await admin.query({ data: { query: ordersQuery } });
    const orders = ordersResponse?.body?.data?.orders?.edges || [];

    for (const { node: order } of orders) {
      try {
        // Fetch order notes and events
        const eventsQuery = `
          query {
            order(id: "${order.id}") {
              events(first: 25, sortKey: CREATED_AT, reverse: true) {
                edges {
                  node {
                    id
                    message
                    createdAt
                    author { name isSystem }
                    ... on DraftOrderEvent { entry {
                      ... on DraftOrderNotePayload { message }
                    }}
                  }
                }
              }
              metafield(namespace: "support_auto", key: "ticket_id") { value }
            }
          }
        `;

        const eventsResponse = await admin.query({ data: { query: eventsQuery } });
        const events = eventsResponse?.body?.data?.order?.events?.edges || [];

        // Filter for customer-facing messages
        const customerMessages = events
          .filter((e: any) => e.node.message && !e.node.author?.isSystem)
          .map((e: any) => ({
            id: e.node.id,
            body: e.node.message,
            author: e.node.author?.name || "Staff",
            createdAt: e.node.createdAt,
            isCustomerMessage: false,
          }));

        if (customerMessages.length === 0) continue;

        const customerEmail = order.email || order.customer?.email || "";
        const customerName = order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
          : "";

        // Check if we already have a ticket for this order
        const shopifyOrderId = order.id.split("/").pop();
        const { data: existingTicket } = await db
          .from("tickets")
          .select("id")
          .eq("shop_id", shopId)
          .eq("customer_email", customerEmail)
          .ilike("subject", `%${order.name}%`)
          .limit(1)
          .single();

        if (existingTicket) {
          // Sync new messages only
          const { data: existingMessages } = await db
            .from("ticket_messages")
            .select("content")
            .eq("ticket_id", existingTicket.id);

          const existingContents = new Set(existingMessages?.map((m) => m.content) || []);

          for (const msg of customerMessages) {
            if (!existingContents.has(msg.body)) {
              await db.from("ticket_messages").insert({
                ticket_id: existingTicket.id,
                sender_type: "human",
                sender_email: null,
                content: msg.body,
              });
              synced++;
            }
          }
        } else {
          // Create new ticket from Shopify conversation
          const { data: ticket, error } = await db
            .from("tickets")
            .insert({
              shop_id: shopId,
              order_id: null,
              customer_email: customerEmail,
              customer_name: customerName || null,
              subject: `Order ${order.name} — Customer Support`,
              status: "open",
              priority: "normal",
              category: "inquiry",
            })
            .select()
            .single();

          if (error || !ticket) {
            errors++;
            continue;
          }

          // Add messages
          for (const msg of customerMessages.reverse()) {
            await db.from("ticket_messages").insert({
              ticket_id: ticket.id,
              sender_type: "human",
              sender_email: null,
              content: `[${msg.author}] ${msg.body}`,
            });
          }
          synced++;
        }
      } catch (err) {
        console.error(`[Shopify Sync] Error processing order ${order.name}:`, err);
        errors++;
      }
    }
  } catch (err) {
    console.error("[Shopify Sync] Error fetching conversations:", err);
    errors++;
  }

  return { synced, errors };
}

export async function sendShopifyNotification(
  admin: any,
  shopifyOrderId: string,
  message: string,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Add as order note (internal)
    const noteMutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order { id }
          userErrors { field message }
        }
      }
    `;

    const noteResponse = await admin.query({
      data: {
        query: noteMutation,
        variables: {
          input: {
            id: shopifyOrderId.startsWith("gid://")
              ? shopifyOrderId
              : `gid://shopify/Order/${shopifyOrderId}`,
            note: message,
          },
        },
      },
    });

    const userErrors = noteResponse?.body?.data?.orderUpdate?.userErrors;
    if (userErrors?.length > 0) {
      return { success: false, error: userErrors[0].message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendCustomerEmail(
  admin: any,
  shopifyOrderId: string,
  customerEmail: string,
  subject: string,
  body: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use Shopify's order notification email
    const emailMutation = `
      mutation orderUpdate($input: OrderInput!) {
        orderUpdate(input: $input) {
          order { id email }
          userErrors { field message }
        }
      }
    `;

    const noteWithMarker = `[Support Auto Reply]\n\nSubject: ${subject}\n\n${body}`;

    const response = await admin.query({
      data: {
        query: emailMutation,
        variables: {
          input: {
            id: shopifyOrderId.startsWith("gid://")
              ? shopifyOrderId
              : `gid://shopify/Order/${shopifyOrderId}`,
            note: noteWithMarker,
            tags: "support-auto-reply",
          },
        },
      },
    });

    const userErrors = response?.body?.data?.orderUpdate?.userErrors;
    if (userErrors?.length > 0) {
      return { success: false, error: userErrors[0].message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
