import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchCashRegisters, createCashRegister, openCashSession } from './api';
import { CashRegister } from './types';
import { ListSkeleton } from '@/components/ui/skeleton';
import { Wallet } from 'lucide-react';
import EmptyState from '@/components/ui/empty-state';

export default function CashPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  const handleCreateRegister = async () => {
    if (!newName.trim()) return;
    await createCashRegister({ name: newName.trim(), establishmentId });
    setNewName('');
    setShowForm(false);
    load();
  };

  const handleOpen = async (registerId: string) => {
    const balance = openingBalanceByRegister[registerId] ?? 0;
    const session = await openCashSession(registerId, balance);
    navigate(`/cash/${session.id}`);
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-heading">Caisse</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="btn btn-primary"
        >
          {showForm ? 'Annuler' : 'Nouvelle caisse'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-surface p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Caisse #01)"
            className="input flex-1"
          />
          <button
            onClick={handleCreateRegister}
            className="btn btn-primary"
          >
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
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-surface p-4"
              >
                <div>
                  <p className="font-medium text-slate-900">{r.name}</p>
                  <p className="text-xs text-slate-500">
                    {openSession ? 'Session ouverte' : 'Fermée'}
                  </p>
                </div>
                {openSession ? (
                  <Link
                    to={`/cash/${openSession.id}`}
                    className="btn btn-secondary px-3"
                  >
                    Voir la session
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Solde initial"
                      value={openingBalanceByRegister[r.id] ?? ''}
                      onChange={(e) =>
                        setOpeningBalanceByRegister((prev) => ({
                          ...prev,
                          [r.id]: Number(e.target.value),
                        }))
                      }
                      className="input input-sm w-28"
                    />
                    <button
                      onClick={() => handleOpen(r.id)}
                      className="btn btn-primary px-3"
                    >
                      Ouvrir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {registers.length === 0 && (
            <EmptyState icon={Wallet} title="Aucune caisse configurée" description="Créez une caisse pour ouvrir une session et suivre les encaissements en espèces." action={{ label: 'Créer une caisse', onClick: () => setShowForm(true) }} />
          )}
        </div>
      )}
    </div>
  );
}
