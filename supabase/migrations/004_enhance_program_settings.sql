-- Enhance program_settings table with proper data types and improved RLS policies
-- This migration improves the program_settings table created in 001_initial_schema.sql

-- Drop existing RLS policies for program_settings
DROP POLICY IF EXISTS "program_settings_select_policy" ON program_settings;
DROP POLICY IF EXISTS "program_settings_update_policy" ON program_settings;
DROP POLICY IF EXISTS "program_settings_insert_policy" ON program_settings;
DROP POLICY IF EXISTS "program_settings_delete_policy" ON program_settings;

-- Alter table to use NUMERIC for better precision with currency/amount fields
ALTER TABLE program_settings
  ALTER COLUMN min_sale_amount TYPE NUMERIC USING min_sale_amount::NUMERIC,
  ALTER COLUMN voucher_value_euros TYPE NUMERIC USING voucher_value_euros::NUMERIC;

-- Ensure timestamps are TIMESTAMPTZ for timezone awareness
ALTER TABLE program_settings
  ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at TYPE TIMESTAMPTZ USING updated_at AT TIME ZONE 'UTC';

-- Add audit trail columns
-- NOTE: id remains BIGINT PRIMARY KEY with CHECK (id = 1) singleton pattern from 001_initial_schema.sql
-- Do NOT convert to UUID - this would break the singleton constraint and destroy data
ALTER TABLE program_settings
  ADD COLUMN version INT DEFAULT 1,
  ADD COLUMN updated_by UUID REFERENCES staff(id);

-- Rename points_for_voucher to voucher_threshold
ALTER TABLE program_settings
  RENAME COLUMN points_for_voucher TO voucher_threshold;

-- Verify RLS is enabled
ALTER TABLE program_settings ENABLE ROW LEVEL SECURITY;

-- Create improved RLS policies
-- Admin-only access: SELECT
CREATE POLICY "program_settings_select_policy" ON program_settings
  FOR SELECT
  USING (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  );

-- Admin-only access: UPDATE
CREATE POLICY "program_settings_update_policy" ON program_settings
  FOR UPDATE
  USING (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  );

-- Admin-only access: INSERT
CREATE POLICY "program_settings_insert_policy" ON program_settings
  FOR INSERT
  WITH CHECK (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  );

-- Admin-only access: DELETE
CREATE POLICY "program_settings_delete_policy" ON program_settings
  FOR DELETE
  USING (
    (SELECT role FROM staff WHERE id = auth.uid()) = 'admin'
  );
