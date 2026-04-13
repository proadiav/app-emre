# Phase 4.1 — Settings Avancés (Dynamic Program Configuration)

**Date:** 2026-04-13  
**Status:** Design Review ✅  
**Priority:** High (blocage adoption)

---

## 🎯 Objectif

Permettre à l'admin de configurer en temps réel les paramètres du programme de parrainage sans redéploiement:
- Points par filleul validé
- Seuil de points pour générer un bon
- Montant minimum de vente pour validation
- Valeur du bon d'achat

**Impact:** Flexibilité métier immédiate + audit trail complet.

---

## 📊 Data Model

### Table `program_settings` (existante, enrichie)

```sql
id UUID PRIMARY KEY
version INT -- Incrémenté à chaque update
points_per_referral INT -- Actuellement: 1
voucher_threshold INT -- Actuellement: 5
min_sale_amount NUMERIC -- Actuellement: 30 €
voucher_value_euros NUMERIC -- Actuellement: 20 €
updated_at TIMESTAMPTZ -- Timestamp de dernière modif
updated_by UUID -- FK staff.id (admin qui a changé)
created_at TIMESTAMPTZ
```

**Garanties RLS:**
- SELECT: authentifié seulement
- UPDATE/INSERT/DELETE: admin seulement
- Migration 004 déjà en place, à appliquer

### Audit Logging Strategy

Chaque opération sensible enregistre un **snapshot des settings appliqués**:

```json
{
  "action": "record_sale_with_voucher_generated",
  "staff_id": "uuid...",
  "details": {
    "customer_id": "uuid...",
    "applied_settings_version": 2,
    "settings_snapshot": {
      "points_per_referral": 1,
      "voucher_threshold": 5,
      "min_sale_amount": 30,
      "voucher_value_euros": 20
    }
  },
  "created_at": "2026-04-13T14:32:00Z"
}
```

**Bénéfice:** Déboguer exactement quelle règle s'appliquait le 10/04 à 15h.

---

## 🔧 Architecture Technique

### Server Action: `updateProgramSettings`

**Location:** `app/(authenticated)/admin/settings/actions.ts`

**Signature:**
```typescript
export async function updateProgramSettings(
  input: {
    points_per_referral: number;
    voucher_threshold: number;
    min_sale_amount: number;
    voucher_value_euros: number;
  }
): Promise<ApiResponse<ProgramSettings>>
```

**Validations:**
- Zod schema (côté serveur)
  - `points_per_referral`: integer, 1-100
  - `voucher_threshold`: integer, 1-100
  - `min_sale_amount`: numeric, 0-10000
  - `voucher_value_euros`: numeric, 1-1000
- Role check: admin seulement (timing-safe comparison)

**Comportement:**
1. Valide input (Zod)
2. Vérifie authentification + role admin
3. Update `program_settings` table
4. Insert audit log avec snapshot
5. Retourne succès ou erreur

**Error cases:**
- VALIDATION_ERROR: input invalide
- UNAUTHORIZED: pas authentifié
- FORBIDDEN: role ≠ admin
- DATABASE_ERROR: DB connection issue

### RPC Refactoring: `record_sale_with_points`

**Changement clé:** Lire `program_settings` dynamiquement au lieu de hardcoder.

**Pseudo-code:**
```sql
CREATE OR REPLACE FUNCTION record_sale_with_points(...)
RETURNS TABLE (...) AS $$
DECLARE
  v_settings record;
BEGIN
  -- Load current settings
  SELECT * INTO v_settings
  FROM program_settings
  ORDER BY updated_at DESC
  LIMIT 1;

  -- Validate sale amount using dynamic threshold
  IF p_amount >= v_settings.min_sale_amount AND v_referrer_id IS NOT NULL THEN
    -- Award dynamic points
    UPDATE referrals
    SET points_awarded = v_settings.points_per_referral
    WHERE id = v_referral_id;

    -- Check voucher generation using dynamic threshold
    SELECT COUNT(*) INTO v_validated_count
    FROM referrals
    WHERE referrer_id = v_referrer_id AND status = 'validated';

    IF v_validated_count = v_settings.voucher_threshold THEN
      -- Generate voucher
      -- Audit log with settings snapshot
      INSERT INTO audit_logs (details)
      VALUES (jsonb_build_object(
        'applied_settings_version', v_settings.version,
        'settings_snapshot', row_to_json(v_settings)
      ));
    END IF;
  END IF;
END;
$$;
```

**Fallback (sécurité):** Si `program_settings` vide/corrupte, utiliser defaults hardcodés en SQL.

---

## 🎨 UI & Components

### Page: `/admin/settings`

**Layout:**

