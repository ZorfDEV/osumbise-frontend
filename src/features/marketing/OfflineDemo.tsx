import { useEffect, useState } from 'react';
import { Cloud, CloudOff, Check, Tablet } from 'lucide-react';
import { prefersReducedMotion, useInView } from './motion';

// Animation de la section "hors ligne" : la connexion coupe, les commandes
// continuent et s'empilent en file d'attente, puis tout part au retour du
// réseau. Les commandes affichées sont des exemples.

const QUEUE = ['Table 2 · 3 articles', 'Comptoir · 1 article', 'Table 7 · 5 articles'];

// 0 en ligne · 1 coupure · 2-4 commandes en file · 5 retour réseau · 6 synchronisé
const STEP_MS = 1400;
const LAST = 7;

export default function OfflineDemo() {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, threshold: 0.35, rootMargin: '0px' });
  const [step, setStep] = useState(() => (prefersReducedMotion() ? 4 : 0));

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const id = window.setInterval(() => setStep((s) => (s >= LAST ? 0 : s + 1)), STEP_MS);
    return () => window.clearInterval(id);
  }, [inView]);

  const offline = step >= 1 && step <= 4;
  const syncing = step === 5;
  const synced = step >= 6;
  const queued = synced || syncing ? QUEUE.length : Math.max(0, Math.min(step - 1, QUEUE.length));

  return (
    <div ref={ref} role="img" aria-label="Animation : les commandes continuent sans internet et se synchronisent au retour du réseau" className="relative">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        {/* Tablette de la caisse */}
        <div className="rounded-2xl border border-slate-200 bg-surface p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-heading">
              <Tablet size={14} /> Caisse
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[0.7rem] font-semibold transition-colors duration-500 ${
                offline ? 'bg-danger-soft text-danger-dark' : 'bg-success-soft text-success-dark'
              }`}
            >
              {offline ? 'Hors ligne' : 'En ligne'}
            </span>
          </div>
          <ul className="min-h-[6.75rem] space-y-1.5">
            {QUEUE.slice(0, queued).map((q, i) => (
              <li
                key={q}
                className={`flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-all duration-500 ${
                  synced ? 'bg-success-soft text-success-dark' : 'animate-item-in bg-slate-100 text-slate-700'
                } ${syncing ? 'animate-fly-right' : ''}`}
                style={syncing ? { animationDelay: `${i * 120}ms` } : undefined}
              >
                {q}
                {synced && <Check size={14} />}
              </li>
            ))}
            {queued === 0 && <li className="flex h-[6.25rem] items-center justify-center text-xs text-slate-400">Service en cours…</li>}
          </ul>
          <p className="mt-2 text-[0.7rem] text-slate-500">
            {synced ? 'Tout est enregistré sur le serveur' : offline ? `${queued} en attente d’envoi` : 'Connecté'}
          </p>
        </div>

        {/* Liaison réseau : pointillés animés, coupés hors ligne */}
        <div className="flex w-10 flex-col items-center gap-2 sm:w-20" aria-hidden="true">
          <div className={`h-0.5 w-full rounded ${offline ? 'bg-danger/30' : 'link-flow'}`} />
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors duration-500 ${
              offline ? 'bg-danger-soft text-danger-dark' : 'bg-success-soft text-success-dark'
            }`}
          >
            {offline ? <CloudOff size={16} /> : <Cloud size={16} />}
          </span>
        </div>

        {/* Serveur Osumbice */}
        <div
          className={`rounded-2xl border bg-surface p-4 text-center shadow-lg transition-all duration-500 ${
            synced ? 'border-success/40 ring-2 ring-success/20' : 'border-slate-200'
          } ${offline ? 'opacity-60' : ''}`}
        >
          <Cloud size={28} className={`mx-auto mb-2 ${offline ? 'text-slate-400' : 'text-primary-600'}`} />
          <p className="text-xs font-semibold text-heading">Serveur Osumbice</p>
          <p className="mt-1 text-[0.7rem] text-slate-500">
            {offline ? 'Injoignable' : syncing ? 'Réception…' : synced ? '3 commandes reçues' : 'Disponible'}
          </p>
        </div>
      </div>
    </div>
  );
}
