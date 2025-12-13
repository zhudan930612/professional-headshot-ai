import React, { useEffect, useState } from 'react';
import { getHistory } from '../services/storageService';
import { GenerationSession, GeneratedImage } from '../types';
import { Download, Calendar, ArrowLeft, Maximize2, X } from 'lucide-react';
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
    return new Date(ts).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
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
            <div className="space-y-12">
              {sessions.map((session) => (
                <div key={session.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                     <h3 className="font-semibold text-slate-900">
                        {formatDate(session.date)}
                     </h3>
                  </div>
                  <div className="p-6">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                          {session.images.map((img) => (
                              <div
                                key={img.id}
                                className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-slate-100 shadow-sm cursor-pointer"
                                onClick={() => setSelectedImage(img)}
                              >
                                  <img src={img.url} alt="Generated Headshot" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3 backdrop-blur-sm rounded-xl">
                                       <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors">
                                           <Maximize2 size={24} />
                                       </div>
                                       <a 
                                          href={img.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white hover:bg-white/30 transition-colors"
                                          title="Download High Res"
                                       >
                                           <Download size={24} />
                                       </a>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
                </div>
              ))}
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
                    <X size={32} />
                </button>
            </div>
        )}
    </>
  );
};