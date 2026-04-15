import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Programme Ambassadeur</h1>
        <p className="mt-2 text-gray-600">Connexion staff</p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
