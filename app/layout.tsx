import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Programme Ambassadeur',
  description: 'Gestion du programme de parrainage',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
