
import React, { useState, useMemo, useRef } from 'react';
import type { PerCapitaSupplier } from '../types';
import html2pdf from 'html2pdf.js';
import ContractView from './ContractView';

interface AdminContractGeneratorProps {
    producers: PerCapitaSupplier[];
    type: 'PRODUTOR' | 'FORNECEDOR';
    activeContractPeriod?: '1_QUAD' | '2_3_QUAD';
}

const AdminContractGenerator: React.FC<AdminContractGeneratorProps> = ({ producers, type, activeContractPeriod = '1_QUAD' }) => {
    const [selectedProducerId, setSelectedProducerId] = useState<string>('');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedProducer = useMemo(() => 
        producers.find(p => p.id === selectedProducerId),
    [producers, selectedProducerId]);

    const contractDate = useMemo(() => {
        const now = new Date();
        const day = now.getDate();
        const month = now.toLocaleString('pt-BR', { month: 'long' });
        const year = now.getFullYear();
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        
        const daysInWords = [
            'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
            'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
            'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta', 'trinta e um'
        ];

        return `Aos ${daysInWords[day]}(${day}) dias do mês de ${capitalizedMonth} do ano de ${year}`;
    }, []);

    const handlePrint = () => {
        if (!containerRef.current || !selectedProducer) return;
        
        const opt: any = {
            margin:       [10, 10, 10, 10],
            filename:     `Contrato_${selectedProducer.name.replace(/\s+/g, '_')}.pdf`,
            image:        { type: 'jpeg' as const, quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                logging: false,
                letterRendering: false,
                windowWidth: 800
            },
            jsPDF:        { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const },
            pagebreak:    { mode: ['css', 'legacy'], avoid: '.avoid-break' }
        };

        html2pdf().set(opt).from(containerRef.current).save();
    };

    if (producers.length === 0) {
        return (
            <div className="p-8 text-center text-zinc-500 font-bold">
                Nenhum {type.toLowerCase()} cadastrado para gerar contrato.
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-end gap-4 bg-zinc-50 p-6 rounded-2xl border border-zinc-200 print:hidden">
                <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">
                        Selecione o {type}
                    </label>
                    <select 
                        value={selectedProducerId}
                        onChange={(e) => setSelectedProducerId(e.target.value)}
                        className="w-full bg-white border-2 border-zinc-200 rounded-xl px-4 py-3 font-bold text-sm focus:border-indigo-500 outline-none transition-all"
                    >
                        <option value="">Selecione...</option>
                        {producers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <button 
                    onClick={handlePrint}
                    disabled={!selectedProducerId}
                    className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar PDF
                </button>
            </div>

            {selectedProducer ? (
                <div ref={containerRef}>
                    <ContractView 
                        producer={selectedProducer} 
                        activeContractPeriod={activeContractPeriod}
                        contractDate={contractDate}
                    />
                </div>
            ) : (
                <div className="p-8 text-center text-zinc-400 italic">
                    Selecione um {type.toLowerCase()} para visualizar o contrato.
                </div>
            )}
        </div>
    );
};

export default AdminContractGenerator;
