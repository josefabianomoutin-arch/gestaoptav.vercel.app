import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicInfo } from '../types';

interface PublicInfoPortalProps {
  isOpen: boolean;
  onClose: () => void;
  infoList: PublicInfo[];
}

const PublicInfoPortal: React.FC<PublicInfoPortalProps> = ({ isOpen, onClose, infoList }) => {
  const isAbrilVerde = new Date().getMonth() === 3; // April is index 3
  const [selectedInfo, setSelectedInfo] = React.useState<PublicInfo | null>(null);
  const [zoomedImage, setZoomedImage] = React.useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen && selectedInfo !== null) {
      setSelectedInfo(null);
    }
  }

  // Filter non-confidential items and sort by date/updatedAt descending (newest first)
  const displayItems = React.useMemo(() => {
    return [...infoList]
      .filter(info => !info.isConfidential)
      .sort((a, b) => new Date(b.updatedAt || b.date || 0).getTime() - new Date(a.updatedAt || a.date || 0).getTime());
  }, [infoList]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-4xl bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className={`p-6 sm:p-10 text-white relative overflow-hidden transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-900' : 'bg-indigo-900'}`}>
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
              
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-4 sm:gap-6">
                  {selectedInfo ? (
                    <button 
                      onClick={() => setSelectedInfo(null)}
                      className="p-3 sm:p-4 bg-white/15 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-inner hover:bg-white/25 transition-all active:scale-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  ) : (
                    <motion.div 
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                      className="p-3 sm:p-4 bg-white/15 backdrop-blur-md rounded-2xl sm:rounded-3xl shadow-inner"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-10 sm:w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </motion.div>
                  )}
                  <div>
                    <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tighter italic leading-none mb-1 sm:mb-2">
                      {selectedInfo ? 'Leitura Completa' : 'Fique por dentro! 📢'}
                    </h2>
                    <p className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] opacity-80 transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-300' : 'text-indigo-200'}`}>
                      {selectedInfo ? `Publicado em ${new Date(selectedInfo.updatedAt || selectedInfo.date || '2026-01-01').toLocaleDateString('pt-BR')}` : 'Novidades, Avisos e Transparência • 2026'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2.5 sm:p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className={`flex-1 overflow-y-auto transition-colors duration-500 relative ${isAbrilVerde ? 'bg-[#f7fee7]/50' : 'bg-slate-50'}`}>
              <AnimatePresence mode="wait">
                {selectedInfo ? (
                  <motion.div
                    key="reading-mode"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-6 sm:p-12 max-w-3xl mx-auto space-y-6"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl ${isAbrilVerde ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        #{selectedInfo.sector}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {new Date(selectedInfo.updatedAt || selectedInfo.date || '2026-01-01').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 uppercase tracking-tight leading-[1.1]">
                      {selectedInfo.title}
                    </h1>

                    {/* Image Banner in Reading Mode if exists */}
                    {selectedInfo.imageUrl && (
                      <div className="my-6 rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 group relative">
                        <img 
                          src={selectedInfo.imageUrl} 
                          alt={selectedInfo.title}
                          className="w-full max-h-[450px] object-contain mx-auto bg-slate-900 cursor-pointer transition-transform duration-300 group-hover:scale-102"
                          onClick={() => setZoomedImage(selectedInfo.imageUrl || null)}
                        />
                        <div className="p-2 bg-slate-900/80 text-white text-[10px] font-bold text-center uppercase tracking-widest backdrop-blur-md flex items-center justify-center gap-1 cursor-pointer"
                             onClick={() => setZoomedImage(selectedInfo.imageUrl || null)}>
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                          </svg>
                          Clique na imagem para ampliar
                        </div>
                      </div>
                    )}
                    
                    <div className="prose prose-slate prose-lg max-w-none pt-2">
                      <p className="text-slate-700 text-base sm:text-xl leading-relaxed font-medium whitespace-pre-wrap">
                        {selectedInfo.content}
                      </p>
                    </div>

                    <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-center">
                      <button 
                        onClick={() => setSelectedInfo(null)}
                        className={`flex items-center gap-2 font-black uppercase text-xs tracking-widest transition-colors ${isAbrilVerde ? 'text-emerald-600 hover:text-emerald-800' : 'text-indigo-600 hover:text-indigo-800'}`}
                      >
                        ← Voltar para a lista
                      </button>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        Taiúva/SP • Gestão 2026
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="list-mode"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="p-6 sm:p-10"
                  >
                    {/* Subtle background watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                      <h1 className="text-[15vw] font-black rotate-[-5deg]">COMUNICADOS</h1>
                    </div>

                    {displayItems.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-6 py-20 relative z-10">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" />
                          </svg>
                        </div>
                        <p className="font-black uppercase tracking-widest text-sm text-center max-w-xs leading-relaxed">
                          Tudo tranquilo por aqui! <br/> <span className="font-medium normal-case opacity-60">Nenhum aviso novo no momento.</span>
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 relative z-10">
                        {displayItems.map((info, index) => (
                          <motion.div
                            key={info.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05, type: "spring", stiffness: 100 }}
                            whileHover={{ scale: 1.015 }}
                            onClick={() => setSelectedInfo(info)}
                            className="bg-white rounded-[2rem] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-slate-100 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.14)] transition-all group relative overflow-hidden cursor-pointer flex flex-col justify-between"
                          >
                            {/* Decorative corner accent */}
                            <div className={`absolute top-0 left-0 w-2 h-full transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-500' : 'bg-indigo-500'} opacity-30 group-hover:opacity-100 z-10`}></div>

                            <div>
                              {/* Card Header Image if exists */}
                              {info.imageUrl ? (
                                <div className="h-44 sm:h-48 w-full bg-slate-900 overflow-hidden relative">
                                  <img 
                                    src={info.imageUrl} 
                                    alt={info.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20"></div>
                                  <div className="absolute top-4 left-5 right-5 flex justify-between items-center z-10">
                                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-[0.15em] rounded-lg bg-white/90 backdrop-blur-md shadow-xs ${isAbrilVerde ? 'text-emerald-700' : 'text-indigo-700'}`}>
                                      #{info.sector}
                                    </span>
                                    <span className="text-[10px] text-white/90 font-bold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-lg">
                                      {new Date(info.updatedAt || info.date || '2026-01-01').toLocaleDateString('pt-BR')}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="p-6 pb-0 flex justify-between items-center">
                                  <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                    #{info.sector}
                                  </span>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    {new Date(info.updatedAt || info.date || '2026-01-01').toLocaleDateString('pt-BR')}
                                  </div>
                                </div>
                              )}

                              <div className="p-6">
                                <h3 className={`text-lg sm:text-xl font-black text-slate-900 mb-3 uppercase tracking-tight leading-tight transition-colors duration-500 ${isAbrilVerde ? 'group-hover:text-emerald-600' : 'group-hover:text-indigo-600'}`}>
                                  {info.title}
                                </h3>
                                
                                <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-medium line-clamp-3">
                                  {info.content}
                                </p>
                              </div>
                            </div>

                            <div className="p-6 pt-0 flex justify-between items-center border-t border-slate-50 mt-2">
                              {info.imageUrl ? (
                                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  🖼️ Imagem anexada
                                </span>
                              ) : (
                                <span></span>
                              )}
                              <span className={`text-[10px] font-black uppercase tracking-widest transition-opacity duration-300 ${isAbrilVerde ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                Ler na íntegra →
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 bg-white border-t border-slate-100 flex flex-col items-center gap-1">
              <p className={`text-[10px] sm:text-[11px] font-black uppercase tracking-[0.3em] transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-500' : 'text-slate-500'}`}>
                Transparência • Conexão • Unidade
              </p>
              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                Taiúva/SP &copy; 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}

      {/* Lightbox Modal for Zooming Images */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[150] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img 
              src={zoomedImage} 
              alt="Imagem ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20" 
            />
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-[-40px] right-0 text-white font-bold text-xs uppercase bg-white/20 px-3 py-1.5 rounded-full hover:bg-white/40 transition-all"
            >
              ✕ Fechar Ampliação
            </button>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PublicInfoPortal;
