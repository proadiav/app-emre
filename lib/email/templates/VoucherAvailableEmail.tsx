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
  Link,
  Heading,
} from '@react-email/components';

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
}) => {
  return (
    <Html>
      <Head />
      <Preview>{`Votre bon d'achat de ${voucherAmount} € est disponible!`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>
              Bon d'achat de {voucherAmount} € généré!
            </Heading>
            <Text style={paragraph}>
              Bonjour {referrerName},
            </Text>
            <Text style={paragraph}>
              Vous avez atteint <strong>5 filleuls validés</strong>! En
              récompense, un bon d'achat de <strong>{voucherAmount} €</strong>a
              été généré pour vous.
            </Text>
            <Section style={voucherContainer}>
              <Text style={voucherLabel}>Votre code promotionnel</Text>
              <Text style={voucherCodeStyle}>{String(voucherCode)}</Text>
            </Section>
            <Text style={paragraph}>
              Ce bon d'achat est:
            </Text>
            <ul style={list}>
              <li style={listItem}>
                Valable en boutique sans minimum d'achat
              </li>
              <li style={listItem}>Sans date d'expiration</li>
              <li style={listItem}>Cumulable avec d'autres bons</li>
            </ul>
            <Section style={buttonContainer}>
              <Link href={dashboardUrl} style={button}>
                Accéder à mon compte
              </Link>
            </Section>
            <Hr style={hr} />
            <Text style={footerText}>
              Vous pouvez continuer à parrainer pour générer d'autres bons
              d'achat!
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VoucherAvailableEmail;

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
  color: '#f59e0b',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  color: '#3c3c3d',
};

const voucherContainer = {
  margin: '27px 0',
  padding: '24px',
  backgroundColor: '#fef3c7',
  borderRadius: '4px',
  border: '2px solid #f59e0b',
  textAlign: 'center' as const,
};

const voucherLabel = {
  fontSize: '13px',
  color: '#92400e',
  margin: '0 0 12px',
  fontWeight: 'normal',
};

const voucherCodeStyle = {
  fontSize: '28px',
  fontWeight: 'bold',
  color: '#f59e0b',
  margin: '0',
  letterSpacing: '2px',
  fontFamily: 'monospace',
};

const list = {
  margin: '16px 0',
  paddingLeft: '20px',
  color: '#3c3c3d',
};

const listItem = {
  margin: '8px 0',
  fontSize: '15px',
  lineHeight: '24px',
};

const buttonContainer = {
  margin: '27px 0',
};

const button = {
  backgroundColor: '#f59e0b',
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '11px 23px',
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
