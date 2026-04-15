-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Staff table (admin + vendeurs)
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendeur')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_email ON staff(email);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  referrer_id UUID REFERENCES customers(id),
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255) UNIQUE,
  email_verification_token_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (email != '' AND phone != ''),
  CHECK (referrer_id IS DISTINCT FROM id)
);

CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_referrer_id ON customers(referrer_id);

-- Sales table
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (amount > 0)
);

CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);

-- Referrals table
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(id),
  referee_id UUID NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  validated_at TIMESTAMPTZ,
  sale_id UUID REFERENCES sales(id) ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (referrer_id, referee_id),
  CHECK (referrer_id != referee_id),
  CHECK (status = 'validated' OR validated_at IS NULL),
  CHECK (points_awarded >= 0 AND points_awarded <= 1)
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Vouchers table
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  used_at TIMESTAMPTZ,
  used_in_sale_id UUID REFERENCES sales(id) ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (status = 'available' OR used_at IS NOT NULL),
  CHECK (status != 'used' OR used_in_sale_id IS NOT NULL)
);

CREATE INDEX idx_vouchers_referrer_id ON vouchers(referrer_id);
CREATE INDEX idx_vouchers_status ON vouchers(status);

-- Program settings table (single row for global configuration)
CREATE TABLE program_settings (
  id BIGINT PRIMARY KEY CHECK (id = 1),
  min_sale_amount INTEGER NOT NULL DEFAULT 30,
  points_per_referral INTEGER NOT NULL DEFAULT 1,
  voucher_value_euros INTEGER NOT NULL DEFAULT 20,
  points_for_voucher INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  action VARCHAR(100) NOT NULL,
  details JSONB ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
