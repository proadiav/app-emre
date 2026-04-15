# Module 1 — Navigation + Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorer la structure de routes pour centraliser l'auth dans un layout authentifié unique et implémenter une navbar role-aware avec dropdown admin.

**Architecture:** Un `(authenticated)/layout.tsx` server component centralise l'auth check, récupère le rôle staff, et rend une Navbar (server) qui délègue à un NavbarClient (client component) pour l'interactivité (dropdown, lien actif). Le root layout est allégé pour ne plus rendre la navbar sur les pages publiques. Le admin layout est simplifié pour ne faire que la vérification du rôle.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Tailwind CSS, Supabase Auth, `usePathname()` pour le lien actif

**Spec:** `docs/superpowers/specs/2026-04-14-module1-navigation-layout-design.md`

---

## File Structure

| Fichier | Action | Responsabilité |
|---------|--------|----------------|
| `app/layout.tsx` | Modifier | Root : html/body + metadata + globals.css uniquement |
| `app/(authenticated)/layout.tsx` | Créer | Auth check + Navbar + Footer |
| `app/(authenticated)/dashboard/page.tsx` | Créer | Dashboard placeholder (déplacé depuis app/dashboard/) |
| `components/layout/Navbar.tsx` | Modifier | Server component : fetch user+rôle, rend NavbarClient |
| `components/layout/NavbarClient.tsx` | Créer | Client component : liens, dropdown admin, lien actif |
| `app/(authenticated)/admin/layout.tsx` | Modifier | Simplifié : role check uniquement, plus de navbar |
| `app/dashboard/page.tsx` | Supprimer | Remplacé par (authenticated)/dashboard/page.tsx |

---

### Task 1: Alléger le root layout

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Modifier app/layout.tsx**

Retirer les imports Navbar et Footer. Le root layout ne rend plus que le shell HTML :

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Programme Ambassadeur',
  description: 'Gestion du programme de parrainage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Vérifier que le build compile**

Run: `npx next build 2>&1 | head -30`
Expected: Compilation sans erreur liée au layout (les pages qui dépendaient de Navbar via le root layout vont maintenant ne plus l'avoir — c'est attendu, on le corrige dans la Task suivante).

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "refactor: strip Navbar and Footer from root layout"
```

---

### Task 2: Créer le NavbarClient (client component)

**Files:**
- Create: `components/layout/NavbarClient.tsx`

- [ ] **Step 1: Créer le composant NavbarClient**

```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface NavbarClientProps {
  userEmail: string;
  role: 'admin' | 'vendeur';
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/customers', label: 'Clients' },
  { href: '/vouchers', label: 'Bons' },
];

const ADMIN_LINKS = [
  { href: '/admin/settings', label: 'Paramètres' },
  { href: '/admin/stats', label: 'Statistiques' },
  { href: '/admin/audit-logs', label: 'Journal d\'audit' },
  { href: '/admin/staff', label: 'Personnel' },
];

