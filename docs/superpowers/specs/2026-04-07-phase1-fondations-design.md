# Phase 1 — Fondations : Design Spec

**Date** : 2026-04-07  
**Projet** : Programme Ambassadeur (Boutique Parfum)  
**Portée** : Architecture DB, auth staff, structure Next.js, opérations atomiques  

---

## 🎯 Objectifs Phase 1

1. **Schéma Supabase** : tables clients, ventes, parrainages, bons, audit
2. **Authentication** : staff (email/password) via Supabase Auth
3. **Opérations atomiques** : RPC Postgres pour saisie vente + points + bon
4. **Structure Next.js** : app router, server components, Server Actions
5. **Sécurité** : RLS policies, Zod validation, audit logs
6. **Tests** : Vitest setup, tests anti-fraude ébauche

**Non inclus Phase 1** :
- Création/recherche clients
- Emails transactionnels (Resend)
- Interface parrainage/bons
- Admin settings, stats, staff management

---

## 🏗️ Architecture globale

```
┌─────────────────────────────────────────────────────┐
│  Next.js 15 (App Router) + TypeScript strict        │
│  ├─ /app/login           (form auth staff)          │
│  ├─ /app/dashboard       (placeholder redirect)     │
│  └─ /app/error           (fallback erreurs)         │
│                                                      │
│  Server Actions → RPC calls + Zod validation        │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│  Supabase (PostgreSQL) + Supabase Auth              │
│  ├─ Tables (RLS policies actives) :                 │
│  │  ├─ staff                                        │
│  │  ├─ customers                                    │
│  │  ├─ sales                                        │
│  │  ├─ referrals                                    │
│  │  ├─ vouchers                                     │
│  │  └─ audit_logs                                   │
│  └─ RPC Functions (atomiques) :                     │
│     ├─ record_sale_with_points()                    │
│     └─ use_voucher()                                │
└─────────────────────────────────────────────────────┘
```

**Data flow** :
1. Staff login → Supabase Auth (email/password) → JWT token
2. Request → Middleware (JWT check) → Server Action
3. Server Action → Zod validation → RPC call
4. RPC exécute atomiquement, trace audit_log, retourne résultat
5. Server Action retourne JSON → UI affiche résultat/erreur

---

## 📊 Schéma Supabase

### **Table : staff**

Gestion équipe interne (admin + vendeurs).

```sql
CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'vendeur')),
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC'
);
```

**Notes** :
- Email gérée par Supabase Auth (password hash stocké séparément)
- `role` : 'admin' ou 'vendeur'

---

### **Table : customers**

Clients boutique (prospects + validated customers).

```sql
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  referrer_id UUID REFERENCES customers(id) NULLABLE,
  email_verified BOOLEAN DEFAULT FALSE,
  email_verification_token VARCHAR(255) UNIQUE NULLABLE,
  email_verification_token_expires TIMESTAMP NULLABLE,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  updated_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  
  CHECK (email != '' AND phone != ''),
  CHECK (referrer_id IS DISTINCT FROM id)
);
```

**Règles métier** :
- Email + phone normalisés avant INSERT (lowercase, trim, E.164)
- `referrer_id` : optionnel, défini à la création du client uniquement
- `email_verified` : false = parrainage non confirmé, aucun point
- `email_verification_token` : JWT 7 jours, usage unique

**Indices** :
```sql
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_referrer_id ON customers(referrer_id);
```

---

### **Table : sales**

Saisies manuelles de ventes.

```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  
  CHECK (amount > 0)
);
```

**Règles métier** :
- Montant > 0
- Une vente ≥ 30€ valide un parrainage (via RPC)

**Indices** :
```sql
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
```

---

### **Table : referrals**

