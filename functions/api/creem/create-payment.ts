/**
 * Cloudflare Pages Function - Creem 创建支付订单
 */

interface Env {
  CREEM_API_KEY: string;
  VITE_SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  VITE_APP_URL: string;
}

interface CreatePaymentRequest {
  planType: string;
}

interface CreemPaymentResponse {
  order_id: string;
  payment_url: string;
  amount: number;
  currency: string;
}

export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  try {
    // 动态导入 Supabase (Cloudflare Workers 兼容)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      context.env.VITE_SUPABASE_URL,
      context.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const body = await context.request.json() as CreatePaymentRequest;
    const { planType } = body;

    if (!planType || !['professional', 'executive'].includes(planType)) {
      return new Response(
        JSON.stringify({ error: '无效的套餐类型' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 获取 Authorization header
    const authHeader = context.request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: '未授权' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const token = authHeader.substring(7);

    // 验证 token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ error: '无效的认证令牌' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = user.id;

    // 获取套餐配置
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planType)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: '套餐不存在' }),
        { status: 400, headers: corsHeaders }
      );
    }

    // 调用 Creem API
    const creemApiKey = context.env.CREEM_API_KEY;
    if (!creemApiKey) {
      console.error('CREEM_API_KEY 环境变量未设置');
      return new Response(
        JSON.stringify({ error: '支付服务配置错误' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const appUrl = context.env.VITE_APP_URL || 'https://example.com';

    const creemResponse = await fetch('https://api.creem.io/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creemApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: Math.round(plan.price * 100),
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
      return new Response(
        JSON.stringify({ error: 'Creem API 错误' }),
        { status: 500, headers: corsHeaders }
      );
    }

    const creemData: CreemPaymentResponse = await creemResponse.json();

    // 保存支付记录
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
      return new Response(
        JSON.stringify({ error: '保存支付信息失败' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`✅ 为用户 ${userId} 创建了 ${planType} 支付订单`);

    return new Response(
      JSON.stringify({
        orderId: creemData.order_id,
        paymentUrl: creemData.payment_url
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('创建支付订单异常:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return new Response(
      JSON.stringify({
        error: '创建支付订单失败',
        details: errorMessage
      }),
      { status: 500, headers: corsHeaders }
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
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
