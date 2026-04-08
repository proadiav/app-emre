'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircleIcon, XCircleIcon, Spinner } from '@/components/ui/icons';
import Link from 'next/link';
import { verifyEmailToken } from '../actions';

type VerificationState = 'loading' | 'success' | 'error';

interface VerificationError {
  code: string;
  message: string;
}

interface VerifyEmailContentProps {
  token: string;
}

export function VerifyEmailContent({ token }: VerifyEmailContentProps) {
  const router = useRouter();
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<VerificationError | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    let timer: NodeJS.Timeout | undefined;

    const verifyEmail = async () => {
      try {
        const result = await verifyEmailToken(token);

        if (result.success) {
          setMessage(result.message || 'Email vérifié avec succès!');
          setState('success');
          // Redirect to dashboard after 2 seconds
          timer = setTimeout(() => {
            router.push('/dashboard');
          }, 2000);
        } else {
          if (result.error) {
            setError(result.error);
          }
          setState('error');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        console.error('[VerifyEmailContent] Error:', errorMsg);
        setError({
          code: 'unexpected_error',
          message: 'Une erreur inattendue s\'est produite',
        });
        setState('error');
      }
    };

    verifyEmail();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [token, router]);

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="rounded-lg bg-white p-8 shadow-md text-center">
          <Spinner className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-gray-700 font-medium">Vérification en cours...</p>
        </div>
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="rounded-lg bg-white p-8 shadow-md text-center max-w-md">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Succès!</h1>
          <p className="mt-2 text-gray-600">{message}</p>
          <p className="mt-4 text-sm text-gray-500">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  if (state === 'error' && error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="rounded-lg bg-white p-8 shadow-md text-center max-w-md">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-600" />
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Erreur</h1>
          <p className="mt-2 text-gray-600">{error.message}</p>
          <div className="mt-6 flex gap-3 justify-center">
            <Link
              href="/"
              className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
