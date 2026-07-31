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
): Promise<{ synced: number; errors: number; details?: string }> {
  const db = getSupabaseClient();
  let synced = 0;
  let errors = 0;
  let lastError = "";

  try {
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

    let ordersResponse: any;
    try {
      ordersResponse = await admin.query({ data: { query: ordersQuery } });
    } catch (qErr: any) {
      lastError = `Orders query failed: ${qErr.message}`;
      console.error("[Shopify Sync]", lastError);
      errors++;
      return { synced, errors, details: lastError };
    }

    const orders = ordersResponse?.body?.data?.orders?.edges || [];
    console.log(`[Shopify Sync] Found ${orders.length} orders`);

    if (orders.length === 0) {
      return { synced: 0, errors: 0, details: "No orders found in store" };
    }

    for (const { node: order } of orders) {
      try {
        const customerEmail = order.email || order.customer?.email || "";
        const customerName = order.customer
          ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
          : "";

        if (!customerEmail) continue;

        const shopifyOrderId = order.id.split("/").pop();
        const { data: existingTicket } = await db
          .from("tickets")
          .select("id")
          .eq("shop_id", shopId)
          .ilike("subject", `%${order.name}%`)
          .limit(1)
          .single();

        if (existingTicket) continue;

        const { data: ticket, error: insertErr } = await db
          .from("tickets")
          .insert({
            shop_id: shopId,
            order_id: shopifyOrderId,
            customer_email: customerEmail,
            customer_name: customerName || null,
            subject: `Order ${order.name} — Customer Support`,
            status: "open",
            priority: "normal",
            category: "inquiry",
          })
          .select()
          .single();

        if (insertErr || !ticket) {
          console.error(`[Shopify Sync] Ticket insert error for ${order.name}:`, insertErr);
          errors++;
          continue;
        }

        await db.from("ticket_messages").insert({
          ticket_id: ticket.id,
          sender_type: "system",
          sender_email: null,
          content: `Order ${order.name} synced from Shopify (updated: ${order.updatedAt})`,
        });

        synced++;
      } catch (err: any) {
        console.error(`[Shopify Sync] Error processing order ${order.name}:`, err);
        lastError = err.message;
        errors++;
      }
    }
  } catch (err: any) {
    console.error("[Shopify Sync] Error fetching orders:", err);
    lastError = err.message;
    errors++;
  }

  return { synced, errors, details: lastError || undefined };
}

export async function sendShopifyNotification(
  admin: any,
  shopifyOrderId: string,
  message: string,
  subject?: string
): Promise<{ success: boolean; error?: string }> {
  try {
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
