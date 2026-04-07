# Programme Ambassadeur — Phase 1

Fondations pour la gestion du programme de parrainage d'une boutique de parfum.

## Setup

### Prerequisites
- Node.js 18+
- Supabase CLI
- Git

### Installation

```bash
# Clone repository
git clone <repo>
cd "App Emre"

# Install dependencies
npm install

# Create .env.local (copy from .env.example)
cp .env.example .env.local

# Add Supabase credentials to .env.local
# NEXT_PUBLIC_SUPABASE_URL=your-url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

### Database Setup

```bash
# Start Supabase locally
supabase start

# Apply migrations
supabase db push

# (Optional) Seed test data
supabase db seed seed.sql
```

### Development

```bash
# Start dev server
npm run dev

# Open browser
# http://localhost:3000
```

### Testing

```bash
# Run all tests
npm run test

# Run with UI
npm run test:ui

# Watch mode
npm run test:watch
```

## Structure

```
app-emre/
├─ app/                         # Next.js App Router
│  ├─ middleware.ts             # Auth guard
│  ├─ layout.tsx                # Root layout
│  ├─ error.tsx                 # Error boundary
│  ├─ globals.css               # Tailwind styles
│  ├─ login/
│  │  ├─ page.tsx               # Login form page
│  │  └─ actions.ts             # Auth Server Actions
│  └─ dashboard/
│     └─ page.tsx               # Dashboard placeholder
├─ lib/
│  ├─ supabase/                 # Supabase clients
│  ├─ db/                        # Query helpers
│  ├─ rpc/                       # RPC wrappers
│  ├─ validation/                # Zod schemas
│  ├─ utils/                     # Utilities (normalize, errors)
│  └─ constants.ts              # Business constants
├─ components/
│  ├─ auth/                      # Auth components
│  ├─ layout/                    # Layout components
│  └─ errors/                    # Error components
├─ __tests__/
│  ├─ unit/                      # Unit tests
│  └─ integration/               # Integration tests (Phase 2)
└─ supabase/
   └─ migrations/                # Database migrations
```

## Phase 1 Features

✅ Database schema (6 tables + indices)
✅ RPC functions (record_sale_with_points, use_voucher)
✅ Row Level Security policies
✅ Supabase Auth (staff email/password)
✅ Auth middleware
✅ Login/logout flow
✅ Zod validation
✅ Error handling
✅ Unit tests (normalize, schemas)
✅ Test stubs for Phase 2

## Phase 2+ (Not Included)

- [ ] Customer creation & search
- [ ] Sales recording UI
- [ ] Voucher usage UI
- [ ] Email verification
- [ ] Email templates (Resend)
- [ ] Admin settings & stats
- [ ] Audit logs UI
- [ ] Staff management
- [ ] Full integration tests

## Technology Stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript strict
- **Styling:** Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Validation:** Zod
- **Testing:** Vitest + jsdom
- **Deployment:** Vercel

## Standards

- TypeScript strict mode (no `any`)
- Server components by default
- Zod validation on server actions
- French UI messages
- Conventional commits (feat:, fix:, test:, etc.)
- Atomic transactions for critical operations

## Troubleshooting

### Supabase connection fails
- Check .env.local has correct credentials
- Verify Supabase project is running (`supabase status`)
- Check JWT token in browser cookies

### RLS policy errors
- Ensure middleware is setting auth context
- Check user has staff role in database
- Verify RLS policies are enabled

## Contributing

1. Create feature branch: `git checkout -b feat/feature-name`
2. Write tests first (TDD)
3. Implement feature
4. Commit with conventional message
5. Create PR for review

## License

Proprietary - Boutique Parfum
