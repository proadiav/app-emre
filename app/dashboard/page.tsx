import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { LogoutButton } from '@/components/auth/LogoutButton';

export default async function DashboardPage() {
  const supabase = createServerSupabase();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
      <p className="text-gray-600">Bienvenue ! Phase 1 : Fondations</p>

      <div className="rounded-lg bg-blue-50 p-4">
        <p className="text-blue-900">
          L'application est en cours de construction. Phase 2 commencera bientôt.
        </p>
      </div>

      <LogoutButton />
    </div>
  );
}
