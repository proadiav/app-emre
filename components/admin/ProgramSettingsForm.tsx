'use client';

import { useState } from 'react';
import { updateSettingsAction } from '@/app/(authenticated)/admin/settings/actions';
import type { ProgramSettings } from '@/lib/db/settings';
import type { ApiResponse } from '@/lib/utils/errors';

interface ProgramSettingsFormProps {
  initialSettings: ProgramSettings;
  onSuccess?: (settings: ProgramSettings) => void;
}

export function ProgramSettingsForm({
  initialSettings,
  onSuccess,
}: ProgramSettingsFormProps) {
  const [settings, setSettings] = useState<ProgramSettings>(initialSettings);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0,
    }));
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = (await updateSettingsAction(settings)) as ApiResponse<ProgramSettings>;

      if (result.success && result.data) {
        setSettings(result.data);
        setSuccess(true);
        onSuccess?.(result.data);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Min sale amount */}
        <div>
          <label htmlFor="min_sale_amount" className="block text-sm font-medium text-gray-900">
            Montant minimum de vente pour valider un parrainage (€)
          </label>
          <input
            type="number"
            id="min_sale_amount"
            name="min_sale_amount"
            value={settings.min_sale_amount}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            disabled={isLoading}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Points per referral */}
        <div>
          <label htmlFor="points_per_referral" className="block text-sm font-medium text-gray-900">
            Points par filleul validé
          </label>
          <input
            type="number"
            id="points_per_referral"
            name="points_per_referral"
            value={settings.points_per_referral}
            onChange={handleChange}
            step="1"
            min="0"
            required
            disabled={isLoading}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Voucher value */}
        <div>
          <label htmlFor="voucher_value_euros" className="block text-sm font-medium text-gray-900">
            Valeur d'un bon d'achat (€)
          </label>
          <input
            type="number"
            id="voucher_value_euros"
            name="voucher_value_euros"
            value={settings.voucher_value_euros}
            onChange={handleChange}
            step="0.01"
            min="0"
            required
            disabled={isLoading}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>

        {/* Points for voucher */}
        <div>
          <label htmlFor="voucher_threshold" className="block text-sm font-medium text-gray-900">
            Points requis pour générer un bon
          </label>
          <input
            type="number"
            id="voucher_threshold"
            name="voucher_threshold"
            value={settings.voucher_threshold}
            onChange={handleChange}
            step="1"
            min="0"
            required
            disabled={isLoading}
            className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none disabled:opacity-50"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-green-900">Paramètres mis à jour avec succès</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {isLoading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
      </button>
    </form>
  );
}
