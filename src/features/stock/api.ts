import { api } from '@/lib/axios';
import { StockMovement, StockAlert } from './types';

export const fetchMovements = async (productId?: string): Promise<StockMovement[]> => {
  const res = await api.get('/stock/movements', {
    params: productId ? { productId } : undefined,
  });
  return res.data.movements;
};

export const fetchAlerts = async (): Promise<StockAlert[]> => {
  const res = await api.get('/stock/alerts');
  return res.data.alerts;
};

export const createEntry = async (payload: {
  productId: string;
  quantity: number;
  location?: 'SALES' | 'RESERVE';
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/entries', payload);
};

export const createLoss = async (payload: {
  productId: string;
  quantity: number;
  type?: 'PERTE' | 'CASSE';
  location?: 'SALES' | 'RESERVE';
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/losses', payload);
};

export const createAdjustment = async (payload: {
  productId: string;
  countedQuantity: number;
  location?: 'SALES' | 'RESERVE';
  reason: string;
}): Promise<void> => {
  await api.post('/stock/adjustments', payload);
};

// Déstockage réserve → vente (ou retour en réserve)
export const createTransfer = async (payload: {
  productId: string;
  quantity: number;
  direction: 'TO_SALES' | 'TO_RESERVE';
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/transfer', payload);
};

// Corriger une entrée erronée : nouvelle quantité + justification obligatoire
export const correctMovement = async (movementId: string, payload: { quantity: number; reason: string }): Promise<void> => {
  await api.post(`/stock/movements/${movementId}/correct`, payload);
};
