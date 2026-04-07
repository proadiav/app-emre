-- Function: record_sale_with_points()
-- Purpose: Atomically record sale, validate referral, award points, generate voucher
CREATE OR REPLACE FUNCTION record_sale_with_points(
  p_customer_id UUID,
  p_amount DECIMAL,
  p_staff_id UUID
)
RETURNS TABLE (
  sale_id UUID,
  referral_validated BOOLEAN,
  voucher_created BOOLEAN,
  error_code TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_sale_id UUID;
  v_customer_email_verified BOOLEAN;
  v_referral_id UUID;
  v_validated_count INT;
  v_error_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- 1. Validate customer exists and email_verified = true
  SELECT email_verified, referrer_id
  INTO v_customer_email_verified, v_referrer_id
  FROM customers
  WHERE id = p_customer_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'customer_not_found'::TEXT;
    RETURN;
  END IF;

  IF NOT v_customer_email_verified THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'email_not_verified'::TEXT;
    RETURN;
  END IF;

  -- 2. Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT NULL, FALSE, FALSE, 'invalid_amount'::TEXT;
    RETURN;
  END IF;

  -- 3. INSERT sale
  INSERT INTO sales (customer_id, amount)
  VALUES (p_customer_id, p_amount)
  RETURNING id INTO v_sale_id;

  -- 4. If amount >= 30, validate referral and award points
  IF p_amount >= 30 AND v_referrer_id IS NOT NULL THEN
    -- Find pending referral for this customer (as referee)
    SELECT id
    INTO v_referral_id
    FROM referrals
    WHERE referee_id = p_customer_id AND status = 'pending'
    LIMIT 1;

    IF FOUND THEN
      -- Update referral to validated
      UPDATE referrals
      SET status = 'validated', validated_at = NOW(), sale_id = v_sale_id, points_awarded = 1
      WHERE id = v_referral_id;

      -- Count validated referrals for referrer
      SELECT COUNT(*)
      INTO v_validated_count
      FROM referrals
      WHERE referrer_id = v_referrer_id AND status = 'validated';

      -- Generate voucher if count = 5
      IF v_validated_count = 5 THEN
        INSERT INTO vouchers (referrer_id, status)
        VALUES (v_referrer_id, 'available');

        -- Trace audit log
        INSERT INTO audit_logs (staff_id, action, details)
        VALUES (
          p_staff_id,
          'record_sale_with_voucher_generated',
          jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'sale_id', v_sale_id,
            'referrer_id', v_referrer_id
          )
        );

        RETURN QUERY SELECT v_sale_id, TRUE, TRUE, NULL;
      ELSE
        -- Trace audit log
        INSERT INTO audit_logs (staff_id, action, details)
        VALUES (
          p_staff_id,
          'record_sale_with_points_awarded',
          jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'sale_id', v_sale_id,
            'referrer_id', v_referrer_id,
            'points_count', v_validated_count
          )
        );

        RETURN QUERY SELECT v_sale_id, TRUE, FALSE, NULL;
      END IF;
    ELSE
      -- No pending referral found
      INSERT INTO audit_logs (staff_id, action, details)
      VALUES (
        p_staff_id,
        'record_sale_no_referral',
        jsonb_build_object(
          'customer_id', p_customer_id,
          'amount', p_amount,
          'sale_id', v_sale_id
        )
      );

      RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
    END IF;
  ELSE
    -- Amount < 30 or no referrer
    INSERT INTO audit_logs (staff_id, action, details)
    VALUES (
      p_staff_id,
      'record_sale_no_validation',
      jsonb_build_object(
        'customer_id', p_customer_id,
        'amount', p_amount,
        'sale_id', v_sale_id,
        'reason', CASE WHEN p_amount < 30 THEN 'amount_below_threshold' ELSE 'no_referrer' END
      )
    );

    RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL, FALSE, FALSE, 'unknown_error'::TEXT;
END;
$$;

-- Function: use_voucher()
-- Purpose: Atomically mark voucher as used, link to sale
CREATE OR REPLACE FUNCTION use_voucher(
  p_voucher_id UUID,
  p_sale_id UUID,
  p_staff_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_voucher_status TEXT;
BEGIN
  -- 1. Validate voucher exists and status = 'available'
  SELECT status
  INTO v_voucher_status
  FROM vouchers
  WHERE id = p_voucher_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'voucher_not_found'::TEXT;
    RETURN;
  END IF;

  IF v_voucher_status != 'available' THEN
    RETURN QUERY SELECT FALSE, 'voucher_not_available'::TEXT;
    RETURN;
  END IF;

  -- 2. Validate sale exists
  IF NOT EXISTS (SELECT 1 FROM sales WHERE id = p_sale_id) THEN
    RETURN QUERY SELECT FALSE, 'sale_not_found'::TEXT;
    RETURN;
  END IF;

  -- 3. Update voucher to used
  UPDATE vouchers
  SET status = 'used', used_at = NOW(), used_in_sale_id = p_sale_id
  WHERE id = p_voucher_id;

  -- 4. Trace audit log
  INSERT INTO audit_logs (staff_id, action, details)
  VALUES (
    p_staff_id,
    'use_voucher',
    jsonb_build_object(
      'voucher_id', p_voucher_id,
      'sale_id', p_sale_id
    )
  );

  RETURN QUERY SELECT TRUE, NULL;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT FALSE, 'unknown_error'::TEXT;
END;
$$;