Relation parrain → filleul, statut de validation.

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(id),
  referee_id UUID NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'validated')),
  validated_at TIMESTAMP NULLABLE,
  sale_id UUID REFERENCES sales(id) NULLABLE,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  
  UNIQUE (referrer_id, referee_id),
  CHECK (referrer_id != referee_id),
  CHECK (status = 'validated' OR validated_at IS NULL),
  CHECK (points_awarded >= 0 AND points_awarded <= 1)
);
```

**Règles métier** :
- `status` : 'pending' → attente vente ≥ 30€, 'validated' → vente réalisée
- Un filleul ne génère des points qu'une fois (`points_awarded` max 1)
- Un parrain ne peut pas être parrainé lui-même (CHECK)
- Anti-doublon : unique (referrer_id, referee_id)

**Indices** :
```sql
CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referee_id ON referrals(referee_id);
CREATE INDEX idx_referrals_status ON referrals(status);
```

---

### **Table : vouchers**

Bons de 20€ générés automatiquement (5 filleuls validés = 1 bon).

```sql
CREATE TABLE vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES customers(id),
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
  used_at TIMESTAMP NULLABLE,
  used_in_sale_id UUID REFERENCES sales(id) NULLABLE,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC',
  
  CHECK (status = 'available' OR used_at IS NOT NULL),
  CHECK (status != 'used' OR used_in_sale_id IS NOT NULL)
);
```

**Règles métier** :
- Générés automatiquement par RPC quand referrer atteint 5 filleuls validés
- Statut : 'available' (prêt), 'used' (utilisé), 'expired' (optionnel Phase 2)
- Aucun minimum pour utilisation, aucune expiration, cumulables
- Les points NE sont PAS remis à zéro après génération

**Indices** :
```sql
CREATE INDEX idx_vouchers_referrer_id ON vouchers(referrer_id);
CREATE INDEX idx_vouchers_status ON vouchers(status);
```

---

### **Table : audit_logs**

Traçabilité obligatoire de toutes les actions sensibles.

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID NOT NULL REFERENCES staff(id),
  action VARCHAR(100) NOT NULL,
  details JSONB NULLABLE,
  created_at TIMESTAMP DEFAULT NOW() AT TIME ZONE 'UTC'
);
```

**Actions tracées** :
- `create_customer`
- `record_sale`
- `use_voucher`
- `verify_email`
- etc.

**Indices** :
```sql
CREATE INDEX idx_audit_logs_staff_id ON audit_logs(staff_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

---

## 🔒 Row Level Security (RLS)

Chaque table a des policies SQL pour isoler les accès par rôle.

### **staff**
- **Vendeur** : voit seulement ses propres données
- **Admin** : voit tous les staff

### **customers**
- **Vendeur** : voit **tous** les clients (besoin métier : chercher parrain, saisir vente)
- **Admin** : voit tous les clients

### **sales, referrals, vouchers**
- **Lecture** : tous les staff
- **Écriture** : **RPC uniquement** (INSERT/UPDATE directs interdits)

### **audit_logs**
- **Lecture** : admin only
- **Écriture** : RPC only (auto-tracé)

---

## ⚙️ RPC Functions (opérations atomiques)

Toutes les mutations critiques passent par des RPC Postgres (plpgsql).

### **1. record_sale_with_points()**

Saisie vente + validation parrainage + attribution points + génération bon.

**Signature** :
```sql
record_sale_with_points(
  p_customer_id UUID,
  p_amount DECIMAL,
  p_staff_id UUID
) RETURNS TABLE (
  sale_id UUID,
  referral_validated BOOLEAN,
  voucher_created BOOLEAN,
  error_code TEXT
)
```

**Logique (atomique en transaction)** :

```
1. Valider customer existe + email_verified = true
   ├─ SI non → ROLLBACK, retourner error_code 'email_not_verified'
   
2. Valider amount > 0
   ├─ SI non → ROLLBACK, retourner error_code 'invalid_amount'

3. INSERT INTO sales (customer_id, amount)
   ├─ Retourner sale_id

4. SI amount >= 30 :
   a. Chercher referral WHERE referee_id = customer_id AND status = 'pending'
   b. SI referral EXISTS :
      - UPDATE referral : status = 'validated', validated_at = NOW(), sale_id = sale_id
      - SELECT COUNT(validated referrals) for referrer → count
      - SI count = 5 :
        → INSERT INTO vouchers (referrer_id, status = 'available')
        → voucher_created = true
      - ELSE :
        → voucher_created = false
   c. ELSE :
      - referral_validated = false

