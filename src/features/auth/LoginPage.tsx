import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import {Mail, Lock, Eye, EyeOff, ArrowRight  } from "lucide-react"
import loginBackground from '@/assets/img/loginbackground.png';
import BrandLogo from '@/components/ui/brand-logo';
import { useToast } from '@/lib/toast';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginForm) => {
    setServerError(null);
    try {
      await login(data.email, data.password);
      navigate('/dashboard');
    } catch {
      setServerError('Identifiants incorrects');
    }
  };

  // Pas encore de flux de réinitialisation en libre-service : la voie de
  // récupération existante passe par un OWNER/ADMIN (Paramètres > réinitialiser
  // le mot de passe d'un utilisateur), donc on oriente simplement vers elle.
  const handleForgotPassword = () => {
    toast.info(
      'Demandez au propriétaire ou à un administrateur de votre établissement de réinitialiser votre mot de passe depuis Paramètres.'
    );
  };

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden  lg:block">
        <img
          src={loginBackground}
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link to="/" aria-label="Osumbise, page d’accueil" className="flex items-center gap-2 rounded-md">
            <BrandLogo className="h-8" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {/* Formulaire */}
           <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
             <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold text-heading">Connexion</h1>
          <p className="text-sm  text-muted-foreground">
             Saisissez vos informations afin de pouvoir accéder à votre espace
          </p>
        </div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-600">
              Email
            </label>
            <div className="relative mb-1">
              <Mail
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                {...register('email')}
                className="input w-full rounded-lg py-2.5 pl-10 pr-3"
              />
            </div>
            {errors.email && <p className="mb-3 text-xs text-danger">{errors.email.message}</p>}
        
            <div className="mb-1 mt-1 flex items-center justify-between">
              <label className="block text-sm font-medium text-slate-600">Mot de passe</label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-heading"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                {showPassword ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            <div className="relative mb-1">
              <Lock
                size={18}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                {...register('password')}
                className="input w-full rounded-lg py-2.5 pl-10 pr-3"
              />
            </div>
            {errors.password && (
              <p className="mb-3 text-xs text-danger">{errors.password.message}</p>
            )}

            <div className="mb-1 text-right">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-700 transition hover:text-primary-800"
              >
                <ArrowRight size={14} />
                Mot de passe oublié ?
              </button>
            </div>

            {serverError && <p className="mb-4 text-sm text-danger">{serverError}</p>}

            <button
              type="submit"
              disabled={isSubmitting} aria-busy={isSubmitting}
              className="btn btn-primary w-full rounded-full py-3 font-semibold"
            >
              {isSubmitting ? 'Connexion...' : 'Connexion'}
            </button>

            <p className="text-center text-sm text-slate-500">
              Pas encore de compte ?{' '}
              <Link to="/register" className="font-semibold text-primary-700 hover:text-primary-800 hover:underline">
                Créer un compte
              </Link>
            </p>
            </FieldGroup>
          </form>
          </div>
        </div>
      </div>
      
    </div>
  );
}
