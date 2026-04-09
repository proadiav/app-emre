# Testing Setup - Admin Settings & Audit Logging

This document explains how to set up and run the integration tests for the admin settings and audit logging features (Task 2 of Phase 3).

## Prerequisites

Before running the tests, ensure you have:
1. Node.js 18+ installed
2. A Supabase project created (with PostgreSQL database)
3. The database migrations applied to your Supabase instance

## Environment Setup

### 1. Create `.env.local` file

Copy the `.env.example` file and create a `.env.local` with your Supabase credentials:

```bash
cp .env.example .env.local
```

Then fill in the values:

```
# Supabase (public, non-secret)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Supabase (private, secrets)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-key-min-32-chars

# Resend Email (optional for these tests)
RESEND_API_KEY=your-resend-api-key-here

# Deployment (Vercel)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is required for the integration tests to work, as they use the admin client.

### 2. Apply Database Migrations

Ensure your Supabase project has the latest migrations applied:

```bash
# If using Supabase CLI locally
supabase db push

# Or manually apply the migration:
# - Go to Supabase Dashboard → SQL Editor
# - Run the migration from supabase/migrations/001_initial_schema.sql
```

The migration creates the following tables:
- `program_settings` - Stores global configuration (single row with id=1)
- `audit_logs` - Stores audit trail of admin actions
- Plus other tables for customers, sales, referrals, vouchers, staff

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Admin Settings Tests Only
```bash
npm test -- __tests__/integration/admin-settings.test.ts
```

### Run Tests in Watch Mode
```bash
npm test:watch
```

### Run Tests with UI
```bash
npm test:ui
```

## Test Structure

The test suite covers:

### `getSettings()`
- Returns default settings when no records exist
- Returns existing settings from database
- Defaults: min_sale_amount=30, points_per_referral=1, voucher_value_euros=20, points_for_voucher=5

### `updateSettings(updates)`
- Updates settings with partial values
- Creates settings if none exist
- Persists updates to database

### `countAuditLogs()`
- Returns 0 when no audit logs exist
- Counts all audit log entries

### `getAuditLogs(filters?, pagination?)`
- Returns all logs with default pagination (limit=50)
- Filters logs by action
- Filters logs by staff_id
- Supports pagination with page and limit
- Orders logs by created_at DESC (newest first)

### `logAction(staffId, action, details?)`
- Inserts audit log entry
- Inserts log without details (details=null)
- Does not throw even if logging fails (resilience)

## Test Database Cleanup

The tests automatically:
1. **Before each test** (beforeEach):
   - Clean up previous test data from audit_logs
   - Clean up previous test data from program_settings
   - Create a fresh test staff member

2. **After each test** (afterEach):
   - Remove the test staff member
   - Clean up all audit_logs
   - Clean up all program_settings

This ensures each test runs in a clean state without affecting other tests.

## Troubleshooting

### Error: "Missing Supabase admin environment variables"
**Solution:** Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`

### Error: Database connection failed
**Solution:** 
- Verify your Supabase project URL and keys are correct
- Check that your Supabase project is active (not paused)
- Verify network connectivity

### Error: "relation 'public.program_settings' does not exist"
**Solution:** Apply the database migrations:
```bash
supabase db push
```

### Tests timeout
**Solution:** Increase timeout in `vitest.config.ts` or use `--testTimeout=30000` flag:
```bash
npm test -- --testTimeout=30000
```

## Test Data

The tests use:
- Email: `test.staff@example.com`
- Role: `admin`
- Actions: `create_customer`, `update_settings`, `verify_email`

All test data is automatically cleaned up after tests complete.

## Next Steps

Once tests pass:
1. Run all integration tests to ensure nothing else broke
2. Commit with: `git commit -m "feat: add settings and audit logging database helpers"`
3. Request code review
4. Merge to main branch

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Vitest Testing Framework](https://vitest.dev/)
- [Project CLAUDE.md](./CLAUDE.md) for business rules
