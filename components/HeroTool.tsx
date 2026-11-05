import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, Check, Download, RefreshCw, ArrowRight, ArrowLeft, X as XIconLucide, Maximize2, XCircle } from 'lucide-react';
import { HEADSHOT_TEMPLATES } from '../constants';
import { HeadshotStyle, UseCase, GeneratedImage, ReferenceImage, QuotaInfo } from '../types';
import { getRemainingQuota, saveSession } from '../services/storageService';
import { selectReferenceImage, validateImageFiles } from '../services/imageService';
import { generateHeadshots, recoverGeneration } from '../services/generationService';
import { GenerationRecoveryError } from '@/services/nanoBananaAPI.secure';
import { addWatermark, downloadImageWithWatermark } from '../services/watermarkService';
import { EmptyQuotaModal, InsufficientQuotaModal } from './UpgradeModal';
import { useNavigate, useLocation } from 'react-router-dom';
import { getCurrentUser } from '@/services/authService';
import { useAuth } from '../contexts/AuthContext';

interface HeroToolProps {
  onSuccess?: (images: GeneratedImage[]) => void;
}

interface GenerationResult {
  templateId: string;
  loading: boolean;
  image: GeneratedImage | null;
  progress: number;
  error?: string;  // 新增：存储错误消息
  retryCount: number;  // 新增：跟踪重试次数
  recoveryTaskId?: string;
}

const CATEGORIES = [
  HeadshotStyle.General,
  HeadshotStyle.Medical,
  HeadshotStyle.RealEstate,
  HeadshotStyle.Corporate,
  HeadshotStyle.Creative,
  HeadshotStyle.SolidColor,
];

// Helper function: Convert HeadshotStyle to SEO-friendly style name
const getStyleName = (category: HeadshotStyle): string => {
  const styleMap: Record<HeadshotStyle, string> = {
    [HeadshotStyle.General]: 'professional',
    [HeadshotStyle.Medical]: 'medical professional',
    [HeadshotStyle.RealEstate]: 'real estate agent',
    [HeadshotStyle.Corporate]: 'corporate executive',
    [HeadshotStyle.Creative]: 'creative professional',
    [HeadshotStyle.SolidColor]: 'professional'
  };
  return styleMap[category];
};