```
┌─────────────────────────────────────────────┐
│ Paramètres du Programme                     │
├─────────────────────────────────────────────┤
│                                             │
│ [Form]                                      │
│  ├─ Points par filleul: [1]                │
│  ├─ Seuil de points: [5]                   │
│  ├─ Montant minimum (€): [30]              │
│  ├─ Valeur bon (€): [20]                   │
│  └─ [Enregistrer]                           │
│                                             │
├─────────────────────────────────────────────┤
│ Dernière mise à jour:                       │
│ 13/04/2026 à 14:32 par Admin Adi            │
├─────────────────────────────────────────────┤
│ Historique des 5 derniers changements:      │
│ • 13/04 14:32 - Seuil 5→3 par Adi          │
│ • 12/04 10:15 - Montant 30→25 par Adi      │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### Component: `ProgramSettingsForm`

**Comportement:**
- 4 inputs numérique (type="number", step="0.01" pour montants)
- Validation live côté client (Zod + react-hook-form)
- Bouton disabled pendant la requête
- Toast feedback (succès vert, erreur rouge)
- Affiche erreurs Zod inline (texte rouge sous champ)

**Accessibilité:**
- Labels clairs en français
- `disabled` attribute pendant submit
- Erreurs associées aux champs

### Historique des changements

**Affichage:**
- Tableau avec colonnes: Date | Changement | Par qui
- Sorted DESC (les plus récents d'abord)
- Limité aux 5 derniers (pagination optionnelle Phase 4.2)

---

## 🚨 Error Handling

### Validation Failures

| Scenario | Behavior | Message |
|----------|----------|---------|
| Input invalide (ex: -1 points) | Schema rejette côté client | "Valeur invalide" (inline) |
| Non-authentifié | Server action retourne UNAUTHORIZED | Toast: "Reconnectez-vous" |
| Role ≠ admin | Server action retourne FORBIDDEN | Toast: "Accès réservé aux admins" |
| DB connection fails | Catch Supabase error | Toast: "Erreur base de données" |
| Race condition (2 admins simultanés) | Last-write-wins via timestamp | Aucune corruption, audit trail enregistre les 2 |

### Fallback (Critical)

Si `program_settings` vide ou corruptée lors d'une vente:
- RPC utilise defaults hardcodés en SQL
- Admin alerte dans logs: "program_settings vide, defaults appliqués"
- Admin peut corriger manuellement dans `/admin/settings`

---

## 🧪 Testing

### Unit Tests

**Fichier:** `__tests__/integration/admin-settings.test.ts`

**Cas:**
- ✅ Invalid input rejected (schema validation)
- ✅ Non-admin rejected (role check)
- ✅ Valid update succeeds + audit logged
- ✅ Audit log contains settings snapshot
- ✅ Multiple updates increment version

### Integration Tests (RPC)

**Fichier:** `__tests__/integration/rpc.test.ts`

**Cas:**
- ✅ RPC applies current settings snapshot
- ✅ Voucher generated at new threshold (after settings change)
- ✅ Points awarded using new points_per_referral value
- ✅ Min sale amount check uses dynamic threshold

### E2E Tests (UI)

**Fichier:** `__tests__/e2e/admin-settings.test.ts` (future)

**Cas:**
- Admin logs in → navigates `/admin/settings`
- Changes voucher_threshold to 3
- Clicks "Enregistrer"
- Toast confirms success
- Historique shows the change

---

## 🔒 Security & Compliance

### RLS Policies

Migration 004 met en place:
```sql
-- SELECT: tous les authentifiés (lecture des settings)
CREATE POLICY "program_settings_select_policy" ON program_settings
  FOR SELECT USING (true);

-- UPDATE/INSERT/DELETE: admin uniquement
CREATE POLICY "program_settings_update_policy" ON program_settings
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');
```

### Audit Trail

Chaque changement:
1. Enregistre `updated_by` (admin ID)
2. Enregistre `updated_at` (timestamp)
3. Insert audit_log avec snapshot des nouvelles valeurs

**Implication:** Admin peut retracer exactement qui a changé quoi et quand.

### Timing-Safe Role Comparison

Role check utilise comparison timing-safe (déjà implémentée en Phase 3).

---

## 📈 Scalabilité & Performance

### Query Performance

- `program_settings` → 1 seule row (singleton pattern)
- RPC read: `ORDER BY updated_at DESC LIMIT 1` → index sur `updated_at`
- Audit insert: opération mineure, pas de problème

### Migration Effort

- Migration 004 déjà écrite (prête à appliquer)
- RPC refactoring: ~30 lignes SQL modifiées
- Nouvelle server action: ~40 lignes TypeScript
- UI component: ~150 lignes React

---

## 📋 Comportement de Mise en Œuvre

### Immédiat vs Rétroactif

**Choix:** Immédiatement + snapshot audit

- Changement de settings s'applique à TOUTES les futures opérations
- Pas de replay/rétroactif (complexe et risqué)
- Chaque opération enregistre le snapshot des settings appliqués
- Admin peut debugger: "Le 10/04 à 15h, le seuil était 5"

### Lors du Changement

Exemple: Admin change seuil de 5 → 3

**Avant:** Parrain avec 3 filleuls validés → pas de voucher
**Après:** Prochain parrain avec 3 filleuls validés → voucher généré immédiatement

C'est attendu et correct.

---

## 🚀 Implémentation Order

1. **Appliquer migration 004** (RLS policies)
2. **Refactorer RPC** `record_sale_with_points` (dynamique)
3. **Créer server action** `updateProgramSettings`
4. **Créer component** `ProgramSettingsForm`
5. **Enrichir page** `/admin/settings`
6. **Tests** (unit + integration)
7. **Commit + PR**

**Durée estimée:** 1-1.5 jours

---

## ✅ Success Criteria

- ✅ Admin peut modifier les 4 settings via UI
- ✅ Changements appliqués immédiatement aux futures ventes
- ✅ Audit trail enregistre snapshot des settings appliqués
- ✅ RPC lit dynamiquement au lieu de hardcoder
- ✅ Tests passent (validation, role check, RPC dynamics)
- ✅ Zéro incohérence DB
- ✅ Messages d'erreur en français

---

## 🔮 Phase 4.2 (Future)

- Batch operations (CSV import clients)
- Settings versioning avancée (reverter ancienne version)
- Planification reporting (exports récurrents)
