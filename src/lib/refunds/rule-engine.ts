import type { Ticket, Order, RefundRule, RefundConditions } from "@/types";
import { differenceInDays } from "date-fns";

export interface RuleEvaluationResult {
  matched: boolean;
  rule: RefundRule | null;
  shouldAutoRefund: boolean;
  actions: RefundRule["actions"] | null;
  reason: string;
}

export function evaluateRules(
  ticket: Ticket,
  order: Order | null,
  rules: RefundRule[]
): RuleEvaluationResult {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (!rule.is_active) continue;

    if (matchesConditions(ticket, order, rule.conditions)) {
      return {
        matched: true,
        rule,
        shouldAutoRefund: rule.actions.auto_refund,
        actions: rule.actions,
        reason: `Matched rule: ${rule.name}`,
      };
    }
  }

  return {
    matched: false,
    rule: null,
    shouldAutoRefund: false,
    actions: null,
    reason: "No matching rules found",
  };
}

function matchesConditions(
  ticket: Ticket,
  order: Order | null,
  conditions: RefundConditions
): boolean {
  if (!order) return false;

  if (conditions.order_total_max !== undefined && order.total_price > conditions.order_total_max) {
    return false;
  }

  if (conditions.order_total_min !== undefined && order.total_price < conditions.order_total_min) {
    return false;
  }

  if (conditions.category && ticket.category !== conditions.category) {
    return false;
  }

  if (conditions.fulfillment_status && order.fulfillment_status !== conditions.fulfillment_status) {
    return false;
  }

  if (conditions.days_since_delivery_max !== undefined && order.created_at) {
    const daysSince = differenceInDays(new Date(), new Date(order.created_at));
    if (daysSince > conditions.days_since_delivery_max) {
      return false;
    }
  }

  return true;
}

export function createDefaultRules(shopId: string): Omit<RefundRule, "id">[] {
  return [
    {
      shop_id: shopId,
      name: "Auto-refund small orders under $50 within 30 days",
      is_active: true,
      conditions: {
        order_total_max: 50,
        category: "refund",
        days_since_delivery_max: 30,
      },
      actions: {
        auto_refund: true,
        restock: false,
        notify_customer: true,
        refund_shipping: false,
      },
      priority: 10,
      created_at: new Date().toISOString(),
    },
    {
      shop_id: shopId,
      name: "Auto-approve returns for fulfilled orders under $100",
      is_active: true,
      conditions: {
        order_total_max: 100,
        category: "return",
        fulfillment_status: "fulfilled",
        days_since_delivery_max: 14,
      },
      actions: {
        auto_refund: true,
        restock: true,
        notify_customer: true,
        refund_shipping: true,
      },
      priority: 20,
      created_at: new Date().toISOString(),
    },
  ];
}
