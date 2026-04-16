'use client';

import { useState } from 'react';
import Link from 'next/link';
import { recordSale } from '@/app/(authenticated)/customers/[id]/new-sale/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
        <Alert className="border-[#3d8a52]/20 bg-[#ecf7ee]">
          <AlertDescription className="text-[#3d8a52]">
            Vente de {currencyFormatter.format(result.amount)} enregistrée avec succès
          </AlertDescription>
        </Alert>
        {result.referralValidated && (
          <Alert className="border-accent/20 bg-accent/10">
            <AlertDescription className="text-accent">
              Parrainage validé ! 1 point attribué au parrain
            </AlertDescription>
          </Alert>
        )}
        {result.voucherCreated && (
          <Alert className="border-[#4a7ac7]/20 bg-[#edf3fe]">
            <AlertDescription className="text-[#4a7ac7]">
              Bon d&apos;achat de 20 € généré pour le parrain !
            </AlertDescription>
          </Alert>
        )}
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
        <Label htmlFor="amount">Montant (€)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Montant en euros"
          required
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer la vente'}
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/customers/${customerId}`}>Annuler</Link>
        </Button>
      </div>
    </form>
  );
}
