'use client';

import { useState } from 'react';
import Link from 'next/link';
import { recordSale } from '@/app/(authenticated)/customers/[id]/new-sale/actions';

interface RecordSaleFormProps {
  customerId: string;
}

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export function RecordSaleForm({ customerId }: RecordSaleFormProps) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    amount: number;
    referralValidated: boolean;
    voucherCreated: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setError('Le montant doit être supérieur à 0');
      return;
    }

    setIsSubmitting(true);
    const response = await recordSale({ customerId, amount: numAmount });

    if (response.success && response.data) {
      setResult({
        amount: response.data.amount,
        referralValidated: response.data.referralValidated,
        voucherCreated: response.data.voucherCreated,
      });
    } else {
      setError(response.error?.message ?? 'Une erreur est survenue');
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="rounded-md bg-green-50 p-4">
          <p className="text-sm font-medium text-green-700">
            Vente de {currencyFormatter.format(result.amount)} enregistrée avec succès
          </p>
        </div>
        {result.referralValidated && (
          <div className="rounded-md bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">
              Parrainage validé ! 1 point attribué au parrain
            </p>
          </div>
        )}
        {result.voucherCreated && (
          <div className="rounded-md bg-purple-50 p-4">
            <p className="text-sm font-medium text-purple-700">
              Bon d&apos;achat de 20 € généré pour le parrain !
            </p>
          </div>
        )}
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
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
          Montant (€)
        </label>
        <input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant en euros"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
          required
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer la vente'}
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
