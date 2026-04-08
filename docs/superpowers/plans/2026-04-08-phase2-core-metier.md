# Phase 2 — Core Métier : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build customer management, sales entry, referral validation, voucher generation, and email verification—the complete core business logic for the ambassador program.

**Architecture:** Phase 2 layers customer-facing pages and server actions on top of Phase 1's DB schema and RPC atomicity. All mutations route through Supabase RPC to enforce business rules and maintain audit trails. Email verification is async (token-based, 7-day expiry), triggered at customer creation. Emails are sent via Resend with React Email templates.

**Tech Stack:** Next.js 15 Server Actions (mutations), Supabase RPC (atomicity), Zod (validation), Resend + React Email (transactional emails), Vitest (integration & anti-fraud tests).

---

## 📁 File Structure

### **New Pages**
- `app/(authenticated)/customers/page.tsx` — List + search customers
- `app/(authenticated)/customers/new/page.tsx` — Create customer + select referrer
- `app/(authenticated)/customers/[id]/page.tsx` — Customer detail (profile, history, vouchers)
- `app/(authenticated)/customers/[id]/new-sale/page.tsx` — Record sale UI
- `app/(authenticated)/customers/[id]/use-voucher/page.tsx` — Use voucher UI
- `app/(authenticated)/vouchers/page.tsx` — List all vouchers (staff)
- `app/verify-email/[token]/page.tsx` — Public email verification page

### **Server Actions**
- `app/(authenticated)/customers/actions.ts` — createCustomer, searchCustomers, getCustomer
- `app/(authenticated)/customers/[id]/new-sale/actions.ts` — recordSale (calls RPC)
- `app/(authenticated)/customers/[id]/use-voucher/actions.ts` — useVoucher (calls RPC)
- `app/verify-email/actions.ts` — verifyEmailToken (public)

### **Email Templates (Resend + React Email)**
- `lib/email/templates/VerificationEmail.tsx` — Email verification link
- `lib/email/templates/ReferralValidatedEmail.tsx` — Sent to referrer when referee validated
- `lib/email/templates/VoucherAvailableEmail.tsx` — Sent to referrer when voucher generated
- `lib/email/templates/VoucherUsedEmail.tsx` — Sent to referrer when voucher used
- `lib/email/send.ts` — Resend client + send functions

### **Database Queries**
- `lib/db/customers.ts` — searchByEmail, searchByPhone, getById, countByReferrer
- `lib/db/vouchers.ts` — getAvailableByReferrer, getUsedByReferrer, getAll

### **RPC Wrappers (updates to Phase 1)**
- `lib/rpc/record-sale.ts` — updated with email sending logic
- `lib/rpc/use-voucher.ts` — updated with email sending logic

### **Validation & Utilities**
- `lib/validation/email.ts` — validateEmailToken, generateVerificationToken
- `lib/utils/jwt.ts` — JWT encode/decode for verification tokens
- `lib/constants.ts` — add VERIFICATION_TOKEN_EXPIRY_DAYS = 7

### **Tests**
- `__tests__/integration/customers.test.ts` — create, search, get customer
- `__tests__/integration/sales.test.ts` — record sale via RPC, referral validation, voucher generation
- `__tests__/integration/email.test.ts` — verification token generation & validation
- `__tests__/e2e/anti-fraud.test.ts` — complete anti-fraud scenarios

---

## Tasks

### Task 1: Setup Resend + Email Templates

**Files:**
- Create: `lib/email/send.ts`
- Create: `lib/email/templates/VerificationEmail.tsx`
- Create: `lib/email/templates/ReferralValidatedEmail.tsx`
- Create: `lib/email/templates/VoucherAvailableEmail.tsx`
- Create: `lib/email/templates/VoucherUsedEmail.tsx`
- Modify: `package.json` (add resend, react-email, nodemailer types)
- Modify: `.env.example` (add RESEND_API_KEY)

- [ ] **Step 1: Install Resend dependencies**

