-- Migration: Create billing tables (invoices and subscriptions)
-- Supports both SQLite and PostgreSQL

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    
    status TEXT NOT NULL,
    currency TEXT NOT NULL,
    amount_due INTEGER NOT NULL,
    amount_paid INTEGER NOT NULL,
    
    hosted_invoice_url TEXT,
    invoice_pdf TEXT,
    
    billing_reason TEXT,
    period_start TIMESTAMP,
    period_end TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    
    status TEXT NOT NULL,
    price_id TEXT NOT NULL,
    interval TEXT NOT NULL,
    
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    
    cancel_at_period_end BOOLEAN DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subs_stripe_id ON subscriptions(stripe_subscription_id);

-- For PostgreSQL (uncomment if using PostgreSQL):
-- CREATE TABLE IF NOT EXISTS invoices (
--     id SERIAL PRIMARY KEY,
--     
--     stripe_invoice_id TEXT UNIQUE NOT NULL,
--     stripe_customer_id TEXT NOT NULL,
--     
--     status TEXT NOT NULL,
--     currency TEXT NOT NULL,
--     amount_due INTEGER NOT NULL,
--     amount_paid INTEGER NOT NULL,
--     
--     hosted_invoice_url TEXT,
--     invoice_pdf TEXT,
--     
--     billing_reason TEXT,
--     period_start TIMESTAMP WITH TIME ZONE,
--     period_end TIMESTAMP WITH TIME ZONE,
--     
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE
-- );
-- 
-- CREATE INDEX IF NOT EXISTS idx_invoices_customer ON invoices(stripe_customer_id);
-- CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
-- CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);
-- 
-- CREATE TABLE IF NOT EXISTS subscriptions (
--     id SERIAL PRIMARY KEY,
--     
--     stripe_subscription_id TEXT UNIQUE NOT NULL,
--     stripe_customer_id TEXT NOT NULL,
--     
--     status TEXT NOT NULL,
--     price_id TEXT NOT NULL,
--     interval TEXT NOT NULL,
--     
--     current_period_start TIMESTAMP WITH TIME ZONE,
--     current_period_end TIMESTAMP WITH TIME ZONE,
--     
--     cancel_at_period_end BOOLEAN DEFAULT FALSE,
--     
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
--     updated_at TIMESTAMP WITH TIME ZONE
-- );
-- 
-- CREATE INDEX IF NOT EXISTS idx_subs_customer ON subscriptions(stripe_customer_id);
-- CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
-- CREATE INDEX IF NOT EXISTS idx_subs_stripe_id ON subscriptions(stripe_subscription_id);

