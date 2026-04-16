'use client';

import { signOut } from '@/app/login/actions';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        await signOut();
      }}
      className="text-[#9d9dab] hover:text-white hover:bg-white/10"
    >
      Déconnexion
    </Button>
  );
}
