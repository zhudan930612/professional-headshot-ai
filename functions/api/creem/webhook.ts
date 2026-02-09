/**
 * Cloudflare Pages Function - Creem 支付回调 Webhook
 */

interface Env {
  CREEM_WEBHOOK_SECRET: string;
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
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

/**
 * 使用 Web Crypto API 验证 HMAC-SHA256 签名
 */
async function verifyCreemSignature(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    // 转换为十六进制字符串
    const hashArray = Array.from(new Uint8Array(signatureBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex === signature;
  } catch (error) {
    console.error('签名验证失败:', error);
    return false;
  }
}

/**
 * 处理支付退款
 */
async function handleRefund(orderId: string, supabase: any): Promise<void> {
  try {
    const { data: payment } = await supabase
      .from('payment_transactions')
      .select('subscription_id')
      .eq('creem_order_id', orderId)
      .single();

    if (!payment?.subscription_id) {
      return;
    }

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
  price: number,
  supabase: any
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.admin.getUserById(userId);

    if (!user?.email) {
      return;
    }

    console.log(`📧 应该发送订阅确认邮件给 ${user.email}`);
  } catch (error) {
    console.error('发送邮件失败:', error);
  }
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-creem-signature',
    'Content-Type': 'application/json',
  };

  try {
    // 动态导入 Supabase
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      context.env.VITE_SUPABASE_URL,
      context.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // 获取签名和请求体
    const signature = context.request.headers.get('x-creem-signature');
    const bodyText = await context.request.text();

    if (!signature) {
      console.warn('缺少 x-creem-signature header');
      return new Response(
        JSON.stringify({ error: '缺少签名' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 验证签名
    const secret = context.env.CREEM_WEBHOOK_SECRET;
    if (!secret) {
      console.error('CREEM_WEBHOOK_SECRET 环境变量未设置');
      return new Response(
        JSON.stringify({ error: '配置错误' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const isValid = await verifyCreemSignature(bodyText, signature, secret);
    if (!isValid) {
      console.warn('❌ Creem 签名验证失败');
      return new Response(
        JSON.stringify({ error: '签名验证失败' }),
        { status: 401, headers: corsHeaders }
      );
    }

    console.log('✅ Creem 签名验证成功');

    // 解析 Webhook 数据
    const webhookData: CreemWebhookPayload = JSON.parse(bodyText);

    // 更新支付交易记录
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
    }

    // 如果支付成功，创建订阅
    if (webhookData.status === 'completed') {
      const { user_id: userId, plan_type: planType } = webhookData.metadata;

      // 获取套餐配置
      const { data: plan } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planType)
        .single();

      if (!plan) {
        console.error('套餐配置不存在:', planType);
      } else {
        // 1. 查询用户当前所有订阅
        const { data: existingSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active');

        // 计算当前已使用的总配额
        const currentUsedQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.used_quota || 0), 0) || 0;

        // 2. 计算累加后的配额
        const existingPurchasedQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.purchased_quota || 0), 0) || 0;
        const existingBonusQuota = existingSubscriptions?.reduce((sum, sub) => sum + (sub.bonus_quota || 0), 0) || 0;
        
        const totalPurchasedQuota = existingPurchasedQuota + plan.quota;
        const totalBonusQuota = existingBonusQuota + plan.bonus_quota;

        console.log(`📊 配额累加: 之前 ${existingPurchasedQuota}+${existingBonusQuota}, 新增 ${plan.quota}+${plan.bonus_quota}, 已使用 ${currentUsedQuota}`);

        // 3. 删除所有旧订阅
        await supabase
          .from('user_subscriptions')
          .delete()
          .eq('user_id', userId);

        // 4. 插入新的合并订阅
        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_type: planType,
            status: 'active',
            purchased_quota: totalPurchasedQuota,
            bonus_quota: totalBonusQuota,
            used_quota: currentUsedQuota,
            payment_id: webhookData.order_id,
            amount: plan.price,
            currency: webhookData.currency,
            expires_at: null
          });

        if (subscriptionError) {
          console.error('创建订阅失败:', subscriptionError);
        } else {
          console.log(`✅ 为用户 ${userId} 创建了 ${planType} 订阅，总配额: ${totalPurchasedQuota}+${totalBonusQuota}，已使用: ${currentUsedQuota}`);

          await sendSubscriptionConfirmationEmail(userId, planType, plan.price, supabase);
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
      await handleRefund(webhookData.order_id, supabase);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('处理 Webhook 异常:', error);
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: corsHeaders }
    );
  }
}

/**
 * 处理 CORS preflight 请求
 */
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, x-creem-signature',
    },
  });
}
