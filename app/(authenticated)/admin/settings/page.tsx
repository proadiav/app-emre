'use client';

import { useState, useEffect } from 'react';
import { ProgramSettingsForm } from '@/components/admin/ProgramSettingsForm';
import { getSettingsAction } from './actions';
import type { ProgramSettings } from '@/lib/db/settings';
import type { ApiResponse } from '@/lib/utils/errors';

export default function SettingsPage() {
  const [settings, setSettings] = useState<ProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings on mount
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
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-red-600">Impossible de charger les paramètres</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Paramètres du programme</h1>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      <ProgramSettingsForm
        initialSettings={settings}
        onSuccess={setSettings}
      />
    </div>
  );
}
