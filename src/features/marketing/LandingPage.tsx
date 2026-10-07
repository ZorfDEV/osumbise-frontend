import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  ChefHat,
  BarChart3,
  WifiOff,
  Wallet,
  Mail,
  Phone,
  MessageCircle,
  Check,
  Menu,
  X,
  ArrowRight,
  Sparkles,
  Beer,
  UtensilsCrossed,
  BedDouble,
  Store,
  Warehouse,
  UserPlus,
  ListChecks,
  Banknote,
  ShieldCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { fetchPlans } from '@/features/billing/api';
import BrandLogo, { BrandMark } from '@/components/ui/brand-logo';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { Skeleton } from '@/components/ui/skeleton';
import { Plan } from '@/features/billing/types';
import HeroDemo from './HeroDemo';
import OfflineDemo from './OfflineDemo';
import { CountUp, Reveal, RotatingWord, SpotlightCard, useActiveSection, useInView, useScrollProgress } from './motion';

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

const FEATURES = [
  {
    icon: ShoppingCart,
    title: 'Point de vente rapide',
    description:
      'Prise de commande en quelques secondes, par table ou au comptoir, avec paiement espèces, carte ou mobile money.',
  },
  {
    icon: Package,
    title: 'Stock et recettes',
    description:
      'Le stock des ingrédients se décrémente automatiquement à chaque vente, selon la recette de chaque plat.',
  },
  {
    icon: ChefHat,
    title: 'Écran cuisine en temps réel',
    description:
      'Chaque commande envoyée arrive instantanément en cuisine, sans passer par un serveur qui fait la navette.',
  },
  {
    icon: WifiOff,
    title: 'Fonctionne hors ligne',
    description:
      'Une coupure internet ? Les ventes continuent normalement, tout se synchronise au retour de la connexion.',
  },
  {
    icon: Wallet,
    title: 'Caisse et rapports',
    description:
      'Sessions de caisse, dépenses catégorisées, rapports journaliers, mensuels ou sur mesure — tout est suivi.',
  },
  {
    icon: BarChart3,
    title: 'Multi-établissements',
    description:
      "Gérez plusieurs bars, restaurants ou hôtels depuis un seul compte, avec des droits d'accès par rôle.",
  },
];

const VENUES = [
  { icon: Beer, label: 'Bars' },
  { icon: UtensilsCrossed, label: 'Restaurants' },
  { icon: BedDouble, label: 'Hôtels' },
  { icon: Store, label: 'Épiceries' },
  { icon: Warehouse, label: 'Grossistes' },
];

// Chiffres tirés du produit lui-même (pas de statistiques inventées)
const STATS = [
  { value: 14, suffix: ' jours', label: 'd’essai gratuit, sans carte bancaire' },
  { value: 3, suffix: '', label: 'moyens de paiement : espèces, carte, mobile money' },
  { value: 5, suffix: '', label: 'types d’établissements pris en charge' },
  { value: 6, suffix: '', label: 'rôles d’accès, du gérant au cuisinier' },
];

const STEPS = [
  { icon: UserPlus, title: 'Créez votre compte', text: 'Choisissez votre formule et votre type d’établissement. L’essai démarre tout de suite.' },
  { icon: ListChecks, title: 'Ajoutez produits et tables', text: 'Saisissez votre carte, vos prix, vos recettes et le plan de votre salle.' },
  { icon: Banknote, title: 'Encaissez dès le service', text: 'Vos serveurs prennent les commandes, la cuisine les reçoit, la caisse encaisse.' },
];

const SECTIONS = ['apercu', 'tarifs', 'support'];
const NAV_LINKS = [
  { id: 'apercu', label: 'Aperçu' },
  { id: 'tarifs', label: 'Tarifs' },
  { id: 'support', label: 'Support' },
];

