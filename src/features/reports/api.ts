import { api } from '@/lib/axios';
import { DashboardSummary } from '@/features/dashboard/types';

// La réponse de /api/reports a exactement la même forme que le résumé du
// dashboard (les deux passent par report.service.ts côté backend)
export type ReportData = DashboardSummary;

export const fetchReport = async (params: Record<string, string>): Promise<ReportData> => {
  const res = await api.get('/reports', { params });
  return res.data;
};

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Téléchargement direct plutôt que via axios : le cookie HttpOnly est envoyé
// automatiquement sur une navigation classique, et le backend force le
// téléchargement via Content-Disposition — pas besoin de gérer un blob ici.
export const downloadReport = (format: 'csv' | 'pdf', params: Record<string, string>) => {
  const query = new URLSearchParams(params).toString();
  const url = `${API_BASE}/reports/${format}${query ? `?${query}` : ''}`;
  window.open(url, '_blank');
};
