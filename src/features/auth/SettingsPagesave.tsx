import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { updateProfile, changePassword } from './api';
import { useToast } from '@/lib/toast';
import { ROLE_LABELS } from '@/config/roles';

const profileSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Au moins 8 caractères'),
    confirmPassword: z.string().min(1, 'Confirme le nouveau mot de passe'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  });
type PasswordFormValues = z.infer<typeof passwordSchema>;

const extractError = (err: unknown): string =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Erreur';

export default function SettingsPage() {
  const { user, refreshProfile } = useAuth();
  const toast = useToast();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setProfileError(null);
    setProfileSuccess(false);
    try {
      await updateProfile(data);
      await refreshProfile();
      setProfileSuccess(true);
      toast.success('Profil mis à jour');
    } catch (err) {
      const message = extractError(err);
      setProfileError(message);
      toast.error(message);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    try {
      await changePassword(data);
      setPasswordSuccess(true);
      toast.success('Mot de passe mis à jour');
      passwordForm.reset();
    } catch (err) {
      const message = extractError(err);
      setPasswordError(message);
      toast.error(message);
    }
  };

  return (
    <div className="max-w-xl space-y-8">
      <h1 className="text-2xl font-semibold text-slate-900">Paramètres</h1>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Mon profil</h2>
        <p className="mb-4 text-xs text-slate-500">{user && ROLE_LABELS[user.role]}</p>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Nom</label>
            <input
              {...profileForm.register('name')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.name.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              {...profileForm.register('email')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-xs text-red-600">
                {profileForm.formState.errors.email.message}
              </p>
            )}
          </div>
          {profileError && <p className="text-sm text-red-600">{profileError}</p>}
          {profileSuccess && <p className="text-sm text-green-600">Profil mis à jour.</p>}
          <button
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {profileForm.formState.isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Changer de mot de passe</h2>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Mot de passe actuel
            </label>
            <input
              type="password"
              {...passwordForm.register('currentPassword')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {passwordForm.formState.errors.currentPassword && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nouveau mot de passe
            </label>
            <input
              type="password"
              {...passwordForm.register('newPassword')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {passwordForm.formState.errors.newPassword && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Confirmer le nouveau mot de passe
            </label>
            <input
              type="password"
              {...passwordForm.register('confirmPassword')}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {passwordForm.formState.errors.confirmPassword && (
              <p className="mt-1 text-xs text-red-600">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordSuccess && <p className="text-sm text-green-600">Mot de passe mis à jour.</p>}
          <button
            type="submit"
            disabled={passwordForm.formState.isSubmitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {passwordForm.formState.isSubmitting ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  );
}
