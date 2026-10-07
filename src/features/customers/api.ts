import { api } from '@/lib/axios';
import { Customer, CustomerDetail, CustomerPayment } from './types';

export const fetchCustomers = async (): Promise<Customer[]> => {
  const res = await api.get('/customers');
  return res.data.customers;
};

export const fetchCustomer = async (id: string): Promise<CustomerDetail> => {
  const res = await api.get(`/customers/${id}`);
  return res.data.customer;
};

export interface CustomerPayload {
  name: string;
  phone?: string;
  address?: string;
  creditLimit?: number;
  establishmentId?: string;
}

export const createCustomer = async (payload: CustomerPayload): Promise<Customer> => {
  const res = await api.post('/customers', payload);
  return res.data.customer;
};

export const updateCustomer = async (
  id: string,
  payload: Partial<CustomerPayload> & { isActive?: boolean }
): Promise<Customer> => {
  const res = await api.patch(`/customers/${id}`, payload);
  return res.data.customer;
};

export const recordCustomerPayment = async (
  customerId: string,
  payload: { amount: number; method: string; note?: string }
): Promise<CustomerPayment> => {
  const res = await api.post(`/customers/${customerId}/payments`, payload);
  return res.data.payment;
};
