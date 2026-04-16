'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVoucherAction } from '@/app/(authenticated)/customers/[id]/use-voucher/actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface VoucherOption {
  id: string;
  created_at: string;
}

interface SaleOption {
  id: string;
  amount: number;
  created_at: string;
}

interface UseVoucherFormProps {
  customerId: string;
  vouchers: VoucherOption[];
  sales: SaleOption[];
}

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export function UseVoucherForm({ customerId, vouchers, sales }: UseVoucherFormProps) {
  const [voucherId, setVoucherId] = useState(vouchers.length === 1 ? vouchers[0].id : '');
  const [saleId, setSaleId] = useState(sales.length === 1 ? sales[0].id : '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!voucherId) {
      setError('Veuillez sélectionner un bon');
      return;
    }
    if (!saleId) {
      setError('Veuillez sélectionner une vente');
      return;
    }

    setIsSubmitting(true);
    const response = await useVoucherAction({ voucherId, saleId });

    if (response.success) {
      setSuccess(true);
    } else {
      setError(response.error?.message ?? 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-4">
        <Alert className="border-[#3d8a52]/20 bg-[#ecf7ee]">
          <AlertDescription className="text-[#3d8a52]">
            Bon de 20 € utilisé avec succès
          </AlertDescription>
        </Alert>
        <Button asChild>
          <Link href={`/customers/${customerId}`}>Retour à la fiche client</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="voucher">Bon d&apos;achat</Label>
        <select
          id="voucher"
          value={voucherId}
          onChange={(e) => setVoucherId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Sélectionner un bon...</option>
          {vouchers.map((v) => (
            <option key={v.id} value={v.id}>
              Bon — créé le {dateFormatter.format(new Date(v.created_at))}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sale">Vente associée</Label>
        <select
          id="sale"
          value={saleId}
          onChange={(e) => setSaleId(e.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Sélectionner une vente...</option>
          {sales.map((s) => (
            <option key={s.id} value={s.id}>
              {dateFormatter.format(new Date(s.created_at))} — {currencyFormatter.format(s.amount)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Utilisation en cours...' : 'Utiliser le bon'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/customers/${customerId}`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
