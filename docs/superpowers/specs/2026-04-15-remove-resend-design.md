# Suppression de Resend & vérification email

**Date** : 2026-04-15
**Statut** : Approuvé
**Objectif** : Supprimer complètement l'envoi d'emails (Resend) et la vérification email, auto-valider les clients à la création.

---

## Contexte métier

La boutique est physique. Le flux réel :
1. Alice arrive en boutique, dit "Je viens de la part de Marc"
2. Le vendeur crée le compte d'Alice avec Marc en parrain
3. Alice achète ≥ 30 € → Marc gagne 1 point automatiquement

L'email n'a pas de rôle fonctionnel dans ce flux. Les clients ne cliquent pas sur les emails en boutique. Les notifications parrain ne sont pas nécessaires — Marc revient régulièrement et peut consulter ses points avec le vendeur.

La protection anti-fraude réelle est :
- Unicité email ET téléphone
- Audit log de toutes les actions vendeur
- Contrôle humain (le vendeur voit les clients)

## Décisions

| Question | Choix |
|----------|-------|
| Email de vérification | Supprimé — auto-validation à la création |
| Emails de notification parrain (3) | Supprimés |
| Route `/verify-email/[token]` | Supprimée |
| Dépendances `resend`, `@react-email/*` | Supprimées |
| Colonnes DB `email_verification_token*` | Conservées (optionnelles, pas de migration nécessaire) |
| Champ `email_verified` en DB | Conservé, mis à `true` par défaut |
| Badge "Vérifié" sur fiche client | Supprimé (plus informatif) |

---

## 1. Fichiers à supprimer

| Fichier | Raison |
|---------|--------|
| `lib/email/send.ts` | API Resend plus utilisée |
| `lib/email/templates/VerificationEmail.tsx` | Plus envoyé |
| `lib/email/templates/ReferralValidatedEmail.tsx` | Plus envoyé |
| `lib/email/templates/VoucherAvailableEmail.tsx` | Plus envoyé |
| `lib/email/templates/VoucherUsedEmail.tsx` | Plus envoyé |
| `lib/validation/email.ts` | Tokens JWT plus générés |
| `lib/utils/jwt.ts` | Plus utilisé (vérifier qu'il n'est pas importé ailleurs) |
| `app/verify-email/` (dossier complet) | Route non-nécessaire |

---

## 2. Fichiers à modifier

### `app/(authenticated)/customers/actions.ts`
- Retirer import `generateVerificationToken`, `sendVerificationEmail`
- Créer customer avec `email_verified: true` directement
- Ne plus générer de token, ne plus appeler `sendVerificationEmail`

### `app/(authenticated)/customers/[id]/new-sale/actions.ts`
- Retirer import `sendReferralValidatedEmail`, `sendVoucherAvailableEmail`
- Retirer tout le bloc fire-and-forget des notifications email

### `app/(authenticated)/customers/[id]/use-voucher/actions.ts`
- Retirer import `sendVoucherUsedEmail`
- Retirer le bloc fire-and-forget de notification email

### `app/(authenticated)/customers/[id]/page.tsx` (fiche client)
- Retirer le badge "Vérifié" / "En attente" (l'info n'est plus pertinente)
- Retirer la ligne "Email vérifié" de la section Informations

### `components/customers/CustomerSearch.tsx`
- Retirer la colonne "Email vérifié" du tableau

### `app/(authenticated)/customers/actions.ts` (searchCustomers)
- Peut retirer `email_verified` du SELECT (optionnel, cohérence)

### `lib/db/customers.ts` (getRecentCustomers)
- Peut retirer `email_verified` du SELECT (optionnel, cohérence)

### `package.json`
- Retirer `resend`, `@react-email/components`, `react-email`

### `.env.local` (manuel par l'utilisateur)
- Retirer `RESEND_API_KEY` et `RESEND_FROM`

---

## 3. Migration DB (aucune requise)

La colonne `email_verified` existe déjà avec `DEFAULT false`. On la met à `true` à la création via le code. Les clients existants gardent leur valeur actuelle — un bouton admin ou une requête manuelle peut les mettre à jour si besoin.

## 4. Hors périmètre

- Suppression des colonnes `email_verification_token`, `email_verification_token_expires` (on les laisse, pas critique)
- Migration des clients existants non vérifiés (manuel si nécessaire)
