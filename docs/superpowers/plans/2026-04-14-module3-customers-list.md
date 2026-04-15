# Module 3 — Clients (Liste & Recherche) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer la page `/customers` avec un tableau des 20 derniers clients et une recherche interactive par nom/email/téléphone.

**Architecture:** Server component page fetches 20 recent customers via a new DB function, passes them to a client component (CustomerSearch) that handles search interactivity. Search calls the existing `searchCustomers` server action (enriched with extra fields). Navigation to customer detail via clickable rows.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase, `useRouter` for navigation

**Spec:** `docs/superpowers/specs/2026-04-14-module3-customers-list-design.md`

---

## File Structure

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `lib/db/customers.ts` | Modifier | Ajouter `getRecentCustomers(limit)` |
| `app/(authenticated)/customers/actions.ts` | Modifier | Enrichir `searchCustomers` pour retourner `email_verified`, `referrer_id`, `created_at` |
| `app/(authenticated)/customers/page.tsx` | Créer | Server component : fetch récents + rendu CustomerSearch |
| `components/customers/CustomerSearch.tsx` | Créer | Client component : recherche + tableau |

---

### Task 1: Ajouter getRecentCustomers dans lib/db/customers.ts

**Files:**
- Modify: `lib/db/customers.ts`

- [ ] **Step 1: Ajouter le type CustomerListItem et la fonction getRecentCustomers**

Ajouter après le type `ExistsResponse` (ligne 36) et avant la fonction `searchCustomersByEmail` (ligne 42) :

```typescript
// Customer fields needed for list display
export type CustomerListItem = Pick<
  Customer,
  'id' | 'email' | 'phone' | 'first_name' | 'last_name' | 'email_verified' | 'referrer_id' | 'created_at'
>;

interface RecentCustomersResponse {
  success: boolean;
  customers: CustomerListItem[];
  error: string | null;
}

/**
 * Get most recent customers, ordered by creation date descending
 */
export async function getRecentCustomers(limit: number = 20): Promise<RecentCustomersResponse> {
  try {
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from('customers')
      .select('id, email, phone, first_name, last_name, email_verified, referrer_id, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[getRecentCustomers] Database error:', error);
      return { success: false, customers: [], error: 'Erreur lors de la récupération des clients' };
    }

    return { success: true, customers: (data || []) as CustomerListItem[], error: null };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[getRecentCustomers] Exception:', errorMsg);
    return { success: false, customers: [], error: 'Erreur interne' };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/db/customers.ts
git commit -m "feat: add getRecentCustomers function for customer list page"
```

---

### Task 2: Enrichir searchCustomers pour retourner tous les champs nécessaires

**Files:**
- Modify: `app/(authenticated)/customers/actions.ts`

- [ ] **Step 1: Modifier le type SearchCustomersData**

À la ligne 27, remplacer l'interface `SearchCustomersData` :

```typescript
// AVANT :
interface SearchCustomersData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
}

// APRÈS :
interface SearchCustomersData {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  email_verified: boolean;
  referrer_id: string | null;
  created_at: string;
}
```

- [ ] **Step 2: Modifier toutes les requêtes select dans searchCustomers**

Dans la fonction `searchCustomers`, remplacer chaque occurrence de :

```typescript
.select('id, email, first_name, last_name, phone')
```

par :

```typescript
.select('id, email, first_name, last_name, phone, email_verified, referrer_id, created_at')
```

Il y a **5 occurrences** dans la fonction (lignes ~234, ~250, ~276, ~282, ~294). Les remplacer toutes.

- [ ] **Step 3: Vérifier le build**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add "app/(authenticated)/customers/actions.ts"
git commit -m "feat: enrich searchCustomers to return email_verified, referrer_id, created_at"
```

---

### Task 3: Créer le composant CustomerSearch (client)

**Files:**
- Create: `components/customers/CustomerSearch.tsx`

- [ ] **Step 1: Créer le fichier CustomerSearch.tsx**

```tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { searchCustomers } from '@/app/(authenticated)/customers/actions';

interface CustomerItem {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
  referrer_id: string | null;
  created_at: string;
}

interface CustomerSearchProps {
  initialCustomers: CustomerItem[];
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function CustomerSearch({ initialCustomers }: CustomerSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CustomerItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const displayedCustomers = query.length >= 2 ? results : initialCustomers;

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setResults([]);
      setNoResults(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const response = await searchCustomers(query);
      if (response.success && response.data) {
        setResults(response.data as CustomerItem[]);
        setNoResults(response.data.length === 0);
      } else {
        setResults([]);
        setNoResults(true);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  return (
    <div className="space-y-4">
      {/* Search input */}
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher par nom, email ou téléphone..."
        className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
      />

      {isSearching && (
        <p className="text-sm text-gray-500">Recherche en cours...</p>
      )}

      {noResults && !isSearching && (
        <p className="text-sm text-gray-500">
          Aucun client trouvé pour « {query} »
        </p>
      )}

      {/* Customer table */}
      {displayedCustomers.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Nom
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Téléphone
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Email vérifié
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Parrain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {displayedCustomers.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => router.push(`/customers/${customer.id}`)}
                  className="cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {customer.email}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {customer.phone}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {customer.email_verified ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Vérifié
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                        En attente
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm">
                    {customer.referrer_id && (
                      <span className="inline-flex rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                        Oui
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {dateFormatter.format(new Date(customer.created_at))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state when no initial customers and no search */}
      {displayedCustomers.length === 0 && !isSearching && !noResults && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Aucun client enregistré pour le moment.</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/customers/CustomerSearch.tsx
git commit -m "feat: create CustomerSearch component with debounced search and table"
```

---

### Task 4: Créer la page customers (server component)

**Files:**
- Create: `app/(authenticated)/customers/page.tsx`

- [ ] **Step 1: Créer la page**

```tsx
import Link from 'next/link';
import { getRecentCustomers } from '@/lib/db/customers';
import { CustomerSearch } from '@/components/customers/CustomerSearch';

export default async function CustomersPage() {
  const { customers } = await getRecentCustomers(20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          + Nouveau client
        </Link>
      </div>

      {/* Search + Table */}
      <CustomerSearch initialCustomers={customers} />
    </div>
  );
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npx next build 2>&1 | tail -20`
Expected: `✓ Compiled successfully` with `/customers` route visible

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/customers/page.tsx"
git commit -m "feat: create customers list page with search and recent customers"
```

---

### Task 5: Vérification end-to-end

**Files:** Aucun changement de code.

- [ ] **Step 1: Lancer le serveur de dev**

```bash
npx next dev
```

- [ ] **Step 2: Vérifier les scénarios**

| Scénario | Résultat attendu |
|----------|-------------------|
| Naviguer vers `/customers` | Tableau avec les 20 derniers clients (ou message vide si aucun client) |
| Cliquer sur "Nouveau client" | Navigation vers `/customers/new` (page pas encore créée — OK, sera Module 4) |
| Taper "du" dans la recherche | Rien (< 2 chars) |
| Taper "dup" dans la recherche | Résultats filtrés après 300ms debounce |
| Taper un email partiel "@gm" | Résultats par email |
| Taper un numéro "06" | Résultats par téléphone |
| Vider la recherche | Retour aux clients initiaux |
| Cliquer sur une ligne | Navigation vers `/customers/[id]` (page pas encore créée — OK, sera Module 5) |
| Vérifier colonnes | Nom, Email, Téléphone, badges Vérifié/En attente, badge Parrain, Date |
| Navigation navbar "Clients" | Lien actif (surligné) |
