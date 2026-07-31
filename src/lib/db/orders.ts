import { supabase } from "@/lib/supabase";
import type { Order, WebhookOrder } from "@/types";

export async function upsertOrder(shopId: string, webhookOrder: WebhookOrder): Promise<Order> {
  const orderData = {
    shop_id: shopId,
    shopify_order_id: webhookOrder.id,
    order_number: webhookOrder.name,
    customer_email: webhookOrder.email || null,
    customer_name: webhookOrder.customer
      ? `${webhookOrder.customer.firstName} ${webhookOrder.customer.lastName}`.trim()
      : null,
    total_price: parseFloat(webhookOrder.total_price),
    currency: webhookOrder.currency,
    financial_status: webhookOrder.financial_status,
    fulfillment_status: webhookOrder.fulfillment_status || null,
    line_items: webhookOrder.line_items.edges.map((e) => ({
      title: e.node.title,
      quantity: e.node.quantity,
      price: parseFloat(e.node.original_unit_price_set.shopMoney.amount),
      sku: e.node.variant?.sku || null,
      variant_id: e.node.variant?.id || null,
      product_id: e.node.product?.id || null,
    })),
    shipping_address: webhookOrder.shipping_address || null,
    created_at: webhookOrder.created_at,
    synced_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("orders")
    .upsert(orderData, { onConflict: "shopify_order_id" })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert order: ${error.message}`);
  return data;
}

export async function getOrdersByShopId(shopId: string, limit = 50): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data || [];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function getOrderByShopifyId(shopifyOrderId: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("shopify_order_id", shopifyOrderId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function searchOrdersByEmail(shopId: string, email: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("shop_id", shopId)
    .ilike("customer_email", `%${email}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(`Failed to search orders: ${error.message}`);
  return data || [];
}
