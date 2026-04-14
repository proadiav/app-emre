'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useVoucherAction } from '@/app/(authenticated)/customers/[id]/use-voucher/actions';

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
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            Bon de 20 € utilisé avec succès
          </p>
        </div>
        <Link
          href={`/customers/${customerId}`}
          className="inline-block rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          Retour à la fiche client
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="voucher" className="block text-sm font-medium text-gray-700">
          Bon d&apos;achat
        </label>
        <select
          id="voucher"
          value={voucherId}
          onChange={(e) => setVoucherId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
        >
          <option value="">Sélectionner un bon...</option>
          {vouchers.map((v) => (
            <option key={v.id} value={v.id}>
              Bon — créé le {dateFormatter.format(new Date(v.created_at))}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sale" className="block text-sm font-medium text-gray-700">
          Vente associée
        </label>
        <select
          id="sale"
          value={saleId}
          onChange={(e) => setSaleId(e.target.value)}
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
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
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Utilisation en cours...' : 'Utiliser le bon'}
        </button>
        <Link
          href={`/customers/${customerId}`}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Annuler
        </Link>
      </div>
    </form>
  );
}
