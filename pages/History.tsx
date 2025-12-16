import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/storageService';
import { GenerationSession, GeneratedImage } from '../types';
import { Layout } from '../components/Layout';
import { Download, Calendar, ArrowLeft, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const History = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GenerationSession[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      const history = await getHistory();
      setSessions(history);
    };
    loadHistory();

    const handleMigrationComplete = () => {
      loadHistory();
    };
    window.addEventListener('history-migrated', handleMigrationComplete);

    return () => {
      window.removeEventListener('history-migrated', handleMigrationComplete);
    };
  }, [user]);

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    const month = date.toLocaleDateString('en-US', { month: 'long' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  };

  const handleDownloadImage = async (image: GeneratedImage) => {
    try {
      const response = await fetch(image.url);
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
                          src={img.webpUrl || img.url} 
                          alt="Generated Headshot" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
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
                <div className="relative z-10 w-full max-w-5xl flex flex-col items-center justify-center gap-6 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                    <div className="relative rounded-xl overflow-hidden shadow-2xl bg-black/50 ring-1 ring-white/10">
                        {/* Image */}
                        <img 
                            src={selectedImage.webpUrl || selectedImage.url} 
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
                        <button 
                            onClick={() => handleDownloadImage(selectedImage)}
                            className="px-6 py-2.5 bg-primary-600 text-white rounded-full font-bold text-sm hover:bg-primary-700 transition-colors shadow-lg flex items-center gap-2"
                        >
                            <Download size={16} /> Download High Res
                        </button>
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