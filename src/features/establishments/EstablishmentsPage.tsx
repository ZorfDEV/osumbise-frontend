import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import {
  fetchEstablishments,
  createEstablishment,
  updateEstablishment,
  uploadEstablishmentLogo,
  removeEstablishmentLogo,
} from './api';
import { Establishment, EstablishmentType } from './types';
import { useToast } from '@/lib/toast';
import { resolveUploadUrl } from '@/lib/uploads';
import { fetchSubscription } from '@/features/billing/api';
import PaySubscriptionButton from '@/features/billing/PaySubscriptionButton';
import { Subscription } from '@/features/billing/types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Building2, ImagePlus, Trash2, Pencil } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import { useActiveEstablishment } from './ActiveEstablishmentContext';
import { legalLines } from './legalInfo';

// Mentions légales facultatives, imprimées en tête des factures
type LegalForm = { phone: string; email: string; postalBox: string; nif: string; rc: string };
const EMPTY_LEGAL: LegalForm = { phone: '', email: '', postalBox: '', nif: '', rc: '' };
const LEGAL_FIELDS: { key: keyof LegalForm; label: string; placeholder: string }[] = [
  { key: 'phone', label: 'Téléphone', placeholder: 'Ex. +241 77 00 00 00' },
  { key: 'email', label: 'E-mail', placeholder: 'Ex. contact@monhotel.ga' },
  { key: 'postalBox', label: 'Boîte postale', placeholder: 'Ex. BP 1234 Libreville' },
  { key: 'nif', label: 'N° NIF', placeholder: 'Numéro d’identification fiscale' },
  { key: 'rc', label: 'N° RC', placeholder: 'Registre du commerce (RCCM)' },
];
// Champ vidé -> null : la mention disparaît des factures
const legalPayload = (l: LegalForm) => ({
  phone: l.phone.trim() || null,
  email: l.email.trim() || null,
  postalBox: l.postalBox.trim() || null,
  nif: l.nif.trim() || null,
  rc: l.rc.trim() || null,
});

const TYPE_LABELS: Record<EstablishmentType, string> = {
  BAR: 'Bar',
  RESTAURANT: 'Restaurant',
  HOTEL: 'Hôtel',
  GROSSISTE: 'Grossiste',
  EPICERIE: 'Épicerie',
};

// Mêmes règles que le backend (upload.middleware.ts) : on prévient tout de
// suite plutôt qu'après l'envoi
const MAX_LOGO_SIZE = 1024 * 1024;
const LOGO_TYPES = ['image/png', 'image/jpeg'];

const errorMessage = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;

// Choix du logo depuis le poste : aperçu, remplacement, retrait
function LogoPicker({
  id,
  currentUrl,
  file,
  onFileChange,
  removed,
  onRemove,
  name,
}: {
  id: string;
  currentUrl?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  removed?: boolean;
  onRemove?: () => void;
  name: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Aperçu local du fichier choisi (libéré quand il change)
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview ?? (removed ? undefined : currentUrl);

  const pick = (f: File | undefined) => {
    setError(null);
    if (!f) return;
    if (!LOGO_TYPES.includes(f.type)) {
      setError('Format non pris en charge : choisissez une image PNG ou JPG.');
      return;
    }
    if (f.size > MAX_LOGO_SIZE) {
      setError(`Image trop lourde (${(f.size / 1024 / 1024).toFixed(1)} Mo) : 1 Mo maximum.`);
      return;
    }
    onFileChange(f);
  };

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-slate-700">Logo (optionnel)</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {shown ? (
            <img src={shown} alt={`Logo de ${name || 'l’établissement'}`} className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={22} className="text-slate-400" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = ''; // permet de re-choisir le même fichier
            }}
          />
          <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-secondary btn-sm">
            <ImagePlus size={14} />
            {shown ? 'Changer l’image' : 'Choisir une image'}
          </button>
          {file && (
            <button type="button" onClick={() => onFileChange(null)} className="btn btn-secondary btn-sm">
              Annuler le choix
            </button>
          )}
          {!file && shown && onRemove && (
            <button type="button" onClick={onRemove} className="btn btn-danger btn-sm">
              <Trash2 size={14} />
              Retirer le logo
            </button>
          )}
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-xs text-slate-500">
          PNG ou JPG, 1 Mo maximum. Affiché dans l’en-tête de l’application et sur les tickets. Un logo simple, sur fond
          blanc, rend mieux à l’impression.
        </p>
      )}
    </div>
  );
}

