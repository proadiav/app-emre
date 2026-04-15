# Module 4 — Création de client

**Date** : 2026-04-14
**Statut** : Approuvé
**Objectif** : Créer la page `/customers/new` avec un formulaire de création de client incluant une option de rattachement à un parrain.

---

## Contexte

Le backend est complet :
- `createCustomer(input)` server action — valide Zod, normalise email/phone, vérifie doublon, valide parrain, crée le client, envoie email de vérification, crée le referral
- `createCustomerSchema` Zod — email, phone, firstName, lastName, referrerId? (UUID ou null)
- `searchCustomers(query)` server action — recherche par nom/email/tél, retourne jusqu'à 10 résultats

Les dépendances sont déjà installées : react-hook-form, zod, @hookform/resolvers.

## Décisions de design

| Question | Choix |
|----------|-------|
| Sélection parrain | Checkbox "Ce client a un parrain" → champ recherche inline avec suggestions |
| Après création | Redirection vers la fiche client `/customers/[id]` |
| Validation | react-hook-form + zodResolver côté client + validation serveur |

---

## 1. Structure et composants

### Fichiers à créer

| Fichier | Type | Responsabilité |
|---------|------|----------------|
| `app/(authenticated)/customers/new/page.tsx` | Server component | Page simple qui rend le formulaire |
| `components/customers/CreateCustomerForm.tsx` | Client component | Formulaire complet avec validation + recherche parrain |

### Flux de données

```
new/page.tsx (server)
  → <CreateCustomerForm />

CreateCustomerForm.tsx (client)
  → react-hook-form + zodResolver(createCustomerSchema)
  → checkbox "Ce client a un parrain"
    → si coché : champ recherche → searchCustomers() → liste suggestions
    → clic suggestion → referrerId stocké dans le form state
  → soumission → createCustomer() server action
  → succès → router.push(/customers/[id])
```

---

## 2. Formulaire — détails

### Champs

| Champ | Type HTML | Champ Zod | Placeholder |
|-------|-----------|-----------|-------------|
| Prénom | text | `firstName` (min 1) | "Prénom" |
| Nom | text | `lastName` (min 1) | "Nom" |
| Email | email | `email` (format email) | "email@exemple.com" |
| Téléphone | tel | `phone` (format accepté) | "06 12 34 56 78" |

Chaque champ a un `<label>` au-dessus et un message d'erreur Zod en rouge en dessous si invalide.

### Section parrain (conditionnelle)

- **Checkbox** : "Ce client a un parrain" — état local `hasReferrer`
- **Quand cochée** :
  - Champ de recherche apparaît : "Rechercher le parrain par nom, email ou téléphone..."
  - Debounce 300ms, appel `searchCustomers()`, minimum 2 caractères
  - **Liste de suggestions** sous le champ (max 5) : `Prénom Nom — email`
  - Clic sur suggestion → parrain sélectionné
- **Parrain sélectionné** : affiché comme badge `Prénom Nom (email)` avec bouton ✕ pour retirer
- **Quand décoché** : reset referrerId à null, cacher la recherche
- Le `referrerId` n'est pas un champ visible du formulaire — il est stocké dans un state React et passé à `createCustomer()` lors de la soumission

### États du formulaire

| État | Rendu |
|------|-------|
| Erreurs de validation | Messages Zod français en rouge sous chaque champ |
| Erreur serveur | Bannière rouge en haut du formulaire (ex: "Ce client existe déjà") |
| Soumission en cours | Bouton désactivé + texte "Création en cours..." |
| Succès | `router.push(/customers/${id})` — pas de message visible (la fiche client confirme) |

### Boutons

| Bouton | Action | Style |
|--------|--------|-------|
| Créer le client | Submit formulaire | Primary (bg-gray-900 text-white) |
| Annuler | Lien vers `/customers` | Secondary (border border-gray-300) |

---

## 3. Validation

### Côté client (react-hook-form + zodResolver)

Réutilise `createCustomerSchema` de `lib/validation/schemas.ts`. Le `referrerId` est ajouté manuellement à l'input au moment de la soumission (pas dans le form state de react-hook-form car c'est géré par la recherche parrain).

### Côté serveur (createCustomer action)

La server action revalide tout avec Zod. Les erreurs serveur (doublon, parrain invalide) sont affichées dans la bannière d'erreur globale.

---

## 4. Hors périmètre

- Modification de client (pas de page edit en V1)
- Autocomplete/suggestions d'email existants pour détecter les doublons en temps réel
- Upload de photo client
- Champs additionnels (adresse, notes)
