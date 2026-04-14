import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCustomer } from '@/app/(authenticated)/customers/actions';
import { getCustomerById, getCustomersByIds } from '@/lib/db/customers';

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

  // Fetch referrer name if customer has a referrer
  let referrerName: string | null = null;
  if (customer.referrer_id) {
    const referrerResult = await getCustomerById(customer.referrer_id);
    if (referrerResult.success && referrerResult.customer) {
      referrerName = `${referrerResult.customer.first_name} ${referrerResult.customer.last_name}`;
    }
  }

  // Fetch referee names for referrals
  const refereeIds = referralsAsReferrer.map((r) => r.referee_id);
  const referees = await getCustomersByIds(refereeIds);
  const refereeMap = new Map(referees.map((c) => [c.id, c]));

  // Computed stats
  const validatedPoints = referralsAsReferrer.filter((r) => r.status === 'validated').length;
  const totalVouchers = vouchers.length;
  const availableVouchers = vouchers.filter((v) => v.status === 'available').length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/customers"
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            ← Retour aux clients
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {customer.first_name} {customer.last_name}
          </h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/customers/${id}/new-sale`}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
          >
            Saisir une vente
          </Link>
          {availableVouchers > 0 && (
            <Link
              href={`/customers/${id}/use-voucher`}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Utiliser un bon
            </Link>
          )}
        </div>
      </div>

      {/* Infos client */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Informations</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Email : </span>
            <span className="text-gray-900">{customer.email}</span>
          </div>
          <div>
            <span className="text-gray-500">Téléphone : </span>
            <span className="text-gray-900">{customer.phone}</span>
          </div>
          <div>
            <span className="text-gray-500">Email vérifié : </span>
            {customer.email_verified ? (
              <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                Vérifié
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                En attente
              </span>
            )}
          </div>
          <div>
            <span className="text-gray-500">Créé le : </span>
            <span className="text-gray-900">
              {dateFormatter.format(new Date(customer.created_at))}
            </span>
          </div>
          {customer.referrer_id && (
            <div>
              <span className="text-gray-500">Parrainé par : </span>
              <Link
                href={`/customers/${customer.referrer_id}`}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                {referrerName ?? 'Client inconnu'}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Résumé parrainage */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Résumé parrainage</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-500">Points</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{validatedPoints}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-500">Bons générés</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{totalVouchers}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-500">Bons disponibles</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{availableVouchers}</p>
          </div>
        </div>
      </div>

      {/* Historique des ventes */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Historique des ventes</h2>
        {sales.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {dateFormatter.format(new Date(sale.created_at))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {currencyFormatter.format(sale.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucune vente enregistrée</p>
        )}
      </div>

      {/* Filleuls */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Filleuls</h2>
        {referralsAsReferrer.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Nom
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {referralsAsReferrer.map((referral) => {
                  const referee = refereeMap.get(referral.referee_id);
                  return (
                    <tr key={referral.id}>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <Link
                          href={`/customers/${referral.referee_id}`}
                          className="font-medium text-blue-600 hover:text-blue-800"
                        >
                          {referee
                            ? `${referee.first_name} ${referee.last_name}`
                            : 'Client inconnu'}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        {referral.status === 'validated' ? (
                          <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                            Validé
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
                            En attente
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun filleul</p>
        )}
      </div>

      {/* Bons d'achat */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Bons d&apos;achat</h2>
        {vouchers.length > 0 ? (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Statut
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date création
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date utilisation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      {voucher.status === 'available' ? (
                        <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Disponible
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                          Utilisé
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                      {dateFormatter.format(new Date(voucher.created_at))}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {voucher.used_at
                        ? dateFormatter.format(new Date(voucher.used_at))
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Aucun bon d&apos;achat</p>
        )}
      </div>
    </div>
  );
}
