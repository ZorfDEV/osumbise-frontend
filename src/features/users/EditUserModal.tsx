import { useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/features/auth/AuthContext';
import { ROLE_LABELS } from '@/config/roles';
import { useActiveEstablishment } from '@/features/establishments/ActiveEstablishmentContext';
import { updateUser } from './api';
import type { AppUser, AssignableRole } from './types';

const ASSIGNABLE_ROLES: AssignableRole[] = ['ADMIN', 'CASHIER', 'SERVER', 'STOCK_KEEPER', 'COOK'];

// Modifier un employé : nom, e-mail de connexion, rôle et, pour le
// propriétaire, l'établissement où il travaille
export default function EditUserModal({ user, onClose, onSaved }: { user: AppUser; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const { establishments } = useActiveEstablishment();
  const isOwner = currentUser?.role === 'OWNER';
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState<AssignableRole>(user.role as AssignableRole);
  const [establishmentId, setEstablishmentId] = useState(user.establishmentId ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (name.trim().length < 2) return setError('Le nom doit contenir au moins 2 caractères.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Adresse e-mail invalide.');
    setSaving(true);
    try {
      await updateUser(user.id, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        ...(isOwner && establishmentId ? { establishmentId } : {}),
      });
      toast.success(`${name.trim()} modifié`);
      onSaved();
    } catch (err) {
      setError((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Modification impossible');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Modifier l’utilisateur">
      <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-heading">Modifier l’utilisateur</h2>
          <button onClick={onClose} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label htmlFor="edit-user-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input id="edit-user-name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label htmlFor="edit-user-email" className="mb-1 block text-sm font-medium text-slate-700">
              E-mail de connexion
            </label>
            <input id="edit-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" />
            {email.trim().toLowerCase() !== user.email.toLowerCase() && (
              <p className="mt-1 text-xs text-warning-dark">L’employé devra se connecter avec cette nouvelle adresse.</p>
            )}
          </div>
          <div>
            <label htmlFor="edit-user-role" className="mb-1 block text-sm font-medium text-slate-700">
              Rôle
            </label>
            <select id="edit-user-role" value={role} onChange={(e) => setRole(e.target.value as AssignableRole)} className="input w-full">
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {isOwner && establishments.length > 1 && (
            <div>
              <label htmlFor="edit-user-establishment" className="mb-1 block text-sm font-medium text-slate-700">
                Établissement
              </label>
              <select id="edit-user-establishment" value={establishmentId} onChange={(e) => setEstablishmentId(e.target.value)} className="input w-full">
                {establishments.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="btn btn-secondary flex-1">
            Annuler
          </button>
          <button onClick={submit} disabled={saving} aria-busy={saving} className="btn btn-primary flex-1">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}
