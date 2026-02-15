import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Creem Payment API - Create Payment
 *
 * 创建 Creem 支付订单的 Serverless Function
 *
 * 请求方法: POST
 * 请求体: { planType: 'professional' | 'executive' }
 *
 * 响应:
 * {
 *   "orderId": "creem_order_id",
 *   "paymentUrl": "https://pay.creem.com/..."
 * }
 */

// Supabase 初始化
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    db: { schema: 'headshot_ai' },
  }
);

interface CreatePaymentRequest {
  planType: string;
}

interface CreemPaymentResponse {
  order_id: string;
  payment_url: string;
  amount: number;
  currency: string;
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
    // 1. 解析请求体
    const { planType } = req.body as CreatePaymentRequest;

    if (!planType || !['professional', 'executive'].includes(planType)) {
      return res.status(400).json({ error: '无效的套餐类型' });
    }

    // 2. 从 Authorization header 获取用户 ID
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未授权' });
    }

    const token = authHeader.substring(7);

    // 验证 token 并获取用户信息
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.id) {
      return res.status(401).json({ error: '无效的认证令牌' });
    }

    const userId = user.id;

    // 3. 获取套餐配置
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planType)
      .single();

    if (planError || !plan) {
      return res.status(400).json({ error: '套餐不存在' });
    }

    // 4. 调用 Creem API 创建支付订单
    // 注意：这是一个示例实现，实际 API 调用需要根据 Creem 官方文档进行调整

    const creemApiKey = process.env.CREEM_API_KEY;
    if (!creemApiKey) {
      console.error('CREEM_API_KEY 环境变量未设置');
      return res.status(500).json({ error: '支付服务配置错误' });
    }

    const appUrl = process.env.APP_URL || 'https://example.com';

    // 构建 Creem API 请求（示例）
    const creemResponse = await fetch('https://api.creem.io/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creemApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(plan.price * 100), // 转换为分（Creem 要求）
        currency: 'USD',
        description: `Professional Headshot - ${plan.display_name} Plan`,
        metadata: {
          user_id: userId,
          plan_type: planType
        },
        return_url: `${appUrl}/#/payment/success`,
        cancel_url: `${appUrl}/#/payment/cancel`
      })
    });

    if (!creemResponse.ok) {
      const errorText = await creemResponse.text();
      console.error('Creem API 请求失败:', errorText);
      return res.status(500).json({ error: 'Creem API 错误' });
    }

    const creemData: CreemPaymentResponse = await creemResponse.json();

    // 5. 在数据库中创建待处理的支付记录
    const { error: insertError } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: userId,
        plan_type: planType,
        amount: plan.price,
        currency: 'USD',
        creem_order_id: creemData.order_id,
        status: 'pending',
        metadata: {
          plan_name: plan.display_name,
          quota: plan.quota,
          bonus_quota: plan.bonus_quota
        }
      });

    if (insertError) {
      console.error('插入支付记录失败:', insertError);
      return res.status(500).json({ error: '保存支付信息失败' });
    }

    console.log(`✅ 为用户 ${userId} 创建了 ${planType} 支付订单`);

    // 6. 返回支付链接给前端
    return res.status(200).json({
      orderId: creemData.order_id,
      paymentUrl: creemData.payment_url
    });
  } catch (error) {
    console.error('创建支付订单异常:', error);
    return res.status(500).json({
      error: '创建支付订单失败',
      details: error instanceof Error ? error.message : '未知错误'
    });
  }
}
