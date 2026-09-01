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
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/entries', payload);
};

export const createLoss = async (payload: {
  productId: string;
  quantity: number;
  type?: 'PERTE' | 'CASSE';
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/losses', payload);
};

export const createAdjustment = async (payload: {
  productId: string;
  countedQuantity: number;
  reason?: string;
}): Promise<void> => {
  await api.post('/stock/adjustments', payload);
};
