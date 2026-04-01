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
            <div className={`p-8 text-white flex justify-between items-center transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-900' : 'bg-indigo-900'}`}>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter italic">Portal de Informações</h2>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-300' : 'text-indigo-300'}`}>Comunicados Oficiais • Gestão 2026</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l18 18" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className={`flex-1 overflow-y-auto p-8 transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-50/30' : 'bg-slate-50'}`}>
              {infoList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4 py-20">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0l-8 8-8-8" />
                  </svg>
                  <p className="font-bold uppercase tracking-widest text-sm">Nenhuma informação disponível no momento</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {infoList.map((info, index) => (
                    <motion.div
                      key={info.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                          {info.sector}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {new Date(info.updatedAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <h3 className={`text-lg font-black text-slate-900 mb-2 uppercase tracking-tight leading-tight transition-colors duration-500 ${isAbrilVerde ? 'group-hover:text-emerald-600' : 'group-hover:text-indigo-600'}`}>
                        {info.title}
                      </h3>
                      <p className="text-slate-600 text-sm leading-relaxed font-medium">
                        {info.content}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-center">
              <p className={`text-[10px] font-bold uppercase tracking-[0.3em] transition-colors duration-500 ${isAbrilVerde ? 'text-emerald-300' : 'text-slate-300'}`}>
                Transparência e Comunicação • Taiúva/SP
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default PublicInfoPortal;
