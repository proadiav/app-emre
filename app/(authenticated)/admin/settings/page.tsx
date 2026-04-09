'use client';

import { useState, useEffect } from 'react';
import { getSettingsAction, updateSettingsAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';

interface SettingsData {
  min_sale_amount: number;
  points_per_referral: number;
  voucher_value_euros: number;
  points_for_voucher: number;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true);
      setError(null);
      try {
        const result = (await getSettingsAction()) as ApiResponse<SettingsData>;
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

  // Handle form submission
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const result = (await updateSettingsAction(settings)) as ApiResponse<SettingsData>;
      if (result.success && result.data) {
        setSettings(result.data);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setSaving(false);
    }
  }

  // Handle input change
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setSettings(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: parseFloat(value) || 0,
      };
    });
  }

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

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-green-900">Paramètres mis à jour avec succès</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 rounded-lg bg-white p-6 shadow">
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
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
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
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
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
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Points for voucher */}
          <div>
            <label htmlFor="points_for_voucher" className="block text-sm font-medium text-gray-900">
              Points requis pour générer un bon
            </label>
            <input
              type="number"
              id="points_for_voucher"
              name="points_for_voucher"
              value={settings.points_for_voucher}
              onChange={handleChange}
              step="1"
              min="0"
              required
              className="mt-2 block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-block rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
        </button>
      </form>
    </div>
  );
}
