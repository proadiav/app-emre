'use client';

import { useState } from 'react';
import { updateSettingsAction } from '@/app/(authenticated)/admin/settings/actions';
import type { ProgramSettings } from '@/lib/db/settings';
import type { ApiResponse } from '@/lib/utils/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ProgramSettingsFormProps {
  initialSettings: ProgramSettings;
  onSuccess?: (settings: ProgramSettings) => void;
}

export function ProgramSettingsForm({ initialSettings, onSuccess }: ProgramSettingsFormProps) {
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
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="min_sale_amount">
                Montant minimum de vente pour valider un parrainage (€)
              </Label>
              <Input
                type="number"
                id="min_sale_amount"
                name="min_sale_amount"
                value={settings.min_sale_amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="points_per_referral">Points par filleul validé</Label>
              <Input
                type="number"
                id="points_per_referral"
                name="points_per_referral"
                value={settings.points_per_referral}
                onChange={handleChange}
                step="1"
                min="0"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voucher_value_euros">Valeur d&apos;un bon d&apos;achat (€)</Label>
              <Input
                type="number"
                id="voucher_value_euros"
                name="voucher_value_euros"
                value={settings.voucher_value_euros}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="voucher_threshold">Points requis pour générer un bon</Label>
              <Input
                type="number"
                id="voucher_threshold"
                name="voucher_threshold"
                value={settings.voucher_threshold}
                onChange={handleChange}
                step="1"
                min="0"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-[#3d8a52]/20 bg-[#ecf7ee]">
              <AlertDescription className="text-[#3d8a52]">
                Paramètres mis à jour avec succès
              </AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
