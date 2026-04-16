'use client';

import { useState, useEffect } from 'react';
import { getAuditLogsAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';
import type { Database } from '@/lib/supabase/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
        <h1 className="text-2xl font-semibold text-foreground">Journal d&apos;audit</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Journal d&apos;audit</h1>
        <p className="text-destructive">Impossible de charger les logs d&apos;audit</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.total / limit);
  const canPrevious = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Journal d&apos;audit</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date/Heure</TableHead>
                <TableHead>ID Personnel</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Détails</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun log disponible
                  </TableCell>
                </TableRow>
              ) : (
                data.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString('fr-FR')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{log.staff_id}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell className="text-muted-foreground">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {JSON.stringify(log.details || {})}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Page {page + 1} sur {totalPages || 1} ({data.total} total)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p - 1)}
            disabled={!canPrevious}
          >
            Précédent
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={!canNext}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
