'use client';

import { useState, useEffect } from 'react';
import { getStatisticsAction, exportStatsAsCSVAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  async function handleExportCSV() {
    setExporting(true);
    setError(null);
    try {
      const result = (await exportStatsAsCSVAction()) as ApiResponse<string>;
      if (result.success && result.data) {
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
        <h1 className="text-2xl font-semibold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Statistiques</h1>
        <p className="text-destructive">Impossible de charger les statistiques</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">Statistiques</h1>
        <Button onClick={handleExportCSV} disabled={exporting} variant="outline">
          {exporting ? 'Export en cours...' : 'Exporter en CSV'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total clients', value: stats.totalCustomers },
          { label: 'Total parrainages', value: stats.totalReferrals },
          { label: 'Total ventes', value: `${stats.totalSalesAmount.toFixed(2)} €` },
          { label: 'Bons générés', value: stats.totalVouchersGenerated },
        ].map((kpi) => (
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

      <Card>
        <CardHeader>
          <CardTitle>Top 10 parrains</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rang</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Filleuls validés</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.topReferrers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun parrain pour le moment
                  </TableCell>
                </TableRow>
              ) : (
                stats.topReferrers.map((referrer, index) => (
                  <TableRow key={referrer.customerId}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{referrer.email}</TableCell>
                    <TableCell>{referrer.firstName} {referrer.lastName}</TableCell>
                    <TableCell>{referrer.count}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
