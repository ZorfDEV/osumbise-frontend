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
  openingBalance: number
): Promise<CashSession> => {
  const res = await api.post(`/cash-registers/${registerId}/sessions`, { openingBalance });
  return res.data.session;
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
