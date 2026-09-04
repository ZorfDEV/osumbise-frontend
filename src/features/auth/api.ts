import { api } from '@/lib/axios';
import { AuthUser } from './types';

export const updateProfile = async (payload: {
  name?: string;
  email?: string;
}): Promise<AuthUser> => {
  const res = await api.patch('/auth/me', payload);
  return res.data.user;
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> => {
  await api.post('/auth/change-password', payload);
};
