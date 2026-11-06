import type { UserSubscription, SubscriptionPlanConfig } from '@/types';
import { api } from './apiClient';
export const getSubscriptionPlans = (signal?: AbortSignal): Promise<SubscriptionPlanConfig[]> => api('/api/plans', { signal });
export const getUserActiveSubscription = async (): Promise<UserSubscription | null> =>
  (await api<{ subscription: UserSubscription | null }>('/api/account')).subscription;