export const HeroTool: React.FC<HeroToolProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const allPreviewUrlsRef = useRef<Set<string>>(new Set());
  const { user, openAuthModal, quotaInfo: authQuotaInfo, refreshQuota } = useAuth();

  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<HeadshotStyle>(HeadshotStyle.General);

  // Reference Image State ⭐ NEW
  const [selectedReferenceIndex, setSelectedReferenceIndex] = useState<number | null>(null);

  // Multi-selection state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  // Subscription State
  const [localQuotaInfo, setLocalQuotaInfo] = useState<QuotaInfo | null>(null);
  const showUpgradeModalState = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = showUpgradeModalState;
  const [upgradeModalSource, setUpgradeModalSource] = useState<'step1' | 'step2'>('step2');
  const [requiredQuotaCount, setRequiredQuotaCount] = useState(1);
  const [displayImages, setDisplayImages] = useState<Map<string, string>>(new Map());

  // Derived state
  const quotaInfo = user ? authQuotaInfo : localQuotaInfo;
  const remainingQuota = quotaInfo?.remaining_quota ?? 0;

  // Load quota for non-logged-in users
  useEffect(() => {
    const loadLegacyQuota = async () => {
      if (!user) {
        try {
          // Not logged in: use legacy quota system
          const quota = await getRemainingQuota();
          setLocalQuotaInfo({
            plan_type: 'free',
            total_quota: 5,
            used_quota: 5 - quota,
            remaining_quota: quota,
            is_paid: false,
            quality: '1K',
            has_watermark: true,
          });
        } catch (err) {
          console.error('Failed to load legacy quota:', err);
        }
      } else {
        setLocalQuotaInfo(null);
      }
    };
    loadLegacyQuota();
  }, [user]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from<File>(e.target.files);
      if (newFiles.length + files.length > 5) {
        setError("Maximum 5 photos allowed.");
        return;
      }

      // ⭐ NEW: 验证图片文件
      const validation = validateImageFiles(newFiles);
      if (!validation.valid) {
        setError(validation.errors.join('\n'));
        return;
      }

      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      setError(null);

      // ⭐ NEW: 自动选择参考图（选择第一张）
      if (updatedFiles.length > 0 && selectedReferenceIndex === null) {
        try {
          const refIndex = await selectReferenceImage(updatedFiles);
          setSelectedReferenceIndex(refIndex);
          console.log(`✅ 自动选择第 ${refIndex + 1} 张图片作为参考图`);
        } catch (err) {
          console.error('选择参考图失败:', err);
        }
      }
    }
  };

  // 存储文件预览 URL 的映射
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());

  // 当文件列表变化时，更新预览 URL
  useEffect(() => {
    setPreviewUrls(prevUrls => {
      const newPreviewUrls = new Map<File, string>();

      files.forEach(file => {
        // 复用已存在的 URL 或创建新的
        const existingUrl = prevUrls.get(file);
        if (existingUrl) {
          newPreviewUrls.set(file, existingUrl);
        } else {
          const newUrl = URL.createObjectURL(file);
          newPreviewUrls.set(file, newUrl);
          allPreviewUrlsRef.current.add(newUrl); // 跟踪所有创建的 URL
        }
      });

      // 清理不再使用的 URL（立即清理已删除文件的 URL）
      prevUrls.forEach((url, file) => {
        if (!files.includes(file)) {
          URL.revokeObjectURL(url);
          allPreviewUrlsRef.current.delete(url); // 从跟踪中移除
        }
      });

      return newPreviewUrls;
    });
  }, [files]);

  // 组件卸载时清理所有 URL
  useEffect(() => {
    return () => {
      allPreviewUrlsRef.current.forEach(url => {
        URL.revokeObjectURL(url);
      });
      allPreviewUrlsRef.current.clear();
    };
  }, []);

  const removeFile = async (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);

    // ⭐ NEW: 如果删除的是参考图，重新选择
    if (index === selectedReferenceIndex) {
      setSelectedReferenceIndex(null);

      if (updatedFiles.length > 0) {
        try {
          const newRefIndex = await selectReferenceImage(updatedFiles);
          setSelectedReferenceIndex(newRefIndex);
          console.log(`✅ 重新选择第 ${newRefIndex + 1} 张图片作为参考图`);
        } catch (err) {
          console.error('重新选择参考图失败:', err);
        }
      }
    } else if (selectedReferenceIndex !== null && index < selectedReferenceIndex) {
      // 如果删除的文件在参考图之前，调整索引
      setSelectedReferenceIndex(selectedReferenceIndex - 1);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFiles = Array.from<File>(e.dataTransfer.files);
    if (droppedFiles.length + files.length > 5) {
      setError("Maximum 5 photos allowed.");
      return;
    }

    // Validate image files
    const validation = validateImageFiles(droppedFiles);
    if (!validation.valid) {
      setError(validation.errors.join('\n'));
      return;
    }

    const updatedFiles = [...files, ...droppedFiles];
    setFiles(updatedFiles);
    setError(null);

    // Auto-select reference image (first image)
    if (updatedFiles.length > 0 && selectedReferenceIndex === null) {
      try {
        const refIndex = await selectReferenceImage(updatedFiles);
        setSelectedReferenceIndex(refIndex);
      } catch (err) {
        console.error('Failed to select reference image:', err);
      }
    }
  };

  // Convert error messages to friendly text
  const getFriendlyErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
      const message = error.message;
      if (message.includes('Failed to fetch') || message.includes('fetch')) {
        return 'Our AI blinked for a second 😅 Let\'s try again.';
      }
      return message;
    }
    return 'Our AI blinked for a second 😅 Let\'s try again.';
  };

  const toggleTemplate = (id: string) => {
    if (selectedTemplateIds.includes(id)) {
      setSelectedTemplateIds(prev => prev.filter(tid => tid !== id));
    } else {
      if (selectedTemplateIds.length >= 4) {
        return;
      }
      setSelectedTemplateIds(prev => [...prev, id]);
    }
  };

  const startGeneration = async () => {
    // Refresh quota info
    let currentQuotaInfo = quotaInfo;
    try {
      if (user) {
        // ⭐ 使用 refreshQuota 的返回值，避免状态更新延迟
        const freshQuota = await refreshQuota();
        currentQuotaInfo = freshQuota || quotaInfo; // 使用最新值或回退到当前值
        console.log('[HeroTool] 获取到最新配额:', currentQuotaInfo);
      }
    } catch (err) {
      console.error('Failed to refresh quota info:', err);
    }

    // Check if user has enough quota
    if (!currentQuotaInfo || currentQuotaInfo.remaining_quota < selectedTemplateIds.length) {
      setRequiredQuotaCount(selectedTemplateIds.length);
      setUpgradeModalSource('step2');
      setShowUpgradeModal(true);
      return;
    }

    if (selectedTemplateIds.length === 0) {
      setError("Please select at least one style template.");
      return;
    }

    // ⭐ NEW: 检查参考图是否已选择
    if (selectedReferenceIndex === null || !files[selectedReferenceIndex]) {
      setError("No reference image selected. Please upload photos first.");
      return;
    }

    // Initialize placeholders for the results
    const initialResults: GenerationResult[] = selectedTemplateIds.map(id => ({
      templateId: id,
      loading: true,
      image: null,
      progress: 0,
      error: undefined,
      retryCount: 0
    }));

    setGenerationResults(initialResults);
    setStep(3); // Go to step 3 immediately
    setIsGenerating(true);
    setError(null);

    try {
      // ⭐ 获取用户 ID（用于生成服务）
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id;
      if (!userId) throw new Error('Please sign in to continue.');

      const referenceFile = files[selectedReferenceIndex];
      if (!referenceFile) {
        throw new Error('参考图未选择');
      }

      // ⭐ 调用新的生成服务（使用参考图 + 模板图，参考图会上传到 private storage）
      const selectedTemplates = HEADSHOT_TEMPLATES.filter(t =>
        selectedTemplateIds.includes(t.id)
      );
      const primaryStyle = selectedTemplates[0]?.category || HeadshotStyle.General;
      const sessionId = Date.now().toString();

      console.log('🎨 开始生成专业头像...');

      // Create independent generation promises for each selected template
      const promises = selectedTemplateIds.map(async (id, index) => {
        try {
          // Add a random stagger delay (0-2s) to make it look like independent processing
          await new Promise(r => setTimeout(r, Math.random() * 2000));

          const template = selectedTemplates.find(t => t.id === id);
          if (!template) {
            throw new Error(`Template ${id} not found`);
          }

          // 调用生成服务（参考图 + 模板），不传递 referenceImageUrl（让服务内部上传到 private storage）
          const generatedImages = await generateHeadshots(
            referenceFile,
            [template],
            primaryStyle,
            userId,
            `${sessionId}_${index}`,
            undefined, // 不传递 referenceImageUrl，让服务内部上传到 private storage
            (progress) => {
              // ⭐ 更新当前图片的生成进度，但最多到95%，避免100%时的白屏
              const cappedProgress = Math.min(progress, 95);
              setGenerationResults(prev => prev.map(item =>
                item.templateId === id
                  ? { ...item, progress: cappedProgress }
                  : item
              ));
            }
          );

          const img = generatedImages[0];
          try {
            await saveSession({
              id: `${sessionId}_${index}`,
              date: Date.now(),
              style: template.category,
              useCase: UseCase.LinkedIn,
              images: [img],
            });
          } catch (saveError) {
            console.error('Failed to save generation history:', saveError);
            setError('Your image is ready, but history could not be saved. Download it before leaving this page.');
          }

          // ⭐ 预加载图片，确保浏览器完成加载后再显示
          await new Promise<void>((resolve, reject) => {
            const preloadImg = new Image();
            preloadImg.onload = () => resolve();
            preloadImg.onerror = () => resolve();
            preloadImg.src = img.jpgUrl || img.url;
          });

          // ✅ 成功：图片真正加载完成后才更新状态
          setGenerationResults(prev => prev.map(item =>
            item.templateId === id
              ? { ...item, loading: false, image: img, progress: 100, error: undefined }
              : item
          ));

          return { success: true, image: img };

        } catch (error) {
          // ❌ 失败：更新错误状态
          const errorMessage = getFriendlyErrorMessage(error);

          setGenerationResults(prev => prev.map(item =>
            item.templateId === id
              ? { ...item, loading: false, progress: 0, error: errorMessage, recoveryTaskId: error instanceof GenerationRecoveryError ? error.taskId : undefined }
              : item
          ));

          console.error(`模板 ${id} 生成失败:`, error);
          return { success: false, error: errorMessage };
        }
      });

      // 使用 allSettled 允许部分成功
      const results = await Promise.allSettled(promises);

      // 提取成功的图片
      const completedImages = results
        .filter((r): r is PromiseFulfilledResult<{ success: true; image: GeneratedImage }> =>
          r.status === 'fulfilled' && r.value.success === true
        )
        .map(r => r.value.image);

      setIsGenerating(false);

      // 检查是否有成功的图片
      if (completedImages.length > 0) {
        try {
          console.log('[HeroTool] 处理完成的图片, 数量:', completedImages.length, 'user:', !!user);

          await refreshQuota();

          // 3. Apply watermarks if Free user
          if (quotaInfo?.has_watermark) {
            console.log('Applying watermarks to Free tier images...');
            const watermarkedUrls: { [key: string]: string } = {};
            for (const img of completedImages) {
              try {
                const watermarkedUrl = await addWatermark(img.url);
                watermarkedUrls[img.id] = watermarkedUrl;
                displayImages.set(img.id, watermarkedUrl);
              } catch (err) {
                console.error('Failed to add watermark to image:', err);
                watermarkedUrls[img.id] = img.url; // Fallback to original
              }
            }
            setDisplayImages(new Map(Object.entries(watermarkedUrls)));
          }

          if (onSuccess) onSuccess(completedImages);
        } catch (err) {
          console.error('Error processing completed images:', err);
          setError("Failed to process results. Please try again.");
        }
      } else {
        // 所有模板都失败
        setError("Our AI blinked for a second 😅 Let's try again.");
      }

    } catch (err) {
      // 这个 catch 只处理意外的系统错误（如状态更新失败）
      console.error('系统错误:', err);
      setError("System error, please refresh the page and try again");
      setIsGenerating(false);
    }
  };

  // 重试单个失败的模板
  const retryTemplate = async (templateId: string) => {
    if (selectedReferenceIndex === null || !files[selectedReferenceIndex]) {
      setError("Reference image lost, please re-upload");
      return;
    }

    const template = HEADSHOT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      console.error(`模板 ${templateId} 未找到`);
      return;
    }

    const originalResult = generationResults.find(item => item.templateId === templateId);
    if (originalResult?.loading) return;
    if (!originalResult?.image?.taskId && !originalResult?.recoveryTaskId) {
      const quota = await refreshQuota();
      if (!quota || quota.remaining_quota < 1) {
        setRequiredQuotaCount(1);
        setUpgradeModalSource('step2');
        setShowUpgradeModal(true);
        return;
      }
    }

    // The server verifies the original task before granting a free retry.
    setGenerationResults(prev => prev.map(item =>
      item.templateId === templateId
        ? { ...item, loading: true, progress: 0, error: undefined, retryCount: item.retryCount + (item.recoveryTaskId ? 0 : 1) }
        : item
    ));

    try {
      const currentUser = await getCurrentUser();
      const userId = currentUser?.id;
      if (!userId) throw new Error('Please sign in to continue.');

      const referenceFile = files[selectedReferenceIndex];
      const retrySessionId = `${Date.now()}_retry_${templateId}`;
      const generatedImages = originalResult?.recoveryTaskId
        ? await recoverGeneration(originalResult.recoveryTaskId, retrySessionId)
        : await generateHeadshots(
        referenceFile,
        [template],
        template.category,
        userId,
        retrySessionId,
        undefined, // 不传递 referenceImageUrl，让服务内部上传到 private storage
        (progress) => {
          // 限制进度最多到95%，避免100%时的白屏
          const cappedProgress = Math.min(progress, 95);
          setGenerationResults(prev => prev.map(item =>
            item.templateId === templateId
              ? { ...item, progress: cappedProgress }
              : item
          ));
        },
        originalResult?.image?.taskId
      );

      const img = generatedImages[0];

      // ⭐ 预加载图片，确保浏览器完成加载后再显示
      await new Promise<void>((resolve, reject) => {
        const preloadImg = new Image();
        preloadImg.onload = () => resolve();
        preloadImg.onerror = () => resolve();
        preloadImg.src = img.jpgUrl || img.url;
      });

      // 成功：图片真正加载完成后才更新状态
      setGenerationResults(prev => prev.map(item =>
        item.templateId === templateId
          ? { ...item, loading: false, image: img, progress: 100, error: undefined, recoveryTaskId: undefined }
          : item
      ));

      try {
        await saveSession({
          id: retrySessionId,
          date: Date.now(),
          style: template.category,
          useCase: UseCase.LinkedIn,
          images: [img],
        });
      } catch (saveError) {
        console.error('Failed to save retry history:', saveError);
        setError('Your image is ready, but history could not be saved. Download it before leaving this page.');
      }
      if (quotaInfo?.has_watermark) {
        const watermarkedUrl = await addWatermark(img.url);
        setDisplayImages(previous => new Map(previous).set(img.id, watermarkedUrl));
      }
      await refreshQuota();
      onSuccess?.([img]);

    } catch (error) {
      // 失败
      const errorMessage = getFriendlyErrorMessage(error);

      setGenerationResults(prev => prev.map(item =>
        item.templateId === templateId
          ? { ...item, loading: false, progress: 0, error: errorMessage, recoveryTaskId: error instanceof GenerationRecoveryError ? error.taskId : undefined }
          : item
      ));

      console.error(`重试模板 ${templateId} 失败:`, error);
    }
  };

  const resetAll = () => {
    setFiles([]);
    setGenerationResults([]);
    setSelectedTemplateIds([]);
    setStep(1);
    setIsGenerating(false);
    // ⭐ NEW: 重置参考图状态
    setSelectedReferenceIndex(null);
  }

  // Download PNG（主资源），Free 用户可使用已生成的水印版本
  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const watermarkedUrl = quotaInfo?.has_watermark ? displayImages.get(image.id) : undefined;
      const downloadUrl = watermarkedUrl || image.url;

      const response = await fetch(downloadUrl);
      const blob = await response.blob();
      const extension = 'png';
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `professional-headshot-${Date.now()}.${extension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(image.url, '_blank');
    }
  }

  // --- STEPS RENDERERS ---

  const renderStep1_Upload = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
      <div className="mb-6 text-center">
        <h3 className="text-xl font-bold text-slate-900 mb-2">Step 1: Upload Your Photos</h3>
        <p className="text-slate-500 whitespace-nowrap">We recommend uploading 3–5 clear selfies to help the AI better capture your facial features.</p>
      </div>

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex-grow border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[300px] ${files.length > 0 ? 'border-primary-200 bg-primary-50/30' : 'border-slate-300 hover:border-primary-500 hover:bg-primary-50'
          }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="image/*"
          className="hidden"
        />

        {files.length === 0 ? (
          <>
            {/* 示例图片展示 - 放在最上面重点展示 */}
            <div className="mb-6">
              <p className="text-xs text-slate-500 font-medium mb-3 text-center">Example Photos:</p>
              <div className="flex gap-4 justify-center">
                {[
                  '/hero-img/hero_01.jpeg',
                  '/hero-img/hero_02.jpeg',
                  '/hero-img/hero_03.jpeg'
                ].map((url, idx) => (
                  <div key={idx} className="w-[120px] h-[160px] rounded-xl overflow-hidden border-2 border-slate-300 shadow-md hover:shadow-lg transition-shadow flex-shrink-0">
                    <img src={url} alt={`Example ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>

              {/* 照片要求说明 */}
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3 max-w-md mx-auto">
                <p className="text-xs font-semibold text-blue-900 mb-2">Photo Requirements:</p>
                <ul className="text-xs text-blue-800 space-y-1">
                  <li className="flex items-start gap-1.5">
                    <Check size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Clear face, good lighting (natural light preferred)</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <Check size={14} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <span>Front-facing or slight angle, neutral expression</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <XIconLucide size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
                    <span>No sunglasses, hats, or heavy filters</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-lg font-semibold text-slate-700 group-hover:text-primary-700 mt-0">
              Click or Drop Photos Here
            </p>
            <p className="text-sm text-slate-400 mt-2">Supports JPG, PNG</p>
          </>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
              {files.map((f, i) => {
                const previewUrl = previewUrls.get(f);
                return (
                  <div key={i} className="relative aspect-[3/4] rounded-xl overflow-hidden border-2 border-slate-200 bg-white shadow-sm group">
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt={`Preview ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100">
                        <Loader2 className="animate-spin text-slate-400" size={20} />
                      </div>
                    )}
                    {/* 参考图徽章已移除 - 参考图选择为纯后端逻辑 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <XIconLucide size={12} />
                    </button>
                  </div>
                );
              })}
              {files.length < 5 && (
                <div className="aspect-[3/4] rounded-xl border-2 border-dashed border-primary-300 bg-white flex flex-col items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors">
                  <Upload size={20} />
                  <span className="text-xs font-bold mt-1">Add More</span>
                </div>
              )}
            </div>
            {/* 参考图信息提示已移除 - 参考图选择为纯后端逻辑 */}
            <p className="text-sm font-semibold text-primary-600">{files.length} photos selected</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 mx-auto max-w-md p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            if (!user) {
              openAuthModal(location.pathname);
              return;
            }

            // ⭐ 新增：配额为 0 时显示弹窗，阻止进入 Step 2
            if (quotaInfo && quotaInfo.remaining_quota === 0) {
              setRequiredQuotaCount(1);
              setUpgradeModalSource('step1');
              setShowUpgradeModal(true);
              return;
            }

            setStep(2);
          }}
          disabled={files.length < 1}
          className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all ${files.length < 1
            ? 'bg-slate-300 cursor-not-allowed'
            : 'bg-primary-600 hover:bg-primary-700 shadow-lg shadow-primary-500/20 hover:scale-105'
            }`}
        >
          Next Step <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );

  const renderStep2_Template = () => (
    <div className="flex flex-col h-full animate-in slide-in-from-right-8 duration-300 relative">
      <div className="mb-4 text-center shrink-0">
        <h3 className="text-xl font-bold text-slate-900 mb-1">Step 2: Choose Your Style</h3>
        <p className="text-sm text-slate-500">
          Select up to 4 styles from any category. We will blend these into your final results.
        </p>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap justify-center gap-2 mb-4 shrink-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 cursor-pointer ${selectedCategory === cat
              ? 'bg-primary-600 text-white shadow-md shadow-primary-500/30 scale-105 ring-2 ring-primary-200'
              : 'bg-white border-2 border-primary-300 text-primary-700 shadow-sm hover:border-primary-500 hover:bg-primary-50 hover:text-primary-800 hover:shadow-md hover:scale-105 active:scale-95'
              }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid - Expanded to take remaining space */}
      <div className="flex-grow overflow-y-auto px-1 min-h-0 custom-scrollbar bg-white rounded-xl border border-slate-100 shadow-inner">
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-8 gap-2 p-3">
          {HEADSHOT_TEMPLATES.filter(t => t.category === selectedCategory).map((template) => {
            const isSelected = selectedTemplateIds.includes(template.id);
            const isDisabled = !isSelected && selectedTemplateIds.length >= 4;
            return (
              <div
                key={template.id}
                onClick={() => !isDisabled && toggleTemplate(template.id)}
                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group aspect-[3/4] ${isSelected
                  ? 'border-primary-600 ring-2 ring-primary-100 ring-offset-1 shadow-md opacity-100 scale-95'
                  : isDisabled
                    ? 'border-transparent opacity-50 cursor-not-allowed'
                    : 'border-transparent hover:border-slate-300 shadow-sm opacity-100 hover:shadow-md'
                  }`}
              >
                <img
                  src={template.imageUrl}
                  alt={`AI-generated ${getStyleName(template.category)} headshot for LinkedIn and resume${template.description ? `, ${template.description}` : ''}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />

                {isSelected && (
                  <div className="absolute top-1 right-1 bg-primary-600 text-white p-0.5 rounded-full shadow-md animate-in zoom-in">
                    <Check size={10} strokeWidth={3} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-2 text-center shrink-0">
          <span className="text-red-500 text-xs font-medium bg-red-50 px-2 py-1 rounded-md">{error}</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0">
        <button
          onClick={() => setStep(1)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          {/* Selected Thumbnails */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-[150px] sm:max-w-[200px] no-scrollbar">
            {selectedTemplateIds.length === 0 && (
              <span className="text-xs text-slate-400 italic whitespace-nowrap pr-2">Pick up to 4</span>
            )}
            {selectedTemplateIds.map(id => {
              const t = HEADSHOT_TEMPLATES.find(temp => temp.id === id);
              if (!t) return null;
              return (
                <div key={id} onClick={() => toggleTemplate(id)} className="relative flex-shrink-0 w-8 h-10 rounded overflow-hidden border border-slate-200 cursor-pointer hover:opacity-75 group">
                  <img src={t.imageUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-red-500/20 transition-colors flex items-center justify-center">
                    <XIconLucide className="text-white opacity-0 group-hover:opacity-100" size={12} />
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={startGeneration}
            disabled={selectedTemplateIds.length === 0}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg ${selectedTemplateIds.length === 0
              ? 'bg-slate-300 cursor-not-allowed shadow-none'
              : 'bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 shadow-primary-500/20 hover:scale-105'
              }`}
          >
            <Sparkles size={16} /> Generate {selectedTemplateIds.length > 0 ? `(${selectedTemplateIds.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );

  const renderStep3_Result = () => {
    const isAnyLoading = generationResults.some(r => r.loading);

    return (
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex flex-col h-full">
          <div className="text-center mb-6">
            {isAnyLoading ? (
              <div className="inline-flex items-center justify-center p-3 bg-primary-50 text-primary-600 rounded-full mb-4 animate-pulse">
                <Sparkles size={32} />
              </div>
            ) : (
              <div className="inline-flex items-center justify-center p-3 bg-green-100 text-green-700 rounded-full mb-4 animate-in zoom-in">
                <CheckCircle size={32} />
              </div>
            )}

            <h3 className="text-2xl font-bold text-slate-900" translate="no">
              {isAnyLoading ? "Generating Your Headshots..." : "Headshots Ready!"}
            </h3>
            <p className="text-slate-500" translate="no">
              {isAnyLoading ? "Please wait while we create your professional photos." : "Here are your professional AI-generated photos."}
            </p>
          </div>

          <div className="flex-grow flex flex-wrap justify-center content-start gap-4 overflow-y-auto max-h-[500px] p-2">
            {generationResults.map((result, idx) => (
              <div
                key={result.templateId}
                className="relative aspect-[3/4] rounded-xl overflow-hidden shadow-md ring-1 ring-slate-200 w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] flex-shrink-0"
              >
                {result.error ? (
                  // ❌ 错误状态
                  <div className="w-full h-full bg-red-50 flex flex-col items-center justify-center border-2 border-red-200 p-6">
                    <XCircle className="text-red-500 mb-4" size={48} />
                    <div className="text-sm font-semibold text-red-700 text-center mb-5 leading-relaxed">
                      {result.error === "Our AI blinked for a second 😅 Let's try again." ? (
                        <>
                          <div>Our AI blinked for a second 😅</div>
                          <div>Let's try again.</div>
                        </>
                      ) : (
                        result.error
                      )}
                    </div>
                    {result.recoveryTaskId || result.retryCount < 1 ? (
                      <button
                        onClick={() => retryTemplate(result.templateId)}
                        className="px-5 py-2.5 bg-red-500 text-white text-sm font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <RefreshCw size={18} />
                        {result.recoveryTaskId ? 'Check generation' : 'Retry'}
                      </button>
                    ) : (
                      <span className="text-sm text-red-600 italic">Please try again later</span>
                    )}
                  </div>
                ) : !result.image || result.loading ? (
                  // ⏳ 加载状态
                  <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center p-6">
                    <Loader2 className="animate-spin text-primary-600 mb-3" size={40} />
                    <span className="text-sm font-semibold text-slate-600 animate-pulse" translate="no">Generating...</span>
                    <span className="text-xs text-slate-500 mt-2" translate="no">
                      {result.progress >= 95 ? 'Finalizing...' : 'Estimated time: 30-60s'}
                    </span>
                  </div>
                ) : (
                  // ✅ 成功状态
                  <div
                    onClick={() => setSelectedImage(result.image)}
                    className="w-full h-full group cursor-pointer animate-in fade-in duration-700"
                  >
                    <img
                      // Use watermarked URL if available for Free users
                      src={displayImages.get(result.image.id) || result.image.jpgUrl || result.image.url}
                      alt="Result"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="eager"
                    />
                    {result.image.taskId && result.retryCount < 1 && (
                      <button
                        onClick={event => { event.stopPropagation(); void retryTemplate(result.templateId); }}
                        className="absolute bottom-2 left-2 right-2 bg-white/95 rounded-lg px-2 py-2 text-xs font-semibold text-slate-800 shadow-sm"
                      >
                        Regenerate once for free
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-4">
            <button
              onClick={() => setStep(2)}
              disabled={isAnyLoading}
              className={`px-6 py-3 rounded-xl font-medium border border-slate-200 transition-colors ${isAnyLoading
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Generate More
            </button>
            <button
              onClick={resetAll}
              disabled={isAnyLoading}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${isAnyLoading
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'text-white bg-slate-900 hover:bg-slate-800'
                }`}
            >
              <RefreshCw size={18} /> Start Over
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* UpgradeModal */}
      {/* 配额不足弹窗 (Step 1 - Empty) */}
      <EmptyQuotaModal
        isOpen={showUpgradeModal && upgradeModalSource === 'step1'}
        onClose={() => setShowUpgradeModal(false)}
        onBrowseCase={() => {
          setStep(2);
          setShowUpgradeModal(false);
        }}
      />

      {/* 配额不足弹窗 (Step 2 - Insufficient) */}
      <InsufficientQuotaModal
        isOpen={showUpgradeModal && upgradeModalSource === 'step2'}
        onClose={() => setShowUpgradeModal(false)}
        remainingQuota={quotaInfo?.remaining_quota || 0}
        requiredQuota={requiredQuotaCount}
      />

      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
        {/* Header Progress Indicators */}
        <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Sparkles className="text-primary-600" size={20} />
            AI Studio
          </h2>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => {
              // 判断第三步是否已完成：step === 3 且所有图片都生成完成
              const isStep3Completed = s === 3 && step === 3 && !generationResults.some(r => r.loading) && generationResults.length > 0;
              const isCompleted = step > s || isStep3Completed;
              const isActive = step === s && !isStep3Completed;

              return (
                <div key={s} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${isActive
                    ? 'bg-primary-600 text-white'
                    : isCompleted
                      ? 'bg-green-500 text-white'
                      : 'bg-slate-200 text-slate-500'
                    }`}>
                    {isCompleted ? <Check size={16} /> : s}
                  </div>
                  {s < 3 && (
                    <div className={`w-8 h-1 mx-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
            {remainingQuota} uses left
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow p-6 md:p-8 md:px-12 flex flex-col">
          {step === 1 && renderStep1_Upload()}
          {step === 2 && renderStep2_Template()}
          {step === 3 && renderStep3_Result()}
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8" style={{ maxHeight: '100dvh' }}>
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setSelectedImage(null)}
          ></div>

          {/* Content wrapper */}
          <div className="relative z-10 max-w-5xl flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-200 pointer-events-none" style={{ marginTop: '0px' }}>
            <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black/50 ring-1 ring-white/10 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              {/* Image */}
              <img
                src={displayImages.get(selectedImage.id) || selectedImage.jpgUrl || selectedImage.url}
                alt="Full size"
                className="max-h-[75vh] w-auto max-w-[90vw] object-contain"
              />
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2 w-full items-center pointer-events-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleDownloadImage(selectedImage)}
                  className="px-5 py-2.5 bg-primary-600 text-white rounded-full font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg flex items-center gap-2"
                  style={{ minWidth: '150px' }}
                >
                  <Download size={16} /> Download
                </button>
                {quotaInfo?.has_watermark && (
                  <div className="relative inline-block">
                    <button
                      onClick={() => navigate('/pricing')}
                      className="px-6 py-2.5 bg-amber-500 text-white rounded-full font-bold text-sm hover:bg-amber-600 transition-colors shadow"
                      style={{ minWidth: '200px' }}
                    >
                      Upgrade Plan
                    </button>
                    <span
                      className="absolute -top-2 -right-[25px] inline-block text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg"
                      style={{ background: 'linear-gradient(to right, #3b82f6, #2563eb)' }}
                    >
                      ⭐ Popular
                    </span>
                  </div>
                )}
              </div>
              {quotaInfo?.has_watermark && (
                <div className="text-xs text-slate-200 text-center mt-1 whitespace-nowrap">
                  Download watermark-free professional headshots
                </div>
              )}
            </div>
          </div>

          {/* Top right close button */}
          <button
            className="absolute top-4 right-4 text-white/50 hover:text-white p-2 transition-colors z-20"
            onClick={() => setSelectedImage(null)}
          >
            <XIconLucide size={32} />
          </button>
        </div>
      )}
    </>
  );
};

const XIcon = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);