export default function EstablishmentsPage() {
  const { refreshProfile } = useAuth();
  // Le sélecteur de la Topbar (propriétaire) doit refléter les changements
  const { reload: reloadSwitcher } = useActiveEstablishment();
  const toast = useToast();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<EstablishmentType>('BAR');
  const [address, setAddress] = useState('');
  const [legal, setLegal] = useState<LegalForm>(EMPTY_LEGAL);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<EstablishmentType>('BAR');
  const [editAddress, setEditAddress] = useState('');
  const [editLegal, setEditLegal] = useState<LegalForm>(EMPTY_LEGAL);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoRemoved, setEditLogoRemoved] = useState(false);

  const load = () => {
    setIsLoading(true);
    fetchEstablishments()
      .then(setEstablishments)
      .finally(() => setIsLoading(false));
  };

  const loadSubscription = () => {
    fetchSubscription()
      .then(setSubscription)
      .catch(() => setSubscription(null));
  };

  useEffect(() => {
    load();
    loadSubscription();
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const created = await createEstablishment({
        name: name.trim(),
        type,
        address: address.trim() || undefined,
        ...legalPayload(legal),
      });
      // Le logo s'envoie une fois l'établissement créé (il faut son id)
      if (logoFile) {
        try {
          await uploadEstablishmentLogo(created.id, logoFile);
        } catch (err) {
          toast.error(errorMessage(err, 'Établissement créé, mais le logo n’a pas pu être envoyé'));
        }
      }
      toast.success('Établissement créé');
      setName('');
      setAddress('');
      setLegal(EMPTY_LEGAL);
      setLogoFile(null);
      setType('BAR');
      setShowForm(false);
      load();
      reloadSwitcher();
    } catch (err) {
      toast.error(errorMessage(err, 'Impossible de créer l’établissement'));
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = (e: Establishment) => {
    setEditingId(e.id);
    setEditName(e.name);
    setEditType(e.type);
    setEditAddress(e.address ?? '');
    setEditLegal({ phone: e.phone ?? '', email: e.email ?? '', postalBox: e.postalBox ?? '', nif: e.nif ?? '', rc: e.rc ?? '' });
    setEditLogoFile(null);
    setEditLogoRemoved(false);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setIsSaving(true);
    try {
      await updateEstablishment(editingId, {
        name: editName.trim(),
        type: editType,
        address: editAddress.trim() || undefined,
        ...legalPayload(editLegal),
      });
      if (editLogoFile) await uploadEstablishmentLogo(editingId, editLogoFile);
      else if (editLogoRemoved) await removeEstablishmentLogo(editingId);
      toast.success('Établissement modifié');
      setEditingId(null);
      load();
      reloadSwitcher();
      // Le nom/logo affiché dans la Topbar vient de /auth/me — on le rafraîchit
      // pour que le changement soit visible immédiatement, sans recharger la page
      refreshProfile();
    } catch (err) {
      toast.error(errorMessage(err, 'Impossible d’enregistrer les modifications'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Établissements</h1>
        <button onClick={() => setShowForm((s) => !s)} className="btn btn-primary">
          {showForm ? 'Annuler' : 'Nouvel établissement'}
        </button>
      </div>

      {subscription && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-surface p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">
                Formule {subscription.plan.name}
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    subscription.status === 'TRIAL'
                      ? 'bg-warning-soft text-warning-dark'
                      : subscription.status === 'ACTIVE'
                        ? 'bg-success-soft text-success-dark'
                        : 'bg-danger-soft text-danger-dark'
                  }`}
                >
                  {subscription.status === 'TRIAL'
                    ? 'Essai'
                    : subscription.status === 'ACTIVE'
                      ? 'Actif'
                      : subscription.status === 'PAST_DUE'
                        ? 'Paiement en retard'
                        : 'Annulé'}
                </span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {subscription.status === 'TRIAL' ? "Fin de l'essai" : 'Prochain renouvellement'}{' '}
                le {new Date(subscription.currentPeriodEnd).toLocaleDateString('fr-FR')} —{' '}
                {establishments.length}/
                {subscription.plan.maxEstablishments >= 999 ? '∞' : subscription.plan.maxEstablishments}{' '}
                établissement{establishments.length > 1 ? 's' : ''} utilisé
                {establishments.length > 1 ? 's' : ''}
              </p>
            </div>
            {subscription.status !== 'ACTIVE' && (
              <PaySubscriptionButton
                amountLabel={`${Number(subscription.plan.price).toLocaleString('fr-FR')} FCFA`}
                onSuccess={loadSubscription}
              />
            )}
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-surface p-6 sm:grid-cols-3">
          <div>
            <label htmlFor="new-name" className="mb-1 block text-sm font-medium text-slate-700">
              Nom
            </label>
            <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label htmlFor="new-type" className="mb-1 block text-sm font-medium text-slate-700">
              Type
            </label>
            <select
              id="new-type"
              value={type}
              onChange={(e) => setType(e.target.value as EstablishmentType)}
              className="input w-full"
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="new-address" className="mb-1 block text-sm font-medium text-slate-700">
              Adresse (optionnel)
            </label>
            <input id="new-address" value={address} onChange={(e) => setAddress(e.target.value)} className="input w-full" />
          </div>
          {LEGAL_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`new-${f.key}`} className="mb-1 block text-sm font-medium text-slate-700">
                {f.label} <span className="font-normal text-slate-500">(optionnel)</span>
              </label>
              <input
                id={`new-${f.key}`}
                value={legal[f.key]}
                onChange={(ev) => setLegal((l) => ({ ...l, [f.key]: ev.target.value }))}
                placeholder={f.placeholder}
                className="input w-full"
              />
            </div>
          ))}
          <div className="sm:col-span-3">
            <LogoPicker id="new-logo" file={logoFile} onFileChange={setLogoFile} name={name} />
          </div>
          <div className="sm:col-span-3">
            <button onClick={handleCreate} disabled={isSaving || !name.trim()} aria-busy={isSaving} className="btn btn-primary">
              Créer
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-3">
          {establishments.map((e) => (
            <div key={e.id} className="rounded-lg border border-slate-200 bg-surface p-4">
              {editingId === e.id ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor={`edit-name-${e.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                      Nom
                    </label>
                    <input
                      id={`edit-name-${e.id}`}
                      value={editName}
                      onChange={(ev) => setEditName(ev.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label htmlFor={`edit-type-${e.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                      Type
                    </label>
                    <select
                      id={`edit-type-${e.id}`}
                      value={editType}
                      onChange={(ev) => setEditType(ev.target.value as EstablishmentType)}
                      className="input w-full"
                    >
                      {Object.entries(TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor={`edit-address-${e.id}`} className="mb-1 block text-sm font-medium text-slate-700">
                      Adresse
                    </label>
                    <input
                      id={`edit-address-${e.id}`}
                      value={editAddress}
                      onChange={(ev) => setEditAddress(ev.target.value)}
                      className="input w-full"
                    />
                  </div>
          {LEGAL_FIELDS.map((f) => (
            <div key={f.key}>
              <label htmlFor={`edit-${f.key}`} className="mb-1 block text-sm font-medium text-slate-700">
                {f.label} <span className="font-normal text-slate-500">(optionnel)</span>
              </label>
              <input
                id={`edit-${f.key}`}
                value={editLegal[f.key]}
                onChange={(ev) => setEditLegal((l) => ({ ...l, [f.key]: ev.target.value }))}
                placeholder={f.placeholder}
                className="input w-full"
              />
            </div>
          ))}
                  <div className="sm:col-span-3">
                    <LogoPicker
                      id={`edit-logo-${e.id}`}
                      currentUrl={resolveUploadUrl(e.logo)}
                      file={editLogoFile}
                      onFileChange={(f) => {
                        setEditLogoFile(f);
                        if (f) setEditLogoRemoved(false);
                      }}
                      removed={editLogoRemoved}
                      onRemove={() => setEditLogoRemoved(true)}
                      name={editName}
                    />
                    {editLogoRemoved && (
                      <p className="mt-1 text-xs text-warning-dark">Le logo sera retiré à l’enregistrement.</p>
                    )}
                  </div>
                  <div className="flex gap-2 sm:col-span-3">
                    <button onClick={saveEdit} disabled={isSaving} aria-busy={isSaving} className="btn btn-primary">
                      Enregistrer
                    </button>
                    <button onClick={() => setEditingId(null)} disabled={isSaving} className="btn btn-secondary">
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {e.logo ? (
                      <img
                        src={resolveUploadUrl(e.logo)}
                        alt={e.name}
                        className="h-9 w-9 rounded border border-slate-200 bg-white object-contain"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-100 text-sm font-semibold text-slate-500">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-slate-900">{e.name}</p>
                      <p className="text-xs text-slate-500">
                        {TYPE_LABELS[e.type]}
                        {e.address ? ` — ${e.address}` : ''}
                      </p>
                      {legalLines({ phone: e.phone, email: e.email, postalBox: e.postalBox, nif: e.nif, rc: e.rc }).map((line) => (
                        <p key={line} className="text-xs text-slate-500">
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => startEdit(e)} className="btn btn-edit btn-sm">
                    <Pencil size={14} />
                    Modifier
                  </button>
                </div>
              )}
            </div>
          ))}
          {establishments.length === 0 && (
            <EmptyState icon={Building2} title="Aucun établissement" description="Ajoutez votre premier établissement avec le formulaire ci-dessus." />
          )}
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        La suppression d’un établissement n’est pas proposée : trop de données en dépendent
        (produits, tables, commandes, utilisateurs...). Il n’y a pas non plus de désactivation
        pour l’instant — à construire si le besoin se présente.
      </p>
    </div>
  );
}
