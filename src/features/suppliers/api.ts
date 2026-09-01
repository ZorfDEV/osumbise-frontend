import { api } from '@/lib/axios';
import { Supplier } from './types';

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const res = await api.get('/suppliers');
  return res.data.suppliers;
};

export interface SupplierPayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  establishmentId?: string;
}

export const createSupplier = async (payload: SupplierPayload): Promise<Supplier> => {
  const res = await api.post('/suppliers', payload);
  return res.data.supplier;
};

export const updateSupplier = async (
  id: string,
  payload: Partial<SupplierPayload>
): Promise<Supplier> => {
  const res = await api.patch(`/suppliers/${id}`, payload);
  return res.data.supplier;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await api.delete(`/suppliers/${id}`);
};
