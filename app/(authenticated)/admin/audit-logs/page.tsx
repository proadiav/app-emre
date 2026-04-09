'use client';

import { useState, useEffect } from 'react';
import { getAuditLogsAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';
import type { Database } from '@/lib/supabase/types';

type AuditLog = Database['public']['Tables']['audit_logs']['Row'];

interface AuditLogsData {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditLogsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const limit = 50;

  // Fetch audit logs
  useEffect(() => {
    async function fetchLogs() {
      setLoading(true);
      setError(null);
      try {
        const result = (await getAuditLogsAction(undefined, { page, limit })) as ApiResponse<AuditLogsData>;
        if (result.success && result.data) {
          setData(result.data);
        } else {
          setError(result.error?.message || 'Impossible de charger les logs d\'audit');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, [page]);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Journal d'audit</h1>
        <p className="text-red-600">Impossible de charger les logs d'audit</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / limit);
  const canPrevious = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Journal d'audit</h1>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      {/* Logs table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date/Heure</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">ID Personnel</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Détails</th>
              </tr>
            </thead>
            <tbody>
              {data.logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                    Aucun log disponible
                  </td>
                </tr>
              ) : (
                data.logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.staff_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{log.action}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <code className="rounded bg-gray-100 px-2 py-1 text-xs">
                        {JSON.stringify(log.details || {})}
                      </code>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {page + 1} sur {totalPages || 1} ({data.total} total)
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={!canPrevious}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Précédent
          </button>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!canNext}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
