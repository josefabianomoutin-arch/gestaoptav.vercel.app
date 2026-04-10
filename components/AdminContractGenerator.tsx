import React, { useRef } from 'react';
import html2pdf from 'html2pdf.js';
import type { PerCapitaSupplier } from '../types';

interface AdminContractGeneratorProps {
    producers: PerCapitaSupplier[];
    type: 'PRODUTOR' | 'FORNECEDOR';
    activeContractPeriod: string;
}

const AdminContractGenerator: React.FC<AdminContractGeneratorProps> = ({ producers, type, activeContractPeriod }) => {
    const contractRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        if (!contractRef.current) return;
        const opt = {
            margin: [10, 10, 10, 10] as [number, number, number, number],
            filename: `Contrato_${type}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg' as const, quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
        };
        html2pdf().set(opt).from(contractRef.current).save();
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex justify-end">
                <button 
                    onClick={handlePrint}
                    className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-indigo-700 shadow-lg transition-all active:scale-95 flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    Gerar Contrato PDF
                </button>
            </div>
            <div ref={contractRef} className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-sm">
                <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter mb-8 text-center">
                    Minuta de Contrato - {type}
                </h2>
                <div className="space-y-6">
                    {producers.map(producer => (
                        <div key={producer.id} className="border-b border-zinc-100 pb-6">
                            <h4 className="font-bold text-zinc-800">{producer.name}</h4>
                            <p className="text-sm text-zinc-600">CPF/CNPJ: {producer.cpfCnpj}</p>
                            <p className="text-sm text-zinc-600">Processo: {producer.processNumber}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminContractGenerator;
