import { api } from '@/lib/axios';
import type { StayDetail } from './types';

// Prestations de l'hôtel (pressing, blanchisserie, room service…)

export interface HotelService {
  id: string;
  name: string;
  category: string;
  price: string;
  isActive: boolean;
}

export const SERVICE_CATEGORIES = ['Pressing', 'Blanchisserie', 'Room service', 'Navette', 'Mini-bar', 'Autre'];

export const fetchHotelServices = async (): Promise<HotelService[]> => (await api.get('/hotel/services')).data.services;
export const createHotelService = async (payload: { name: string; category: string; price: number }): Promise<HotelService> =>
  (await api.post('/hotel/services', payload)).data.service;
export const updateHotelService = async (
  id: string,
  payload: Partial<{ name: string; category: string; price: number; isActive: boolean }>
): Promise<HotelService> => (await api.patch(`/hotel/services/${id}`, payload)).data.service;

export const addStayCharge = async (
  stayId: string,
  payload: { serviceId?: string; label?: string; category?: string; quantity: number; unitPrice?: number; note?: string }
): Promise<StayDetail> => (await api.post(`/hotel/stays/${stayId}/charges`, payload)).data.stay;
export const deleteStayCharge = async (stayId: string, chargeId: string): Promise<StayDetail> =>
  (await api.delete(`/hotel/stays/${stayId}/charges/${chargeId}`)).data.stay;
