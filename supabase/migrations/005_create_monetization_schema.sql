-- Monetization Schema for ProLight AI
-- Supports subscription tiers, credit-based billing, marketplace, and API access

-- Plans table: Defines available subscription tiers
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  monthly_credit_limit INTEGER NOT NULL DEFAULT 0,
  features JSONB DEFAULT '[]'::jsonb,
  stripe_price_id TEXT,
  price_cents INTEGER,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend users table if needed (stripe_customer_id will be in auth.users metadata or separate profile)
-- For now, we'll create a user_profiles table to extend auth.users
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  stripe_customer_id TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stripe_customer_id)
);

-- Subscriptions table: Manages user's active plan and billing cycle
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id UUID REFERENCES plans(id) ON DELETE SET NULL,
  status TEXT NOT NULL, -- active, past_due, canceled, trialing
  stripe_subscription_id TEXT UNIQUE,
  stripe_subscription_item_id TEXT, -- For metered usage reporting
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credit usage table: Core table for metered billing - logs every credit-consuming action
CREATE TABLE IF NOT EXISTS credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'generate_image', 'refine_image', 'hdr_enhance', etc.
  credits_used INTEGER NOT NULL DEFAULT 0,
  related_image_id UUID,
  related_request_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- API clients table: Manages white-label API access (B2B strategy)
CREATE TABLE IF NOT EXISTS api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  monthly_request_limit INTEGER DEFAULT 0,
  tier TEXT DEFAULT 'standard',
  is_active BOOLEAN DEFAULT TRUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Marketplace presets table: Stores preset listings for the internal marketplace
CREATE TABLE IF NOT EXISTS marketplace_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  fibo_json JSONB NOT NULL,
  preview_url TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0,
  license_type TEXT DEFAULT 'single_user', -- single_user, commercial, enterprise
  is_approved BOOLEAN DEFAULT FALSE,
  download_count INTEGER DEFAULT 0,
  rating_average NUMERIC(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Preset purchases table: Records transactions in the marketplace
CREATE TABLE IF NOT EXISTS preset_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id UUID REFERENCES marketplace_presets(id) ON DELETE SET NULL,
  buyer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchase_price_cents INTEGER NOT NULL,
  license_key TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_timestamp ON credit_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_credit_usage_user_timestamp ON credit_usage(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_presets_author ON marketplace_presets(author_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_presets_approved ON marketplace_presets(is_approved);
CREATE INDEX IF NOT EXISTS idx_preset_purchases_buyer ON preset_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_preset_purchases_preset ON preset_purchases(preset_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_clients_updated_at BEFORE UPDATE ON api_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_marketplace_presets_updated_at BEFORE UPDATE ON marketplace_presets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE preset_purchases ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Plans: Public read, admin write
CREATE POLICY "Plans are viewable by everyone"
  ON plans FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own credit usage"
  ON credit_usage FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert credit usage (for edge functions)
CREATE POLICY "Service role can manage credit usage"
  ON credit_usage FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Users can view approved marketplace presets"
  ON marketplace_presets FOR SELECT USING (is_approved = TRUE OR auth.uid() = author_id);

CREATE POLICY "Users can view their own purchases"
  ON preset_purchases FOR SELECT USING (auth.uid() = buyer_id);

-- Seed default plans
INSERT INTO plans (name, monthly_credit_limit, features, price_cents, description) VALUES
  ('Free', 10, '["basic_generation"]'::jsonb, 0, 'Perfect for trying out ProLight AI'),
  ('Pro', 500, '["basic_generation", "hdr", "batch_generation", "priority_support"]'::jsonb, 2999, 'For professionals and power users'),
  ('Team', 2500, '["basic_generation", "hdr", "batch_generation", "priority_support", "api_access", "team_collaboration"]'::jsonb, 9999, 'For teams and agencies')
ON CONFLICT (name) DO NOTHING;

