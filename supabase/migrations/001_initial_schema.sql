-- Customer Support & Returns Automation - Initial Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shops table
CREATE TABLE shops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shopify_domain TEXT UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  scope TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  installed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shops_domain ON shops(shopify_domain);

-- Orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  shopify_order_id TEXT UNIQUE NOT NULL,
  order_number TEXT NOT NULL,
  customer_email TEXT,
  customer_name TEXT,
  total_price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  financial_status TEXT,
  fulfillment_status TEXT,
  line_items JSONB DEFAULT '[]',
  shipping_address JSONB,
  created_at TIMESTAMPTZ,
  synced_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_shop ON orders(shop_id);
CREATE INDEX idx_orders_email ON orders(customer_email);
CREATE INDEX idx_orders_shopify_id ON orders(shopify_order_id);

-- Tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  subject TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'normal',
  category TEXT,
  ai_response TEXT,
  ai_responded_at TIMESTAMPTZ,
  human_response TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tickets_shop ON tickets(shop_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_created ON tickets(created_at DESC);

-- Ticket messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type TEXT NOT NULL,
  sender_email TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_ticket ON ticket_messages(ticket_id);

-- Refund rules
CREATE TABLE refund_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}',
  actions JSONB NOT NULL DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rules_shop ON refund_rules(shop_id);

-- Refund logs
CREATE TABLE refund_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rule_id UUID REFERENCES refund_rules(id) ON DELETE SET NULL,
  refund_type TEXT NOT NULL,
  amount NUMERIC(10,2),
  shopify_refund_id TEXT,
  status TEXT DEFAULT 'pending',
  reason TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_refund_logs_shop ON refund_logs(shop_id);
CREATE INDEX idx_refund_logs_status ON refund_logs(status);

-- RLS policies
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON shops FOR ALL USING (true);
CREATE POLICY "Service role full access" ON orders FOR ALL USING (true);
CREATE POLICY "Service role full access" ON tickets FOR ALL USING (true);
CREATE POLICY "Service role full access" ON ticket_messages FOR ALL USING (true);
CREATE POLICY "Service role full access" ON refund_rules FOR ALL USING (true);
CREATE POLICY "Service role full access" ON refund_logs FOR ALL USING (true);
