import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Beer,
  BedDouble,
  Building2,
  Check,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Store,
  User,
  UtensilsCrossed,
  Warehouse,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import BrandLogo from '@/components/ui/brand-logo';
import loginBackground from '@/assets/img/loginbackground.png';

const registerSchema = z.object({
  organizationName: z.string().min(2, "Le nom de l'entreprise est requis"),
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères'),
  establishmentName: z.string().min(2, "Le nom de l'établissement est requis"),
  establishmentType: z.enum(['BAR', 'RESTAURANT', 'HOTEL', 'GROSSISTE', 'EPICERIE']),
});
type RegisterForm = z.infer<typeof registerSchema>;
type EstablishmentType = RegisterForm['establishmentType'];

const TYPE_OPTIONS: { value: EstablishmentType; label: string; icon: LucideIcon; hint: string }[] = [
  { value: 'BAR', label: 'Bar', icon: Beer, hint: 'Plan de salle, tables et écran cuisine activés.' },
  { value: 'RESTAURANT', label: 'Restaurant', icon: UtensilsCrossed, hint: 'Plan de salle, tables et écran cuisine activés.' },
  { value: 'HOTEL', label: 'Hôtel', icon: BedDouble, hint: 'Plan de salle, tables et écran cuisine activés.' },
  { value: 'EPICERIE', label: 'Épicerie', icon: Store, hint: 'Vente au détail au comptoir, sans écran cuisine.' },
  { value: 'GROSSISTE', label: 'Grossiste', icon: Warehouse, hint: 'Vente en gros et clients à crédit, sans tables ni cuisine.' },
];

const BENEFITS = ['14 jours d’essai gratuit', 'Sans carte bancaire', 'Fonctionne même hors ligne'];

// Indicateur de solidité du mot de passe (aide, pas une règle bloquante :
// seule la longueur minimale est exigée par le formulaire)
const passwordStrength = (pwd: string) => {
  if (!pwd) return null;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { level: 1, label: 'Faible', bar: 'bg-danger', text: 'text-danger' };
  if (score <= 3) return { level: 2, label: 'Moyen', bar: 'bg-warning-accent', text: 'text-warning' };
  return { level: 3, label: 'Solide', bar: 'bg-success', text: 'text-success' };
};

const FIELD_ICON = 'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400';
const FIELD_INPUT = 'input w-full rounded-lg py-2.5 pl-10 pr-3';

