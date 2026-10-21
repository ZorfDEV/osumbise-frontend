import { api } from '@/lib/axios';
import { CashRegister, CashSession } from './types';

export const fetchCashRegisters = async (): Promise<CashRegister[]> => {
  const res = await api.get('/cash-registers');
  return res.data.cashRegisters;
};

export const createCashRegister = async (payload: {
  name: string;
  establishmentId?: string;
}): Promise<CashRegister> => {
  const res = await api.post('/cash-registers', payload);
  return res.data.cashRegister;
};

export const openCashSession = async (
  registerId: string,
  openingBalance: number,
  // Fin de service prévue (obligatoire pour une caissière)
  plannedCloseAt?: string
): Promise<CashSession> => {
  const res = await api.post(`/cash-registers/${registerId}/sessions`, { openingBalance, plannedCloseAt });
  return res.data.session;
};

// Session ouverte de l'utilisateur connecté (où vont ses encaissements) ;
// null s'il n'en a pas (propriétaire/administrateur : celle de l'établissement)
export const fetchMyCashSession = async (): Promise<{ id: string; cashRegister: { name: string } } | null> => {
  const res = await api.get('/cash-sessions/mine');
  return res.data.session;
};

// Verrouiller / déverrouiller une caisse (propriétaire)
export const lockCashRegister = async (id: string, locked: boolean, reason?: string): Promise<void> => {
  await api.patch(`/cash-registers/${id}/lock`, { locked, reason });
};

export const fetchCashSession = async (id: string): Promise<CashSession> => {
  const res = await api.get(`/cash-sessions/${id}`);
  return res.data.session;
};

export const closeCashSession = async (
  id: string,
  actualBalance: number
): Promise<CashSession> => {
  const res = await api.post(`/cash-sessions/${id}/close`, { actualBalance });
  return res.data.session;
};

export const createCashMovement = async (
  sessionId: string,
  payload: { type: 'EXPENSE' | 'REFUND' | 'ADJUSTMENT'; amount: number; note?: string }
): Promise<void> => {
  await api.post(`/cash-sessions/${sessionId}/movements`, payload);
};
