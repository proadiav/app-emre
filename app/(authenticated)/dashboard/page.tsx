import Link from 'next/link';
import {
  getTotalCustomers,
  getTotalReferrals,
  getTotalSalesAmount,
  getTotalVouchersGenerated,
} from '@/lib/db/stats';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);

export default async function DashboardPage() {
  const [customers, referrals, salesAmount, vouchers] = await Promise.all([
    getTotalCustomers(),
    getTotalReferrals(),
    getTotalSalesAmount(),
    getTotalVouchersGenerated(),
  ]);

  const kpis = [
    { label: 'Clients', value: customers },
    { label: 'Parrainages validés', value: referrals },
    { label: 'Ventes totales', value: formatCurrency(salesAmount) },
    { label: 'Bons générés', value: vouchers },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-600">Bienvenue sur le Programme Ambassadeur.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-gray-200 bg-white p-6"
          >
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Actions rapides</h2>
        <div className="flex gap-4">
          <Link
            href="/customers/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            + Nouveau client
          </Link>
          <Link
            href="/customers"
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Rechercher un client
          </Link>
        </div>
      </div>
    </div>
  );
}