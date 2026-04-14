import Link from 'next/link';
import { getRecentCustomers } from '@/lib/db/customers';
import { CustomerSearch } from '@/components/customers/CustomerSearch';

export default async function CustomersPage() {
  const { customers } = await getRecentCustomers(20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
        <Link
          href="/customers/new"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
        >
          + Nouveau client
        </Link>
      </div>

      {/* Search + Table */}
      <CustomerSearch initialCustomers={customers} />
    </div>
  );
}
