import { api } from '@/lib/axios';
import { PurchaseOrder } from './types';

export const fetchPurchaseOrders = async (params?: {
  status?: string;
  supplierId?: string;
}): Promise<PurchaseOrder[]> => {
  const res = await api.get('/purchase-orders', { params });
  return res.data.purchaseOrders;
};

export const fetchPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
  const res = await api.get(`/purchase-orders/${id}`);
  return res.data.purchaseOrder;
};

export const createPurchaseOrder = async (payload: {
  supplierId: string;
  establishmentId?: string;
}): Promise<PurchaseOrder> => {
  const res = await api.post('/purchase-orders', payload);
  return res.data.purchaseOrder;
};

export const addPurchaseItem = async (
  poId: string,
  payload: { productId: string; quantity: number; unitPrice: number }
): Promise<void> => {
  await api.post(`/purchase-orders/${poId}/items`, payload);
};

export const removePurchaseItem = async (poId: string, itemId: string): Promise<void> => {
  await api.delete(`/purchase-orders/${poId}/items/${itemId}`);
};

export const updatePurchaseOrderStatus = async (poId: string, status: string): Promise<void> => {
  await api.patch(`/purchase-orders/${poId}/status`, { status });
};

export const receivePurchaseOrder = async (poId: string): Promise<void> => {
  await api.post(`/purchase-orders/${poId}/receive`);
};
