'use client';

import { useState, useEffect } from 'react';
import { listStaffAction, createStaffAction, deleteStaffAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';

interface StaffData {
  id: string;
  email: string;
  role: 'admin' | 'vendeur';
  created_at: string;
  updated_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffData[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'vendeur'>('vendeur');

  // Fetch staff list on mount
  useEffect(() => {
    async function fetchStaff() {
      setLoading(true);
      setError(null);
      try {
        const result = (await listStaffAction()) as ApiResponse<StaffData[]>;
        if (result.success && result.data) {
          setStaff(result.data);
        } else {
          setError(result.error?.message || 'Impossible de charger la liste du personnel');
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    }
    fetchStaff();
  }, []);

  // Handle add staff
  async function handleAddStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newEmail.trim()) return;

    setAdding(true);
    setError(null);
    setSuccess(false);

    try {
      const result = (await createStaffAction({
        email: newEmail.toLowerCase().trim(),
        role: newRole,
      })) as ApiResponse<StaffData>;

      if (result.success && result.data) {
        setStaff(prev => [result.data!, ...prev]);
        setNewEmail('');
        setNewRole('vendeur');
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error?.message || 'Erreur lors de la création du personnel');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setAdding(false);
    }
  }

  // Handle delete staff
  async function handleDeleteStaff(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) {
      return;
    }

    setDeleting(id);
    setError(null);

    try {
      const result = (await deleteStaffAction(id)) as ApiResponse<{ success: boolean }>;

      if (result.success) {
        setStaff(prev => prev.filter(s => s.id !== id));
      } else {
        setError(result.error?.message || 'Erreur lors de la suppression');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(errorMsg);
    } finally {
      setDeleting(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Gestion du personnel</h1>
        <p className="text-gray-600">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Gestion du personnel</h1>

      {error && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-900">{error}</p>
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 p-4">
          <p className="text-green-900">Personnel ajouté avec succès</p>
        </div>
      )}

      {/* Add staff form */}
      <form onSubmit={handleAddStaff} className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Ajouter un membre du personnel</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="Email"
              required
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value as 'admin' | 'vendeur')}
              className="block w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              <option value="vendeur">Vendeur</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={adding}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {adding ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </form>

      {/* Staff table */}
      <div className="rounded-lg bg-white shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Rôle</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date création</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-600">
                    Aucun personnel
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{member.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        member.role === 'admin'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-blue-100 text-blue-900'
                      }`}>
                        {member.role === 'admin' ? 'Admin' : 'Vendeur'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteStaff(member.id)}
                        disabled={deleting === member.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {deleting === member.id ? 'Suppression...' : 'Supprimer'}
                      </button>
                    </td>
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
