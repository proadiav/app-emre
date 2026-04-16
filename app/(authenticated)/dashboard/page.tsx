import Link from 'next/link';
import {
  getTotalCustomers,
  getTotalReferrals,
  getTotalSalesAmount,
  getTotalVouchersGenerated,
} from '@/lib/db/stats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Vue d&apos;ensemble du programme</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Actions rapides</h2>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/customers/new">+ Nouveau client</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/customers">Rechercher un client</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
