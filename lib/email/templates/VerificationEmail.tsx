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

interface VerificationEmailProps {
  customerName: string;
  verificationUrl: string;
}

export const VerificationEmail: React.FC<VerificationEmailProps> = ({
  customerName,
  verificationUrl,
}) => {
  return (
    <Html>
      <Head />
      <Preview>Vérifiez votre email pour activer votre compte</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={box}>
            <Heading style={heading}>Bienvenue, {customerName}!</Heading>
            <Text style={paragraph}>
              Merci de vous être inscrit dans notre programme de parrainage.
              Veuillez vérifier votre email en cliquant sur le lien ci-dessous.
            </Text>
            <Section style={buttonContainer}>
              <Link href={verificationUrl} style={button}>
                Vérifier mon email
              </Link>
            </Section>
            <Hr style={hr} />
            <Text style={footer}>
              Ou copiez ce lien dans votre navigateur:
            </Text>
            <Text style={footerLink}>{verificationUrl}</Text>
            <Hr style={hr} />
            <Text style={footerText}>
              Ce lien expire dans 7 jours. Ne pas partagez ce lien avec
              d'autres.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default VerificationEmail;

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
  color: '#1a1a1a',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 0',
  color: '#3c3c3d',
};

const buttonContainer = {
  margin: '27px 0 27px',
};

const button = {
  backgroundColor: '#5469d4',
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

const footer = {
  color: '#8898aa',
  fontSize: '13px',
  margin: '0',
};

const footerLink = {
  color: '#0b77d3',
  fontSize: '13px',
  margin: '0',
  wordBreak: 'break-all' as const,
};

const footerText = {
  color: '#8898aa',
  fontSize: '12px',
  margin: '0',
};
