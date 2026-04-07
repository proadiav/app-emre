# CLAUDE.md — Programme Ambassadeur (Boutique Parfum)

> Ce fichier est lu automatiquement par Claude Code à chaque session.
> Il contient les règles non-négociables du projet. **Ne jamais les contourner.**

---

## 🎯 CONTEXTE DU PROJET

Application **interne** de gestion d'un programme de parrainage pour une boutique de parfum.
Utilisateurs : **uniquement le personnel** (admin + vendeurs). Les clients finaux n'ont **aucun accès** à l'app.

⚠️ **L'application n'est PAS connectée au système de caisse.**
Toutes les ventes sont saisies **manuellement** par le vendeur **APRÈS** encaissement.

---

## 🛠️ STACK TECHNIQUE

- **Framework** : Next.js 15 (App Router) + TypeScript strict
- **UI** : Tailwind CSS + shadcn/ui
- **Base de données** : Supabase (PostgreSQL) + Row Level Security activée
- **Auth** : Supabase Auth (email/password)
- **Emails** : Resend + React Email
- **Validation** : Zod (côté serveur systématiquement)
- **Formulaires** : react-hook-form + zodResolver
- **Déploiement** : Vercel
- **Langue UI** : Français
- **Langue code** : commentaires métier en français, technique en anglais

---

## 🚨 RÈGLES MÉTIER NON-NÉGOCIABLES

### Anti-abus (à ne JAMAIS contourner)

1. Un client ne peut être parrainé **qu'une seule fois dans sa vie**
2. Le parrainage est possible **uniquement à la création du client** (première visite)
3. Aucun rattachement **rétroactif** possible
4. Le lien filleul → parrain est **définitif**
5. Un filleul ne génère des points **qu'une seule fois**
6. Un parrain ne peut **jamais** être parrainé lui-même
7. Les points sont attribués **uniquement après saisie manuelle d'une vente ≥ 30 €**
8. Tant que `email_verified = false` → **aucun** parrainage validé, **aucun** point attribué

### Mécanique de récompense

- **1 filleul validé** (vente ≥ 30 €) = **1 point**
- **5 points** = **1 bon d'achat de 20 €** généré automatiquement
- Les points **NE sont PAS remis à zéro** après génération d'un bon
- Le bon : valable en boutique, **sans minimum**, **sans expiration**, **cumulable**

### Anti-doublon client

- Email **OU** téléphone déjà en base = client existant
- **Toujours normaliser** avant comparaison :
  - Email : `lowercase` + `trim`
  - Téléphone : format **E.164**

---

## 🔒 SÉCURITÉ (obligatoire)

- Row Level Security **activée sur toutes les tables**
- Validation Zod **côté serveur** systématique (jamais faire confiance au client)
- Aucun secret en dur dans le code → variables d'environnement uniquement
- Tokens de vérification email : **expiration 7 jours**, **usage unique**
- Tracer **toutes les actions sensibles** dans `audit_logs`
- Rate limiting sur les endpoints publics (vérification email)

---

## 🧱 ARCHITECTURE — PRINCIPES

### Atomicité des opérations critiques

⚠️ Les opérations suivantes **DOIVENT** être effectuées dans une **transaction SQL atomique** (fonction RPC Postgres / plpgsql) :

- Saisie d'une vente + validation parrainage + attribution points + génération bon
- Utilisation d'un bon (statut + sale_id)

**Jamais** effectuer ces étapes en plusieurs requêtes côté Next.js : risque d'incohérence.

### Server-first

- Composants **serveur par défaut** (Next.js 15 App Router)
- Composants client **uniquement si nécessaire** (interactivité)
- Mutations via **Server Actions**
- Pas de fetch côté client pour les données sensibles

### Qualité du code

- **Pas de `any`** en TypeScript
- **Pas de try/catch silencieux** — toujours logger ou remonter
- Messages d'erreur UI **en français**
- Commits conventionnels : `feat:`, `fix:`, `chore:`, `refactor:`, `test:`

---

## 📁 STRUCTURE DES PAGES

```
/login                          → Auth staff
/dashboard                      → Vue d'ensemble + stats rapides
/customers                      → Liste + recherche (email/tél)
/customers/new                  → Création + option rattachement parrain
/customers/[id]                 → Fiche client (historique, points, bons)
/customers/[id]/new-sale        → Saisie manuelle de vente
/customers/[id]/use-voucher     → Utilisation d'un bon
/vouchers                       → Liste globale des bons
/admin/settings                 → Paramétrage (ADMIN only)
/admin/stats                    → Statistiques + exports CSV
/admin/audit-logs               → Journal des actions (ADMIN only)
/admin/staff                    → Gestion utilisateurs (ADMIN only)
```

---

## 👥 RÔLES

- **ADMIN** : paramétrage, stats complètes, annulation/correction, bannissement, gestion staff
- **VENDEUR** : création client, rattachement parrain, saisie vente, utilisation bons

---

## 📧 EMAILS TRANSACTIONNELS (Resend)

Templates React Email à maintenir :
1. `VerificationEmail` — validation à la création client
2. `ReferralValidatedEmail` — filleul validé (envoyé au parrain)
3. `VoucherAvailableEmail` — bon de 20 € généré
4. `VoucherUsedEmail` — confirmation utilisation

---

## 🧪 TESTS PRIORITAIRES

Avant tout merge sur `main`, ces scénarios anti-fraude **doivent passer** :

- ❌ Tenter de parrainer un client existant
- ❌ Tenter de rattacher un parrain à lui-même
- ❌ Tenter de valider un parrainage avec vente < 30 €
- ❌ Tenter de valider un parrainage avec email non vérifié
- ❌ Tenter de parrainer 2 fois le même filleul
- ❌ Tenter de rattacher un parrain existant comme filleul
- ✅ Vérifier qu'un 6ᵉ filleul génère bien le 2ᵉ bon (pas de reset des points)
- ✅ Vérifier l'atomicité : si l'email échoue, la vente ne doit PAS être perdue

---

## 🚦 WORKFLOW DE DÉVELOPPEMENT

Le projet avance **par phases**. Ne jamais sauter une phase.

1. **Phase 1 — Fondations** : schéma DB, auth, structure projet
2. **Phase 2 — Core métier** : clients, parrainages, vente atomique
3. **Phase 3 — Bons & emails** : génération auto, templates Resend
4. **Phase 4 — Admin** : settings, stats, audit, staff
5. **Phase 5 — Tests & durcissement** : Vitest, scénarios anti-fraude

À la fin de **chaque phase** : demander validation à Adi avant de passer à la suivante.

---

## ❓ EN CAS DE DOUTE

Si une règle métier semble ambiguë ou en conflit avec une autre :
**STOP. Poser la question à Adi.** Ne jamais inventer une règle métier.
