import { api } from '@/lib/axios';
import type {
  Room,
  RoomPayload,
  RoomStatus,
  StayDetail,
  StayListItem,
  StayPayload,
  StayPaymentMethod,
  StayStatus,
  TaxRate,
} from './types';

// --- Chambres ---
export const fetchRooms = async (): Promise<Room[]> => (await api.get('/hotel/rooms')).data.rooms;
export const createRoom = async (payload: RoomPayload): Promise<Room> => (await api.post('/hotel/rooms', payload)).data.room;
export const updateRoom = async (id: string, payload: Partial<RoomPayload> & { isActive?: boolean }): Promise<Room> =>
  (await api.patch(`/hotel/rooms/${id}`, payload)).data.room;
export const setRoomStatus = async (id: string, status: Exclude<RoomStatus, 'OCCUPIED'>): Promise<Room> =>
  (await api.patch(`/hotel/rooms/${id}/status`, { status })).data.room;

// --- Taxe de séjour ---
export const fetchTaxRates = async (): Promise<TaxRate[]> => (await api.get('/hotel/tax-rates')).data.rates;
export const saveTaxRates = async (rates: TaxRate[]): Promise<TaxRate[]> =>
  (await api.put('/hotel/tax-rates', { rates })).data.rates;

// --- Séjours ---
export const fetchStays = async (params: { status?: StayStatus[]; from?: string; to?: string } = {}): Promise<StayListItem[]> =>
  (
    await api.get('/hotel/stays', {
      params: { ...params, status: params.status?.join(',') || undefined },
    })
  ).data.stays;
// Clients en séjour dans tous les hôtels du propriétaire (« Sur la chambre »)
export interface InHouseGuest {
  id: string;
  guestName: string;
  room: { number: string; building: string };
  group: { name: string } | null;
  establishment: { id: string; name: string };
}
export const fetchInHouseGuests = async (): Promise<InHouseGuest[]> => (await api.get('/hotel/in-house')).data.stays;

// Remise sur la facture du séjour (propriétaire / administrateur)
export const setStayDiscount = async (
  id: string,
  payload: { mode: 'PERCENT' | 'AMOUNT' | 'NONE'; value?: number; reason?: string }
): Promise<StayDetail> => (await api.patch(`/hotel/stays/${id}/discount`, payload)).data.stay;

export const fetchStay = async (id: string): Promise<StayDetail> => (await api.get(`/hotel/stays/${id}`)).data.stay;
export const createStay = async (payload: StayPayload): Promise<StayDetail> => (await api.post('/hotel/stays', payload)).data.stay;
export const updateStay = async (id: string, payload: Partial<StayPayload>): Promise<StayDetail> =>
  (await api.patch(`/hotel/stays/${id}`, payload)).data.stay;
export const checkInStay = async (id: string): Promise<StayDetail> => (await api.post(`/hotel/stays/${id}/check-in`)).data.stay;
// force : départ malgré un solde impayé (sinon le serveur répond 409 BALANCE_DUE)
export const checkOutStay = async (id: string, force = false): Promise<StayDetail> =>
  (await api.post(`/hotel/stays/${id}/check-out`, { force })).data.stay;
// advance : que faire de l'avance versée (REFUND = rendue, RETAIN = conservée)
export const cancelStay = async (
  id: string,
  options: { advance?: 'REFUND' | 'RETAIN'; cashSessionId?: string } = {}
): Promise<StayDetail> => (await api.post(`/hotel/stays/${id}/cancel`, options)).data.stay;
export const addStayPayment = async (
  id: string,
  payload: { method: StayPaymentMethod; amount: number; note?: string; cashSessionId?: string; customerId?: string }
): Promise<StayDetail> => (await api.post(`/hotel/stays/${id}/payments`, payload)).data.stay;

// Message d'erreur renvoyé par l'API (ou message par défaut)
export const apiError = (err: unknown, fallback: string) =>
  (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? fallback;
