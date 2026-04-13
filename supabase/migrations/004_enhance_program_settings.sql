-- Enhance program_settings table with proper data types and improved RLS policies
-- This migration improves the program_settings table created in 001_initial_schema.sql

-- Drop existing RLS policies for program_settings
DROP POLICY IF EXISTS "program_settings_select_policy" ON program_settings;
DROP POLICY IF EXISTS "program_settings_update_policy" ON program_settings;
DROP POLICY IF EXISTS "program_settings_insert_policy" ON program_settings;

-- Alter table to use NUMERIC for better precision with currency/amount fields
ALTER TABLE program_settings
  ALTER COLUMN min_sale_amount TYPE NUMERIC USING min_sale_amount::NUMERIC,
  ALTER COLUMN voucher_value_euros TYPE NUMERIC USING voucher_value_euros::NUMERIC;

-- Ensure timestamps are TIMESTAMPTZ for timezone awareness
ALTER TABLE program_settings
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Verify RLS is enabled
ALTER TABLE program_settings ENABLE ROW LEVEL SECURITY;

-- Create improved RLS policies
-- Anyone can SELECT (this table is read-only for staff, and admin client uses service role anyway)
CREATE POLICY "program_settings_select_policy" ON program_settings
  FOR SELECT
  USING (true);

-- Only authenticated admin users can UPDATE
CREATE POLICY "program_settings_update_policy" ON program_settings
  FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Only authenticated admin users can INSERT
CREATE POLICY "program_settings_insert_policy" ON program_settings
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

-- Only authenticated admin users can DELETE
CREATE POLICY "program_settings_delete_policy" ON program_settings
  FOR DELETE
  USING (auth.jwt() ->> 'role' = 'admin');
