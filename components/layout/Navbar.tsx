import { NavbarClient } from '@/components/layout/NavbarClient';

interface NavbarProps {
  userEmail: string;
  role: 'admin' | 'vendeur';
}

export function Navbar({ userEmail, role }: NavbarProps) {
  return <NavbarClient userEmail={userEmail} role={role} />;
}
