import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { useAuth } from './AuthContext';
import { fetchPlans, selectPlan } from '@/features/billing/api';
import { Plan } from '@/features/billing/types';

const formatFcfa = (value: number) => `${value.toLocaleString('fr-FR')} FCFA`;

export default function SubscribePage() {
  const { user, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans().then((list) => {
      setPlans(list);
      if (list.length > 0) setSelectedPlanId(list[0].id);
    });
  }, []);

  const handleConfirm = async () => {
    if (!selectedPlanId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await selectPlan(selectedPlanId);
      await refreshProfile(); // pour que hasSubscription passe à true côté app
      navigate('/dashboard');
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
        'Erreur lors de la sélection de la formule';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-semibold text-heading">
            Bienvenue{user ? `, ${user.name}` : ''} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Choisis ta formule pour commencer — 14 jours d’essai gratuit, sans carte bancaire.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {plans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={`rounded-xl border-2 p-5 text-left transition-all ${
                selectedPlanId === plan.id
                  ? 'border-primary-600 bg-surface shadow-md'
                  : 'border-slate-200 bg-surface hover:border-slate-300'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
                {selectedPlanId === plan.id && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-white">
                    <Check size={12} strokeWidth={3} />
                  </span>
                )}
              </div>
              <p className="mb-3 text-xl font-bold text-slate-900">
                {formatFcfa(Number(plan.price))}
                <span className="text-sm font-normal text-slate-500">/mois</span>
              </p>
              <ul className="space-y-1.5 text-xs text-slate-500">
                {plan.features.map((feature, i) => (
                  <li
                    key={i}
                    className={
                      feature.endsWith(':') ? 'pt-1 font-medium text-slate-700' : 'flex gap-1.5'
                    }
                  >
                    {!feature.endsWith(':') && <span className="text-slate-300">•</span>}
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {error && <p className="mb-4 text-center text-sm text-danger">{error}</p>}

        <div className="mx-auto max-w-xs">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !selectedPlanId} aria-busy={isSubmitting}
            className="btn btn-primary w-full py-2.5"
          >
            {isSubmitting ? 'Activation...' : 'Démarrer mon essai gratuit'}
          </button>
          <button
            onClick={() => logout()}
            className="mt-3 w-full text-center text-xs text-slate-500 hover:text-slate-600"
          >
            Annuler et se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
