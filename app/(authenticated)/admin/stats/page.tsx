'use client';

import { useState, useEffect } from 'react';
import { getStatisticsAction, exportStatsAsCSVAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';

interface StatisticsData {
  totalCustomers: number;
  totalReferrals: number;
  totalSalesAmount: number;
  totalVouchersGenerated: number;
  topReferrers: Array<{
    customerId: string;
    email: string;
    firstName: string;
    lastName: string;
    count: number;
  }>;
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats on mount
  useEffect(() => {
    async function fetchStats() {
      setLoading(true);
      setError(null);
      try {
        const result = (await getStatisticsAction()) as ApiResponse<StatisticsData>;
        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.error?.message || 'Impossible de charger les statistiques');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  // Handle CSV export
  async function handleExportCSV() {
    setExporting(true);
    setError(null);
    try {
      const result = (await exportStatsAsCSVAction()) as ApiResponse<string>;
      if (result.success && result.data) {
        // Create a blob and download
        const blob = new Blob([result.data], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `stats-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        setError(result.error?.message || 'Erreur lors de l\'export');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-red-600">Impossible de charger les statistiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Statistiques</h1>
        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 disabled:opacity-50"
        >
          {exporting ? 'Export en cours...' : 'Exporter en CSV'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total clients</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalCustomers}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total parrainages</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalReferrals}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total ventes</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalSalesAmount.toFixed(2)} €</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Bons générés</p>
          <p className="text-3xl font-bold text-gray-900">{stats.totalVouchersGenerated}</p>
        </div>
      </div>

      {/* Top referrers table */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">Top 10 parrains</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rang</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Nom</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Filleuls validés</th>
              </tr>
            </thead>
            <tbody>
              {stats.topReferrers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                    Aucun parrain pour le moment
                  </td>
                </tr>
              ) : (
                stats.topReferrers.map((referrer, index) => (
                  <tr key={referrer.customerId} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{index + 1}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{referrer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {referrer.firstName} {referrer.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{referrer.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
