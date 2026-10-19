import { api } from '@/lib/axios';
import { Establishment } from './types';

export const fetchEstablishments = async (): Promise<Establishment[]> => {
  const res = await api.get('/establishments');
  return res.data.establishments;
};

// Le logo ne passe plus par ce payload : il s'envoie comme fichier, via
// uploadEstablishmentLogo (une fois l'établissement créé)
export interface EstablishmentPayload {
  name: string;
  type: string;
  address?: string;
  // null efface la valeur
  phone?: string | null;
  email?: string | null;
  postalBox?: string | null;
  nif?: string | null;
  rc?: string | null;
}

export const createEstablishment = async (
  payload: EstablishmentPayload
): Promise<Establishment> => {
  const res = await api.post('/establishments', payload);
  return res.data.establishment;
};

export const updateEstablishment = async (
  id: string,
  payload: Partial<EstablishmentPayload>
): Promise<Establishment> => {
  const res = await api.patch(`/establishments/${id}`, payload);
  return res.data.establishment;
};

// Logo envoyé depuis le poste : png ou jpg, 1 Mo maximum (contrôlé par le backend)
export const uploadEstablishmentLogo = async (id: string, file: File): Promise<Establishment> => {
  const formData = new FormData();
  formData.append('image', file);
  const res = await api.post(`/establishments/${id}/logo`, formData);
  return res.data.establishment;
};

export const removeEstablishmentLogo = async (id: string): Promise<Establishment> => {
  const res = await api.delete(`/establishments/${id}/logo`);
  return res.data.establishment;
};