5. INSERT INTO audit_logs (staff_id, 'record_sale', {customer_id, amount, sale_id})

6. COMMIT
7. RETURN {sale_id, referral_validated, voucher_created, error_code = NULL}
```

**Erreurs** :
- `email_not_verified` : email_verified = false
- `invalid_amount` : amount <= 0
- `customer_not_found` : customer_id nexistant
- `unknown_error` : erreur DB inattendue

**Garanties** :
- ✅ Atomicité : tout réussit ou tout échoue
- ✅ Points jamais attribués sans email_verified
- ✅ Un filleul ne génère des points qu'une fois
- ✅ Bon généré automatiquement

---

### **2. use_voucher()**

Utilisation d'un bon (statut + traçabilité).

**Signature** :
```sql
use_voucher(
  p_voucher_id UUID,
  p_sale_id UUID,
  p_staff_id UUID
) RETURNS TABLE (
  success BOOLEAN,
  error_code TEXT
)
```

**Logique (atomique)** :

```
1. Valider voucher EXISTS AND status = 'available'
   ├─ SI non → ROLLBACK, retourner error_code 'voucher_not_available'

2. Valider sale EXISTS
   ├─ SI non → ROLLBACK, retourner error_code 'sale_not_found'

3. UPDATE voucher : status = 'used', used_at = NOW(), used_in_sale_id = sale_id

4. INSERT INTO audit_logs (staff_id, 'use_voucher', {voucher_id, sale_id})

5. COMMIT
6. RETURN {success = true, error_code = NULL}
```

**Erreurs** :
- `voucher_not_available` : bon inexistant ou déjà utilisé
- `sale_not_found` : vente inexistante
- `unknown_error` : erreur DB

**Garanties** :
- ✅ Un bon ne peut être utilisé qu'une fois
- ✅ Traçabilité complète via audit_logs

---

## 🔐 Authentication & Authorization

### **Supabase Auth**

- **Provider** : email/password (built-in Supabase Auth)
- **JWT token** : stocké en HTTP-only cookie (sécurisé)
- **Middleware** : valide JWT à chaque requête
- **RLS** : activé, policies basées sur `auth.uid()` (staff.id)

### **Auth Flow**

```
1. User saisit email + password
2. POST /auth/login (Server Action)
3. Supabase Auth valide
4. JWT token généré + stocké en cookie
5. User redirigé vers /dashboard
6. Middleware valide JWT
7. Server Action accède à auth.user.id (staff_id)
```

### **Roles & Permissions**

| Permission | VENDEUR | ADMIN |
|---|---|---|
| Créer client | ✅ | ✅ |
| Voir tous clients | ✅ | ✅ |
| Saisir vente | ✅ | ✅ |
| Utiliser bon | ✅ | ✅ |
| Voir audit logs | ❌ | ✅ |
| Settings | ❌ | ✅ |

---

## 📁 Structure Next.js

### **Répertoires & fichiers**

```
app-emre/
├─ app/
│  ├─ layout.tsx                 # Layout global + navbar
│  ├─ error.tsx                  # Fallback erreurs globales
│  ├─ middleware.ts              # Auth guard + JWT check
│  ├─ login/
│  │  ├─ page.tsx                # Form login
│  │  └─ actions.ts              # signIn + signUp
│  ├─ dashboard/
│  │  └─ page.tsx                # Placeholder redirect
│  ├─ (authenticated)/           # Layout auth'd routes (Phase 2+)
│  │  └─ layout.tsx              # Sous-layout pour routes protégées
│  └─ api/
│     └─ (optionnel Phase 2+)    # API routes pour webhooks
│
├─ lib/
│  ├─ supabase/
│  │  ├─ client.ts               # Supabase client (côté client)
│  │  ├─ server.ts               # Supabase server (côté serveur)
│  │  ├─ admin.ts                # Service role client (admin ops)
│  │  └─ types.ts                # Types DB générées
│  ├─ db/
│  │  ├─ customers.ts            # Queries SELECT customers
│  │  ├─ sales.ts                # Queries SELECT sales
│  │  └─ referrals.ts            # Queries SELECT referrals
│  ├─ rpc/
│  │  ├─ record-sale.ts          # Call record_sale_with_points()
│  │  └─ use-voucher.ts          # Call use_voucher()
│  ├─ validation/
│  │  └─ schemas.ts              # Zod schemas pour validation
│  ├─ utils/
│  │  ├─ normalize.ts            # Email/phone normalization
│  │  └─ errors.ts               # Error handling helpers
│  └─ constants.ts               # Consts métier (seuil 30€, etc.)
│
├─ components/
│  ├─ auth/
│  │  ├─ LoginForm.tsx           # Client component form
│  │  └─ LogoutButton.tsx        # Logout action
│  ├─ layout/
│  │  ├─ Navbar.tsx              # Server component
│  │  └─ Footer.tsx              # Server component
│  └─ errors/
│     └─ ErrorBoundary.tsx       # Error fallback
│
├─ __tests__/
│  ├─ unit/
│  │  ├─ normalize.test.ts       # Tests normalisation
│  │  └─ schemas.test.ts         # Tests Zod
│  ├─ integration/
│  │  ├─ auth.test.ts            # Tests auth flow
│  │  └─ rpc.test.ts             # Tests RPC (atomicité)
│  └─ e2e/
│     └─ anti-fraud.test.ts      # Scénarios anti-fraude
│
├─ public/
│  └─ (assets Phase 2+)
│
├─ .env.example                  # Template variables (pas de secrets)
├─ .env.local                    # (gitignored) Secrets locaux dev
├─ .gitignore
├─ package.json
├─ tsconfig.json                 # Strict mode
├─ next.config.js                # Config Next.js
├─ vitest.config.ts              # Config Vitest
├─ CLAUDE.md                      # Déjà là
└─ docs/
   └─ superpowers/
      └─ specs/
         └─ 2026-04-07-phase1-fondations-design.md  # This file
