'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCustomer, searchCustomers } from '@/app/(authenticated)/customers/actions';

// Client-side schema (referrerId managed separately)
const formSchema = z.object({
  firstName: z.string().min(1, 'Prénom requis').max(100, 'Prénom trop long'),
  lastName: z.string().min(1, 'Nom requis').max(100, 'Nom trop long'),
  email: z.string().email('Email invalide'),
  phone: z.string().min(1, 'Téléphone requis'),
});

type FormValues = z.infer<typeof formSchema>;

interface ReferrerInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function CreateCustomerForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Referrer search state
  const [hasReferrer, setHasReferrer] = useState(false);
  const [referrerQuery, setReferrerQuery] = useState('');
  const [referrerResults, setReferrerResults] = useState<ReferrerInfo[]>([]);
  const [selectedReferrer, setSelectedReferrer] = useState<ReferrerInfo | null>(null);
  const [isSearchingReferrer, setIsSearchingReferrer] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  // Referrer search with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (referrerQuery.length < 2) {
      setReferrerResults([]);
      setIsSearchingReferrer(false);
      return;
    }

    setIsSearchingReferrer(true);
    debounceRef.current = setTimeout(async () => {
      const response = await searchCustomers(referrerQuery);
      if (response.success && response.data) {
        setReferrerResults(
          response.data.slice(0, 5).map((c) => ({
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
          }))
        );
      } else {
        setReferrerResults([]);
      }
      setIsSearchingReferrer(false);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [referrerQuery]);

  function handleSelectReferrer(referrer: ReferrerInfo) {
    setSelectedReferrer(referrer);
    setReferrerQuery('');
    setReferrerResults([]);
  }

  function handleRemoveReferrer() {
    setSelectedReferrer(null);
  }

  function handleToggleReferrer(checked: boolean) {
    setHasReferrer(checked);
    if (!checked) {
      setSelectedReferrer(null);
      setReferrerQuery('');
      setReferrerResults([]);
    }
  }

  async function onSubmit(data: FormValues) {
    setServerError(null);
    setIsSubmitting(true);

    const input = {
      ...data,
      referrerId: selectedReferrer?.id ?? null,
    };

    const response = await createCustomer(input);

    if (response.success && response.data) {
      router.push(`/customers/${response.data.id}`);
    } else {
      setServerError(response.error?.message ?? 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Server error banner */}
      {serverError && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{serverError}</p>
        </div>
      )}

      {/* Name fields (2 columns) */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
            Prénom
          </label>
          <input
            id="firstName"
            type="text"
            {...register('firstName')}
            placeholder="Prénom"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
            Nom
          </label>
          <input
            id="lastName"
            type="text"
            {...register('lastName')}
            placeholder="Nom"
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      {/* Email */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          placeholder="email@exemple.com"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
          Téléphone
        </label>
        <input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="06 12 34 56 78"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
        )}
      </div>

      {/* Referrer section */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasReferrer}
            onChange={(e) => handleToggleReferrer(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Ce client a un parrain</span>
        </label>

        {hasReferrer && (
          <div className="ml-6 space-y-2">
            {selectedReferrer ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  {selectedReferrer.first_name} {selectedReferrer.last_name} ({selectedReferrer.email})
                  <button
                    type="button"
                    onClick={handleRemoveReferrer}
                    className="ml-1 text-blue-500 hover:text-blue-700"
                  >
                    ✕
                  </button>
                </span>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={referrerQuery}
                  onChange={(e) => setReferrerQuery(e.target.value)}
                  placeholder="Rechercher le parrain par nom, email ou téléphone..."
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
                {isSearchingReferrer && (
                  <p className="text-xs text-gray-500">Recherche en cours...</p>
                )}
                {referrerResults.length > 0 && (
                  <ul className="rounded-md border border-gray-200 bg-white">
                    {referrerResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectReferrer(r)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                        >
                          {r.first_name} {r.last_name} — {r.email}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {referrerQuery.length >= 2 && !isSearchingReferrer && referrerResults.length === 0 && (
                  <p className="text-xs text-gray-500">Aucun parrain trouvé</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Création en cours...' : 'Créer le client'}
        </button>
        <a
          href="/customers"
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </a>
      </div>
    </form>
  );
}
