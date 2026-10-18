import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BedDouble, CalendarPlus, Crown, DoorOpen, Settings2, Sparkles, UserPlus, Users, Wrench, X } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { useToast } from '@/lib/toast';
import { getSocket } from '@/lib/socket';
import { CardGridSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import { apiError, checkInStay, fetchRooms, fetchTaxRates, setRoomStatus } from './api';
import { CATEGORY_LABELS, dayOf, fcfa, formatDay, ROOM_STATUS, roomName, todayIso } from './labels';
import StayFormModal from './StayFormModal';
import GroupFormModal from './GroupFormModal';
import RoomsSettings from './RoomsSettings';
import type { Room, RoomStatus, TaxRate } from './types';

type FormState = { walkIn?: boolean; roomId?: string } | null;
// Filtre du plan, choisi en cliquant sur un badge de la synthèse du jour
type RoomFilter = RoomStatus | 'ARRIVALS' | 'DEPARTURES' | null;

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
  const [groupForm, setGroupForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<RoomFilter>(null);

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
  const isDeparture = (r: Room) => {
    const c = current(r);
    return !!c && dayOf(c.checkOutDate) <= today;
  };
  const matches = (r: Room) =>
    filter === null ||
    (filter === 'ARRIVALS' ? !!arrivalToday(r) : filter === 'DEPARTURES' ? isDeparture(r) : r.status === filter);
  const visible = active.filter(matches);

  const counts = useMemo(() => {
    const by = (s: RoomStatus) => active.filter((r) => r.status === s).length;
    return {
      AVAILABLE: by('AVAILABLE'),
      OCCUPIED: by('OCCUPIED'),
      CLEANING: by('CLEANING'),
      OUT_OF_SERVICE: by('OUT_OF_SERVICE'),
      arrivals: active.filter((r) => arrivalToday(r)).length,
      departures: active.filter(isDeparture).length,
    };
  }, [rooms, today]);

  // Chambres (filtrées) regroupées par bâtiment puis par étage
  const floors = useMemo(() => {
    const map = new Map<string, Room[]>();
    visible.forEach((r) => {
      const floor = r.floor ? `Étage ${r.floor}` : 'Sans étage';
      const key = r.building ? `${r.building} · ${floor}` : floor;
      map.set(key, [...(map.get(key) ?? []), r]);
    });
    return [...map.entries()];
  }, [rooms, filter, today]);

  // Badge de la synthèse : un clic filtre le plan, un second clic l'annule
  const chipProps = (f: Exclude<RoomFilter, null>) => ({
    type: 'button' as const,
    onClick: () => setFilter((cur) => (cur === f ? null : f)),
    'aria-pressed': filter === f,
  });
  const chipClass = (f: Exclude<RoomFilter, null>, colors: string) =>
    `inline-flex items-center gap-2 rounded-full px-3 py-1 font-medium transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action/50 ${colors} ${
      filter === f ? 'ring-2 ring-current ring-offset-1 ring-offset-surface' : filter !== null ? 'opacity-50 hover:opacity-100' : ''
    }`;

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
          <button onClick={() => setGroupForm(true)} disabled={active.length === 0} className="btn btn-secondary">
            <Users size={16} />
            Réservation de groupe
          </button>
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
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Filtrer les chambres">
          {(['AVAILABLE', 'OCCUPIED', 'CLEANING', 'OUT_OF_SERVICE'] as RoomStatus[]).map((s) => (
            <button key={s} {...chipProps(s)} className={chipClass(s, ROOM_STATUS[s].badge)}>
              <span className={`h-2 w-2 rounded-full ${ROOM_STATUS[s].dot}`} />
              {ROOM_STATUS[s].label} : {counts[s]}
            </button>
          ))}
          <button {...chipProps('ARRIVALS')} className={chipClass('ARRIVALS', 'bg-info-soft text-info-dark')}>
            Arrivées du jour : {counts.arrivals}
          </button>
          <button {...chipProps('DEPARTURES')} className={chipClass('DEPARTURES', 'bg-slate-100 text-slate-700')}>
            Départs du jour : {counts.departures}
          </button>
          {filter !== null && (
            <button onClick={() => setFilter(null)} className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">
              <X size={14} />
              Tout afficher
            </button>
          )}
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
      ) : visible.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="Aucune chambre dans cette catégorie"
          description="Aucune chambre ne correspond à ce filtre pour le moment."
          action={{ label: 'Tout afficher', onClick: () => setFilter(null) }}
        />
      ) : (
        <div className="space-y-6">
          {floors.map(([floor, list]) => (
            <section key={floor}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                {floor}
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
                      className={`group flex min-h-[9.5rem] flex-col rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${st.card}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface/80 shadow-sm transition-transform group-hover:scale-105 ${st.icon}`}>
                          <BedDouble size={22} strokeWidth={1.75} />
                        </span>
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.7rem] font-semibold ${st.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </div>
                      <span className="mt-2 text-2xl font-bold leading-none text-heading">{r.number}</span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                        {r.category !== 'STANDARD' && <Crown size={12} className="text-warning-dark" aria-hidden />}
                        {CATEGORY_LABELS[r.category]}
                        <span aria-hidden className="text-slate-400">·</span>
                        <Users size={12} aria-hidden />
                        <span>
                          {r.capacity}
                          <span className="sr-only"> personnes</span>
                        </span>
                      </span>
                      <div className="mt-auto border-t border-slate-200/70 pt-2 text-xs">
                        {c ? (
                          <>
                            <span className="block truncate font-medium text-heading">{c.guestName}</span>
                            {c.group && c.group.name !== c.guestName && <span className="block truncate text-slate-500">{c.group.name}</span>}
                            <span className="text-slate-600">Départ {formatDay(c.checkOutDate, { day: '2-digit', month: '2-digit' })}</span>
                          </>
                        ) : arrival ? (
                          <span className="block truncate font-medium text-info-dark">Arrivée : {arrival.guestName}</span>
                        ) : (
                          <span className="text-slate-500">{fcfa(r.nightlyRate)}/nuitée</span>
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
            aria-label={`Chambre ${roomName(selected)}`}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-xl bg-surface p-5 sm:rounded-xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-xl font-bold text-heading">Chambre {roomName(selected)}</p>
                <p className="text-sm text-slate-500">
                  {CATEGORY_LABELS[selected.category]} · {selected.capacity} pers. · {fcfa(selected.nightlyRate)}/nuitée
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

      {groupForm && (
        <GroupFormModal
          rooms={rooms}
          taxRates={taxRates}
          onClose={() => setGroupForm(false)}
          onSaved={(group) => {
            setGroupForm(false);
            load();
            navigate(`/hotel/groups/${group.id}`);
          }}
        />
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
