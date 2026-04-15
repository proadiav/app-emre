# Module 8 — Page Bons globale

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/vouchers` affichant la liste globale de tous les bons d'achat avec leur statut et le parrain associé.

---

## Contexte

Backend existant :
- `getAllVouchers()` dans `lib/db/vouchers.ts` — retourne tous les bons avec les infos du parrain (join sur customers)
- Retourne `VoucherWithReferrer[]` : champs voucher + `referrer: { first_name, last_name, email }`

---

## 1. Structure

### Fichier à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/vouchers/page.tsx` | Server | Charge tous les bons + rendu du tableau |

Un seul fichier, server component pur. Pas de composant client (pas d'interactivité).

### Flux

```
page.tsx (server)
  → getAllVouchers()
  → rendu du tableau
```

---

## 2. Tableau

### Colonnes

| Colonne | Source | Format |
|---------|--------|--------|
| Parrain | `referrer.first_name` + `referrer.last_name` | Lien cliquable vers `/customers/[referrer_id]` |
| Email parrain | `referrer.email` | Texte gris |
| Statut | `status` | Badge Disponible (vert) / Utilisé (gris) |
| Date création | `created_at` | `dd/mm/yyyy` |
| Date utilisation | `used_at` | `dd/mm/yyyy` ou "—" |

### États vides

- Si aucun bon : "Aucun bon d'achat généré pour le moment."

---

## 3. Hors périmètre

- Filtres par statut
- Pagination
- Export CSV (déjà dans admin/stats)
- Création/annulation de bons
