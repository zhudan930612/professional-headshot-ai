import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, Check } from 'lucide-react';

// --- 1. 基础布局组件 (内部使用) ---
interface UpgradeModalLayoutProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: React.ReactNode;
  secondaryButton: React.ReactNode;
}

const UpgradeModalLayout: React.FC<UpgradeModalLayoutProps> = ({
  isOpen,
  onClose,
  title,
  description,
  secondaryButton,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl transform transition-all animate-in zoom-in-95 duration-200 text-left">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
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
        <h2 className="text-2xl font-bold text-slate-900 mb-3 text-center">
          {title}
        </h2>

        {/* Description */}
        <div className="text-slate-600 mb-8 text-center">
          {description}
        </div>

        {/* Features Highlight */}
        <div className="bg-slate-50 rounded-2xl p-4 mb-8 space-y-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600"><Check size={18} /></div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">Professional Plan</div>
              <div className="text-xs text-slate-500">30 lifetime credits</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600"><Check size={18} /></div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">Executive Plan</div>
              <div className="text-xs text-slate-500">60 credits + 10 bonus + High quality</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-600"><Check size={18} /></div>
            <div>
              <div className="font-semibold text-slate-900 text-sm">No Watermarks</div>
              <div className="text-xs text-slate-500">Save unlimited full resolution images</div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              navigate('/pricing');
              onClose();
            }}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            View Pricing Plans
          </button>

          {secondaryButton}

          <p className="text-center text-xs text-slate-400 mt-2">
            Upgrade now to get more lifetime credits
          </p>
        </div>
      </div>
    </div>
  );
};

// --- 2. Step 1 专用弹窗: 配额耗尽 (Empty) ---
interface EmptyQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrowseCase: () => void;
}

export const EmptyQuotaModal: React.FC<EmptyQuotaModalProps> = ({
  isOpen,
  onClose,
  onBrowseCase,
}) => {
  return (
    <UpgradeModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Quota Limit Reached"
      description="You've used all your free generations. Upgrade to continue creating professional headshots!"
      secondaryButton={
        <button
          onClick={() => {
            onClose(); // 先关闭弹窗
            onBrowseCase(); // 再跳转
          }}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          Browse Case Images
        </button>
      }
    />
  );
};

// --- 3. Step 2 专用弹窗: 配额不足 (Insufficient) ---
interface InsufficientQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingQuota: number;
  requiredQuota: number;
}

export const InsufficientQuotaModal: React.FC<InsufficientQuotaModalProps> = ({
  isOpen,
  onClose,
  remainingQuota,
  requiredQuota,
}) => {
  const shortAmount = requiredQuota - remainingQuota;

  return (
    <UpgradeModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Quota Limit Reached"
      description={
        <p>
          You have <strong>{remainingQuota}</strong> credit{remainingQuota !== 1 ? 's' : ''} remaining, but need <strong>{requiredQuota}</strong>.
          <br />
          You're <strong>{shortAmount}</strong> short. Upgrade for more!
        </p>
      }
      secondaryButton={
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
        >
          Remind Me Later
        </button>
      }
    />
  );
};
