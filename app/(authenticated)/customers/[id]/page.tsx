export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer } from '@/app/(authenticated)/customers/actions';
import { getCustomerById, getCustomersByIds } from '@/lib/db/customers';
import { createServerSupabase } from '@/lib/supabase/server';
import { DeleteCustomerButton } from '@/components/customers/DeleteCustomerButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

const currencyFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const response = await getCustomer(id);

  if (!response.success || !response.data?.customer) {
    notFound();
  }

  const { customer, sales, referralsAsReferrer, vouchers } = response.data;

  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: staff } = await supabase.from('staff').select('role').eq('id', user.id).single();
    isAdmin = staff?.role === 'admin';
  }

  let referrerName: string | null = null;
  if (customer.referrer_id) {
    const referrerResult = await getCustomerById(customer.referrer_id);
    if (referrerResult.success && referrerResult.customer) {
      referrerName = `${referrerResult.customer.first_name} ${referrerResult.customer.last_name}`;
    }
  }

  const refereeIds = referralsAsReferrer.map((r) => r.referee_id);
  const referees = await getCustomersByIds(refereeIds);
  const refereeMap = new Map(referees.map((c) => [c.id, c]));

  const validatedPoints = referralsAsReferrer.filter((r) => r.status === 'validated').length;
  const totalVouchers = vouchers.length;
  const availableVouchers = vouchers.filter((v) => v.status === 'available').length;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/customers"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Retour aux clients
          </Link>
          <h1 className="text-2xl font-semibold text-foreground">
            {customer.first_name} {customer.last_name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Button asChild>
            <Link href={`/customers/${id}/new-sale`}>Saisir une vente</Link>
          </Button>
          {availableVouchers > 0 && (
            <Button variant="outline" asChild>
              <Link href={`/customers/${id}/use-voucher`}>Utiliser un bon</Link>
            </Button>
          )}
          {isAdmin && (
            <DeleteCustomerButton
              customerId={id}
              customerName={`${customer.first_name} ${customer.last_name}`}
            />
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Email : </span>
              <span className="text-foreground">{customer.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Téléphone : </span>
              <span className="text-foreground">{customer.phone}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Créé le : </span>
              <span className="text-foreground">
                {dateFormatter.format(new Date(customer.created_at))}
              </span>
            </div>
            {customer.referrer_id && (
              <div>
                <span className="text-muted-foreground">Parrainé par : </span>
                <Link
                  href={`/customers/${customer.referrer_id}`}
                  className="text-accent font-medium hover:underline"
                >
                  {referrerName ?? 'Client inconnu'}
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Résumé parrainage</h2>
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{validatedPoints}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bons générés</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{totalVouchers}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bons disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{availableVouchers}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Historique des ventes</h2>
        {sales.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>{dateFormatter.format(new Date(sale.created_at))}</TableCell>
                    <TableCell>{currencyFormatter.format(sale.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune vente enregistrée</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Filleuls</h2>
        {referralsAsReferrer.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {referralsAsReferrer.map((referral) => {
                  const referee = refereeMap.get(referral.referee_id);
                  return (
                    <TableRow key={referral.id}>
                      <TableCell>
                        <Link
                          href={`/customers/${referral.referee_id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {referee
                            ? `${referee.first_name} ${referee.last_name}`
                            : 'Client inconnu'}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {referral.status === 'validated' ? (
                          <Badge variant="validated">Validé</Badge>
                        ) : (
                          <Badge variant="pending">En attente</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun filleul</p>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Bons d&apos;achat</h2>
        {vouchers.length > 0 ? (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date création</TableHead>
                  <TableHead>Date utilisation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((voucher) => (
                  <TableRow key={voucher.id}>
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
          <p className="text-sm text-muted-foreground">Aucun bon d&apos;achat</p>
        )}
      </div>
    </div>
  );
}
