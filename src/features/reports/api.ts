import { ALL_ESTABLISHMENTS, api, getActiveEstablishmentId } from '@/lib/axios';
import { DashboardSummary } from '@/features/dashboard/types';

// La réponse de /api/reports a exactement la même forme que le résumé du
// dashboard (les deux passent par report.service.ts côté backend)
export type ReportData = DashboardSummary;

// `allEstablishments` : vue consolidée d'un propriétaire (toute l'organisation)
export const fetchReport = async (params: Record<string, string>, allEstablishments?: boolean): Promise<ReportData> => {
  const res = await api.get('/reports', { params, ...(allEstablishments ? ALL_ESTABLISHMENTS : {}) });
  return res.data;
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Téléchargement direct plutôt que via axios : le cookie HttpOnly est envoyé
// automatiquement sur une navigation classique, et le backend force le
// téléchargement via Content-Disposition — pas besoin de gérer un blob ici.
// Un nouvel onglet ne porte pas l'en-tête X-Establishment-Id : l'établissement
// actif passe donc en paramètre (establishmentScope, lu par tenant.middleware).
export const downloadReport = (format: 'csv' | 'pdf', params: Record<string, string>, allEstablishments?: boolean) => {
  const activeId = getActiveEstablishmentId();
  const query = new URLSearchParams({
    ...params,
    ...(activeId && !allEstablishments ? { establishmentScope: activeId } : {}),
  }).toString();
  const url = `${API_BASE}/reports/${format}${query ? `?${query}` : ''}`;
  window.open(url, '_blank');
};
