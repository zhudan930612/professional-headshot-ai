import type { UserSubscription, SubscriptionPlanConfig } from '@/types';
import { api } from './apiClient';
export const getSubscriptionPlans = (): Promise<SubscriptionPlanConfig[]> => api('/api/plans');
export const getUserActiveSubscription = async (): Promise<UserSubscription | null> =>
  (await api<{ subscription: UserSubscription | null }>('/api/account')).subscription;
