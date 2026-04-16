'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCustomer, searchCustomers } from '@/app/(authenticated)/customers/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

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
      if (debounceRef.current) clearTimeout(debounceRef.current);
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
      {serverError && (
        <Alert variant="destructive">
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Prénom</Label>
          <Input id="firstName" type="text" {...register('firstName')} placeholder="Prénom" />
          {errors.firstName && (
            <p className="text-sm text-destructive">{errors.firstName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Nom</Label>
          <Input id="lastName" type="text" {...register('lastName')} placeholder="Nom" />
          {errors.lastName && (
            <p className="text-sm text-destructive">{errors.lastName.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" {...register('email')} placeholder="email@exemple.com" />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Téléphone</Label>
        <Input id="phone" type="tel" {...register('phone')} placeholder="06 12 34 56 78" />
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hasReferrer}
            onChange={(e) => handleToggleReferrer(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          <span className="text-sm font-medium">Ce client a un parrain</span>
        </label>

        {hasReferrer && (
          <div className="ml-6 space-y-2">
            {selectedReferrer ? (
              <div className="flex items-center gap-2">
                <Badge variant="points" className="gap-1">
                  {selectedReferrer.first_name} {selectedReferrer.last_name} ({selectedReferrer.email})
                  <button
                    type="button"
                    onClick={handleRemoveReferrer}
                    className="ml-1 hover:opacity-70"
                  >
                    ✕
                  </button>
                </Badge>
              </div>
            ) : (
              <>
                <Input
                  type="text"
                  value={referrerQuery}
                  onChange={(e) => setReferrerQuery(e.target.value)}
                  placeholder="Rechercher le parrain par nom, email ou téléphone..."
                />
                {isSearchingReferrer && (
                  <p className="text-xs text-muted-foreground">Recherche en cours...</p>
                )}
                {referrerResults.length > 0 && (
                  <ul className="rounded-md border bg-card">
                    {referrerResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectReferrer(r)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-accent/10 transition-colors"
                        >
                          {r.first_name} {r.last_name} — {r.email}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {referrerQuery.length >= 2 && !isSearchingReferrer && referrerResults.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucun parrain trouvé</p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Création en cours...' : 'Créer le client'}
        </Button>
        <Button variant="outline" asChild>
          <a href="/customers">Annuler</a>
        </Button>
      </div>
    </form>
  );
}
