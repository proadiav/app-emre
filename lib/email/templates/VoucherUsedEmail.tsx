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

interface VoucherUsedEmailProps {
  referrerName: string;
  voucherAmount: number;
  remainingPoints: number;
}

export const VoucherUsedEmail: React.FC<VoucherUsedEmailProps> = ({
  referrerName,
  voucherAmount,
  remainingPoints,
}) => {
  return (
    <Html>
      <Head />
      <Preview>{`Votre bon d'achat de ${voucherAmount} € a été utilisé`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Bon d'achat utilisé</Heading>
            <Text style={paragraph}>
              Bonjour {referrerName},
            </Text>
            <Text style={paragraph}>
              Votre bon d'achat de <strong>{voucherAmount} €</strong> a été
              utilisé en boutique.
            </Text>
            <Section style={statsContainer}>
              <Section style={statBox}>
                <Text style={statLabel}>Points restants</Text>
                <Text style={statValue}>{String(remainingPoints)}</Text>
              </Section>
            </Section>
            <Text style={paragraph}>
              Continuez à parrainer pour accumuler des points et générer
              d'autres bons d'achat!
            </Text>
            <Hr style={hr} />
            <Text style={footerText}>
              Merci de votre fidélité à notre programme.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VoucherUsedEmail;

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
  color: '#06b6d4',
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
  backgroundColor: '#f0f9fa',
  borderRadius: '4px',
  border: '1px solid #cffafe',
};

const statBox = {
  textAlign: 'center' as const,
};

const statLabel = {
  fontSize: '13px',
  color: '#0e7490',
  margin: '0',
  fontWeight: 'normal',
};

const statValue = {
  fontSize: '32px',
  fontWeight: 'bold',
  color: '#06b6d4',
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
