import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import Link from 'next/link';

/**
 * Admin Layout - Server component
 * Checks user role via getUser() and redirects if not admin
 * Renders navbar with links to: /admin/settings, /admin/stats, /admin/audit-logs, /admin/staff
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();

  // Check if user is authenticated
  if (authError || !authData.user) {
    redirect('/login');
  }

  // Check if user is admin
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', authData.user.id)
    .single();

  if (staffError || !staff || staff.role !== 'admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin navbar */}
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-bold text-gray-900">Administration</h2>
            <div className="flex gap-6">
              <Link
                href="/admin/settings"
                className="text-gray-600 hover:text-gray-900"
              >
                Paramètres
              </Link>
              <Link
                href="/admin/stats"
                className="text-gray-600 hover:text-gray-900"
              >
                Statistiques
              </Link>
              <Link
                href="/admin/audit-logs"
                className="text-gray-600 hover:text-gray-900"
              >
                Journal d'audit
              </Link>
              <Link
                href="/admin/staff"
                className="text-gray-600 hover:text-gray-900"
              >
                Personnel
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
