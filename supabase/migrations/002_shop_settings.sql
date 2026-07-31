-- Add shop settings for auto-response and notifications

ALTER TABLE shops ADD COLUMN IF NOT EXISTS auto_respond BOOLEAN DEFAULT false;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS notify_on_ticket BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS return_policy TEXT DEFAULT '30-day return policy for unused items in original packaging.';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shop_name TEXT DEFAULT '';
ALTER TABLE shops ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT true;
ALTER TABLE shops ADD COLUMN IF NOT EXISTS shopify_sync_enabled BOOLEAN DEFAULT true;
