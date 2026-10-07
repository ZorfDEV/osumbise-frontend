export interface Plan {
  id: string;
  name: string;
  price: string;
  maxEstablishments: number;
  maxUsers: number;
  features: string[];
}

export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodEnd: string;
  plan: Plan;
}

export type SubscriptionPaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface SubscriptionPayment {
  id: string;
  amount: string;
  phone: string;
  status: SubscriptionPaymentStatus;
  createdAt?: string;
}
