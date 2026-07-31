import { supabase } from "@/lib/supabase";
import type { RefundRule, RefundLog } from "@/types";

export async function getRefundRulesByShopId(shopId: string): Promise<RefundRule[]> {
  const { data, error } = await supabase
    .from("refund_rules")
    .select("*")
    .eq("shop_id", shopId)
    .order("priority", { ascending: false });

  if (error) throw new Error(`Failed to fetch refund rules: ${error.message}`);
  return data || [];
}

export async function getRefundRuleById(ruleId: string): Promise<RefundRule | null> {
  const { data, error } = await supabase
    .from("refund_rules")
    .select("*")
    .eq("id", ruleId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createRefundRule(rule: Omit<RefundRule, "id" | "created_at">): Promise<RefundRule> {
  const { data, error } = await supabase
    .from("refund_rules")
    .insert(rule)
    .select()
    .single();

  if (error) throw new Error(`Failed to create refund rule: ${error.message}`);
  return data;
}

export async function updateRefundRule(
  ruleId: string,
  updates: Partial<Omit<RefundRule, "id" | "created_at">>
): Promise<void> {
  const { error } = await supabase
    .from("refund_rules")
    .update(updates)
    .eq("id", ruleId);

  if (error) throw new Error(`Failed to update refund rule: ${error.message}`);
}

export async function deleteRefundRule(ruleId: string): Promise<void> {
  const { error } = await supabase
    .from("refund_rules")
    .delete()
    .eq("id", ruleId);

  if (error) throw new Error(`Failed to delete refund rule: ${error.message}`);
}

export async function createRefundLog(log: Omit<RefundLog, "id" | "processed_at">): Promise<RefundLog> {
  const { data, error } = await supabase
    .from("refund_logs")
    .insert(log)
    .select()
    .single();

  if (error) throw new Error(`Failed to create refund log: ${error.message}`);
  return data;
}

export async function updateRefundLog(
  logId: string,
  updates: Partial<Pick<RefundLog, "shopify_refund_id" | "status">>
): Promise<void> {
  const { error } = await supabase
    .from("refund_logs")
    .update(updates)
    .eq("id", logId);

  if (error) throw new Error(`Failed to update refund log: ${error.message}`);
}

export async function getRefundLogsByShopId(shopId: string, limit = 50): Promise<RefundLog[]> {
  const { data, error } = await supabase
    .from("refund_logs")
    .select("*")
    .eq("shop_id", shopId)
    .order("processed_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch refund logs: ${error.message}`);
  return data || [];
}