```

### **Composants clés**

**Server Components par défaut** :
- Layout, Navbar, pages (sauf formulaires interactifs)

**Client Components** (`'use client'`) :
- Forms interactives (LoginForm, etc.)
- États locaux (isLoading, toast messages)

**Server Actions** (dans `actions.ts`) :
- Mutations (signIn, signUp, record sale, use voucher)
- Zod validation
- Appel RPC
- Retour JSON

---

## ⚠️ Error Handling & Logging

### **Erreurs attendues (métier)**

Retournées en JSON avec code + message FR :

```json
{
  "success": false,
  "error": {
    "code": "email_not_verified",
    "message": "Email non vérifié. Impossible de valider le parrainage."
  }
}
```

**Traitement UI** : afficher toast/message utilisateur.

### **Erreurs inattendues (bugs)**

Loggées en serveur, réponse générique à l'UI :

```json
{
  "success": false,
  "error": {
    "code": "unknown_error",
    "message": "Erreur système. Veuillez réessayer."
  }
}
```

**Traitement serveur** : `console.error()` (Vercel logs, Phase 3 service externe).

### **Jamais try/catch silencieux**

Toujours logger ou remonter l'erreur. Code exemple :

```typescript
try {
  const result = await recordSaleWithPoints(...);
  return { success: true, data: result };
} catch (error) {
  console.error('[recordSaleWithPoints] Error:', error);
  return { 
    success: false, 
    error: { 
      code: 'unknown_error', 
      message: 'Erreur système' 
    } 
  };
}
```

### **Audit Logs**

Tracés **automatiquement dans les RPC** :
- staff_id (qui a fait l'action)
- action (create_customer, record_sale, etc.)
- details (JSONB : données contextuelles)
- created_at (UTC)

Accessibles admin only via `/admin/audit-logs` (Phase 4).

---

## 🧪 Tests (Phase 1)

### **Setup**

Framework : **Vitest** + jsdom (Phase 1 setup, tests écrits Phase 2+)

```
npm install -D vitest @vitest/ui jsdom
```

### **Tests prioritaires Phase 1**

#### **Unit tests**
- Normalisation email (lowercase, trim)
- Normalisation téléphone (E.164 France)
- Zod schemas (validation requête)

#### **Integration tests**
- Auth flow : login avec email/password valide
- Auth flow : login email inexistant → erreur
- RPC atomicité : rollback si erreur

#### **Anti-fraude ébauche** (implémentée Phase 2+)
- ❌ Email non vérifié → pas de parrainage
- ❌ Montant < 30€ → pas de points
- ❌ Customer inexistant → erreur
- ✅ Vente ≥ 30€ + email_verified → points attribués

### **Exécution**

```bash
npm run test          # Run tous les tests
npm run test:ui       # UI Vitest
npm run test:watch    # Watch mode
```

---

## 📦 Dépendances & Configuration

### **package.json (Phase 1 essentials)**

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.0.0",
    "@supabase/supabase-js": "^2.x",
    "@supabase/auth-helpers-nextjs": "^0.x",
    "zod": "^3.x",
    "react-hook-form": "^7.x",
    "tailwindcss": "^3.x",
    "@radix-ui/react-*": "^1.x",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.x"
  },
  "devDependencies": {
    "@types/node": "^20.x",
    "@types/react": "^19.x",
    "vitest": "^1.x",
    "@vitest/ui": "^1.x",
    "jsdom": "^24.x"
  }
}
```

