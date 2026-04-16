export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAllVouchers } from '@/lib/db/vouchers';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default async function VouchersPage() {
  const { vouchers } = await getAllVouchers();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Bons d&apos;achat</h1>

      {vouchers.length > 0 ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parrain</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead>Date utilisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vouchers.map((voucher) => (
                <TableRow key={voucher.id}>
                  <TableCell>
                    {voucher.referrer ? (
                      <Link
                        href={`/customers/${voucher.referrer_id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {voucher.referrer.first_name} {voucher.referrer.last_name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Inconnu</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {voucher.referrer?.email ?? '—'}
                  </TableCell>
                  <TableCell>
                    {voucher.status === 'available' ? (
                      <Badge variant="available">Disponible</Badge>
                    ) : (
                      <Badge variant="secondary">Utilisé</Badge>
                    )}
                  </TableCell>
                  <TableCell>{dateFormatter.format(new Date(voucher.created_at))}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {voucher.used_at
                      ? dateFormatter.format(new Date(voucher.used_at))
                      : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-8 text-center">
          <p className="text-muted-foreground">Aucun bon d&apos;achat généré pour le moment.</p>
        </div>
      )}
    </div>
  );
}
