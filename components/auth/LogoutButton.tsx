'use client';

import { signOut } from '@/app/login/actions';

export function LogoutButton() {
  return (
    <button
      onClick={async () => {
        await signOut();
      }}
      className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700"
    >
      Déconnexion
    </button>
  );
}
