import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch staff role — only staff members can access the app
  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single();

  if (staffError || !staff) {
    redirect('/login');
  }

  const role = staff.role as 'admin' | 'vendeur';

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar userEmail={user.email ?? ''} role={role} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
