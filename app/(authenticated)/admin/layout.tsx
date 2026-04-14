import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabase();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  const { data: staff, error: staffError } = await supabase
    .from('staff')
    .select('role')
    .eq('id', user.id)
    .single();

  if (staffError || !staff || staff.role !== 'admin') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
