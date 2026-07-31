export interface Shop {
  id: string;
  shopify_domain: string;
  access_token: string;
  scope: string;
  is_active: boolean;
  auto_respond: boolean;
  ai_enabled: boolean;
  notify_on_ticket: boolean;
  return_policy: string;
  shop_name: string;
  email_enabled: boolean;
  shopify_sync_enabled: boolean;
  installed_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  shop_id: string;
  shopify_order_id: string;
  order_number: string;
  customer_email: string | null;
  customer_name: string | null;
  total_price: number;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  line_items: LineItem[];
  shipping_address: ShippingAddress | null;
  created_at: string;
  synced_at: string;
}

export interface LineItem {
  title: string;
  quantity: number;
  price: number;
  sku: string | null;
  variant_id: string | null;
  product_id: string | null;
}

export interface ShippingAddress {
  address1: string | null;
  city: string | null;
  province: string | null;
  country: string | null;
  zip: string | null;
}

export interface Ticket {
  id: string;
  shop_id: string;
  order_id: string | null;
  customer_email: string;
  customer_name: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  ai_response: string | null;
  ai_responded_at: string | null;
  human_response: string | null;
  resolved_at: string | null;
  created_at: string;
}

export type TicketStatus = "open" | "pending" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketCategory = "return" | "refund" | "inquiry" | "complaint";

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_type: "customer" | "ai" | "human";
  sender_email: string | null;
  content: string;
  created_at: string;
}

export interface RefundRule {
  id: string;
  shop_id: string;
  name: string;
  is_active: boolean;
  conditions: RefundConditions;
  actions: RefundActions;
  priority: number;
  created_at: string;
}

export interface RefundConditions {
  order_total_max?: number;
  order_total_min?: number;
  category?: TicketCategory;
  days_since_delivery_max?: number;
  fulfillment_status?: string;
  customer_order_count_min?: number;
}

export interface RefundActions {
  auto_refund: boolean;
  restock: boolean;
  notify_customer: boolean;
  refund_shipping: boolean;
  max_refund_amount?: number;
}

export interface RefundLog {
  id: string;
  shop_id: string;
  ticket_id: string | null;
  order_id: string | null;
  rule_id: string | null;
  refund_type: "auto" | "manual" | "partial";
  amount: number;
  shopify_refund_id: string | null;
  status: "pending" | "completed" | "failed";
  reason: string | null;
  processed_at: string;
}

export interface WebhookOrder {
  id: string;
  name: string;
  email: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  currency: string;
  line_items: {
    edges: {
      node: {
        title: string;
        quantity: number;
        original_unit_price_set: {
          shopMoney: { amount: string };
        };
        variant: {
          id: string;
          sku: string | null;
        } | null;
        product: {
          id: string;
        } | null;
      };
    }[];
  };
  customer: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
  shipping_address: {
    address1: string | null;
    city: string | null;
    province: string | null;
    country: string | null;
    zip: string | null;
  } | null;
}
