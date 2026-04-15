# Module 6 — Saisie de vente

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/customers/[id]/new-sale` avec un formulaire de saisie de montant et un feedback détaillé (parrainage validé, bon généré).

---

## Contexte

Le backend est complet :
- `recordSale({ customerId, amount })` server action — appelle la RPC atomique `record_sale_with_points`
- La RPC gère : insertion vente + validation parrainage + attribution points + génération bon
- Retourne `{ saleId, referralValidated, voucherCreated }`
- Emails envoyés automatiquement (non-blocking)

## Décisions

| Question | Choix |
|----------|-------|
| Feedback après vente | Page de confirmation sur place avec détails (parrainage, bon) |

---

## 1. Structure

### Fichiers à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/customers/[id]/new-sale/page.tsx` | Server | Vérifie client + rend le formulaire |
| `components/customers/RecordSaleForm.tsx` | Client | Formulaire montant + feedback résultat |

### Flux de données

```
page.tsx (server)
  → getCustomer(id) — vérifie que le client existe
  → notFound() si pas trouvé
  → <RecordSaleForm customerId={id} customerName="Prénom Nom" />

RecordSaleForm.tsx (client)
  → état : 'form' | 'success'
  → 'form' : champ montant + boutons
  → soumission → recordSale({ customerId, amount })
  → 'success' : messages de confirmation
```

---

## 2. Formulaire

### Champs

| Champ | Type HTML | Validation |
|-------|-----------|------------|
| Montant | `type="number"` step="0.01" min="0.01" | > 0, requis |

Pas de react-hook-form pour un seul champ — un simple state React suffit.

### Boutons

| Bouton | Action | Style |
|--------|--------|-------|
| Enregistrer la vente | Submit | Primary (bg-gray-900) |
| Annuler | Lien vers `/customers/[id]` | Secondary (border) |

### États

| État | Rendu |
|------|-------|
| Erreur validation | "Le montant doit être supérieur à 0" en rouge |
| Erreur serveur | Bannière rouge (ex: "Email non vérifié") |
| Loading | Bouton désactivé + "Enregistrement en cours..." |

---

## 3. Feedback succès

Affiché dans le même composant (remplace le formulaire) :

| Condition | Message | Style |
|-----------|---------|-------|
| Toujours | "Vente de {amount} € enregistrée" | Bannière verte |
| `referralValidated === true` | "Parrainage validé ! 1 point attribué au parrain" | Bannière bleue |
| `voucherCreated === true` | "Bon d'achat de 20 € généré pour le parrain !" | Bannière violette |

Bouton "Retour à la fiche client" → `/customers/[id]`

---

## 4. Hors périmètre

- Sélection de client (on arrive depuis la fiche client, l'ID est dans l'URL)
- Historique de ventes sur cette page
- Modification/annulation de vente
