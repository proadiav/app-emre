-- Fix infinite recursion in staff_select_policy
-- The old policy did a sub-select on staff to check admin role, causing infinite recursion
DROP POLICY IF EXISTS "staff_select_policy" ON staff;

-- Simple policy: authenticated users can read their own record
CREATE POLICY "staff_select_policy" ON staff
  FOR SELECT
  USING (
    auth.uid() = id
  );