export default function RegisterPage() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { establishmentType: 'BAR' },
  });

  const selectedType = watch('establishmentType');
  const strength = passwordStrength(watch('password') ?? '');

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null);
    try {
      await registerUser(data);
      // Le compte ET l'établissement existent, mais aucune formule n'a
      // encore été choisie — c'est l'objet de la page suivante, dédiée
      navigate('/subscribe');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de la création du compte';
      setServerError(message);
    }
  };

  const fieldError = (name: keyof RegisterForm) =>
    errors[name] && (
      <p id={`${name}-error`} className="mt-1 text-xs text-danger">
        {errors[name]?.message}
      </p>
    );
  const a11y = (name: keyof RegisterForm) => ({
    id: name,
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${name}-error` : undefined,
  });

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Visuel — même image que la connexion, avec les arguments de l'essai */}
      <div className="relative hidden lg:block">
        <img src={loginBackground} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1F2D27]/90 via-[#1F2D27]/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white">
          <p className="mb-3 max-w-md text-3xl font-bold leading-tight">
            Lancez votre point de vente en quelques minutes.
          </p>
          <ul className="space-y-2 text-on-primary-soft">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-center gap-2 text-sm">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20">
                  <Check size={12} />
                </span>
                {b}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex items-center justify-center gap-2 md:justify-between">
          <Link to="/" aria-label="Osumbice, page d’accueil" className="flex items-center gap-2 rounded-md">
            <BrandLogo className="h-8" />
          </Link>
          <p className="hidden text-sm text-slate-500 md:block">
            Déjà un compte ?{' '}
            <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md">
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
              {/* En-tête + progression : l'inscription se termine sur le choix de formule */}
              <div className="flex flex-col items-center gap-2 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Étape 1 sur 2</p>
                <h1 className="text-2xl font-semibold text-heading">Créer votre compte</h1>
                <p className="text-sm text-muted-foreground">
                  Quelques informations sur votre établissement. Vous choisirez votre formule à l’étape suivante.
                </p>
                <div className="mt-1 flex w-32 gap-1.5" aria-hidden="true">
                  <span className="h-1 flex-1 rounded-full bg-action" />
                  <span className="h-1 flex-1 rounded-full bg-slate-200" />
                </div>
              </div>

              {/* --- Établissement --- */}
              <fieldset className="space-y-4">
                <legend className="mb-3 text-sm font-semibold text-heading">Votre établissement</legend>

                <div>
                  <label htmlFor="organizationName" className="mb-1 block text-sm font-medium text-slate-600">
                    Nom de l’entreprise
                  </label>
                  <div className="relative">
                    <Building2 size={18} className={FIELD_ICON} />
                    <input
                      {...register('organizationName')}
                      {...a11y('organizationName')}
                      autoComplete="organization"
                      placeholder="Ex. Groupe Okoumé"
                      className={FIELD_INPUT}
                    />
                  </div>
                  {fieldError('organizationName')}
                </div>

                <div>
                  <label htmlFor="establishmentName" className="mb-1 block text-sm font-medium text-slate-600">
                    Nom de l’établissement
                  </label>
                  <div className="relative">
                    <Store size={18} className={FIELD_ICON} />
                    <input
                      {...register('establishmentName')}
                      {...a11y('establishmentName')}
                      placeholder="Ex. Bar La Terrasse"
                      className={FIELD_INPUT}
                    />
                  </div>
                  {fieldError('establishmentName')}
                </div>

                <div role="radiogroup" aria-labelledby="type-label">
                  <p id="type-label" className="mb-1.5 text-sm font-medium text-slate-600">
                    Type d’établissement
                  </p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {TYPE_OPTIONS.map((t) => {
                      const checked = selectedType === t.value;
                      return (
                        <label
                          key={t.value}
                          className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center text-xs font-semibold transition-all has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-500 has-[:focus-visible]:ring-offset-2 ${
                            checked
                              ? 'border-action bg-primary-50 text-primary-800 ring-1 ring-action'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <input type="radio" value={t.value} {...register('establishmentType')} className="sr-only" />
                          <t.icon size={20} className={checked ? 'text-primary-700' : 'text-slate-400'} />
                          {t.label}
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {TYPE_OPTIONS.find((t) => t.value === selectedType)?.hint} Modifiable ensuite dans Établissements.
                  </p>
                </div>
              </fieldset>

              {/* --- Accès --- */}
              <fieldset className="space-y-4">
                <legend className="mb-3 text-sm font-semibold text-heading">Votre accès</legend>

                <div>
                  <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-600">
                    Votre nom
                  </label>
                  <div className="relative">
                    <User size={18} className={FIELD_ICON} />
                    <input
                      {...register('name')}
                      {...a11y('name')}
                      autoComplete="name"
                      placeholder="Prénom et nom"
                      className={FIELD_INPUT}
                    />
                  </div>
                  {fieldError('name')}
                </div>

                <div>
                  <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={18} className={FIELD_ICON} />
                    <input
                      type="email"
                      {...register('email')}
                      {...a11y('email')}
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      className={FIELD_INPUT}
                    />
                  </div>
                  {fieldError('email')}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="password" className="block text-sm font-medium text-slate-600">
                      Mot de passe
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-heading"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showPassword ? 'Masquer' : 'Afficher'}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={18} className={FIELD_ICON} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...register('password')}
                      {...a11y('password')}
                      autoComplete="new-password"
                      placeholder="8 caractères minimum"
                      className={FIELD_INPUT}
                    />
                  </div>
                  {strength && (
                    <div className="mt-2 flex items-center gap-2" aria-live="polite">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((n) => (
                          <span
                            key={n}
                            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                              n <= strength.level ? strength.bar : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${strength.text}`}>{strength.label}</span>
                    </div>
                  )}
                  {fieldError('password')}
                </div>
              </fieldset>

              {serverError && (
                <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger-dark">
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
                className="btn btn-primary group w-full rounded-full py-3 font-semibold"
              >
                {isSubmitting ? (
                  'Création du compte...'
                ) : (
                  <>
                    Continuer
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-slate-500 md:hidden">
                Déjà un compte ?{' '}
                <Link to="/login" className="font-semibold text-primary-700 hover:underline">
                  Se connecter
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
