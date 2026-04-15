# Module 5 — Fiche Client

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/customers/[id]` affichant la fiche complète d'un client avec ses ventes, filleuls, bons et actions contextuelles.

---

## Contexte

Le server action `getCustomer(customerId)` existe déjà et retourne :
- `customer` — infos client complètes
- `sales` — historique ventes (trié par date DESC)
- `referralsAsReferrer` — parrainages où le client est parrain
- `referralsAsReferee` — parrainages où le client est filleul
- `vouchers` — bons du client

Il manque : la page UI et une fonction pour récupérer les noms des filleuls en batch.

## Décisions de design

| Question | Choix |
|----------|-------|
| Organisation | Sections empilées verticalement (pas d'onglets) |
| Actions | "Saisir une vente" toujours + "Utiliser un bon" si bons disponibles |
| Filleuls | Liste simple : nom (cliquable) + statut |
| Approche | Server component unique |

---

## 1. Structure

### Fichier à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/customers/[id]/page.tsx` | Server component | Fiche client complète |

### Fichier à modifier

| Fichier | Modification |
|---------|-------------|
| `lib/db/customers.ts` | Ajouter `getCustomersByIds(ids: string[])` pour récupérer les noms des filleuls en batch |

### Flux de données

```
page.tsx (server)
  → getCustomer(id) — client + sales + referrals + vouchers
  → si customer.referrer_id → getCustomerById(referrer_id) — nom du parrain
  → si referralsAsReferrer.length > 0 → getCustomersByIds([...referee_ids]) — noms des filleuls
  → rendu de toutes les sections
```

---

## 2. Sections de la page

### Header

- Lien "← Retour aux clients" vers `/customers`
- Boutons d'action à droite :
  - "Saisir une vente" → lien vers `/customers/[id]/new-sale` (toujours visible)
  - "Utiliser un bon" → lien vers `/customers/[id]/use-voucher` (visible seulement si `vouchers.filter(v => v.status === 'available').length > 0`)

### Infos client

- Nom complet en `h1` bold
- Email + téléphone
- Badge "Vérifié" (vert) / "En attente" (jaune) pour `email_verified`
- Si parrainé : "Parrainé par" + lien cliquable vers la fiche du parrain
- Date de création formatée `dd/mm/yyyy`

### Résumé parrainage

3 petites cards en ligne (même style que dashboard KPIs) :

| Card | Calcul |
|------|--------|
| Points | `referralsAsReferrer.filter(r => r.status === 'validated').length` |
| Bons générés | `vouchers.length` |
| Bons disponibles | `vouchers.filter(v => v.status === 'available').length` |

### Historique des ventes

Tableau : Date (`dd/mm/yyyy`) | Montant (formaté euros `Intl.NumberFormat`)

- Trié par date DESC (déjà fait)
- Si vide : "Aucune vente enregistrée"

### Filleuls

Tableau : Nom (lien cliquable vers `/customers/[referee_id]`) | Statut (badge Validé vert / En attente jaune)

- Noms récupérés via `getCustomersByIds`
- Si vide : "Aucun filleul"

### Bons d'achat

Tableau : Statut (badge Disponible vert / Utilisé gris) | Date création (`dd/mm/yyyy`) | Date utilisation (`dd/mm/yyyy` ou "—")

- Si vide : "Aucun bon d'achat"

---

## 3. Nouvelle fonction DB : getCustomersByIds

Ajout dans `lib/db/customers.ts` :

```typescript
export async function getCustomersByIds(ids: string[]): Promise<CustomerListItem[]>
```

- Utilise `supabaseAdmin.from('customers').select(...).in('id', ids)`
- Retourne un tableau de `CustomerListItem` (type existant)
- Retourne `[]` si `ids` est vide ou en cas d'erreur

---

## 4. Gestion d'erreur

- Client non trouvé → `notFound()` de Next.js (affiche la page 404)
- Erreur serveur dans `getCustomer` → page d'erreur avec message
- Erreur dans `getCustomersByIds` (noms filleuls) → affiche "Client inconnu" comme nom de fallback

---

## 5. Hors périmètre

- Modification/suppression de client
- Détail des ventes (montant suffit, pas de page vente individuelle)
- Pagination des ventes/filleuls/bons (peu de données par client en V1)
- Envoi/renvoi d'email de vérification depuis la fiche
