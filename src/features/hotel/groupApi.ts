import { api } from '@/lib/axios';
import type { StayDetail, StayPaymentMethod, StayStatus, StayTotals } from './types';

// Réservation de groupe (entreprise) : plusieurs chambres, une facture unique

export interface StayGroupListItem {
  id: string;
  number?: number | null;
  name: string;
  createdAt: string;
  customer: { name: string } | null;
  stays: { id: string; status: StayStatus; checkInDate: string; checkOutDate: string }[];
}

export interface StayGroupDetail {
  id: string;
  number?: number | null;
  name: string;
  contactPhone: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: string; name: string; balance: string; creditLimit: string | null } | null;
  establishment: {
    name: string;
    address: string | null;
    logo: string | null;
    phone?: string | null;
    email?: string | null;
    postalBox?: string | null;
    nif?: string | null;
    rc?: string | null;
  };
  user: { name: string };
  stays: (StayDetail & { totals: StayTotals })[];
  totals: StayTotals & { rooms: number };
}

export interface StayGroupPayload {
  name: string;
  customerId?: string;
  contactPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  notes?: string;
  checkInNow?: boolean;
  rooms: { roomId: string; guestName?: string; adults: number; children: number }[];
}

export const fetchStayGroups = async (): Promise<StayGroupListItem[]> => (await api.get('/hotel/groups')).data.groups;
export const fetchStayGroup = async (id: string): Promise<StayGroupDetail> => (await api.get(`/hotel/groups/${id}`)).data.group;
export const createStayGroup = async (payload: StayGroupPayload): Promise<StayGroupDetail> =>
  (await api.post('/hotel/groups', payload)).data.group;
export const checkInStayGroup = async (id: string): Promise<StayGroupDetail> =>
  (await api.post(`/hotel/groups/${id}/check-in`)).data.group;
export const checkOutStayGroup = async (id: string, force = false): Promise<StayGroupDetail> =>
  (await api.post(`/hotel/groups/${id}/check-out`, { force })).data.group;
export const addStayGroupPayment = async (
  id: string,
  payload: { method: StayPaymentMethod; amount: number; note?: string; cashSessionId?: string; customerId?: string }
): Promise<StayGroupDetail> => (await api.post(`/hotel/groups/${id}/payments`, payload)).data.group;
