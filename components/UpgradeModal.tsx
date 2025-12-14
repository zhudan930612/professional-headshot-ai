import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingQuota?: number;
}

/**
 * 升级提示弹窗
 * 在 Free 用户配额不足时显示
 */
export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  remainingQuota = 0,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    navigate('/pricing');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl relative animate-scale-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
            <Sparkles size={32} className="text-blue-600" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-slate-900 mb-3">
          Quota Limit Reached
        </h2>

        {/* Description */}
        <p className="text-slate-600 text-center mb-8">
          {remainingQuota === 0
            ? "You've used all your free generations. Upgrade to continue creating professional headshots!"
            : `You've reached your generation limit. Upgrade for more generations!`}
        </p>

        {/* Features Highlight */}
        <div className="bg-slate-50 rounded-lg p-6 mb-8 space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-blue-600 font-bold mt-0.5">✓</span>
            <div>
              <div className="font-semibold text-slate-900">Professional Plan</div>
              <div className="text-sm text-slate-600">30 lifetime credits</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-blue-600 font-bold mt-0.5">✓</span>
            <div>
              <div className="font-semibold text-slate-900">Executive Plan</div>
              <div className="text-sm text-slate-600">70 credits + 10 bonus + High quality</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-blue-600 font-bold mt-0.5">✓</span>
            <div>
              <div className="font-semibold text-slate-900">No Watermarks</div>
              <div className="text-sm text-slate-600">Save unlimited full resolution images</div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            View Pricing Plans
          </button>

          <button
            onClick={onClose}
            className="w-full bg-slate-100 text-slate-900 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors"
          >
            Remind Me Later
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-slate-500 text-center mt-6">
          Upgrade now to get more lifetime credits
        </p>
      </div>

      {/* Animation Styles */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }

        .animate-scale-up {
          animation: scale-up 0.3s ease-out cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
};
