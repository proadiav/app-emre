import Link from 'next/link';
import { getRecentCustomers } from '@/lib/db/customers';
import { CustomerSearch } from '@/components/customers/CustomerSearch';
import { Button } from '@/components/ui/button';

export default async function CustomersPage() {
  const { customers } = await getRecentCustomers(20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
        <Button asChild>
          <Link href="/customers/new">+ Nouveau client</Link>
        </Button>
      </div>

      <CustomerSearch initialCustomers={customers} />
    </div>
  );
}
