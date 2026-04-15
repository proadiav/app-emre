# Module 1 — Navigation + Layout

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Refactorer la structure de routes et la navigation pour obtenir un layout authentifié centralisé avec une navbar role-aware.

---

## Contexte

L'app Programme Ambassadeur a un backend quasi-complet (schema DB, RPC, server actions) mais les pages UI manquent et la navigation est cassée. La navbar actuelle n'affiche aucun lien. L'auth est vérifiée de manière incohérente (tantôt dans les pages, tantôt dans les layouts, tantôt dans le middleware).

Ce module pose les fondations UI pour tous les modules suivants.

## Décisions de design

| Question | Choix |
|----------|-------|
| Liens vendeur | Minimal : Dashboard, Clients, Bons |
| Protection des routes | Un seul `(authenticated)/layout.tsx` centralise l'auth |
| Style navbar | Barre horizontale compacte + dropdown Admin |
| Approche d'implémentation | Refactor complet du layout existant |

---

## 1. Structure des routes

### Avant

```
app/
  layout.tsx              ← Navbar + Footer (toujours affichés, même login)
  dashboard/page.tsx      ← Auth check dans la page elle-même
  login/page.tsx
  verify-email/[token]/
  (authenticated)/
    admin/layout.tsx      ← Auth + role check + navbar admin séparée
    admin/settings/page.tsx
    admin/stats/page.tsx
    admin/audit-logs/page.tsx
    admin/staff/page.tsx
    customers/actions.ts
    customers/[id]/new-sale/actions.ts
    customers/[id]/use-voucher/actions.ts
```

### Après

```
app/
  layout.tsx              ← Root : html/body + globals.css SEULEMENT
  login/page.tsx          ← Page publique (pas de navbar)
  verify-email/[token]/   ← Page publique (pas de navbar)
  (authenticated)/
    layout.tsx            ← NEW : auth check + Navbar + Footer
    dashboard/page.tsx    ← Déplacé ici, nettoyé (plus de check auth)
    customers/...         ← Pages à venir (modules 3-7)
    vouchers/...          ← Page à venir (module 8)
    admin/
      layout.tsx          ← Simplifié : role check admin SEULEMENT
      settings/page.tsx
      stats/page.tsx
      audit-logs/page.tsx
      staff/page.tsx
```

### Changements clés

- Le root `layout.tsx` ne rend plus Navbar ni Footer
- `(authenticated)/layout.tsx` centralise : auth check + Navbar + Footer
- `admin/layout.tsx` ne fait que la vérification du rôle admin (plus de navbar dupliquée)
- `dashboard/page.tsx` est déplacé sous `(authenticated)/` et nettoyé
- Le middleware reste en place pour la redirection login + admin check (défense en profondeur)

---

## 2. Composant Navbar

### Architecture

```
Navbar (server component)
  → fetch user via getUser()
  → query staff table pour le rôle
  → <NavbarClient user={email} role={role} />
```

### NavbarClient (client component)

```
┌──────────────────────────────────────────────────────────────────────┐
│ 💎 Programme Ambassadeur   [Dashboard] [Clients] [Bons]   ⚙ Admin▾ │
│                                                    user@...  Déco.  │
└──────────────────────────────────────────────────────────────────────┘
```

### Liens vendeur (toujours visibles)

| Lien | Route | Description |
|------|-------|-------------|
| Dashboard | `/dashboard` | Vue d'ensemble |
| Clients | `/customers` | Liste + recherche clients |
| Bons | `/vouchers` | Liste globale des bons |

### Dropdown Admin (visible si `role === 'admin'`)

| Lien | Route |
|------|-------|
| Paramètres | `/admin/settings` |
| Statistiques | `/admin/stats` |
| Journal d'audit | `/admin/audit-logs` |
| Personnel | `/admin/staff` |

### Comportements

- **Lien actif** : mis en surbrillance via `usePathname()` de Next.js, comparaison startsWith pour les sous-routes
- **Dropdown** : toggle au clic, fermeture au clic extérieur via event listener
- **LogoutButton** : composant existant intégré à droite de la navbar
- **Pas de hamburger mobile** en V1 : les 3 liens vendeur + dropdown tiennent sur petit écran
- **Pas de dépendance externe** : Tailwind + `usePathname`, pas de lib dropdown

---

## 3. Layout authentifié

### `(authenticated)/layout.tsx` — nouveau fichier (server component)

**Responsabilités :**
1. Vérifier que l'user est authentifié (sinon `redirect('/login')`)
2. Vérifier que l'user existe dans la table `staff` (sinon `redirect('/login')`)
3. Récupérer `user.email` et `staff.role`
4. Rendre `<Navbar>` + `{children}` + `<Footer>`

**Flux auth :**
- `getUser()` → pas d'user → `redirect('/login')`
- Query `staff` table → pas trouvé → `redirect('/login')` (seul le personnel a accès)
- OK → render layout avec navbar

### `admin/layout.tsx` — simplifié

**Avant :** auth check + navbar admin + `<main>` wrapper
**Après :** vérification rôle admin uniquement

- Si `staff.role !== 'admin'` → `redirect('/dashboard')`
- Ne rend que `{children}` (plus de `<nav>`, plus de `<main>` wrapper)
- Le middleware fait déjà ce check → défense en profondeur

### `app/layout.tsx` — allégé

**Avant :** `<Navbar />` + `<main>` + `<Footer />`
**Après :** `<html><body>{children}</body></html>` + metadata + globals.css

### `dashboard/page.tsx` — nettoyé

- Suppression du check auth (le layout parent le fait)
- Suppression du `LogoutButton` (la navbar le contient)
- Reste un placeholder simple pour le Module 2

---

## 4. Fichiers impactés

### Fichiers à modifier

| Fichier | Action |
|---------|--------|
| `app/layout.tsx` | Retirer Navbar et Footer, garder html/body/metadata |
| `components/layout/Navbar.tsx` | Refactorer : fetch user+rôle, rendre NavbarClient |
| `app/(authenticated)/admin/layout.tsx` | Simplifier : retirer navbar, garder role check |

### Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `app/(authenticated)/layout.tsx` | Layout centralisé auth + navbar + footer |
| `components/layout/NavbarClient.tsx` | Client component avec liens + dropdown admin |

### Fichiers à déplacer

| Source | Destination |
|--------|-------------|
| `app/dashboard/page.tsx` | `app/(authenticated)/dashboard/page.tsx` |

### Fichiers inchangés

- `middleware.ts` — reste en place (défense en profondeur)
- `components/auth/LogoutButton.tsx` — réutilisé tel quel dans NavbarClient
- `components/layout/Footer.tsx` — réutilisé tel quel dans le layout authentifié
- Toutes les pages admin (`settings`, `stats`, `audit-logs`, `staff`) — inchangées
- Tous les fichiers `actions.ts` — inchangés

---

## 5. Hors périmètre

- Contenu du dashboard (Module 2)
- Pages customers (Modules 3-7)
- Page vouchers (Module 8)
- Responsive hamburger menu (pas en V1)
- Thème sombre