### **.env.example** (aucun secret)

```bash
# Supabase (placeholder, connecté Phase 3)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Resend (Phase 3)
# RESEND_API_KEY=your-api-key-here

# Deployment (Vercel)
# NEXT_PUBLIC_APP_URL=https://app.yourdomain.com
```

### **tsconfig.json** (strict mode)

```json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "bundler",
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

### **Déploiement (Phase 1 readiness)**

- **Vercel** : setup prêt (git push → build auto)
- **Supabase** : local/test project (Phase 3 prod)
- **Secrets** : ajoutés via Vercel dashboard une fois services configurés
- **CI/CD** : setup basic (Phase 2+)

---

## 📋 Checklist d'implémentation (Phase 1)

- [ ] Init Next.js 15 + TypeScript strict
- [ ] Install dépendances (Supabase, Zod, Tailwind, shadcn/ui)
- [ ] Setup Supabase schema local (migrations SQL)
- [ ] Créer RPC functions (record_sale_with_points, use_voucher)
- [ ] Implémenter RLS policies sur toutes tables
- [ ] Setup Supabase Auth (staff table, password hashing)
- [ ] Créer auth middleware
- [ ] Implémenter /login page + LoginForm
- [ ] Implémenter Server Actions (signIn, signUp)
- [ ] Créer /dashboard placeholder
- [ ] Configurer Zod schemas
- [ ] Setup Vitest + config
- [ ] Écrire unit tests (normalisation, schemas)
- [ ] Écrire integration tests (auth, RPC)
- [ ] Documenter structure dans README
- [ ] .env.example + .gitignore
- [ ] Commit + PR (await validation Adi)

---

## 🚀 Transition Phase 2

Une fois Phase 1 complete :

1. **Code review** : vérifier schéma DB, RPC atomicité, auth flow
2. **Validation Adi** : approuver fondations
3. **Phase 2 start** : créer spec clients, ventes, UI parrainage

---

## Notes & Context

**Contexte projet** :
- Boutique parfum interne (staff only, pas clients externes)
- Région : France (E.164 +33, UTC→Paris)
- One boutique (mono-entité)
- Parrainage validé immédiatement à vente ≥ 30€
- Points NE sont PAS remis à zéro après bon généré
- Tous les secrets + services externes = Phase 3

**Anti-abus enforcé** :
- RLS policies
- Transactions atomiques RPC
- Zod validation serveur
- Email verification obligatoire
- Audit logs complets

**Tooling** :
- Next.js 15 (latest)
- TypeScript strict (zéro `any`)
- Supabase (Postgres + Auth)
- Tailwind + shadcn/ui
- Vitest
- Vercel (deployment)
