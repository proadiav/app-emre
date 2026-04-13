-- Create RPC function for atomic program settings update with audit logging
-- This function updates program settings and logs the action in a single transaction
-- Uses service role key (supabaseAdmin) to bypass RLS

CREATE OR REPLACE FUNCTION update_program_settings(
  p_points_per_referral INT,
  p_voucher_threshold INT,
  p_min_sale_amount NUMERIC,
  p_voucher_value_euros NUMERIC,
  p_staff_id UUID
)
RETURNS TABLE (
  id BIGINT,
  version INT,
  points_per_referral INT,
  voucher_threshold INT,
  min_sale_amount NUMERIC,
  voucher_value_euros NUMERIC,
  updated_at TIMESTAMPTZ,
  updated_by UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_version INT;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version FROM program_settings WHERE id = 1;

  -- If no settings exist, initialize with version 1
  IF v_current_version IS NULL THEN
    v_current_version := 0;
  END IF;

  -- Update settings atomically
  UPDATE program_settings
  SET
    points_per_referral = p_points_per_referral,
    voucher_threshold = p_voucher_threshold,
    min_sale_amount = p_min_sale_amount,
    voucher_value_euros = p_voucher_value_euros,
    version = v_current_version + 1,
    updated_at = NOW(),
    updated_by = p_staff_id
  WHERE id = 1;

  -- Insert audit log entry in same transaction
  INSERT INTO audit_logs (staff_id, action, details)
  VALUES (
    p_staff_id,
    'update_program_settings',
    jsonb_build_object(
      'old_version', v_current_version,
      'new_version', v_current_version + 1,
      'points_per_referral', p_points_per_referral,
      'voucher_threshold', p_voucher_threshold,
      'min_sale_amount', p_min_sale_amount,
      'voucher_value_euros', p_voucher_value_euros
    )
  );

  -- Return updated settings
  RETURN QUERY SELECT * FROM program_settings WHERE id = 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_program_settings(INT, INT, NUMERIC, NUMERIC, UUID) TO authenticated;
