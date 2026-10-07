import { api } from '@/lib/axios';
import { Plan, Subscription, SubscriptionPayment } from './types';

export const fetchPlans = async (): Promise<Plan[]> => {
  const res = await api.get('/plans');
  return res.data.plans;
};

export const fetchSubscription = async (): Promise<Subscription> => {
  const res = await api.get('/subscription');
  return res.data.subscription;
};

export const selectPlan = async (planId: string): Promise<Subscription> => {
  const res = await api.post('/subscription', { planId });
  return res.data.subscription;
};

export const initiateSubscriptionPayment = async (
  phone: string
): Promise<SubscriptionPayment> => {
  const res = await api.post('/subscription/pay', { phone });
  return res.data.payment;
};

export const fetchPaymentStatus = async (paymentId: string): Promise<SubscriptionPayment> => {
  const res = await api.get(`/subscription/pay/${paymentId}`);
  return res.data.payment;
};
