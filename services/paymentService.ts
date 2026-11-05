import { api } from './apiClient';
export interface CreemPaymentResponse { orderId: string; checkoutId?: string; paymentId?: string; paymentUrl: string }
export interface PaymentStatusResponse {
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  order_id: string | null; transaction_id?: string; amount: number; currency: string;
}
export const createCreemPayment = (planType: string): Promise<CreemPaymentResponse> =>
  api('/api/creem/create-payment', { method: 'POST', body: JSON.stringify({ planType }) });
export const getPaymentStatus = (orderId: string, signal?: AbortSignal): Promise<PaymentStatusResponse> =>
  api(`/api/creem/payment-status?orderId=${encodeURIComponent(orderId)}`, { signal });
export const getPaymentHistory = (): Promise<{ id: string; status: string; amount: number; currency: string; plan_type: string; created_at: string }[]> => api('/api/payments');
export async function refreshSubscriptionStatus(): Promise<boolean> {
  const pending = (await getPaymentHistory()).find(payment => payment.status === 'pending');
  return pending ? (await getPaymentStatus(pending.id)).status === 'completed' : false;
}
