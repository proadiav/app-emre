# Module 7 — Utilisation de bon

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/customers/[id]/use-voucher` permettant d'utiliser un bon d'achat sur une vente existante.

---

## Contexte

Backend existant :
- `useVoucherAction({ voucherId, saleId })` server action — appelle la RPC atomique `use_voucher`
- La RPC met à jour le bon (status=used, used_at, used_in_sale_id) + log audit
- `getCustomer(id)` retourne le client avec ses ventes et bons

Le bon est lié à un parrain. La page est accessible depuis la fiche client du **parrain** (bouton "Utiliser un bon" visible seulement s'il a des bons disponibles). Le vendeur sélectionne quel bon utiliser et sur quelle vente l'appliquer.

## Décisions

- Le vendeur choisit un bon disponible parmi la liste du client
- Le vendeur choisit une vente existante du client sur laquelle appliquer le bon
- Après succès : message de confirmation + retour à la fiche client

---

## 1. Structure

### Fichiers à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/customers/[id]/use-voucher/page.tsx` | Server | Charge client + bons disponibles + ventes, rend le formulaire |
| `components/customers/UseVoucherForm.tsx` | Client | Sélection bon + vente + soumission |

### Flux de données

```
page.tsx (server)
  → getCustomer(id) — client + ventes + vouchers
  → filtre bons avec status === 'available'
  → si aucun bon disponible → redirect vers /customers/[id]
  → <UseVoucherForm customerId={id} vouchers={available} sales={sales} />

UseVoucherForm.tsx (client)
  → état : 'form' | 'success'
  → 'form' : sélection bon + sélection vente + bouton
  → soumission → useVoucherAction({ voucherId, saleId })
  → 'success' : "Bon utilisé avec succès" + retour fiche client
```

---

## 2. Formulaire

### Champs

| Champ | Type | Description |
|-------|------|-------------|
| Bon d'achat | `<select>` | Liste des bons disponibles : "Bon #X — créé le dd/mm/yyyy" |
| Vente associée | `<select>` | Liste des ventes du client : "dd/mm/yyyy — XX €" |

Si un seul bon disponible → présélectionné. Si une seule vente → présélectionnée.

### Boutons

- "Utiliser le bon" (primary)
- "Annuler" (lien vers `/customers/[id]`)

### États

- Erreur serveur : bannière rouge
- Loading : "Utilisation en cours..."
- Succès : bannière verte "Bon de 20 € utilisé avec succès" + bouton retour

---

## 3. Hors périmètre

- Création de vente depuis cette page
- Annulation d'utilisation de bon
