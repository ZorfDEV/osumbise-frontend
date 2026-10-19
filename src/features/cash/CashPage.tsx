import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { useToast } from '@/lib/toast';
import { fetchCashRegisters, createCashRegister, openCashSession } from './api';
import { CashRegister } from './types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';
import Alert from '@/components/ui/alert';
import DailyCashierSummary from './DailyCashierSummary';

const time = (iso: string) => new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

// Chaque caissier ouvre et clôture SA session : il voit qui occupe les autres
// caisses, mais ne peut ni les consulter ni les fermer. Le propriétaire et
// l'administrateur supervisent toutes les sessions.
export default function CashPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const isManager = user?.role === 'OWNER' || user?.role === 'ADMIN';
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

  const handleCreateRegister = async () => {
    if (!newName.trim()) return;
    await createCashRegister({ name: newName.trim(), establishmentId });
    setNewName('');
    setShowForm(false);
    load();
  };

  const handleOpen = async (registerId: string) => {
    const balance = openingBalanceByRegister[registerId] ?? 0;
    try {
      const session = await openCashSession(registerId, balance);
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
          Depuis le {time(mine.sessions[0].openedAt)}. Vos encaissements y sont enregistrés.{' '}
          <Link to={`/cash/${mine.sessions[0].id}`} className="font-semibold underline">
            Voir ma session
          </Link>
        </Alert>
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
                      ? `Ouverte par ${isMine ? 'vous' : openSession.openedBy?.name ?? '—'} depuis le ${time(openSession.openedAt)}`
                      : 'Fermée'}
                  </p>
                </div>
                {openSession ? (
                  isMine || isManager ? (
                    <Link to={`/cash/${openSession.id}`} className="btn btn-secondary px-3">
                      {isMine ? 'Ma session' : 'Voir la session'}
                    </Link>
                  ) : (
                    <span className="text-xs font-medium text-slate-500">Occupée</span>
                  )
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
