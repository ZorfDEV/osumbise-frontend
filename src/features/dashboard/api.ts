import { ALL_ESTABLISHMENTS, api } from '@/lib/axios';
import { DashboardSummary, HourlySales, StaffPerformance } from './types';

// `allEstablishments` : vue consolidée d'un propriétaire (toute l'organisation)
// au lieu de l'établissement actif choisi dans la Topbar
const scope = (allEstablishments?: boolean) => (allEstablishments ? ALL_ESTABLISHMENTS : {});

export const fetchDashboardSummary = async (date?: string, allEstablishments?: boolean): Promise<DashboardSummary> => {
  const res = await api.get('/dashboard/summary', { params: date ? { date } : undefined, ...scope(allEstablishments) });
  return res.data;
};

export const fetchHourlySales = async (date?: string, allEstablishments?: boolean): Promise<HourlySales> => {
  const res = await api.get('/dashboard/hourly-sales', { params: date ? { date } : undefined, ...scope(allEstablishments) });
  return res.data;
};

export const fetchStaffPerformance = async (date?: string, allEstablishments?: boolean): Promise<StaffPerformance> => {
  const res = await api.get('/dashboard/staff-performance', {
    params: date ? { date } : undefined,
    ...scope(allEstablishments),
  });
  return res.data;
};
