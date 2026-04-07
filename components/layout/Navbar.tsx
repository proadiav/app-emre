import { createServerSupabase } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';

export async function Navbar() {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  return (
    <nav className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Programme Ambassadeur</h1>
        {session && (
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{session.user.email}</span>
            <LogoutButton />
          </div>
        )}
      </div>
    </nav>
  );
}
