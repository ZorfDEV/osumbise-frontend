import { Plan, SubscriptionStatus, SubscriptionPayment } from '@/features/billing/types';

export interface OwnerSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  createdAt: string;
  users: OwnerSummary[]; // les OWNER de cette organisation (généralement un seul)
  subscription: {
    id: string;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    plan: Plan;
  } | null;
  _count: { establishments: number; users: number };
}

export interface OrganizationMember {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface OrganizationDetail {
  id: string;
  name: string;
  createdAt: string;
  users: OrganizationMember[];
  establishments: { id: string; name: string; type: string }[];
  subscription:
    | {
        id: string;
        status: SubscriptionStatus;
        currentPeriodEnd: string;
        plan: Plan;
        payments: SubscriptionPayment[];
      }
    | null;
}

export interface RevenueSummary {
  mrr: number;
  totalCollected: number;
  statusCounts: { status: SubscriptionStatus; count: number }[];
  byPlan: { planName: string; count: number; monthlyRevenue: number }[];
}
