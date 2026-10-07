import { api } from '@/lib/axios';
import { OrganizationSummary, OrganizationDetail, RevenueSummary } from './types';
import { SubscriptionStatus } from '@/features/billing/types';

export const fetchRevenueSummary = async (): Promise<RevenueSummary> => {
  const res = await api.get('/platform-admin/revenue');
  return res.data;
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
