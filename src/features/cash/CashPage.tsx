import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';
import { api } from '@/lib/axios';
import { fetchCashRegisters, createCashRegister, openCashSession } from './api';
import { CashRegister } from './types';

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
        <h1 className="text-2xl font-semibold text-slate-900">Caisse</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {showForm ? 'Annuler' : 'Nouvelle caisse'}
        </button>
      </div>

      {showForm && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom (ex. Caisse #01)"
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleCreateRegister}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Créer
          </button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-slate-500">Chargement...</p>
      ) : (
        <div className="space-y-3">
          {registers.map((r) => {
            const openSession = r.sessions[0];
            return (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white p-4"
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
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
                      className="w-28 rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      onClick={() => handleOpen(r.id)}
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
                    >
                      Ouvrir
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {registers.length === 0 && (
            <p className="text-sm text-slate-400">Aucune caisse configurée</p>
          )}
        </div>
      )}
    </div>
  );
}