export default function LandingPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { progress, scrolled } = useScrollProgress();
  const activeSection = useActiveSection(SECTIONS);
  const steps = useInView<HTMLOListElement>({ threshold: 0.4 });

  useEffect(() => {
    fetchPlans()
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  // La formule du milieu est mise en avant quand il y en a trois
  const featuredIndex = plans && plans.length === 3 ? 1 : -1;

  return (
    <div className="overflow-x-clip">
      {/* Barre de progression de lecture */}
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-50 h-0.5">
        <div className="h-full origin-left bg-action" style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* En-tête : s'allège et prend une ombre au défilement */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur transition-all duration-300 ${
          scrolled ? 'border-slate-200 bg-surface/85 shadow-sm' : 'border-transparent bg-transparent'
        }`}
      >
        <div className={`mx-auto flex max-w-6xl items-center justify-between px-4 transition-all duration-300 sm:px-6 ${scrolled ? 'h-14' : 'h-16'}`}>
          <a
            href="#top"
            aria-label="Osumbise, retour en haut de la page"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="shrink-0 rounded-md"
          >
            <BrandLogo className="h-8 sm:h-9" />
          </a>

          <nav className="hidden items-center gap-8 sm:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className={`relative py-1 text-sm font-medium transition-colors ${
                  activeSection === l.id ? 'text-heading' : 'text-slate-600 hover:text-heading'
                }`}
              >
                {l.label}
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-0 -bottom-0.5 h-0.5 origin-left rounded-full bg-action transition-transform duration-300 ${
                    activeSection === l.id ? 'scale-x-100' : 'scale-x-0'
                  }`}
                />
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" />
            <Link to="/login" className="btn btn-primary hidden sm:inline-flex">
              Connexion
            </Link>
            <button
              onClick={() => setMobileMenuOpen((s) => !s)}
              aria-label="Menu"
              aria-expanded={mobileMenuOpen}
              className="flex h-9 w-9 items-center justify-center text-slate-600 sm:hidden"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="animate-toast-up flex flex-col gap-1 border-t border-slate-200 bg-surface px-4 py-3 sm:hidden">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                {l.label}
              </button>
            ))}
            <Link to="/login" className="btn btn-primary mt-1 px-3">
              Connexion
            </Link>
          </div>
        )}
      </header>

      {/* ===== Hero ===== */}
      <section id="top" className="relative -mt-16 overflow-hidden px-4 pb-24 pt-32 sm:px-6 lg:pb-32 lg:pt-40">
        {/* Fond : taches de couleur qui dérivent + grille de points */}
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-slate-50">
          <div className="animate-blob absolute -left-32 -top-24 h-[28rem] w-[28rem] rounded-full bg-primary-200/70 blur-3xl" />
          <div
            className="animate-blob absolute -right-24 top-32 h-[24rem] w-[24rem] rounded-full bg-success-soft blur-3xl"
            style={{ animationDelay: '-6s' }}
          />
          <div
            className="animate-blob absolute bottom-0 left-1/3 h-[20rem] w-[20rem] rounded-full bg-info-soft/80 blur-3xl"
            style={{ animationDelay: '-12s' }}
          />
          <div className="dot-grid absolute inset-0" />
        </div>

        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2 lg:gap-12">
          <div className="text-center lg:text-left">
            <p
              className="animate-rise mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-surface/70 px-3 py-1 text-xs font-semibold text-primary-700 shadow-sm backdrop-blur lg:mx-0"
              style={{ animationDelay: '0ms' }}
            >
              <Sparkles size={14} /> Continue de vendre même sans internet
            </p>
            <h1
              className="animate-rise mb-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-heading [text-wrap:balance] sm:text-5xl lg:text-6xl"
              style={{ animationDelay: '120ms' }}
            >
              Le point de vente pensé pour les{' '}
              <RotatingWord
                words={['bars', 'restaurants', 'hôtels', 'épiceries', 'grossistes']}
                className="bg-gradient-to-r from-action to-primary-500 bg-clip-text text-transparent"
              />
            </h1>
            <p
              className="animate-rise mx-auto mb-8 max-w-xl text-lg text-slate-600 lg:mx-0"
              style={{ animationDelay: '240ms' }}
            >
              Prise de commande, stock, caisse et rapports dans une seule application — même quand la connexion internet
              flanche.
            </p>
            <div
              className="animate-rise flex flex-col items-center justify-center gap-3 sm:flex-row lg:justify-start"
              style={{ animationDelay: '360ms' }}
            >
              <Link to="/register" className="btn btn-primary btn-lg btn-shine group w-full shadow-lg shadow-action/25 sm:w-auto">
                Essai gratuit de 14 jours
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <button onClick={() => scrollTo('apercu')} className="btn btn-secondary btn-lg w-full sm:w-auto">
                Découvrir l’application
              </button>
            </div>
            <ul
              className="animate-rise mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-slate-500 lg:justify-start"
              style={{ animationDelay: '480ms' }}
            >
              {['Sans carte bancaire', 'Prêt en quelques minutes', 'Support en français'].map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <Check size={16} className="text-success" /> {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="animate-rise" style={{ animationDelay: '300ms' }}>
            <HeroDemo />
          </div>
        </div>
      </section>

      {/* ===== Types d'établissements (bandeau défilant) ===== */}
      <section aria-label="Établissements équipés" className="border-y border-slate-200 bg-surface py-6">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Une application, cinq métiers
        </p>
        <div className="marquee-mask overflow-hidden">
          <ul className="animate-marquee flex w-max gap-4">
            {/* Liste doublée pour une boucle sans à-coup ; la copie est cachée aux lecteurs d'écran */}
            {[...VENUES, ...VENUES, ...VENUES, ...VENUES].map((v, i) => (
              <li
                key={`${v.label}-${i}`}
                aria-hidden={i >= VENUES.length ? true : undefined}
                className="flex shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-700"
              >
                <v.icon size={18} className="text-primary-600" /> {v.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ===== Chiffres clés ===== */}
      <section className="px-4 py-16 sm:px-6">
        <dl className="mx-auto grid max-w-5xl grid-cols-2 gap-6 lg:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">
                  <CountUp value={s.value} suffix={s.suffix} />
                </span>
                <span className="mx-auto mt-2 block max-w-[14rem] text-sm text-slate-500">{s.label}</span>
              </dd>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ===== Fonctionnalités ===== */}
      <section id="apercu" className="scroll-mt-16 bg-slate-50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Fonctionnalités</p>
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-heading sm:text-4xl">Tout ce qu’il faut, rien de superflu</h2>
            <p className="text-slate-500">Conçu pour le rythme d’un vrai service, pas pour une démo.</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 100}>
                <SpotlightCard className="h-full rounded-2xl border border-slate-200 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-xl hover:shadow-primary-900/5">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-all duration-300 group-hover:scale-110 group-hover:bg-action group-hover:text-white">
                    <f.icon size={22} />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold text-heading">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-slate-500">{f.description}</p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Comment ça marche (vraie séquence : la numérotation a un sens) ===== */}
      <section className="px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Démarrage</p>
            <h2 className="text-3xl font-bold tracking-tight text-heading sm:text-4xl">Opérationnel en trois étapes</h2>
          </Reveal>
          <ol ref={steps.ref} className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {/* Ligne de progression qui se dessine entre les étapes */}
            <div aria-hidden="true" className="absolute left-[16.66%] right-[16.66%] top-7 hidden h-0.5 bg-slate-200 md:block">
              <div
                className="h-full origin-left bg-action transition-transform ease-out [transition-duration:1400ms]"
                style={{ transform: `scaleX(${steps.inView ? 1 : 0})` }}
              />
            </div>
            {STEPS.map((s, i) => (
              <li
                key={s.title}
                className="relative text-center transition-all duration-700"
                style={{
                  transitionDelay: `${i * 350}ms`,
                  opacity: steps.inView ? 1 : 0.35,
                  transform: steps.inView ? 'none' : 'translateY(12px)',
                }}
              >
                <div className="relative mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-action text-white shadow-lg shadow-action/30">
                  <s.icon size={24} />
                  <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface text-xs font-bold text-primary-700 shadow">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mb-1.5 font-semibold text-heading">{s.title}</h3>
                <p className="mx-auto max-w-xs text-sm text-slate-500">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ===== Mode hors ligne ===== */}
      <section className="relative overflow-hidden bg-slate-50 px-4 py-24 sm:px-6">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal from="left">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Hors ligne</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              Coupure internet ? Le service continue.
            </h2>
            <p className="mb-6 text-slate-600">
              Osumbise garde vos commandes sur l’appareil quand le réseau tombe, puis les envoie toutes seules dès qu’il
              revient. Aucune vente perdue, aucun ticket à ressaisir.
            </p>
            <ul className="space-y-3 text-sm">
              {[
                { icon: Zap, text: 'Prise de commande et envoi en cuisine sans connexion' },
                { icon: RefreshCw, text: 'Synchronisation automatique au retour du réseau' },
                { icon: ShieldCheck, text: 'Indicateur de connexion toujours visible pour l’équipe' },
              ].map((b) => (
                <li key={b.text} className="flex items-center gap-3 text-slate-700">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success-soft text-success-dark">
                    <b.icon size={16} />
                  </span>
                  {b.text}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal from="right" delay={150}>
            <OfflineDemo />
          </Reveal>
        </div>
      </section>

      {/* ===== Tarifs ===== */}
      <section id="tarifs" className="scroll-mt-16 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <Reveal className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-700">Tarifs</p>
            <h2 className="mb-3 text-3xl font-bold tracking-tight text-heading sm:text-4xl">
              Une formule pour chaque taille d’établissement
            </h2>
            <p className="text-slate-500">14 jours d’essai gratuit sur toutes les formules, sans carte bancaire.</p>
          </Reveal>
          <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-3">
            {plans?.map((plan, i) => {
              const featured = i === featuredIndex;
              return (
                <Reveal key={plan.id} delay={i * 120} from="scale" className={featured ? 'sm:-my-3' : ''}>
                  <div
                    className={`relative flex h-full flex-col rounded-2xl border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                      featured ? 'border-action shadow-xl shadow-action/10 ring-1 ring-action' : 'border-slate-200'
                    }`}
                  >
                    {featured && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-action px-3 py-1 text-xs font-semibold text-white shadow">
                        Recommandée
                      </span>
                    )}
                    <h3 className="mb-1 text-base font-semibold text-heading">{plan.name}</h3>
                    <p className="mb-5 text-3xl font-extrabold tracking-tight text-heading">
                      {formatFcfa(Number(plan.price))}
                      <span className="text-sm font-normal text-slate-500">/mois</span>
                    </p>
                    <ul className="mb-6 flex-1 space-y-2 text-sm text-slate-600">
                      {plan.features.map((feature, j) => (
                        <li key={j} className={feature.endsWith(':') ? 'pt-1 font-semibold text-slate-800' : 'flex gap-2'}>
                          {!feature.endsWith(':') && <Check size={16} className="mt-0.5 shrink-0 text-success" />}
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/register" className={`btn ${featured ? 'btn-primary btn-shine' : 'btn-secondary'} w-full py-2.5`}>
                      Commencer l’essai
                    </Link>
                  </div>
                </Reveal>
              );
            })}
            {plans === null &&
              Array.from({ length: 3 }, (_, i) => (
                <div key={i} className="space-y-4 rounded-2xl border border-slate-200 bg-surface p-6">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-3" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-10 rounded-md" />
                </div>
              ))}
            {plans?.length === 0 && (
              <p className="col-span-full text-center text-sm text-slate-500">
                Les formules n’ont pas pu être chargées. Réessayez dans un instant.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* ===== Support — l'adresse email reste à confirmer avant mise en ligne ===== */}
      <section id="support" className="scroll-mt-16 bg-slate-50 px-4 py-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <h2 className="mb-2 text-3xl font-bold tracking-tight text-heading">Une question avant de te lancer ?</h2>
            <p className="mb-10 text-slate-500">Notre équipe répond rapidement, en français.</p>
          </Reveal>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { href: 'mailto:contact@osumbise.ga', icon: Mail, title: 'Email', hint: 'contact@osumbise.ga' },
              { href: 'tel:+24177545018', icon: Phone, title: 'Téléphone', hint: '+241 77 54 50 18' },
              { href: 'https://wa.me/24177545018', icon: MessageCircle, title: 'WhatsApp', hint: 'Réponse sous 24h', external: true },
            ].map((c, i) => (
              <Reveal key={c.title} delay={i * 100}>
                <a
                  href={c.href}
                  {...(c.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                  className="group flex h-full flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary-300 hover:shadow-lg"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-700 transition-transform duration-300 group-hover:scale-110">
                    <c.icon size={20} />
                  </span>
                  <span className="text-sm font-semibold text-heading">{c.title}</span>
                  <span className="text-xs text-slate-500">{c.hint}</span>
                </a>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Appel à l'action final ===== */}
      <section className="px-4 py-20 sm:px-6">
        <Reveal from="scale" className="mx-auto max-w-5xl">
          <div className="animate-gradient-pan relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#2B3E36] via-[#4A6B5D] to-[#618373] px-6 py-14 text-center shadow-2xl sm:px-12">
            <BrandMark className="animate-float-slow absolute -right-10 -top-10 h-48 w-48 !text-white opacity-10" title="" />
            <BrandMark className="animate-float-slower absolute -bottom-12 -left-8 h-40 w-40 !text-white opacity-10" title="" />
            <h2 className="relative mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Prêt à accélérer votre service ?
            </h2>
            <p className="relative mx-auto mb-8 max-w-xl text-on-primary-soft">
              Créez votre compte en quelques minutes et testez Osumbise pendant 14 jours, sans engagement.
            </p>
            <Link
              to="/register"
              className="btn btn-lg btn-shine group relative bg-white text-[#2B3E36] shadow-lg hover:bg-[#EDF2F0]"
            >
              Démarrer mon essai gratuit
              <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ===== Pied de page ===== */}
      <footer className="border-t border-slate-200 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
          <BrandLogo className="h-7" />
          <div className="flex gap-6 text-xs text-slate-500">
            {NAV_LINKS.map((l) => (
              <button key={l.id} onClick={() => scrollTo(l.id)} className="hover:text-heading">
                {l.label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} Osumbise. Tous droits réservés.</span>
        </div>
      </footer>
    </div>
  );
}
