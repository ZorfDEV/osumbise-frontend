import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { useToast } from '@/lib/toast';
import { fetchCashRegisters, createCashRegister, lockCashRegister, openCashSession } from './api';
import { CashRegister } from './types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Lock, LockOpen, Wallet } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import Alert from '@/components/ui/alert';
import DailyCashierSummary from './DailyCashierSummary';

const hour = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

// « 16:00 » saisi → date d'aujourd'hui à 16:00, ou de demain si l'heure est
// déjà passée (service de nuit : 22:00 → 06:00)
const plannedCloseFrom = (hhmm: string): string => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  return d.toISOString();
};

const time = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Chaque caissier ouvre et clôture SA session : il voit qui occupe les autres
// caisses, mais ne peut ni les consulter ni les fermer. Le propriétaire et
// l'administrateur supervisent toutes les sessions.
export default function CashPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isManager = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const isOwner = user?.role === 'OWNER';
  const [closeTimeByRegister, setCloseTimeByRegister] = useState<Record<string, string>>({});
  const [locking, setLocking] = useState<CashRegister | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [establishmentId, setEstablishmentId] = useState<string | undefined>(
    user?.establishmentId ?? undefined
  );
  const [openingBalanceByRegister, setOpeningBalanceByRegister] = useState<
    Record<string, number>
  >({});

  const load = () => {
    setIsLoading(true);
    fetchCashRegisters()
      .then(setRegisters)
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    if (!user?.establishmentId) {
      api.get('/establishments').then((res) => {
        const list = res.data.establishments;
        if (list.length > 0) setEstablishmentId(list[0].id);
      });
    }
  }, [user]);

  // Ma session ouverte, s'il y en a une
  const mine = registers.find((r) => r.sessions[0]?.openedById === user?.id);

  const toggleLock = async (r: CashRegister, locked: boolean, reason?: string) => {
    try {
      await lockCashRegister(r.id, locked, reason);
      toast.success(locked ? `${r.name} verrouillée` : `${r.name} déverrouillée`);
      setLocking(null);
      setLockReason('');
      load();
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Action impossible');
    }
  };

  const handleCreateRegister = async () => {
    if (!newName.trim()) return;
    await createCashRegister({ name: newName.trim(), establishmentId });
    setNewName('');
    setShowForm(false);
    load();
  };

  const handleOpen = async (registerId: string) => {
    const balance = openingBalanceByRegister[registerId] ?? 0;
    const closeTime = closeTimeByRegister[registerId];
    if (!closeTime && !isManager) return toast.error('Indiquez l’heure de fin de votre service');
    try {
      const session = await openCashSession(registerId, balance, closeTime ? plannedCloseFrom(closeTime) : undefined);
      navigate(`/cash/${session.id}`);
    } catch (err) {
      toast.error((err as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Ouverture impossible');
      load();
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Caisse</h1>
        {isManager && (
          <button onClick={() => setShowForm((s) => !s)} className="btn btn-primary">
            {showForm ? 'Annuler' : 'Nouvelle caisse'}
          </button>
        )}
      </div>

      {mine && (
        <Alert type="success" title={`Votre session est ouverte sur « ${mine.name} »`} className="mb-4">
          Depuis le {time(mine.sessions[0].openedAt)}
          {mine.sessions[0].plannedCloseAt ? `, fin prévue à ${hour(mine.sessions[0].plannedCloseAt)}` : ''}. Vos encaissements y sont enregistrés.{' '}
          <Link to={`/cash/${mine.sessions[0].id}`} className="font-semibold underline">
            Voir ma session
          </Link>
        </Alert>
      )}

      {mine?.sessions[0].plannedCloseAt && new Date(mine.sessions[0].plannedCloseAt).getTime() < Date.now() && (
        <Alert type="warning" title="Fin de service dépassée" className="mb-4">
          Votre fin de service était prévue à {hour(mine.sessions[0].plannedCloseAt)} : pensez à clôturer votre session.
        </Alert>
      )}

      {!isManager && (
        <p className="mb-4 text-xs text-slate-500">Au plus 2 sessions par jour. Indiquez l’heure de fin de votre service à l’ouverture.</p>
      )}

      {locking && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label="Verrouiller la caisse">
          <div className="w-full max-w-md rounded-t-xl bg-surface p-6 sm:rounded-xl">
            <h2 className="mb-2 text-lg font-semibold text-heading">Verrouiller « {locking.name} »</h2>
            <p className="mb-4 text-sm text-slate-600">Plus personne ne pourra ouvrir de session sur cette caisse tant que vous ne l’aurez pas déverrouillée.</p>
            <label htmlFor="lock-reason" className="mb-1 block text-sm font-medium text-slate-700">
              Motif <span className="font-normal text-slate-500">(optionnel)</span>
            </label>
            <input id="lock-reason" value={lockReason} onChange={(e) => setLockReason(e.target.value)} maxLength={200} className="input w-full" placeholder="Ex. tiroir à vérifier, caisse en panne" />
            <div className="mt-5 flex gap-2">
              <button onClick={() => setLocking(null)} className="btn btn-secondary flex-1">
                Annuler
              </button>
              <button onClick={() => toggleLock(locking, true, lockReason.trim() || undefined)} className="btn btn-danger flex-1">
                <Lock size={16} />
                Verrouiller
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-surface p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Caisse #01)"
            className="input flex-1"
          />
          <button onClick={handleCreateRegister} className="btn btn-primary">
            Créer
          </button>
        </div>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <div className="space-y-3">
          {registers.map((r) => {
            const openSession = r.sessions[0];
            const isMine = openSession?.openedById === user?.id;
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {openSession
                      ? `Ouverte par ${isMine ? 'vous' : openSession.openedBy?.name ?? '—'} depuis le ${time(openSession.openedAt)}${openSession.plannedCloseAt ? ` · fin prévue ${hour(openSession.plannedCloseAt)}` : ''}`
                      : r.isLocked
                        ? `Verrouillée par le propriétaire${r.lockedReason ? ` — ${r.lockedReason}` : ''}`
                        : 'Fermée'}
                  </p>
                  {isOwner && !openSession && (
                    <button
                      onClick={() => (r.isLocked ? toggleLock(r, false) : setLocking(r))}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
                    >
                      {r.isLocked ? <LockOpen size={12} /> : <Lock size={12} />}
                      {r.isLocked ? 'Déverrouiller' : 'Verrouiller'}
                    </button>
                  )}
                </div>
                {openSession ? (
                  isMine || isManager ? (
                    <Link to={`/cash/${openSession.id}`} className="btn btn-secondary px-3">
                      {isMine ? 'Ma session' : 'Voir la session'}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">Occupée</span>
                  )
                ) : r.isLocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                    <Lock size={12} />
                    Verrouillée
                  </span>
                ) : mine ? (
                  <span className="text-xs text-slate-500">Clôturez d’abord votre session</span>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Fond de caisse"
                      aria-label={`Fond de caisse de ${r.name}`}
                      value={openingBalanceByRegister[r.id] ?? ''}
                      onChange={(e) =>
                        setOpeningBalanceByRegister((prev) => ({
                          ...prev,
                          [r.id]: Number(e.target.value),
                        }))
                      }
                      className="input input-sm w-32"
                    />
                    <label className="flex items-center gap-1 text-xs text-slate-500">
                      Fin
                      <input
                        type="time"
                        aria-label={`Heure de fin de service sur ${r.name}`}
                        value={closeTimeByRegister[r.id] ?? ''}
                        onChange={(e) => setCloseTimeByRegister((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        className="input input-sm w-28"
                      />
                    </label>
                    <button onClick={() => handleOpen(r.id)} className="btn btn-primary px-3">
                      Ouvrir ma session
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {isManager && registers.length > 0 && <DailyCashierSummary />}
          {registers.length === 0 && (
            <EmptyState
              icon={Wallet}
              title="Aucune caisse configurée"
              description={
                isManager
                  ? 'Créez une caisse pour ouvrir une session et suivre les encaissements en espèces.'
                  : 'Le responsable doit d’abord créer une caisse.'
              }
              action={isManager ? { label: 'Créer une caisse', onClick: () => setShowForm(true) } : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
}