\`\`\`bash
npm install resend react-email @react-email/components
npm install -D @types/react-email
\`\`\`

- [ ] **Step 2: Create VerificationEmail template**

\`\`\`typescript
// lib/email/templates/VerificationEmail.tsx
import React from 'react';
import { Html, Body, Head, Hr, Container, Preview, Row, Column, Text, Link, Img, Section } from '@react-email/components';

interface VerificationEmailProps {
  customerName: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({ customerName, verificationUrl }) => (
  <Html>
    <Head />
    <Preview>Vérifiez votre email - Programme Ambassadeur</Preview>
    <Body style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f5f5' }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '20px', maxWidth: '600px' }}>
        <Section>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            Bienvenue, {customerName}!
          </Text>
          <Text style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Veuillez vérifier votre adresse email pour activer votre profil.
          </Text>
        </Section>
        <Hr />
        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
          <Link
            href={verificationUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Vérifier mon email
          </Link>
        </Section>
        <Text style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
          Ou copiez ce lien dans votre navigateur: <br />
          <Link href={verificationUrl} style={{ color: '#000' }}>
            {verificationUrl}
          </Link>
        </Text>
        <Text style={{ fontSize: '12px', color: '#999', marginTop: '20px' }}>
          Ce lien expire dans 7 jours.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VerificationEmail;
\`\`\`

- [ ] **Step 3: Create ReferralValidatedEmail template**

\`\`\`typescript
// lib/email/templates/ReferralValidatedEmail.tsx
import React from 'react';
import { Html, Body, Head, Hr, Container, Preview, Section, Text, Link } from '@react-email/components';

interface ReferralValidatedEmailProps {
  referrerName: string;
  refereeName: string;
  saleAmount: number;
  pointsEarned: number;
}

export const ReferralValidatedEmail: React.FC<ReferralValidatedEmailProps> = ({
  referrerName,
  refereeName,
  saleAmount,
  pointsEarned,
}) => (
  <Html>
    <Head />
    <Preview>Parrainage confirmé - 1 point gagné!</Preview>
    <Body style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f5f5' }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '20px', maxWidth: '600px' }}>
        <Section>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            Parrainage confirmé, {referrerName}!
          </Text>
          <Text style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            {refereeName} a effectué un achat de {saleAmount.toFixed(2)}€ et votre parrainage est maintenant validé.
          </Text>
        </Section>
        <Hr />
        <Section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Points gagnés: {pointsEarned} point
          </Text>
        </Section>
        <Text style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          Continuez à parrainer pour accumuler des points et débloquer des bons d'achat!
        </Text>
      </Container>
    </Body>
  </Html>
);

export default ReferralValidatedEmail;
\`\`\`

- [ ] **Step 4: Create VoucherAvailableEmail template**

\`\`\`typescript
// lib/email/templates/VoucherAvailableEmail.tsx
import React from 'react';
import { Html, Body, Head, Hr, Container, Preview, Section, Text, Link } from '@react-email/components';

interface VoucherAvailableEmailProps {
  referrerName: string;
  voucherAmount: number;
  voucherCode: string;
  dashboardUrl: string;
}

export const VoucherAvailableEmail: React.FC<VoucherAvailableEmailProps> = ({
  referrerName,
  voucherAmount,
  voucherCode,
  dashboardUrl,
}) => (
  <Html>
    <Head />
    <Preview>Bon d'achat de {voucherAmount}€ disponible!</Preview>
    <Body style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f5f5' }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '20px', maxWidth: '600px' }}>
        <Section>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            Bravo, {referrerName}!
          </Text>
          <Text style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Vous avez accumulé 5 filleuls validés et débloqué un bon d'achat de {voucherAmount}€!
          </Text>
        </Section>
        <Hr />
        <Section style={{ backgroundColor: '#fff4e6', padding: '20px', borderRadius: '4px', margin: '20px 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff6b00' }}>
            {voucherAmount}€
          </Text>
          <Text style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Code: {voucherCode}
          </Text>
        </Section>
        <Section style={{ textAlign: 'center', margin: '20px 0' }}>
          <Link
            href={dashboardUrl}
            style={{
              backgroundColor: '#000',
              color: '#fff',
              padding: '12px 24px',
              textDecoration: 'none',
              borderRadius: '4px',
              display: 'inline-block',
              fontSize: '14px',
              fontWeight: 'bold',
            }}
          >
            Voir mes bons
          </Link>
        </Section>
        <Text style={{ fontSize: '12px', color: '#666', marginTop: '20px' }}>
          ✓ Valable en boutique<br />
          ✓ Sans minimum<br />
          ✓ Sans expiration<br />
          ✓ Cumulable
        </Text>
      </Container>
    </Body>
  </Html>
);

export default VoucherAvailableEmail;
\`\`\`

- [ ] **Step 5: Create VoucherUsedEmail template**

\`\`\`typescript
// lib/email/templates/VoucherUsedEmail.tsx
import React from 'react';
import { Html, Body, Head, Hr, Container, Preview, Section, Text } from '@react-email/components';

interface VoucherUsedEmailProps {
  referrerName: string;
  voucherAmount: number;
  remainingPoints: number;
}

export const VoucherUsedEmail: React.FC<VoucherUsedEmailProps> = ({
  referrerName,
  voucherAmount,
  remainingPoints,
}) => (
  <Html>
    <Head />
    <Preview>Bon d'achat utilisé - Merci!</Preview>
    <Body style={{ fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f5f5f5' }}>
      <Container style={{ backgroundColor: '#ffffff', margin: '0 auto', padding: '20px', maxWidth: '600px' }}>
        <Section>
          <Text style={{ fontSize: '24px', fontWeight: 'bold', color: '#333' }}>
            Bon utilisé, {referrerName}!
          </Text>
          <Text style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            Votre bon d'achat de {voucherAmount}€ a été utilisé en boutique. Merci!
          </Text>
        </Section>
        <Hr />
        <Section style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '4px', margin: '20px 0' }}>
          <Text style={{ fontSize: '14px', fontWeight: 'bold', color: '#333' }}>
            Points restants: {remainingPoints}
          </Text>
          <Text style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            {remainingPoints < 5 ? \`Plus que \${5 - remainingPoints} point(s) pour le prochain bon!\` : 'Vous pouvez débloquer un nouveau bon!'}
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

export default VoucherUsedEmail;
\`\`\`

- [ ] **Step 6: Create Resend send service**

\`\`\`typescript
// lib/email/send.ts
import { Resend } from 'resend';
import { VerificationEmail } from './templates/VerificationEmail';
import { ReferralValidatedEmail } from './templates/ReferralValidatedEmail';
import { VoucherAvailableEmail } from './templates/VoucherAvailableEmail';
import { VoucherUsedEmail } from './templates/VoucherUsedEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, customerName: string, verificationUrl: string) {
  try {
    const result = await resend.emails.send({
      from: 'Programme Ambassadeur <noreply@ambassadeur.parfum.local>',
      to: email,
      subject: 'Vérifiez votre email',
      react: VerificationEmail({ customerName, verificationUrl }),
    });

    if (result.error) {
      console.error('[sendVerificationEmail] Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[sendVerificationEmail] Unexpected error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendReferralValidatedEmail(
  referrerEmail: string,
  referrerName: string,
  refereeName: string,
  saleAmount: number,
  pointsEarned: number,
) {
  try {
    const result = await resend.emails.send({
      from: 'Programme Ambassadeur <noreply@ambassadeur.parfum.local>',
      to: referrerEmail,
      subject: 'Parrainage confirmé - 1 point gagné!',
      react: ReferralValidatedEmail({ referrerName, refereeName, saleAmount, pointsEarned }),
    });

    if (result.error) {
      console.error('[sendReferralValidatedEmail] Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[sendReferralValidatedEmail] Unexpected error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendVoucherAvailableEmail(
  referrerEmail: string,
  referrerName: string,
  voucherCode: string,
  dashboardUrl: string,
) {
  const voucherAmount = 20; // Fixed per CLAUDE.md

  try {
    const result = await resend.emails.send({
      from: 'Programme Ambassadeur <noreply@ambassadeur.parfum.local>',
      to: referrerEmail,
      subject: \`Bon d'achat de \${voucherAmount}€ disponible!\`,
      react: VoucherAvailableEmail({ referrerName, voucherAmount, voucherCode, dashboardUrl }),
    });

    if (result.error) {
      console.error('[sendVoucherAvailableEmail] Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[sendVoucherAvailableEmail] Unexpected error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

export async function sendVoucherUsedEmail(
  referrerEmail: string,
  referrerName: string,
  remainingPoints: number,
) {
  const voucherAmount = 20;

  try {
    const result = await resend.emails.send({
      from: 'Programme Ambassadeur <noreply@ambassadeur.parfum.local>',
      to: referrerEmail,
      subject: 'Bon d\\'achat utilisé - Merci!',
      react: VoucherUsedEmail({ referrerName, voucherAmount, remainingPoints }),
    });

    if (result.error) {
      console.error('[sendVoucherUsedEmail] Resend error:', result.error);
      return { success: false, error: result.error.message };
    }

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[sendVoucherUsedEmail] Unexpected error:', error);
    return { success: false, error: 'Failed to send email' };
  }
}
\`\`\`

- [ ] **Step 7: Update .env.example**

\`\`\`bash
# lib/email/send.ts
RESEND_API_KEY=your-resend-api-key-here
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

- [ ] **Step 8: Commit**

\`\`\`bash
git add lib/email/ .env.example
git commit -m "feat: add Resend integration and email templates"
\`\`\`

---

### Task 2: Email Verification Token Generation & Validation

**Files:**
- Create: `lib/utils/jwt.ts`
- Create: `lib/validation/email.ts`
- Modify: `lib/constants.ts` (add VERIFICATION_TOKEN_EXPIRY_DAYS)

[Full task content continues...]

### Task 3-13: [Remaining tasks as specified in original plan]

---

## Execution Notes

- **Phase:** Phase 2 — Core Métier
- **Base branch:** master
- **Working directory:** c:\Users\haric\OneDrive\Bureau\App Emre
- **Total tasks:** 13
- **Estimated commits:** 13 (one per task)
