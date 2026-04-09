-- Enable RLS on all tables
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Staff: vendeur sees only self, admin sees all
CREATE POLICY "staff_select_policy" ON staff
  FOR SELECT
  USING (
    (auth.uid() = id)  -- vendeur sees self
    OR
    ((SELECT role FROM staff WHERE id = auth.uid()) = 'admin')  -- admin sees all
  );

-- Customers: all staff can read
CREATE POLICY "customers_select_policy" ON customers
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid())
  );

-- Sales: all staff can read, RPC writes
CREATE POLICY "sales_select_policy" ON sales
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid())
  );

CREATE POLICY "sales_insert_rpc_only" ON sales
  FOR INSERT
  WITH CHECK (FALSE);  -- Prevent direct inserts

-- Referrals: all staff can read, RPC writes
CREATE POLICY "referrals_select_policy" ON referrals
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid())
  );

CREATE POLICY "referrals_insert_rpc_only" ON referrals
  FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "referrals_update_rpc_only" ON referrals
  FOR UPDATE
  WITH CHECK (FALSE);

-- Vouchers: all staff can read, RPC writes
CREATE POLICY "vouchers_select_policy" ON vouchers
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM staff WHERE id = auth.uid())
  );

CREATE POLICY "vouchers_insert_rpc_only" ON vouchers
  FOR INSERT
  WITH CHECK (FALSE);

CREATE POLICY "vouchers_update_rpc_only" ON vouchers
  FOR UPDATE
  WITH CHECK (FALSE);

-- Program settings: used by admin server-side only, RLS allows admin client (bypasses RLS)
CREATE POLICY "program_settings_select_policy" ON program_settings
  FOR SELECT
  USING (true);  -- Admin client bypasses RLS anyway

CREATE POLICY "program_settings_update_policy" ON program_settings
  FOR UPDATE
  USING (true)  -- Admin client bypasses RLS anyway
  WITH CHECK (true);

CREATE POLICY "program_settings_insert_policy" ON program_settings
  FOR INSERT
  WITH CHECK (true);  -- Admin client bypasses RLS anyway

-- Audit logs: admin only can read, RPC writes
CREATE POLICY "audit_logs_select_policy" ON audit_logs
  FOR SELECT
  USING (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "audit_logs_insert_rpc_only" ON audit_logs
  FOR INSERT
  WITH CHECK (FALSE);
