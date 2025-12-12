import React, { useState, useRef, useEffect } from 'react';
import { Upload, Sparkles, Image as ImageIcon, CheckCircle, AlertCircle, Loader2, Check, Download, RefreshCw, ArrowRight, ArrowLeft, X as XIconLucide, Maximize2 } from 'lucide-react';
import { HEADSHOT_TEMPLATES } from '../constants';
import { HeadshotStyle, UseCase, GeneratedImage } from '../types';
import { getRemainingQuota, incrementQuota, saveSession, mockGenerateImages } from '../services/storageService';
import { useNavigate } from 'react-router-dom';

interface HeroToolProps {
  onSuccess?: (images: GeneratedImage[]) => void;
}

interface GenerationResult {
  templateId: string;
  loading: boolean;
  image: GeneratedImage | null;
}

const CATEGORIES = [
  HeadshotStyle.General,
  HeadshotStyle.Medical,
  HeadshotStyle.RealEstate,
  HeadshotStyle.Corporate,
  HeadshotStyle.Creative,
  HeadshotStyle.SolidColor,
];

export const HeroTool: React.FC<HeroToolProps> = ({ onSuccess }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<HeadshotStyle>(HeadshotStyle.General);

  // Multi-selection state
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationResults, setGenerationResults] = useState<GenerationResult[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [remainingQuota, setRemainingQuota] = useState<number>(0);

  // Load quota on mount and when generation completes
  useEffect(() => {
    const loadQuota = async () => {
      const quota = await getRemainingQuota();
      setRemainingQuota(quota);
    };
    loadQuota();
  }, [isGenerating]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      if (newFiles.length + files.length > 10) {
        setError("Maximum 10 photos allowed.");
        return;
      }
      setFiles([...files, ...newFiles]);
      setError(null);
    }
  };

  // 存储文件预览 URL 的映射
  const [previewUrls, setPreviewUrls] = useState<Map<File, string>>(new Map());

  // 当文件列表变化时，更新预览 URL
  useEffect(() => {
    const newPreviewUrls = new Map<File, string>();

    files.forEach(file => {
      // 复用已存在的 URL 或创建新的
      const existingUrl = previewUrls.get(file);
      if (existingUrl) {
        newPreviewUrls.set(file, existingUrl);
      } else {
        newPreviewUrls.set(file, URL.createObjectURL(file));
      }
    });

    // 清理不再使用的 URL
    previewUrls.forEach((url, file) => {
      if (!files.includes(file)) {
        URL.revokeObjectURL(url);
      }
    });

    setPreviewUrls(newPreviewUrls);

    // 组件卸载时清理所有 URL
    return () => {
      newPreviewUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [files]);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
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
    const quota = await getRemainingQuota();
    if (quota <= 0) {
      setError("Daily limit reached. Please come back tomorrow!");
      return;
    }

    if (selectedTemplateIds.length === 0) {
        setError("Please select at least one style template.");
        return;
    }

    // Initialize placeholders for the results
    const initialResults: GenerationResult[] = selectedTemplateIds.map(id => ({
        templateId: id,
        loading: true,
        image: null
    }));

    setGenerationResults(initialResults);
    setStep(3); // Go to step 3 immediately
    setIsGenerating(true);
    setError(null);

    try {
      // Create independent generation promises for each selected template
      const promises = selectedTemplateIds.map(async (id) => {
        // Add a random stagger delay (0-2s) to make it look like independent processing
        await new Promise(r => setTimeout(r, Math.random() * 2000));
        
        // Generate single image (mock service has internal 3s delay)
        const [img] = await mockGenerateImages(1);
        
        // Update specific item in state to show it's done
        setGenerationResults(prev => prev.map(item => 
             item.templateId === id 
             ? { ...item, loading: false, image: img }
             : item
        ));
        
        return img;
      });

      // Wait for all to complete
      const completedImages = await Promise.all(promises);

      setIsGenerating(false);
      const success = await incrementQuota(completedImages.length);

      if (success) {
        // Find style info for saving
        const selectedTemplates = HEADSHOT_TEMPLATES.filter(t => selectedTemplateIds.includes(t.id));
        const primaryStyle = selectedTemplates[0]?.category || HeadshotStyle.General;

        await saveSession({
            id: Date.now().toString(),
            date: Date.now(),
            style: primaryStyle,
            useCase: UseCase.LinkedIn,
            images: completedImages
        });

        if (onSuccess) onSuccess(completedImages);
      } else {
        setError("Quota exceeded during processing.");
      }

    } catch (err) {
      setError("Something went wrong. Please try again.");
      setIsGenerating(false);
    }
  };

  const resetAll = () => {
      setFiles([]);
      setGenerationResults([]);
      setSelectedTemplateIds([]);
      setStep(1);
      setIsGenerating(false);
  }

  // --- STEPS RENDERERS ---

  const renderStep1_Upload = () => (
    <div className="flex flex-col h-full animate-in fade-in duration-300">
        <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Step 1: Upload Your Photos</h3>
            <p className="text-slate-500 max-w-md mx-auto">Upload 3-10 clear selfies. The AI needs variety to learn your face.</p>
        </div>

        <div 
            onClick={() => fileInputRef.current?.click()}
            className={`flex-grow border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group flex flex-col items-center justify-center min-h-[300px] ${
                files.length > 0 ? 'border-primary-200 bg-primary-50/30' : 'border-slate-300 hover:border-primary-500 hover:bg-primary-50'
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
                    <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                         <Upload className="text-slate-400 group-hover:text-primary-500" size={32} />
                    </div>
                    <p className="text-lg font-semibold text-slate-700 group-hover:text-primary-700">
                    Click or Drop Photos Here
                    </p>
                    <p className="text-sm text-slate-400 mt-2">Supports JPG, PNG, HEIC</p>
                </>
            ) : (
                <div className="w-full max-w-2xl">
                     <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
                         {files.map((f, i) => {
                            const previewUrl = previewUrls.get(f);
                            return (
                                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm group">
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
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                        className="absolute top-1 right-1 bg-black/60 hover:bg-red-500 text-white rounded-full p-1 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <XIcon size={12} />
                                    </button>
                                </div>
                            );
                         })}
                         {files.length < 10 && (
                            <div className="aspect-square rounded-xl border-2 border-dashed border-primary-300 bg-white flex flex-col items-center justify-center text-primary-600 hover:bg-primary-50 transition-colors">
                                <Upload size={20} />
                                <span className="text-xs font-bold mt-1">Add More</span>
                            </div>
                         )}
                     </div>
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
                onClick={() => setStep(2)}
                disabled={files.length < 3}
                className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white transition-all ${
                    files.length < 3 
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        selectedCategory === cat
                        ? 'bg-slate-900 text-white shadow-md'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
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
                            className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all group aspect-[3/4] ${
                                isSelected
                                ? 'border-primary-600 ring-2 ring-primary-100 ring-offset-1 shadow-md opacity-100 scale-95'
                                : isDisabled
                                    ? 'border-transparent opacity-50 cursor-not-allowed'
                                    : 'border-transparent hover:border-slate-300 shadow-sm opacity-100 hover:shadow-md'
                            }`}
                        >
                            <img
                                src={template.imageUrl}
                                alt={`${template.label} - Professional headshot reference template for ${template.category}`}
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
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg ${
                        selectedTemplateIds.length === 0
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
                    
                    <h3 className="text-2xl font-bold text-slate-900">
                        {isAnyLoading ? "Generating Your Headshots..." : "Headshots Ready!"}
                    </h3>
                    <p className="text-slate-500">
                        {isAnyLoading ? "Please wait while we create your professional photos." : "Here are your professional AI-generated photos."}
                    </p>
                </div>

                <div className="flex-grow flex flex-wrap justify-center content-start gap-4 overflow-y-auto max-h-[500px] p-2">
                    {generationResults.map((result, idx) => (
                        <div 
                            key={result.templateId} 
                            className="relative aspect-square rounded-xl overflow-hidden shadow-md ring-1 ring-slate-200 w-[calc(50%-0.5rem)] md:w-[calc(25%-0.75rem)] flex-shrink-0"
                        >
                            {result.loading || !result.image ? (
                                <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center border-2 border-transparent">
                                    <Loader2 className="animate-spin text-primary-600 mb-2" size={32} />
                                    <span className="text-xs font-semibold text-slate-500 animate-pulse">Generating...</span>
                                </div>
                            ) : (
                                <div 
                                    onClick={() => setSelectedImage(result.image)}
                                    className="w-full h-full group cursor-pointer animate-in fade-in duration-700"
                                >
                                    <img src={result.image.url} alt="Result" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-3 backdrop-blur-sm rounded-xl">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors">
                                            <Maximize2 size={24} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center gap-4">
                    <button 
                        onClick={() => setStep(2)}
                        disabled={isAnyLoading}
                        className={`px-6 py-3 rounded-xl font-medium border border-slate-200 transition-colors ${
                            isAnyLoading 
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                        Generate More
                    </button>
                    <button 
                        onClick={resetAll}
                        disabled={isAnyLoading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-colors ${
                            isAnyLoading
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
            {/* Header Progress Indicators */}
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <h2 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <Sparkles className="text-primary-600" size={20} />
                    AI Studio
                </h2>
                
                <div className="flex items-center gap-2">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                                step === s 
                                ? 'bg-primary-600 text-white' 
                                : step > s 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-slate-200 text-slate-500'
                            }`}>
                                {step > s ? <Check size={16} /> : s}
                            </div>
                            {s < 3 && (
                                <div className={`w-8 h-1 mx-2 rounded-full ${step > s ? 'bg-green-500' : 'bg-slate-200'}`}></div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="text-xs font-medium text-slate-500 bg-white px-3 py-1.5 rounded-full border border-slate-200">
                    {remainingQuota} credits
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
                <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black/50 ring-1 ring-white/10">
                        {/* Image */}
                        <img 
                            src={selectedImage.url} 
                            alt="Full size" 
                            className="max-h-[75vh] w-auto max-w-full object-contain"
                        />
                    </div>
                    
                    {/* Buttons */}
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setSelectedImage(null)}
                            className="px-6 py-2.5 bg-white text-slate-900 rounded-full font-bold text-sm hover:bg-slate-200 transition-colors shadow-lg"
                        >
                            Close
                        </button>
                        <a 
                            href={selectedImage.url} 
                            target="_blank"
                            rel="noreferrer"
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-full font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg flex items-center gap-2"
                        >
                            <Download size={16} /> Download High Res
                        </a>
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