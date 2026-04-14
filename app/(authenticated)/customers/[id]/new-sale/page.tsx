export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { getCustomer } from '@/app/(authenticated)/customers/actions';
import { RecordSaleForm } from '@/components/customers/RecordSaleForm';

export default async function NewSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await getCustomer(id);

  if (!response.success || !response.data?.customer) {
    notFound();
  }

  const customer = response.data.customer;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">
        Saisir une vente — {customer.first_name} {customer.last_name}
      </h1>
      <div className="max-w-md">
        <RecordSaleForm customerId={id} />
      </div>
    </div>
  );
}
