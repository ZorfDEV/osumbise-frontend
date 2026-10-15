import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, CalendarPlus, DoorOpen, Settings2, Sparkles, UserPlus, Wrench, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/lib/toast';
import { getSocket } from '@/lib/socket';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { apiError, checkInStay, fetchRooms, fetchTaxRates, setRoomStatus } from './api';
import { CATEGORY_LABELS, dayOf, fcfa, formatDay, ROOM_STATUS, todayIso } from './labels';
import StayFormModal from './StayFormModal';
import RoomsSettings from './RoomsSettings';
import type { Room, RoomStatus, TaxRate } from './types';

type FormState = { walkIn?: boolean; roomId?: string } | null;

export default function RoomsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const canManage = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [rooms, setRooms] = useState<Room[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState<Room | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([fetchRooms(), fetchTaxRates()])
      .then(([r, t]) => {
        setRooms(r);
        setTaxRates(t);
        setSelected((s) => (s ? r.find((x) => x.id === s.id) ?? null : null));
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Plan partagé par toute la réception : mis à jour en direct
  useEffect(() => {
    load();
    const socket = getSocket();
    socket.on('hotel:updated', load);
    return () => {
      socket.off('hotel:updated', load);
    };
  }, [load]);

  const today = todayIso();
  const current = (r: Room) => r.stays.find((s) => s.status === 'CHECKED_IN');
  const arrivalToday = (r: Room) => r.stays.find((s) => s.status === 'RESERVED' && dayOf(s.checkInDate) <= today);
  const nextReservation = (r: Room) => r.stays.find((s) => s.status === 'RESERVED');

  const active = rooms.filter((r) => r.isActive);
  const counts = useMemo(() => {
    const by = (s: RoomStatus) => active.filter((r) => r.status === s).length;
    return {
      AVAILABLE: by('AVAILABLE'),
      OCCUPIED: by('OCCUPIED'),
      CLEANING: by('CLEANING'),
      OUT_OF_SERVICE: by('OUT_OF_SERVICE'),
      arrivals: active.filter((r) => arrivalToday(r)).length,
      departures: active.filter((r) => {
        const c = current(r);
        return c && dayOf(c.checkOutDate) <= today;
      }).length,
    };
  }, [rooms, today]);

  // Chambres regroupées par étage
  const floors = useMemo(() => {
    const map = new Map<string, Room[]>();
    active.forEach((r) => {
      const key = r.floor || 'Sans étage';
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [rooms]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(success);
      load();
    } catch (err) {
      toast.error(apiError(err, 'Action impossible'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-heading">Chambres</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/hotel/stays" className="btn btn-secondary">
            Séjours et planning
          </Link>
          {canManage && (
            <button onClick={() => setShowSettings((s) => !s)} className="btn btn-secondary">
              <Settings2 size={16} />
              {showSettings ? 'Fermer la configuration' : 'Chambres et tarifs'}
            </button>
          )}
          <button onClick={() => setForm({ walkIn: true })} disabled={active.length === 0} className="btn btn-secondary">
            <UserPlus size={16} />
            Arrivée sans réservation
          </button>
          <button onClick={() => setForm({})} disabled={active.length === 0} className="btn btn-primary">
            <CalendarPlus size={16} />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {showSettings && canManage && (
        <RoomsSettings rooms={rooms} taxRates={taxRates} onChanged={load} />
      )}

      {/* Synthèse du jour */}
      {!isLoading && active.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-2 text-sm">
          {(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'] as RoomStatus[]).map((s) => (
            <span key={s} className={`inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium ${ROOM_STATUS[s].badge}`}>
              <span className={`h-2 w-2 rounded-full ${ROOM_STATUS[s].dot}`} />
              {ROOM_STATUS[s].label} : {counts[s]}
            </span>
          ))}
          <span className="inline-flex items-center rounded-full bg-info-soft px-3 py-1 font-medium text-info-dark">
            Arrivées du jour : {counts.arrivals}
          </span>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
            Départs du jour : {counts.departures}
          </span>
        </div>
      )}

      {isLoading ? (
        <CardGridSkeleton />
      ) : active.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="Aucune chambre"
          description={
            canManage
              ? 'Ajoutez vos chambres (numéro, type, tarif) pour commencer à enregistrer des séjours.'
              : 'Le gérant doit d’abord ajouter les chambres de l’hôtel.'
          }
          action={canManage ? { label: 'Ajouter des chambres', onClick: () => setShowSettings(true) } : undefined}
        />
      ) : (
        <div className="space-y-6">
          {floors.map(([floor, list]) => (
            <section key={floor}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {floor === 'Sans étage' ? floor : `Étage ${floor}`}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                {list.map((r) => {
                  const st = ROOM_STATUS[r.status];
                  const c = current(r);
                  const arrival = arrivalToday(r);
                  return (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      className={`flex min-h-[7.5rem] flex-col rounded-xl border-2 p-3 text-left transition-transform hover:-translate-y-0.5 hover:shadow-md ${st.card}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl font-bold text-heading">{r.number}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${st.badge}`}>{st.label}</span>
                      </div>
                      <span className="text-xs text-slate-600">{CATEGORY_LABELS[r.category]}</span>
                      <div className="mt-auto pt-2 text-xs">
                        {c ? (
                          <>
                            <span className="block truncate font-medium text-heading">{c.guestName}</span>
                            <span className="text-slate-600">Départ {formatDay(c.checkOutDate, { day: '2-digit', month: '2-digit' })}</span>
                          </>
                        ) : arrival ? (
                          <span className="block truncate font-medium text-info-dark">Arrivée : {arrival.guestName}</span>
                        ) : (
                          <span className="text-slate-500">{fcfa(r.nightlyRate)}/nuit</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Actions sur une chambre */}
      {selected && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center sm:p-4" onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-label={`Chambre ${selected.number}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-xl bg-surface p-5 sm:rounded-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-heading">Chambre {selected.number}</p>
                <p className="text-sm text-slate-500">
                  {CATEGORY_LABELS[selected.category]} · {selected.capacity} pers. · {fcfa(selected.nightlyRate)}/nuit
                </p>
              </div>
              <button onClick={() => setSelected(null)} aria-label="Fermer" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>

            <span className={`mb-4 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROOM_STATUS[selected.status].badge}`}>
              {ROOM_STATUS[selected.status].label}
            </span>

            <div className="space-y-2">
              {(() => {
                const c = current(selected);
                const next = nextReservation(selected);
                const arrival = arrivalToday(selected);
                return (
                  <>
                    {c && (
                      <button onClick={() => navigate(`/hotel/stays/${c.id}`)} className="btn btn-primary w-full justify-start">
                        <DoorOpen size={16} />
                        Séjour de {c.guestName} — note, encaissement, départ
                      </button>
                    )}
                    {!c && arrival && (
                      <button
                        onClick={() => run(() => checkInStay(arrival.id), `Arrivée de ${arrival.guestName} enregistrée`)}
                        disabled={busy || selected.status === 'OUT_OF_SERVICE'}
                        aria-busy={busy}
                        className="btn btn-primary w-full justify-start"
                      >
                        <DoorOpen size={16} />
                        Enregistrer l’arrivée de {arrival.guestName}
                      </button>
                    )}
                    {!c && selected.status !== 'OUT_OF_SERVICE' && (
                      <button onClick={() => setForm({ walkIn: true, roomId: selected.id })} className="btn btn-secondary w-full justify-start">
                        <UserPlus size={16} />
                        Arrivée sans réservation
                      </button>
                    )}
                    <button onClick={() => setForm({ roomId: selected.id })} className="btn btn-secondary w-full justify-start">
                      <CalendarPlus size={16} />
                      Réserver cette chambre
                    </button>
                    {next && next.id !== arrival?.id && (
                      <button onClick={() => navigate(`/hotel/stays/${next.id}`)} className="btn btn-secondary w-full justify-start">
                        Prochaine réservation : {next.guestName} ({formatDay(next.checkInDate, { day: '2-digit', month: '2-digit' })})
                      </button>
                    )}
                    {selected.status === 'CLEANING' && (
                      <button
                        onClick={() => run(() => setRoomStatus(selected.id, 'AVAILABLE'), `Chambre ${selected.number} prête`)}
                        disabled={busy}
                        className="btn btn-secondary w-full justify-start"
                      >
                        <Sparkles size={16} />
                        Ménage terminé : chambre prête
                      </button>
                    )}
                    {!c && selected.status !== 'OUT_OF_SERVICE' && (
                      <button
                        onClick={() => run(() => setRoomStatus(selected.id, 'OUT_OF_SERVICE'), `Chambre ${selected.number} hors service`)}
                        disabled={busy}
                        className="btn btn-secondary w-full justify-start"
                      >
                        <Wrench size={16} />
                        Mettre hors service
                      </button>
                    )}
                    {selected.status === 'OUT_OF_SERVICE' && (
                      <button
                        onClick={() => run(() => setRoomStatus(selected.id, 'AVAILABLE'), `Chambre ${selected.number} remise en service`)}
                        disabled={busy}
                        className="btn btn-secondary w-full justify-start"
                      >
                        <Wrench size={16} />
                        Remettre en service
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {form && (
        <StayFormModal
          rooms={rooms}
          taxRates={taxRates}
          walkIn={form.walkIn}
          initialRoomId={form.roomId}
          onClose={() => setForm(null)}
          onSaved={(stay) => {
            setForm(null);
            setSelected(null);
            load();
            navigate(`/hotel/stays/${stay.id}`);
          }}
        />
      )}
    </div>
  );
}
