import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, List } from 'lucide-react';
import { getSocket } from '@/lib/socket';
import { ListSkeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/ui/empty-state';
import Breadcrumbs from '@/components/ui/breadcrumbs';
import ListToolbar, { normalizeText } from '@/components/ui/list-toolbar';
import { Pagination, usePagination } from '@/components/ui/pagination';
import { fetchRooms, fetchStays, fetchTaxRates } from './api';
import { addDaysIso, CATEGORY_LABELS, dayOf, formatDay, nightsBetween, STAY_STATUS, todayIso } from './labels';
import StayFormModal from './StayFormModal';
import type { Room, StayListItem, StayStatus, TaxRate } from './types';

type View = 'list' | 'planning';
type Filter = 'today' | 'reserved' | 'in-house' | 'past';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'today', label: 'Arrivées et départs du jour' },
  { value: 'reserved', label: 'Réservations' },
  { value: 'in-house', label: 'En cours' },
  { value: 'past', label: 'Terminés et annulés' },
];

const PLANNING_DAYS = 14;
type Sort = 'date' | 'name' | 'room';

export default function StaysPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<View>('list');
  const [filter, setFilter] = useState<Filter>('today');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('date');
  const [stays, setStays] = useState<StayListItem[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(todayIso());
  const [form, setForm] = useState<{ roomId?: string; checkIn?: string } | null>(null);

  const today = todayIso();

  const load = useCallback(() => {
    const statuses: Record<Filter, StayStatus[]> = {
      today: ['RESERVED', 'CHECKED_IN'],
      reserved: ['RESERVED'],
      'in-house': ['CHECKED_IN'],
      past: ['CHECKED_OUT', 'CANCELLED'],
    };
    const request =
      view === 'planning'
        ? fetchStays({ status: ['RESERVED', 'CHECKED_IN', 'CHECKED_OUT'], from: weekStart, to: addDaysIso(weekStart, PLANNING_DAYS) })
        : fetchStays({ status: statuses[filter] });
    Promise.all([request, fetchRooms(), fetchTaxRates()])
      .then(([s, r, t]) => {
        setStays(s);
        setRooms(r);
        setTaxRates(t);
      })
      .finally(() => setIsLoading(false));
  }, [view, filter, weekStart]);

  useEffect(() => {
    setIsLoading(true);
    load();
    const socket = getSocket();
    socket.on('hotel:updated', load);
    return () => {
      socket.off('hotel:updated', load);
    };
  }, [load]);

  // Liste : filtre "du jour" côté client (arrivées et départs prévus aujourd'hui)
  const q = normalizeText(query);
  const listed = useMemo(
    () =>
      stays
        .filter((s) =>
          filter !== 'today' ? true : (s.status === 'RESERVED' && dayOf(s.checkInDate) <= today) || (s.status === 'CHECKED_IN' && dayOf(s.checkOutDate) <= today)
        )
        .filter((s) => !q || normalizeText(s.guestName).includes(q) || normalizeText(s.room.number).includes(q) || (!!s.guestPhone && s.guestPhone.includes(q)))
        .sort((a, b) =>
          sort === 'name'
            ? a.guestName.localeCompare(b.guestName, 'fr')
            : sort === 'room'
              ? a.room.number.localeCompare(b.room.number, 'fr', { numeric: true })
              : filter === 'past'
                ? dayOf(b.checkInDate).localeCompare(dayOf(a.checkInDate))
                : dayOf(a.checkInDate).localeCompare(dayOf(b.checkInDate))
        ),
    [stays, filter, q, sort, today]
  );
  const pager = usePagination(listed, { resetKey: `${filter}|${query}|${sort}` });

  const days = Array.from({ length: PLANNING_DAYS }, (_, i) => addDaysIso(weekStart, i));
  const activeRooms = rooms.filter((r) => r.isActive);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Chambres', to: '/hotel' }, { label: 'Séjours' }]} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-heading">Séjours</h1>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-md border border-slate-300 p-1" role="tablist" aria-label="Affichage">
            {([
              { v: 'list', label: 'Liste', icon: List },
              { v: 'planning', label: 'Planning', icon: CalendarDays },
            ] as const).map(({ v, label, icon: Icon }) => (
              <button
                key={v}
                role="tab"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`flex items-center gap-1.5 rounded px-3 py-1 text-sm font-medium ${view === v ? 'bg-action text-white' : 'text-slate-600'}`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
          <button onClick={() => setForm({})} disabled={activeRooms.length === 0} className="btn btn-primary">
            <CalendarPlus size={16} />
            Nouvelle réservation
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`rounded-full border px-3 py-1 text-sm font-medium ${
                  filter === f.value ? 'border-action bg-action text-white' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <ListToolbar
            id="stays"
            query={query}
            onQueryChange={setQuery}
            placeholder="Rechercher un client, une chambre, un téléphone"
            sort={sort}
            onSortChange={setSort}
            sortOptions={[
              { value: 'date', label: 'Par date' },
              { value: 'name', label: 'Par client' },
              { value: 'room', label: 'Par chambre' },
            ]}
            resultCount={query ? listed.length : undefined}
          />

          {isLoading ? (
            <ListSkeleton />
          ) : (
            <>
              <div ref={pager.anchorRef} aria-hidden="true" className="scroll-mt-20" />
              <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
                <table className="table-cards w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-2 font-medium">Client</th>
                      <th className="px-4 py-2 font-medium">Chambre</th>
                      <th className="px-4 py-2 font-medium">Arrivée</th>
                      <th className="px-4 py-2 font-medium">Départ</th>
                      <th className="px-4 py-2 font-medium">Nuits</th>
                      <th className="px-4 py-2 font-medium">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pager.pageItems.map((s) => (
                      <tr key={s.id} onClick={() => navigate(`/hotel/stays/${s.id}`)} className="cursor-pointer hover:bg-slate-50">
                        <td data-label="Client" className="px-4 py-2">
                          <Link to={`/hotel/stays/${s.id}`} className="font-medium text-heading hover:underline" onClick={(e) => e.stopPropagation()}>
                            {s.guestName}
                          </Link>
                          {s.guestPhone && <span className="block text-xs text-slate-500">{s.guestPhone}</span>}
                        </td>
                        <td data-label="Chambre" className="px-4 py-2 text-slate-600">
                          {s.room.number} · {CATEGORY_LABELS[s.room.category]}
                        </td>
                        <td data-label="Arrivée" className="px-4 py-2 text-slate-600">
                          {formatDay(s.checkInDate)}
                        </td>
                        <td data-label="Départ" className="px-4 py-2 text-slate-600">
                          {formatDay(s.checkOutDate)}
                        </td>
                        <td data-label="Nuits" className="px-4 py-2 text-slate-600">
                          {nightsBetween(s.checkInDate, s.checkOutDate)}
                        </td>
                        <td data-label="Statut" className="px-4 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAY_STATUS[s.status].badge}`}>{STAY_STATUS[s.status].label}</span>
                        </td>
                      </tr>
                    ))}
                    {listed.length === 0 && (
                      <tr>
                        <td colSpan={6}>
                          <EmptyState
                            compact
                            icon={CalendarDays}
                            title={filter === 'today' ? 'Aucune arrivée ni aucun départ prévu aujourd’hui' : 'Aucun séjour'}
                            description={filter === 'reserved' ? 'Les réservations à venir apparaîtront ici.' : undefined}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={pager.page}
                pageCount={pager.pageCount}
                pageSize={pager.pageSize}
                total={pager.total}
                onPageChange={pager.goTo}
                onPageSizeChange={pager.setPageSize}
                itemLabel="séjours"
              />
            </>
          )}
        </>
      ) : (
        /* --- Planning : chambres en lignes, jours en colonnes --- */
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button onClick={() => setWeekStart(addDaysIso(weekStart, -7))} aria-label="Semaine précédente" className="btn btn-secondary btn-sm">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setWeekStart(todayIso())} className="btn btn-secondary btn-sm">
              Aujourd’hui
            </button>
            <button onClick={() => setWeekStart(addDaysIso(weekStart, 7))} aria-label="Semaine suivante" className="btn btn-secondary btn-sm">
              <ChevronRight size={16} />
            </button>
            <span className="text-sm text-slate-600">
              Du {formatDay(days[0], { day: 'numeric', month: 'long' })} au {formatDay(days[days.length - 1], { day: 'numeric', month: 'long' })}
            </span>
            <span className="ml-auto flex flex-wrap gap-2 text-xs">
              {(['RESERVED', 'CHECKED_IN', 'CHECKED_OUT'] as StayStatus[]).map((st) => (
                <span key={st} className={`rounded border px-2 py-0.5 font-medium ${STAY_STATUS[st].bar}`}>
                  {STAY_STATUS[st].label}
                </span>
              ))}
            </span>
          </div>

          {isLoading ? (
            <ListSkeleton />
          ) : activeRooms.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Aucune chambre" description="Ajoutez des chambres depuis l’écran Chambres." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-surface">
              <div
                className="grid min-w-[56rem] text-xs"
                style={{ gridTemplateColumns: `6rem repeat(${PLANNING_DAYS}, minmax(3.5rem, 1fr))` }}
              >
                {/* En-tête des jours */}
                <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-slate-50 px-2 py-2 font-semibold text-slate-500">Chambre</div>
                {days.map((d) => (
                  <div
                    key={d}
                    className={`border-b border-r border-slate-200 px-1 py-2 text-center ${d === today ? 'bg-primary-50 font-bold text-primary-800' : 'bg-slate-50 text-slate-500'}`}
                  >
                    <span className="block capitalize">{formatDay(d, { weekday: 'short' })}</span>
                    <span className="block">{formatDay(d, { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                ))}

                {/* Une ligne par chambre */}
                {activeRooms.map((r) => {
                  const roomStays = stays.filter((s) => s.roomId === r.id);
                  return (
                    <div key={r.id} className="contents">
                      <div className="sticky left-0 z-10 border-b border-r border-slate-200 bg-surface px-2 py-2">
                        <span className="block font-semibold text-heading">{r.number}</span>
                        <span className="text-slate-500">{CATEGORY_LABELS[r.category]}</span>
                      </div>
                      <div className="relative border-b border-slate-200" style={{ gridColumn: `span ${PLANNING_DAYS}` }}>
                        {/* Cases cliquables : réserver à cette date */}
                        <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${PLANNING_DAYS}, minmax(0, 1fr))` }}>
                          {days.map((d) => (
                            <button
                              key={d}
                              onClick={() => setForm({ roomId: r.id, checkIn: d })}
                              aria-label={`Réserver la chambre ${r.number} le ${formatDay(d)}`}
                              className={`min-h-[3rem] border-r border-slate-100 hover:bg-primary-50 ${d === today ? 'bg-primary-50/50' : ''}`}
                            />
                          ))}
                        </div>
                        {/* Séjours : barres positionnées selon leurs dates */}
                        {roomStays.map((s) => {
                          const startIdx = Math.max(0, nightsBetweenSigned(weekStart, dayOf(s.checkInDate)));
                          const endIdx = Math.min(PLANNING_DAYS, nightsBetweenSigned(weekStart, dayOf(s.checkOutDate)));
                          if (endIdx <= 0 || startIdx >= PLANNING_DAYS || endIdx <= startIdx) return null;
                          return (
                            <button
                              key={s.id}
                              onClick={() => navigate(`/hotel/stays/${s.id}`)}
                              title={`${s.guestName} — ${formatDay(s.checkInDate)} → ${formatDay(s.checkOutDate)}`}
                              className={`absolute top-1.5 bottom-1.5 truncate rounded-md border px-2 text-left font-medium shadow-sm ${STAY_STATUS[s.status].bar}`}
                              style={{
                                left: `calc(${(startIdx / PLANNING_DAYS) * 100}% + 2px)`,
                                width: `calc(${((endIdx - startIdx) / PLANNING_DAYS) * 100}% - 4px)`,
                              }}
                            >
                              {s.guestName}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-slate-500">
            Une case vide permet de réserver la chambre à cette date. Les montants sont visibles dans le détail du séjour.
          </p>
        </div>
      )}

      {form && (
        <StayFormModal
          rooms={rooms}
          taxRates={taxRates}
          initialRoomId={form.roomId}
          initialCheckIn={form.checkIn}
          onClose={() => setForm(null)}
          onSaved={(stay) => {
            setForm(null);
            navigate(`/hotel/stays/${stay.id}`);
          }}
        />
      )}
    </div>
  );
}

// Écart en jours (peut être négatif) entre deux dates AAAA-MM-JJ
function nightsBetweenSigned(from: string, to: string) {
  const [y1, m1, d1] = from.split('-').map(Number);
  const [y2, m2, d2] = to.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

