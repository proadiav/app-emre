export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { getAllVouchers } from '@/lib/db/vouchers';

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export default async function VouchersPage() {
  const { vouchers } = await getAllVouchers();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Bons d&apos;achat</h1>

      {vouchers.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Parrain
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  Email
                </th>
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
                    {voucher.referrer ? (
                      <Link
                        href={`/customers/${voucher.referrer_id}`}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {voucher.referrer.first_name} {voucher.referrer.last_name}
                      </Link>
                    ) : (
                      <span className="text-gray-500">Inconnu</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {voucher.referrer?.email ?? '—'}
                  </td>
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
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">Aucun bon d&apos;achat généré pour le moment.</p>
        </div>
      )}
    </div>
  );
}
