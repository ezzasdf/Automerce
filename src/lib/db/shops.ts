import { supabase } from "@/lib/supabase";
import type { Shop } from "@/types";

export async function getShopByDomain(domain: string): Promise<Shop | null> {
  const { data, error } = await supabase
    .from("shops")
    .select("*")
    .eq("shopify_domain", domain)
    .single();

  if (error || !data) return null;
  return data;
}

export async function createShop(shop: Omit<Shop, "id" | "installed_at" | "updated_at">): Promise<Shop> {
  const { data, error } = await supabase
    .from("shops")
    .insert(shop)
    .select()
    .single();

  if (error) throw new Error(`Failed to create shop: ${error.message}`);
  return data;
}

export async function updateShopAccessToken(domain: string, accessToken: string, scope: string): Promise<void> {
  const { error } = await supabase
    .from("shops")
    .update({ access_token: accessToken, scope, updated_at: new Date().toISOString() })
    .eq("shopify_domain", domain);

  if (error) throw new Error(`Failed to update shop: ${error.message}`);
}
