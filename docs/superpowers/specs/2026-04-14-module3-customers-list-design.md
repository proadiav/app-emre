# Module 3 — Clients (Liste & Recherche)

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/customers` avec un tableau des 20 derniers clients et une recherche interactive.

---

## Contexte

Le backend pour les clients existe déjà :
- `searchCustomers(query)` server action — détecte le type de recherche (email, téléphone, nom) et retourne jusqu'à 10 résultats
- `getCustomer(customerId)` server action — fiche complète
- `lib/db/customers.ts` — fonctions de recherche par email, phone, existence check

Il manque : une fonction pour récupérer les N derniers clients, et toute la partie UI.

## Décisions de design

| Question | Choix |
|----------|-------|
| Affichage initial | Hybride : 20 derniers clients + barre de recherche |
| Colonnes | Nom, Email, Téléphone, Email vérifié, Parrain, Date |
| Clic sur ligne | Navigation vers `/customers/[id]` |
| Approche technique | Server component (données initiales) + client component (recherche) |

---

## 1. Structure et composants

### Fichiers à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/customers/page.tsx` | Server component | Fetch 20 derniers clients, rend CustomerSearch |
| `components/customers/CustomerSearch.tsx` | Client component | Barre de recherche + tableau de résultats |

### Fichiers à modifier

| Fichier | Modification |
|---------|-------------|
| `lib/db/customers.ts` | Ajouter `getRecentCustomers(limit: number)` |
| `app/(authenticated)/customers/actions.ts` | Enrichir le retour de `searchCustomers` pour inclure `email_verified`, `referrer_id`, `created_at` (actuellement retourne seulement id, email, first_name, last_name, phone) |

### Flux de données

```
customers/page.tsx (server)
  → getRecentCustomers(20) via lib/db/customers.ts
  → <CustomerSearch initialCustomers={customers} />

CustomerSearch.tsx (client)
  → état local : query, results, isSearching
  → si query vide → affiche initialCustomers
  → si query ≥ 2 chars → debounce 300ms → searchCustomers() server action
  → affiche résultats ou message "Aucun client trouvé"
```

---

## 2. Nouvelle fonction DB : getRecentCustomers

Ajout dans `lib/db/customers.ts` :

```typescript
export async function getRecentCustomers(limit: number = 20)
```

- Utilise `supabaseAdmin` (comme les autres fonctions du fichier)
- Retourne les clients ordonnés par `created_at` DESC, limités à `limit`
- Retourne les champs : `id`, `email`, `phone`, `first_name`, `last_name`, `email_verified`, `referrer_id`, `created_at`
- Pattern de retour : `{ success: boolean, data: Customer[], error? }` (cohérent avec le fichier)

---

## 3. Page server component

`app/(authenticated)/customers/page.tsx` :

- Appelle `getRecentCustomers(20)`
- Rend un header avec titre "Clients" + bouton "Nouveau client" (lien vers `/customers/new`)
- Passe les clients initiaux à `<CustomerSearch />`

---

## 4. CustomerSearch — client component

### Layout

```
┌──────────────────────────────────────────────────────┐
│ [🔍 Rechercher par nom, email ou téléphone...]       │
│                                                      │
│ "Recherche en cours..." (si loading)                 │
├──────────────────────────────────────────────────────┤
│ Nom       │ Email      │ Tél    │ Vérifié │ Parrain │ Date   │
│ ────────────────────────────────────────────────────────── │
│ Dupont M. │ m@ex.com   │ +33... │ ✓ Vérifié │ Oui   │ 14/04  │
│ Martin L. │ l@ex.com   │ +33... │ ⏳ Attente│       │ 13/04  │
│ (ligne cliquable → /customers/[id])                  │
└──────────────────────────────────────────────────────┘
```

### Props

```typescript
interface CustomerSearchProps {
  initialCustomers: Array<{
    id: string;
    email: string;
    phone: string;
    first_name: string;
    last_name: string;
    email_verified: boolean;
    referrer_id: string | null;
    created_at: string;
  }>;
}
```

### Comportement

- **Input recherche** : `onChange` avec debounce 300ms
- **Minimum 2 caractères** pour déclencher la recherche (cohérent avec `searchCustomers` action)
- **Pendant la recherche** : texte "Recherche en cours..." affiché
- **Aucun résultat** : message "Aucun client trouvé pour « {query} »"
- **Input vidé** : retour aux `initialCustomers`
- **Navigation** : `useRouter().push(/customers/${id})` au clic sur la ligne

### Colonnes du tableau

| Colonne | Champ source | Rendu |
|---------|-------------|-------|
| Nom | `first_name` + `last_name` | Texte, font-medium |
| Email | `email` | Texte text-gray-500 |
| Téléphone | `phone` | Texte text-gray-500 |
| Email vérifié | `email_verified` | Badge vert "Vérifié" (`true`) / Badge jaune "En attente" (`false`) |
| Parrain | `referrer_id` | Badge bleu "Oui" si non-null / vide si null |
| Date | `created_at` | Format `dd/mm/yyyy` via `Intl.DateTimeFormat('fr-FR')` |

### Styles

- Lignes : `cursor-pointer hover:bg-gray-50 transition-colors`
- Badges : petits `rounded-full px-2 py-1 text-xs font-medium`
  - Vérifié : `bg-green-100 text-green-700`
  - En attente : `bg-yellow-100 text-yellow-700`
  - Parrain : `bg-blue-100 text-blue-700`
- Tableau : bordures grises, header gris clair, style cohérent avec les pages admin existantes

---

## 5. Hors périmètre

- Pagination (les 20 derniers + recherche suffisent pour la V1)
- Tri des colonnes
- Filtres avancés (par statut, par date)
- Export CSV des clients
- Création de client (Module 4)
- Fiche client (Module 5)
