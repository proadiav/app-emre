import React from 'react';
import {
  Html,
  Body,
  Head,
  Hr,
  Container,
  Preview,
  Section,
  Text,
  Heading,
} from '@react-email/components';

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
}) => {
  return (
    <Html>
      <Head />
      <Preview>Votre filleul a validé son parrainage!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Parrainage validé!</Heading>
            <Text style={paragraph}>
              Bonjour {referrerName},
            </Text>
            <Text style={paragraph}>
              Félicitations! {refereeName} a effectué un achat de{' '}
              <strong>{saleAmount.toFixed(2)} €</strong> et son parrainage a
              été validé.
            </Text>
            <Section style={statsContainer}>
              <Section style={statBox}>
                <Text style={statLabel}>Points gagnés</Text>
                <Text style={statValue}>{String(pointsEarned)}</Text>
              </Section>
            </Section>
            <Text style={paragraph}>
              Continuez à parrainer! Avec <strong>5 filleuls validés</strong>,
              vous recevrez un bon d'achat de <strong>20 €</strong>.
            </Text>
            <Hr style={hr} />
            <Text style={footerText}>
              Connectez-vous à votre compte pour voir vos points et bons
              d'achat.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ReferralValidatedEmail;

const main = {
  backgroundColor: '#f3f3f5',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const box = {
  padding: '0 48px',
};

const heading = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '16px 0',
  padding: '0',
  color: '#22c55e',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  color: '#3c3c3d',
};

const statsContainer = {
  margin: '27px 0',
  padding: '20px',
  backgroundColor: '#f9fafb',
  borderRadius: '4px',
  border: '1px solid #e5e7eb',
};

const statBox = {
  textAlign: 'center' as const,
};

const statLabel = {
  fontSize: '13px',
  color: '#6b7280',
  margin: '0',
  fontWeight: 'normal',
};

const statValue = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#22c55e',
  margin: '8px 0 0',
};

const hr = {
  borderColor: '#ddddde',
  marginTop: '48px',
  marginBottom: '16px',
};

const footerText = {
  color: '#8898aa',
  fontSize: '13px',
  margin: '16px 0 0',
};
