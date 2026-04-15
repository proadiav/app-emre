# Module 2 — Dashboard avec stats rapides

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Remplacer le placeholder du dashboard par une page fonctionnelle avec 4 KPIs et 2 actions rapides.

---

## Contexte

Le dashboard à `app/(authenticated)/dashboard/page.tsx` est un placeholder vide ("Le contenu du dashboard sera implémenté dans le Module 2"). Le backend pour les stats existe déjà dans `lib/db/stats.ts`. Le layout authentifié (Module 1) est en place et fournit la navbar + footer.

## Décisions de design

| Question | Choix |
|----------|-------|
| Vue vendeur vs admin | Même vue pour tous |
| Actions rapides | Nouveau client + Rechercher un client |
| Approche technique | Server component pur (pas de client component) |

---

## 1. Structure de la page

### Layout visuel

```
┌──────────────────────────────────────────────────────┐
│ Dashboard                                            │
│ Bienvenue sur le Programme Ambassadeur.              │
├──────────────────────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐ │
│  │  Clients  │ │Parrainages│ │  Ventes   │ │   Bons    │ │
│  │    42     │ │    18     │ │ 3 450 €   │ │     3     │ │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘ │
├──────────────────────────────────────────────────────┤
│ Actions rapides                                      │
│  [+ Nouveau client]     [Rechercher un client]       │
└──────────────────────────────────────────────────────┘
```

### 4 KPI Cards

| KPI | Fonction source | Format affiché |
|-----|----------------|----------------|
| Clients | `getTotalCustomers()` | Nombre entier |
| Parrainages validés | `getTotalReferrals()` | Nombre entier |
| Ventes totales | `getTotalSalesAmount()` | Formaté en euros (`Intl.NumberFormat('fr-FR')`) |
| Bons générés | `getTotalVouchersGenerated()` | Nombre entier |

Chaque card : fond blanc, bordure grise, label en haut (texte gris), valeur en grand (texte noir, font-bold), style Tailwind cohérent avec le reste de l'app.

### 2 Actions rapides

| Action | Route | Style |
|--------|-------|-------|
| + Nouveau client | `/customers/new` | Bouton primary (bg-gray-900 text-white) |
| Rechercher un client | `/customers` | Bouton secondary (border border-gray-300) |

Les liens utilisent `next/link` — ce sont des liens stylisés en boutons, pas des `<button>`.

---

## 2. Architecture technique

### Server component pur

Le dashboard est un server component async. Pas de `'use client'`, pas de state, pas de useEffect.

### Flux de données

```
dashboard/page.tsx (server component)
  → import { getTotalCustomers, getTotalReferrals, getTotalSalesAmount, getTotalVouchersGenerated } from '@/lib/db/stats'
  → Promise.all([...]) pour appel parallèle
  → Rendu statique des résultats
```

### Formatage des montants

Formatage en ligne avec `Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })`. Pas d'utilitaire séparé.

### Gestion d'erreur

Les fonctions de `lib/db/stats.ts` retournent `0` en cas d'erreur (elles ne throw pas). Le dashboard affiche `0` — acceptable pour un outil interne.

---

## 3. Fichiers impactés

| Fichier | Action | Description |
|---------|--------|-------------|
| `app/(authenticated)/dashboard/page.tsx` | Modifier | Remplacer le placeholder par le dashboard complet |

Aucun nouveau fichier. Aucune nouvelle dépendance.

---

## 4. Hors périmètre

- Graphiques ou charts
- Rafraîchissement temps réel
- Activité récente (dernières ventes, derniers clients)
- Top parrains (déjà dans /admin/stats)
- Filtres par période