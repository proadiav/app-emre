-- Fix type mismatch in record_sale_with_points:
-- Untyped NULL literals default to TEXT; cast to UUID / TEXT explicitly
-- to match the RETURNS TABLE signature.

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
  v_referrer_id UUID;
BEGIN
  -- Load current program settings
  SELECT * INTO v_settings
  FROM program_settings
  ORDER BY updated_at DESC
  LIMIT 1;

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
    RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, 'customer_not_found'::TEXT;
    RETURN;
  END IF;

  IF NOT v_customer_email_verified THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, 'email_not_verified'::TEXT;
    RETURN;
  END IF;

  -- 2. Validate amount > 0
  IF p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, 'invalid_amount'::TEXT;
    RETURN;
  END IF;

  -- 3. INSERT sale
  INSERT INTO sales (customer_id, amount)
  VALUES (p_customer_id, p_amount)
  RETURNING id INTO v_sale_id;

  -- 4. Referral validation + voucher generation
  IF p_amount >= v_settings.min_sale_amount AND v_referrer_id IS NOT NULL THEN
    SELECT id
    INTO v_referral_id
    FROM referrals
    WHERE referee_id = p_customer_id AND status = 'pending'
    LIMIT 1;

    IF FOUND THEN
      UPDATE referrals
      SET status = 'validated',
          validated_at = NOW(),
          sale_id = v_sale_id,
          points_awarded = v_settings.points_per_referral
      WHERE id = v_referral_id;

      SELECT COUNT(*)
      INTO v_validated_count
      FROM referrals
      WHERE referrer_id = v_referrer_id AND status = 'validated';

      IF v_validated_count = v_settings.voucher_threshold THEN
        INSERT INTO vouchers (referrer_id, status)
        VALUES (v_referrer_id, 'available');

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

        RETURN QUERY SELECT v_sale_id, TRUE, TRUE, NULL::TEXT;
      ELSE
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

        RETURN QUERY SELECT v_sale_id, TRUE, FALSE, NULL::TEXT;
      END IF;
    ELSE
      RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL::TEXT;
    END IF;
  ELSE
    RETURN QUERY SELECT v_sale_id, FALSE, FALSE, NULL::TEXT;
  END IF;

EXCEPTION WHEN OTHERS THEN
  RETURN QUERY SELECT NULL::UUID, FALSE, FALSE, 'unknown_error'::TEXT;
END;
$$;
