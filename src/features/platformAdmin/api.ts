import { api } from '@/lib/axios';
import { OrganizationSummary, OrganizationDetail, PendingPayment, PlanRequest, RevenueSummary } from './types';
import { SubscriptionStatus } from '@/features/billing/types';

export const fetchRevenueSummary = async (): Promise<RevenueSummary> => {
  const res = await api.get('/platform-admin/revenue');
  return res.data;
};

export const fetchPendingPayments = async (): Promise<PendingPayment[]> => {
  const res = await api.get('/platform-admin/payments/pending');
  return res.data.payments;
};

export const reviewPayment = async (id: string, approve: boolean): Promise<void> => {
  await api.post(`/platform-admin/payments/${id}/review`, { approve });
};

export const fetchPlanRequests = async (): Promise<PlanRequest[]> => {
  const res = await api.get('/platform-admin/plan-requests');
  return res.data.requests;
};

export const reviewPlanRequest = async (id: string, approve: boolean, planId: string): Promise<void> => {
  await api.post(`/platform-admin/plan-requests/${id}/review`, { approve, planId });
};

export const fetchOrganizations = async (search?: string): Promise<OrganizationSummary[]> => {
  const res = await api.get('/platform-admin/organizations', { params: { search } });
  return res.data.organizations;
};

export const fetchOrganization = async (id: string): Promise<OrganizationDetail> => {
  const res = await api.get(`/platform-admin/organizations/${id}`);
  return res.data.organization;
};

export interface UpdateSubscriptionAdminPayload {
  status?: SubscriptionStatus;
  planId?: string;
  currentPeriodEnd?: string; // ISO
}

export const updateSubscriptionAdmin = async (
  organizationId: string,
  payload: UpdateSubscriptionAdminPayload
) => {
  const res = await api.patch(
    `/platform-admin/organizations/${organizationId}/subscription`,
    payload
  );
  return res.data.subscription;
};

export const updateOwnerStatus = async (organizationId: string, isActive: boolean) => {
  const res = await api.patch(`/platform-admin/organizations/${organizationId}/owner-status`, {
    isActive,
  });
  return res.data.users;
};
