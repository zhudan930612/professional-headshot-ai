import { supabase } from '../lib/supabase';

/**
 * 支付相关服务
 * 与 Creem 支付网关集成
 */

export interface CreemPaymentResponse {
  orderId: string;
  paymentUrl: string;
}

export interface PaymentStatusResponse {
  status: 'pending' | 'completed' | 'failed';
  order_id: string;
  transaction_id?: string;
  amount: number;
  currency: string;
}

/**
 * 创建 Creem 支付订单
 * @param planType 套餐类型 ('professional' 或 'executive')
 * @returns 返回订单 ID 和支付链接
 */
export async function createCreemPayment(
  planType: string
): Promise<CreemPaymentResponse> {
  try {
    // 获取当前用户的 session token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error('用户未登录，请先登录');
    }

    const response = await fetch('/api/creem/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ planType })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '创建支付订单失败');
    }

    const data = await response.json();
    return {
      orderId: data.orderId,
      paymentUrl: data.paymentUrl
    };
  } catch (error) {
    console.error('创建支付订单失败:', error);
    throw error;
  }
}

/**
 * 查询支付状态
 * @param orderId Creem 订单 ID
 * @returns 返回支付状态信息
 */
export async function getPaymentStatus(
  orderId: string
): Promise<PaymentStatusResponse> {
  try {
    const response = await fetch(
      `/api/creem/payment-status?orderId=${encodeURIComponent(orderId)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '查询支付状态失败');
    }

    return await response.json();
  } catch (error) {
    console.error('查询支付状态失败:', error);
    throw error;
  }
}

/**
 * 获取支付交易历史
 * @returns 返回当前用户的支付交易列表
 */
export async function getPaymentHistory() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('用户未登录');
    }

    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('获取支付历史失败:', error);
    throw error;
  }
}

/**
 * 手动刷新订阅状态
 * 在支付回调延迟的情况下调用此函数来检查订阅是否已激活
 */
export async function refreshSubscriptionStatus(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) {
      throw new Error('用户未登录');
    }

    // 查询最新的待处理支付
    const { data: pendingPayment } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!pendingPayment) {
      console.log('没有待处理的支付');
      return false;
    }

    // 查询 Creem 获取最新状态
    const paymentStatus = await getPaymentStatus(pendingPayment.creem_order_id);

    if (paymentStatus.status === 'completed') {
      // 更新本地支付记录状态
      await supabase
        .from('payment_transactions')
        .update({
          status: 'completed',
          creem_transaction_id: paymentStatus.transaction_id,
          completed_at: new Date().toISOString()
        })
        .eq('creem_order_id', pendingPayment.creem_order_id);

      console.log('✅ 订阅状态已更新');
      return true;
    }

    return false;
  } catch (error) {
    console.error('刷新订阅状态失败:', error);
    // 刷新失败不抛出错误，允许用户继续操作
    return false;
  }
}
