'use client';

import { useState, useEffect } from 'react';
import { ProgramSettingsForm } from '@/components/admin/ProgramSettingsForm';
import { getSettingsAction } from './actions';
import type { ProgramSettings } from '@/lib/db/settings';
import type { ApiResponse } from '@/lib/utils/errors';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      setError(null);
      try {
        const result = (await getSettingsAction()) as ApiResponse<ProgramSettings>;
        if (result.success && result.data) {
          setSettings(result.data);
        } else {
          setError(result.error?.message || 'Impossible de charger les paramètres');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Paramètres</h1>
        <p className="text-destructive">Impossible de charger les paramètres</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Paramètres du programme</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <ProgramSettingsForm initialSettings={settings} onSuccess={setSettings} />
    </div>
  );
}
