import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

/**
 * Creem Payment Webhook Handler
 *
 * 处理 Creem 支付回调的 Serverless Function
 *
 * 当用户完成支付后，Creem 会向此端点发送 POST 请求
 * 必须验证签名以确保请求来自 Creem
 */

// Supabase 初始化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 验证 Creem 请求签名
 * Creem 使用 HMAC-SHA256 签名
 */
function verifyCreemSignature(
  payload: string,
  signature: string
): boolean {
  const secret = process.env.CREEM_WEBHOOK_SECRET;

  if (!secret) {
    console.error('CREEM_WEBHOOK_SECRET 环境变量未设置');
    return false;
  }

  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return hash === signature;
}

interface CreemWebhookPayload {
  event: string;
  order_id: string;
  transaction_id?: string;
  status: 'completed' | 'failed' | 'refunded';
  amount: number;
  currency: string;
  metadata: {
    user_id: string;
    plan_type: string;
  };
  created_at: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 仅允许 POST 请求
  if (req.method !== 'POST') {
    return res.status(405).json({ error: '不支持的方法' });
  }

  try {
    // 1. 获取签名和请求体
    const signature = req.headers['x-creem-signature'] as string;
    const payload = JSON.stringify(req.body);

    if (!signature) {
      console.warn('缺少 x-creem-signature header');
      return res.status(400).json({ error: '缺少签名' });
    }

    // 2. 验证签名
    if (!verifyCreemSignature(payload, signature)) {
      console.warn('❌ Creem 签名验证失败');
      return res.status(401).json({ error: '签名验证失败' });
    }

    console.log('✅ Creem 签名验证成功');

    // 3. 解析 Webhook 数据
    const webhookData = req.body as CreemWebhookPayload;

    // 4. 更新支付交易记录
    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: webhookData.status === 'completed' ? 'completed' : 'failed',
        creem_transaction_id: webhookData.transaction_id,
        completed_at: webhookData.status === 'completed' ? new Date().toISOString() : null,
        metadata: webhookData
      })
      .eq('creem_order_id', webhookData.order_id);

    if (updateError) {
      console.error('更新支付记录失败:', updateError);
      // 不返回错误，允许 Creem 重试
    }

    // 5. 如果支付成功，创建订阅
    if (webhookData.status === 'completed') {
      const { userId, planType } = webhookData.metadata;

      // 获取套餐配置
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planType)
        .single();

      if (!plan) {
        console.error('套餐配置不存在:', planType);
      } else {
        // 1. 查询用户当前所有订阅，获取已使用配额
        const { data: existingSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active');

        // 计算当前已使用的总配额
        const currentUsedQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.used_quota || 0), 0) || 0;

        // 2. 计算累加后的配额（保留之前的配额 + 新购买的配额）
        const existingPurchasedQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.purchased_quota || 0), 0) || 0;
        const existingBonusQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.bonus_quota || 0), 0) || 0;
        
        const totalPurchasedQuota = existingPurchasedQuota + plan.quota;
        const totalBonusQuota = existingBonusQuota + plan.bonus_quota;

        console.log(`📊 配额累加: 之前 ${existingPurchasedQuota}+${existingBonusQuota}, 新增 ${plan.quota}+${plan.bonus_quota}, 已使用 ${currentUsedQuota}`);

        // 3. 删除所有旧订阅（包括 free 和其他付费订阅）
        await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', userId);

        // 4. 插入新的合并订阅（累加所有配额，保留已使用次数）
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            purchased_quota: totalPurchasedQuota,
            bonus_quota: totalBonusQuota,
            used_quota: currentUsedQuota,  // 保留之前的使用次数
            payment_id: webhookData.order_id,
            amount: plan.price,
            currency: webhookData.currency,
            expires_at: null  // 永不过期
          });

        if (subscriptionError) {
          console.error('创建订阅失败:', subscriptionError);
          // 继续处理，不中断 webhook
        } else {
          console.log(`✅ 为用户 ${userId} 创建了 ${planType} 订阅，总配额: ${totalPurchasedQuota}+${totalBonusQuota}，已使用: ${currentUsedQuota}`);

          // 可选：发送邮件确认
          await sendSubscriptionConfirmationEmail(userId, planType, plan.price);
        }
      }

      // 更新支付交易记录，关联订阅 ID
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('plan_type', planType)
        .single();

      if (subscription) {
        await supabase
          .from('payment_transactions')
          .update({
            subscription_id: subscription.id
          })
          .eq('creem_order_id', webhookData.order_id);
      }
    } else if (webhookData.status === 'failed') {
      console.warn(`⚠️ 支付失败: ${webhookData.order_id}`);
    } else if (webhookData.status === 'refunded') {
      console.log(`💰 支付已退款: ${webhookData.order_id}`);
      // 处理退款逻辑（可选）
      await handleRefund(webhookData.order_id);
    }

    // 6. 返回 200 OK 给 Creem
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('处理 Webhook 异常:', error);
    // 返回 200 避免 Creem 重复发送
    // 在生产环境中应该将错误记录到监控系统
    return res.status(200).json({ received: true });
  }
}

/**
 * 处理支付退款
 */
async function handleRefund(orderId: string): Promise<void> {
  try {
    // 获取退款订单对应的订阅
    const { data: payment } = await supabase
      .from('payment_transactions')
      .select('subscription_id')
      .eq('creem_order_id', orderId)
      .single();

    if (!payment?.subscription_id) {
      return;
    }

    // 取消订阅
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', payment.subscription_id);

    console.log(`✅ 订阅 ${payment.subscription_id} 已因退款而取消`);
  } catch (error) {
    console.error('处理退款失败:', error);
  }
}

/**
 * 发送订阅确认邮件（可选）
 */
async function sendSubscriptionConfirmationEmail(
  userId: string,
  planType: string,
  price: number
): Promise<void> {
  try {
    // 获取用户邮箱
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);

    if (!user?.email) {
      return;
    }

    // 这里可以集成邮件服务（如 SendGrid、AWS SES 等）
    // 示例：await sendEmail(user.email, ...)
    console.log(`📧 应该发送订阅确认邮件给 ${user.email}`);
  } catch (error) {
    console.error('发送邮件失败:', error);
    // 邮件发送失败不应该中断 webhook 处理
  }
}