export function NavbarClient({ userEmail, role }: NavbarClientProps) {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAdminOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on navigation
  useEffect(() => {
    setAdminOpen(false);
  }, [pathname]);

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  }

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left: Logo + nav links */}
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-gray-900">
            Programme Ambassadeur
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Admin dropdown + user + logout */}
        <div className="flex items-center gap-3">
          {role === 'admin' && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                className={`flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  pathname.startsWith('/admin')
                    ? 'bg-purple-100 text-purple-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                Admin
                <svg
                  className={`h-4 w-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {adminOpen && (
                <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border border-gray-200 bg-white py-1 shadow-lg">
                  {ADMIN_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        pathname.startsWith(link.href)
                          ? 'bg-gray-100 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
          <span className="text-sm text-gray-500">{userEmail}</span>
          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/layout/NavbarClient.tsx
git commit -m "feat: create NavbarClient with role-aware links and admin dropdown"
```

---

### Task 3: Refactorer le Navbar server component

**Files:**
- Modify: `components/layout/Navbar.tsx`

- [ ] **Step 1: Réécrire Navbar.tsx**

Le server component récupère l'user et le rôle, puis délègue au client component. Il reçoit les props depuis le layout parent au lieu de faire sa propre requête auth :

```tsx
import { NavbarClient } from '@/components/layout/NavbarClient';

interface NavbarProps {
  userEmail: string;
  role: 'admin' | 'vendeur';
}

export function Navbar({ userEmail, role }: NavbarProps) {
  return <NavbarClient userEmail={userEmail} role={role} />;
}
```

Note : La Navbar ne fait plus de requête Supabase elle-même. Le layout authentifié qui l'appelle lui passe les données (user email + rôle). Cela évite un double appel Supabase.

- [ ] **Step 2: Commit**

```bash
git add components/layout/Navbar.tsx
git commit -m "refactor: Navbar receives user data as props instead of fetching"
```

---

### Task 4: Créer le layout authentifié

**Files:**
- Create: `app/(authenticated)/layout.tsx`

- [ ] **Step 1: Créer app/(authenticated)/layout.tsx**

```tsx
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch staff role — only staff members can access the app
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single();

  if (staffError || !staff) {
    redirect('/login');
  }

  const role = staff.role as 'admin' | 'vendeur';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userEmail={user.email ?? ''} role={role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(authenticated)/layout.tsx"
git commit -m "feat: create centralized authenticated layout with Navbar and Footer"
```

---

### Task 5: Déplacer et nettoyer le dashboard

**Files:**
- Create: `app/(authenticated)/dashboard/page.tsx`
- Delete: `app/dashboard/page.tsx`

- [ ] **Step 1: Créer app/(authenticated)/dashboard/page.tsx**

```tsx
export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Bienvenue sur le Programme Ambassadeur.</p>
      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-blue-900">
          Le contenu du dashboard sera implémenté dans le Module 2.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Supprimer l'ancien dashboard**

```bash
rm app/dashboard/page.tsx
rmdir app/dashboard 2>/dev/null || true
```

- [ ] **Step 3: Commit**

```bash
git add "app/(authenticated)/dashboard/page.tsx"
git add -u app/dashboard/
git commit -m "refactor: move dashboard under (authenticated) route group, remove auth check"
```

---

### Task 6: Simplifier le admin layout

**Files:**
- Modify: `app/(authenticated)/admin/layout.tsx`

- [ ] **Step 1: Réécrire admin/layout.tsx**

Supprimer la navbar admin et le wrapper `<main>`. Garder uniquement la vérification du rôle :

```tsx
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single();

  if (staffError || !staff || staff.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(authenticated)/admin/layout.tsx"
git commit -m "refactor: simplify admin layout to role check only, remove duplicate navbar"
```

---

### Task 7: Vérification manuelle end-to-end

**Files:** Aucun changement de code.

- [ ] **Step 1: Lancer le serveur de dev**

```bash
npx next dev
```

- [ ] **Step 2: Vérifier les scénarios**

Tester manuellement dans le navigateur :

| Scénario | URL | Résultat attendu |
|----------|-----|-------------------|
| Non connecté → page protégée | `/dashboard` | Redirigé vers `/login` |
| Non connecté → login | `/login` | Page login sans navbar |
| Connecté vendeur → dashboard | `/dashboard` | Navbar avec Dashboard, Clients, Bons. Pas de dropdown Admin. |
| Connecté vendeur → admin | `/admin/settings` | Redirigé vers `/dashboard` |
| Connecté admin → dashboard | `/dashboard` | Navbar avec Dashboard, Clients, Bons + dropdown Admin |
| Connecté admin → admin | `/admin/settings` | Page settings. Dropdown Admin actif (violet). |
| Clic dropdown Admin | N/A | Menu déroulant avec 4 liens admin |
| Clic extérieur dropdown | N/A | Menu se ferme |
| Navigation entre pages | N/A | Lien actif change, dropdown se ferme |
| Verify email (non connecté) | `/verify-email/test` | Page sans navbar |

- [ ] **Step 3: Commit final si ajustements nécessaires**

```bash
git add -A
git commit -m "fix: adjustments after manual testing"
```

Omettre ce commit si aucun ajustement n'est nécessaire.
