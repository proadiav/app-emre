'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCustomer } from '@/app/(authenticated)/customers/actions';
import { Button } from '@/components/ui/button';

interface DeleteCustomerButtonProps {
  customerId: string;
  customerName: string;
}

export function DeleteCustomerButton({ customerId, customerName }: DeleteCustomerButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Supprimer définitivement le client ${customerName} ?\n\n` +
        `Cela supprimera aussi ses ventes, parrainages et bons.\n\n` +
        `Cette action est irréversible.`
    );
    if (!confirmed) return;

    setError(null);
    setIsDeleting(true);
    const response = await deleteCustomer(customerId);

    if (response.success) {
      router.push('/customers');
      router.refresh();
    } else {
      setError(response.error?.message ?? 'Erreur lors de la suppression');
      setIsDeleting(false);
    }
  }

  return (
    <>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isDeleting}
      >
        {isDeleting ? 'Suppression...' : 'Supprimer'}
      </Button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
