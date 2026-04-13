-- Refactor record_sale_with_points to read settings dynamically
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
  v_settings record;
  v_sale_id UUID;
  v_customer_email_verified BOOLEAN;
  v_referral_id UUID;
  v_validated_count INT;
  v_error_code TEXT;
  v_referrer_id UUID;
BEGIN
  -- Load current program settings
  SELECT * INTO v_settings
  FROM program_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Fallback if no settings exist
  IF v_settings IS NULL THEN
    v_settings.min_sale_amount := 30;
    v_settings.points_per_referral := 1;
    v_settings.voucher_threshold := 5;
    v_settings.voucher_value_euros := 20;
    v_settings.version := 0;
  END IF;

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

  -- 4. Use dynamic min_sale_amount from settings
  IF p_amount >= v_settings.min_sale_amount AND v_referrer_id IS NOT NULL THEN
    -- Find pending referral for this customer (as referee)
    SELECT id
    INTO v_referral_id
    FROM referrals
    WHERE referee_id = p_customer_id AND status = 'pending'
    LIMIT 1;

    IF FOUND THEN
      -- Update referral to validated with dynamic points
      UPDATE referrals
      SET status = 'validated', validated_at = NOW(), sale_id = v_sale_id, points_awarded = v_settings.points_per_referral
      WHERE id = v_referral_id;

      -- Count validated referrals for referrer
      SELECT COUNT(*)
      INTO v_validated_count
      FROM referrals
      WHERE referrer_id = v_referrer_id AND status = 'validated';

      -- Generate voucher if count reaches dynamic threshold
      IF v_validated_count = v_settings.voucher_threshold THEN
        INSERT INTO vouchers (referrer_id, status)
        VALUES (v_referrer_id, 'available');

        -- Trace audit log with settings snapshot
        INSERT INTO audit_logs (staff_id, action, details)
        VALUES (
          p_staff_id,
          'record_sale_with_voucher_generated',
          jsonb_build_object(
            'customer_id', p_customer_id,
            'amount', p_amount,
            'sale_id', v_sale_id,
            'referrer_id', v_referrer_id,
            'applied_settings_version', v_settings.version,
            'settings_snapshot', jsonb_build_object(
              'points_per_referral', v_settings.points_per_referral,
              'voucher_threshold', v_settings.voucher_threshold,
              'min_sale_amount', v_settings.min_sale_amount,
              'voucher_value_euros', v_settings.voucher_value_euros
            )
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
            'applied_settings_version', v_settings.version,
            'settings_snapshot', jsonb_build_object(
              'points_per_referral', v_settings.points_per_referral,
              'voucher_threshold', v_settings.voucher_threshold,
              'min_sale_amount', v_settings.min_sale_amount,
              'voucher_value_euros', v_settings.voucher_value_euros
            )
          )
        );

        RETURN QUERY SELECT v_sale_id, TRUE, FALSE, NULL;
      END IF;
    ELSE
      RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
    END IF;
  ELSE
    RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL, FALSE, FALSE, 'unknown_error'::TEXT;
END;
$$;
