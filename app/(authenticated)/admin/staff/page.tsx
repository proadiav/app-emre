'use client';

import { useState, useEffect } from 'react';
import { listStaffAction, createStaffAction, deleteStaffAction } from './actions';
import { ApiResponse } from '@/lib/utils/errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'vendeur'>('vendeur');

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

  async function handleDeleteStaff(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre du personnel ?')) return;

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
        <h1 className="text-2xl font-semibold text-foreground">Gestion du personnel</h1>
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Gestion du personnel</h1>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-[#3d8a52]/20 bg-[#ecf7ee]">
          <AlertDescription className="text-[#3d8a52]">
            Personnel ajouté avec succès
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un membre du personnel</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddStaff} className="flex gap-4">
            <div className="flex-1">
              <Input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="Email"
                required
              />
            </div>
            <div>
              <select
                value={newRole}
                onChange={e => setNewRole(e.target.value as 'admin' | 'vendeur')}
                className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="vendeur">Vendeur</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit" disabled={adding}>
              {adding ? 'Ajout...' : 'Ajouter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Aucun personnel
                  </TableCell>
                </TableRow>
              ) : (
                staff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role === 'admin' ? 'Admin' : 'Vendeur'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(member.created_at).toLocaleDateString('fr-FR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteStaff(member.id)}
                        disabled={deleting === member.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deleting === member.id ? 'Suppression...' : 'Supprimer'}
                      </Button>
                    </TableCell>
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
