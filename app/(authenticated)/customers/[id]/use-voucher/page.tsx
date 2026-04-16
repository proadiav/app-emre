export const dynamic = 'force-dynamic';

import { redirect, notFound } from 'next/navigation';
import { getCustomer } from '@/app/(authenticated)/customers/actions';
import { UseVoucherForm } from '@/components/customers/UseVoucherForm';

export default async function UseVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await getCustomer(id);

  if (!response.success || !response.data?.customer) {
    notFound();
  }

  const { customer, sales, vouchers } = response.data;
  const availableVouchers = vouchers.filter((v) => v.status === 'available');

  // No available vouchers — redirect back to customer page
  if (availableVouchers.length === 0) {
    redirect(`/customers/${id}`);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">
        Utiliser un bon — {customer.first_name} {customer.last_name}
      </h1>
      <div className="max-w-md">
        <UseVoucherForm
          customerId={id}
          vouchers={availableVouchers.map((v) => ({
            id: v.id,
            created_at: v.created_at,
          }))}
          sales={sales.map((s) => ({
            id: s.id,
            amount: s.amount,
            created_at: s.created_at,
          }))}
        />
      </div>
    </div>
  );
}
