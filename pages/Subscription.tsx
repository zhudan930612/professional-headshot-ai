import React, { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { getUserActiveSubscription } from '../services/subscriptionService';
import { getUserQuotaInfo } from '../services/storageService';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Zap } from 'lucide-react';
import type { UserSubscription, QuotaInfo } from '../types';

export const Subscription: React.FC = () => {
  const navigate = useNavigate();
  const { quotaInfo, refreshQuota } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const sub = await getUserActiveSubscription();
        await refreshQuota();
        setSubscription(sub);
      } catch (error) {
        console.error('加载订阅信息失败:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const planFeatures = {
    free: [
      '5 lifetime images',
      'Standard quality (1K 896x1200)',
      'With watermarks',
      'Permanent quota'
    ],
    professional: [
      '30 lifetime images',
      'Standard quality (1K 896x1200)',
      'No watermarks',
      'Never expires',
      'Priority support'
    ],
    executive: [
      '60 lifetime images + 10 bonus',
      'High quality (2K 1792x2400)',
      'No watermarks',
      'Never expires',
      'Priority queue',
      'Premium support'
    ]
  };

  const planColor = quotaInfo ? {
    free: 'slate',
    professional: 'blue',
    executive: 'amber'
  }[quotaInfo.plan_type] : 'slate';

  const usagePercent = quotaInfo ? (quotaInfo.used_quota / quotaInfo.total_quota) * 100 : 0;

  return (
    <Layout>
      {loading ? (
        // Loading State
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      ) : !quotaInfo ? (
        // Error State
        <div className="max-w-4xl mx-auto px-4 py-16">
          <p className="text-center text-slate-600">Unable to load subscription information</p>
        </div>
      ) : (
        // Main Content
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-16 px-4">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-12">
              <h1 className="text-4xl font-bold text-slate-900 mb-4">My Subscription</h1>
              <p className="text-slate-600">Manage your subscription plan and view your usage</p>
            </div>

            {/* Current Plan Card */}
            <div className={`bg-white rounded-2xl shadow-lg border-2 border-${planColor}-100 p-8 mb-8`}>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className={`inline-block bg-${planColor}-100 text-${planColor}-800 text-sm font-bold px-4 py-2 rounded-full mb-4`}>
                    {quotaInfo.plan_type.toUpperCase()} PLAN
                  </div>
                  <h2 className="text-3xl font-bold text-slate-900 mb-2">
                    {quotaInfo.plan_type.charAt(0).toUpperCase() + quotaInfo.plan_type.slice(1)}
                  </h2>
                  <p className="text-slate-600">
                    {quotaInfo.is_paid ? 'Premium plan - Never expires' : 'Free plan - Permanent quota'}
                  </p>
                </div>

                {quotaInfo.plan_type !== 'executive' && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className={`inline-flex items-center gap-2 bg-${planColor}-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-${planColor}-700 transition-colors`}
                  >
                    Upgrade
                    <ArrowRight size={20} />
                  </button>
                )}
              </div>

              {/* Usage Progress */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-semibold text-slate-900">Quota Usage</span>
                  <span className="text-lg font-bold text-slate-900">
                    {quotaInfo.used_quota} / {quotaInfo.total_quota}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`bg-${planColor}-500 h-full rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
                {quotaInfo.remaining_quota > 0 && (
                  <p className="text-sm text-slate-600 mt-2">
                    {quotaInfo.remaining_quota} images left
                  </p>
                )}
              </div>

              {/* Plan Details Grid */}
              <div className="grid md:grid-cols-2 gap-6 border-t border-slate-100 pt-8">
                <div>
                  <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Zap size={20} className={`text-${planColor}-600`} />
                    Image Quality
                  </h3>
                  <p className={`text-2xl font-bold text-${planColor}-600`}>
                    {quotaInfo.quality}
                  </p>
                  <p className="text-sm text-slate-600 mt-1">
                    {quotaInfo.quality === '2K' ? 'High quality 1792x2400px' : 'Standard quality 896x1200px'}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-900 mb-4">Watermarks</h3>
                  <p className={`text-lg font-semibold ${quotaInfo.has_watermark ? 'text-red-600' : 'text-green-600'}`}>
                    {quotaInfo.has_watermark ? 'With Watermarks' : 'No Watermarks'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
              <h3 className="text-xl font-bold text-slate-900 mb-6">Plan Features</h3>
              <div className="grid md:grid-cols-2 gap-4">
                {planFeatures[quotaInfo.plan_type].map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Check size={20} className={`text-${planColor}-600 flex-shrink-0 mt-0.5`} />
                    <span className="text-slate-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Upgrade CTA */}
            {quotaInfo.plan_type === 'free' && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border-2 border-blue-200 p-8 text-center">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">
                  Ready to unlock unlimited generations?
                </h3>
                <p className="text-slate-600 mb-6">
                  Upgrade to Professional or Executive for lifetime credits and higher quality images.
                </p>
                <button
                  onClick={() => navigate('/pricing')}
                  className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  View All Plans
                  <ArrowRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
};
