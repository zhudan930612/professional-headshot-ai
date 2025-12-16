import React, { useEffect, useState, useCallback } from 'react';
import { getHistory, getUserQuotaInfo } from '../services/storageService';
import { GenerationSession, GeneratedImage, QuotaInfo } from '../types';
import { Layout } from '../components/Layout';
import { Download, Calendar, ArrowLeft, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { downloadImageWithWatermark } from '../services/watermarkService';

export const History = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);
  const [quotaInfo, setQuotaInfo] = useState<QuotaInfo | null>(null);

  const loadData = useCallback(async () => {
    const history = await getHistory();
    setSessions(history);

    if (user) {
      try {
        const info = await getUserQuotaInfo();
        setQuotaInfo(info);
      } catch (err) {
        console.error('加载配额信息失败:', err);
      }
    } else {
      setQuotaInfo(null);
    }
  }, [user]);

  useEffect(() => {
    loadData();

    const handleMigrationComplete = () => {
      loadData();
    };
    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('history-migrated', handleMigrationComplete);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('history-migrated', handleMigrationComplete);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, loadData]);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const baseUrl = image.webpUrl || image.url;
      if (quotaInfo?.has_watermark) {
        try {
          await downloadImageWithWatermark(baseUrl, `professional-headshot-${Date.now()}.png`);
          return;
        } catch (e) {
          console.error('水印下载失败，回退原图:', e);
        }
      }

      const response = await fetch(baseUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `professional-headshot-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback: open in new tab
      window.open(image.url, '_blank');
    }
  };

  const showWatermark = quotaInfo?.has_watermark;

  const handleUpgrade = () => {
    navigate('/pricing');
  };

  return (
    <Layout>
      <div className="bg-slate-50 min-h-[80vh] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">My Headshots</h1>
            <p className="text-slate-600">Access and download your previously generated photos.</p>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
              <div className="mb-6 inline-flex p-4 bg-slate-100 rounded-full">
                  <Calendar className="text-slate-400" size={48} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">No headshots yet</h2>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                You haven't generated any professional headshots yet. Upload your photos to get started!
              </p>
              <Link 
                to="/" 
                className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-primary-700 transition-colors"
              >
                <ArrowLeft size={18} /> Go to Generator
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {sessions.flatMap((session) =>
                  session.images.map((img) => (
                    <div
                      key={img.id}
                      className="group relative"
                    >
                      {/* Image Container */}
                      <div
                        className="relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 shadow-sm cursor-pointer border border-slate-200 mb-3"
                        onClick={() => setSelectedImage(img)}
                      >
                        <img 
                          src={`${img.webpUrl || img.url}?width=400&quality=75`}
                          alt="Generated Headshot" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {showWatermark && (
                          <div className="pointer-events-none absolute inset-0 flex items-end justify-end">
                            <div className="m-2 px-2 py-1 bg-black/60 text-[10px] font-bold uppercase tracking-wide text-white rounded">
                              Free Version
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Date */}
                      <div className="text-sm text-slate-600">
                        {formatDate(session.date)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
                            src={selectedImage.webpUrl || selectedImage.url} 
                            alt="Full size" 
                            className="max-h-[75vh] w-auto max-w-full object-contain"
                        />
                        {showWatermark && (
                          <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3">
                            <div className="px-3 py-1.5 bg-black/60 text-xs font-bold uppercase tracking-wide text-white rounded">
                              Free Version
                            </div>
                          </div>
                        )}
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
                        {showWatermark && (
                          <div className="relative inline-block">
                            <button
                              onClick={handleUpgrade}
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
                      {showWatermark && (
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
                    <X size={32} />
                </button>
            </div>
        )}
    </Layout>
  );
};