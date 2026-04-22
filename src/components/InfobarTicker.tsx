import React from 'react';
import { motion } from 'framer-motion';

interface InfobarTickerProps {
    items: { id: string; sector?: string; title: string; content?: string }[];
    defaultText?: string;
    variant?: 'dark' | 'light';
    label?: string;
}

const InfobarTicker: React.FC<InfobarTickerProps> = ({ 
    items, 
    defaultText = "Gestão de Dados P Taiuva • Transparência e Eficiência em Tempo Real • 2026",
    variant = 'light',
    label = "Comunicados:"
}) => {
    const isDark = variant === 'dark';
    
    // Duplicate items for seamless transition
    const displayContent = items.length > 0 ? (
        <>
            {items.map((item) => (
                <div key={`${item.id}-1`} className={`text-[11px] font-bold flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-blue-900'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-400'}`}></span>
                    <span className={`uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>[{item.sector || 'GERAL'}]</span> 
                    <span>{item.title}</span>
                    {item.content && (
                        <span className={`font-medium opacity-80 ml-1`}>
                             — {item.content}
                        </span>
                    )}
                </div>
            ))}
            {/* Same items again for loop */}
            {items.map((item) => (
                <div key={`${item.id}-2`} className={`text-[11px] font-bold flex items-center gap-2 ${isDark ? 'text-slate-300' : 'text-blue-900'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-indigo-500' : 'bg-blue-400'}`}></span>
                    <span className={`uppercase tracking-wider ${isDark ? 'text-indigo-400' : 'text-blue-600'}`}>[{item.sector || 'GERAL'}]</span> 
                    <span>{item.title}</span>
                    {item.content && (
                        <span className={`font-medium opacity-80 ml-1`}>
                             — {item.content}
                        </span>
                    )}
                </div>
            ))}
        </>
    ) : (
        <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-500' : 'text-blue-400'}`}>
            {defaultText} — {defaultText}
        </p>
    );

    return (
        <div className={`${isDark ? 'bg-indigo-600/10 border-b border-indigo-500/20' : 'bg-blue-50 border-b border-blue-100'} overflow-hidden py-2 backdrop-blur-sm`}>
            <div className="max-w-7xl mx-auto px-4 flex items-center gap-6">
                <span className={`text-[9px] whitespace-nowrap font-black uppercase px-3 py-1 rounded-full border ${
                    isDark 
                    ? 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' 
                    : 'text-blue-800 bg-blue-100 border-blue-200'
                }`}>
                    {label}
                </span>
                <div className="w-full overflow-hidden relative">
                    <motion.div 
                        className="flex gap-24 whitespace-nowrap"
                        initial={{ x: 0 }}
                        animate={{ x: "-50%" }}
                        transition={{ 
                            duration: (items?.length || 0) > 3 ? 60 : 35, 
                            repeat: Infinity, 
                            ease: "linear" 
                        }}
                    >
                        {displayContent}
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default InfobarTicker;
