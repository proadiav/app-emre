-- Make the atomic RPCs SECURITY DEFINER so they can perform all their
-- writes (sales, referrals, vouchers, audit_logs) regardless of the
-- caller's RLS context. These RPCs are the only sanctioned mutation
-- path for those tables and every action is audit-logged.

ALTER FUNCTION record_sale_with_points(UUID, DECIMAL, UUID) SECURITY DEFINER;
ALTER FUNCTION use_voucher(UUID, UUID, UUID) SECURITY DEFINER;
