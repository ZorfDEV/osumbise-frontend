import { useEffect, useState } from 'react';
import { CheckCircle2, ChefHat, Smartphone, TrendingUp, Wifi } from 'lucide-react';
import { BrandMark } from '@/components/ui/brand-logo';
import { prefersReducedMotion, useAnimatedNumber, useInView } from './motion';

// Démonstration jouée en boucle dans le hero : une commande se remplit, part
// en cuisine, est servie puis encaissée. Les montants sont des exemples.

const ITEMS = [
  { qty: 2, name: 'Poulet braisé', price: 5000 },
  { qty: 3, name: 'Coca-Cola 33 cl', price: 500 },
  { qty: 1, name: 'Alloco', price: 1000 },
];

const STATUSES = [
  { label: 'Brouillon', className: 'bg-slate-100 text-slate-600' },
  { label: 'En cuisine', className: 'bg-info-soft text-info-dark' },
  { label: 'Servie', className: 'bg-warning-soft text-warning-dark' },
  { label: 'Payée', className: 'bg-success-soft text-success-dark' },
];

// Étapes : 0 vide · 1-3 ajout d'articles · 4 cuisine · 5 servie · 6 payée · 7 pause
const STEP_MS = 1300;
const LAST_STEP = 7;
const FINAL_STEP = 6;

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

export default function HeroDemo() {
  const { ref, inView } = useInView<HTMLDivElement>({ once: false, threshold: 0.3, rootMargin: '0px' });
  const [step, setStep] = useState(() => (prefersReducedMotion() ? FINAL_STEP : 0));

  // Boucle uniquement quand la démo est visible (économise batterie et CPU)
  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    const id = window.setInterval(() => setStep((s) => (s >= LAST_STEP ? 0 : s + 1)), STEP_MS);
    return () => window.clearInterval(id);
  }, [inView]);

  const visibleItems = ITEMS.slice(0, Math.min(step, ITEMS.length));
  const total = visibleItems.reduce((sum, i) => sum + i.qty * i.price, 0);
  const animatedTotal = useAnimatedNumber(total);
  const status = step >= 6 ? STATUSES[3] : step === 5 ? STATUSES[2] : step === 4 ? STATUSES[1] : STATUSES[0];
  const stockLeft = 24 - (step >= 2 ? 3 : 0);
  const revenue = 485000 + (step >= 6 ? total : 0);
  const animatedRevenue = useAnimatedNumber(revenue, 900);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Démonstration animée du point de vente" role="img">
      {/* Halo derrière la carte principale */}
      <div aria-hidden="true" className="absolute inset-6 -z-10 rounded-[2rem] bg-primary-200/60 blur-3xl" />

      {/* Ticket de commande — carte principale */}
      <div className="relative mx-auto max-w-sm rounded-2xl border border-slate-200 bg-surface p-5 shadow-2xl shadow-primary-900/10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="h-7 w-7" title="" />
            <div>
              <p className="text-sm font-semibold text-heading">Table 4 · Terrasse</p>
              <p className="text-xs text-slate-500">Serveur : Junior</p>
            </div>
          </div>
          <span
            key={status.label}
            className={`animate-pop-in rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}
          >
            {status.label}
          </span>
        </div>

        <ul className="min-h-[7.5rem] space-y-2 border-y border-dashed border-slate-200 py-3 text-sm">
          {visibleItems.map((item) => (
            <li key={item.name} className="animate-item-in flex items-center justify-between">
              <span className="text-slate-700">
                <span className="mr-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded bg-primary-50 px-1 text-xs font-bold text-primary-700">
                  {item.qty}
                </span>
                {item.name}
              </span>
              <span className="font-medium text-slate-900">{(item.qty * item.price).toLocaleString('fr-FR')}</span>
            </li>
          ))}
          {visibleItems.length === 0 && (
            <li className="flex h-[6.5rem] items-center justify-center text-xs text-slate-400">Touchez un produit pour l’ajouter</li>
          )}
        </ul>

        <div className="mt-3 flex items-baseline justify-between">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-bold text-heading">{fcfa(animatedTotal)}</span>
        </div>

        {/* Bouton qui change selon l'étape, avec un "appui" simulé */}
        <div
          key={`btn-${step >= 6 ? 'paid' : step >= 4 ? 'kitchen' : 'draft'}`}
          className={`mt-4 flex h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
            step >= 6 ? 'bg-success-soft text-success-dark' : 'bg-action text-white'
          } ${step === 3 || step === 5 ? 'animate-press' : ''}`}
        >
          {step >= 6 ? (
            <>
              <CheckCircle2 size={18} /> Encaissé · Mobile Money
            </>
          ) : step >= 4 ? (
            'Encaisser'
          ) : (
            'Envoyer en cuisine'
          )}
        </div>
      </div>

      {/* Cartes flottantes — décoratives, masquées sur petit écran */}
      <div className="animate-float-slow absolute -left-4 top-6 hidden w-44 rounded-xl border border-slate-200 bg-surface p-3 shadow-xl sm:block lg:-left-10">
        <p className="flex items-center justify-between text-[0.7rem] font-medium uppercase tracking-wide text-slate-500">
          CA du jour <TrendingUp size={14} className="text-success" />
        </p>
        <p className="mt-0.5 text-base font-bold text-heading">{animatedRevenue.toLocaleString('fr-FR')}</p>
        <svg viewBox="0 0 120 30" className="mt-1 h-7 w-full" aria-hidden="true">
          <path d="M2 26 L20 22 L38 24 L56 15 L74 17 L92 9 L118 4" fill="none" strokeWidth="2.5" strokeLinecap="round" className="animate-draw stroke-primary-600" />
        </svg>
        <p className="text-[0.7rem] font-semibold text-success">▲ 12 % vs hier</p>
      </div>

      <div className="animate-float-slower absolute -right-4 top-1/3 hidden w-48 rounded-xl border border-slate-200 bg-surface p-3 shadow-xl sm:block lg:-right-8">
        <p className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-500">Stock mis à jour</p>
        <p className="mt-1 flex items-center justify-between text-sm">
          <span className="font-medium text-heading">Coca-Cola 33 cl</span>
          <span key={stockLeft} className="animate-pop-in font-bold text-primary-700">
            {stockLeft}
          </span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary-600 transition-all duration-700" style={{ width: `${(stockLeft / 24) * 100}%` }} />
        </div>
      </div>

      {/* Notifications : cuisine puis paiement */}
      <div className="absolute -bottom-4 left-1/2 w-64 -translate-x-1/2 sm:-bottom-6">
        {step >= 4 && step < 6 && (
          <div key="kitchen" className="animate-toast-up flex items-center gap-2 rounded-xl border border-info/30 bg-info-soft px-3 py-2 text-xs font-medium text-info-dark shadow-lg">
            <ChefHat size={16} /> Nouvelle commande reçue en cuisine
          </div>
        )}
        {step >= 6 && (
          <div key="paid" className="animate-toast-up flex items-center gap-2 rounded-xl border border-success/30 bg-success-soft px-3 py-2 text-xs font-medium text-success-dark shadow-lg">
            <Smartphone size={16} /> Paiement de {fcfa(total)} reçu
          </div>
        )}
      </div>

      <div className="absolute -top-3 right-6 hidden items-center gap-1.5 rounded-full border border-slate-200 bg-surface px-2.5 py-1 text-[0.7rem] font-semibold text-slate-600 shadow-md sm:flex">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success-accent opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-success-accent" />
        </span>
        <Wifi size={12} /> Synchronisé
      </div>
    </div>
  );
}
