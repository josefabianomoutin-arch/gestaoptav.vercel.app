import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { PublicInfo } from '../types';

interface PublicInfoPortalProps {
  isOpen: boolean;
  onClose: () => void;
  infoList: PublicInfo[];
}

const PublicInfoPortal: React.FC<PublicInfoPortalProps> = ({ isOpen, onClose, infoList }) => {
  const isAbrilVerde = new Date().getMonth() === 3; // April is index 3
  const [selectedInfo, setSelectedInfo] = React.useState<PublicInfo | null>(null);

  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (!isOpen && selectedInfo !== null) {
      setSelectedInfo(null);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
            className="relative w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className={`p-10 text-white relative overflow-hidden transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-900' : 'bg-indigo-900'}`}>
              {/* Decorative background elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-400/10 rounded-full -ml-10 -mb-10 blur-2xl"></div>
              
              <div className="relative z-10 flex justify-between items-center">
                <div className="flex items-center gap-6">
                  {selectedInfo ? (
                    <button 
                      onClick={() => setSelectedInfo(null)}
                      className="p-4 bg-white/15 backdrop-blur-md rounded-3xl shadow-inner hover:bg-white/25 transition-all active:scale-90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                  ) : (
                    <motion.div 
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                      className="p-4 bg-white/15 backdrop-blur-md rounded-3xl shadow-inner"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </motion.div>
                  )}
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter italic leading-none mb-2">
                      {selectedInfo ? 'Leitura Completa' : 'Fique por dentro! 📢'}
                    </h2>
                    <p className={`text-[11px] font-bold uppercase tracking-[0.3em] opacity-80 transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-300' : 'text-indigo-200'}`}>
                      {selectedInfo ? `Publicado em ${new Date(selectedInfo.updatedAt).toLocaleDateString('pt-BR')}` : 'Novidades, Avisos e Transparência • 2026'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-2xl transition-all active:scale-90 group"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="p-10 md:p-16 max-w-3xl mx-auto"
                  >
                    <div className="flex items-center gap-3 mb-8">
                      <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl ${isAbrilVerde ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        #{selectedInfo.sector}
                      </span>
                    </div>
                    
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-10 uppercase tracking-tight leading-[1.1]">
                      {selectedInfo.title}
                    </h1>
                    
                    <div className="prose prose-slate prose-lg max-w-none">
                      <p className="text-slate-700 text-xl md:text-2xl leading-relaxed font-medium whitespace-pre-wrap">
                        {selectedInfo.content}
                      </p>
                    </div>

                    <div className="mt-16 pt-10 border-t border-slate-200 flex justify-between items-center">
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
                    className="p-10"
                  >
                    {/* Subtle background watermark */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
                      <h1 className="text-[15vw] font-black rotate-[-5deg]">COMUNICADOS</h1>
                    </div>

                    {infoList.length === 0 ? (
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
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        {infoList.map((info, index) => (
                          <motion.div
                            key={info.id}
                            initial={{ opacity: 0, y: 30, rotate: index % 2 === 0 ? -1 : 1 }}
                            animate={{ opacity: 1, y: 0, rotate: 0 }}
                            transition={{ delay: index * 0.1, type: "spring", stiffness: 100 }}
                            whileHover={{ scale: 1.02, rotate: index % 2 === 0 ? 0.5 : -0.5 }}
                            onClick={() => setSelectedInfo(info)}
                            className="bg-white p-8 rounded-[2.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.1)] border border-white hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] transition-all group relative overflow-hidden cursor-pointer"
                          >
                            {/* Decorative corner accent */}
                            <div className={`absolute top-0 left-0 w-2 h-full transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-500' : 'bg-indigo-500'} opacity-20 group-hover:opacity-100`}></div>
                            
                            <div className="flex justify-between items-center mb-6">
                              <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.15em] rounded-xl transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                #{info.sector}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(info.updatedAt).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            
                            <h3 className={`text-xl font-black text-slate-900 mb-4 uppercase tracking-tight leading-tight transition-colors duration-500 ${isAbrilVerde ? 'group-hover:text-emerald-600' : 'group-hover:text-indigo-600'}`}>
                              {info.title}
                            </h3>
                            
                            <div className="relative">
                              <p className="text-slate-600 text-sm leading-relaxed font-medium line-clamp-4">
                                {info.content}
                              </p>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-50 flex justify-end">
                              <span className={`text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isAbrilVerde ? 'text-emerald-500' : 'text-indigo-500'}`}>
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
            <div className="p-8 bg-white border-t border-slate-100 flex flex-col items-center gap-2">
              <p className={`text-[11px] font-black uppercase tracking-[0.4em] transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-400' : 'text-slate-400'}`}>
                Transparência • Conexão • Unidade
              </p>
              <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">
                Taiúva/SP &copy; 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PublicInfoPortal;
