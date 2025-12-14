import React, { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Layout } from '../components/Layout';
import { getSubscriptionPlans } from '../services/subscriptionService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { SubscriptionPlanConfig } from '../types';

// Creem 支付链接映射
const CREEM_PAYMENT_LINKS: { [key: string]: string } = {
  professional: 'https://www.creem.io/payment/prod_3VuEcSLV7nUFQIFYByNkaG',
  executive: 'https://www.creem.io/payment/prod_3goNXcJoP80L3mmWoAdkZs'
};

export const Pricing: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlanConfig[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const data = await getSubscriptionPlans();
        setPlans(data);
      } catch (err) {
        console.error('加载套餐失败:', err);
        setError('无法加载价格信息，请稍后重试');
      }
    };
    loadPlans();
  }, []);

  const handleSelectPlan = (planType: string) => {
    // Free 计划直接跳转
    if (planType === 'free') {
      navigate('/');
      return;
    }

    // 检查用户是否登录
    if (!user) {
      openAuthModal('/pricing');
      return;
    }

    // 获取对应的 Creem 支付链接
    const paymentUrl = CREEM_PAYMENT_LINKS[planType];
    if (!paymentUrl) {
      setError('该套餐暂无支付方式');
      return;
    }

    // 构建带有 return_url 的完整支付链接
    const returnUrl = `${window.location.origin}/#/subscription`;
    const fullPaymentUrl = `${paymentUrl}?return_url=${encodeURIComponent(returnUrl)}`;

    // 跳转到 Creem 支付页面
    window.location.href = fullPaymentUrl;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Choose the perfect plan for your professional headshot needs. All plans include our AI-powered generation technology.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {plans.map((plan) => {
              // 直接判断：professional 套餐为 Most Popular
              const isPopular = plan.id === 'professional';
              return (
                <div
                  key={plan.id}
                  className={`
                    rounded-3xl transition-all duration-300 overflow-hidden flex flex-col h-full relative
                    ${isPopular ? 'popular-card' : 'regular-card'}
                  `}
                  style={isPopular ? {
                    borderWidth: '2px',
                    borderColor: '#3b82f6',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                    background: 'linear-gradient(to bottom right, #eff6ff, #ffffff)',
                  } : {
                    borderWidth: '1px',
                    borderColor: '#e2e8f0',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    background: '#ffffff'
                  }}
                >
                  {/* Top gradient bar for popular */}
                  {isPopular && (
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{
                        background: 'linear-gradient(to right, #60a5fa, #3b82f6, #1d4ed8)'
                      }}
                    ></div>
                  )}

                  {/* Plan Header */}
                  <div className="p-8">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="font-bold text-slate-900 text-2xl">
                        {isPopular ? plan.display_name.replace(' (Most Popular)', '') : plan.display_name}
                      </h3>
                      {isPopular && (
                        <div
                          className="inline-block text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg"
                          style={{
                            background: 'linear-gradient(to right, #3b82f6, #2563eb)'
                          }}
                        >
                          ⭐ Most Popular
                        </div>
                      )}
                    </div>
                    <div className="mb-3">
                      <span className={`font-bold text-slate-900 ${isPopular ? 'text-6xl' : 'text-5xl'}`}>
                        ${plan.price}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-slate-600 ml-2">{isPopular ? 'one-time' : 'one-time'}</span>
                      )}
                    </div>
                    <p className={`text-sm font-medium ${isPopular ? 'text-primary-700' : 'text-slate-600'}`}>
                      {plan.id === 'free' ? 'Lifetime quota' : 'Never expires'}
                    </p>
                  </div>

                  {/* Divider */}
                  {isPopular && (
                    <div
                      className="h-px mx-8"
                      style={{
                        background: 'linear-gradient(to right, transparent, #dbeafe, transparent)'
                      }}
                    ></div>
                  )}

                  {/* Features List */}
                  <div className={`flex-grow ${isPopular ? 'p-8' : 'p-8'}`}>
                    <ul className={isPopular ? 'space-y-3' : 'space-y-4'}>
                      <li className="flex items-start gap-3">
                        <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPopular ? 'text-primary-600' : 'text-green-500'}`} />
                        <span className="text-slate-700">
                          <strong className="text-slate-900">{plan.quota}</strong> images generated
                          {plan.bonus_quota > 0 && (
                            <span className={isPopular ? 'text-primary-600 font-medium ml-1' : 'text-green-600 ml-1'}>
                              + {plan.bonus_quota} bonus
                            </span>
                          )}
                        </span>
                      </li>

                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isPopular ? 'text-primary-600' : 'text-green-500'}`} />
                          <span className="text-slate-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="p-8 pt-6">
                    <button
                      onClick={() => handleSelectPlan(plan.id)}
                      className="w-full py-3 px-6 rounded-xl font-semibold transition-all duration-300"
                      style={isPopular ? {
                        background: 'linear-gradient(to right, #3b82f6, #2563eb)',
                        color: '#ffffff',
                        boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                        cursor: 'pointer'
                      } : {
                        background: '#f3f4f6',
                        color: '#111827',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (isPopular) {
                          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(59, 130, 246, 0.4)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        } else {
                          e.currentTarget.style.background = '#e5e7eb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (isPopular) {
                          e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(59, 130, 246, 0.3)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        } else {
                          e.currentTarget.style.background = '#f3f4f6';
                        }
                      }}
                    >
                      {plan.price === 0 ? 'Get Started' : 'Upgrade Now'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
};
