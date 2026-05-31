import React, { useMemo } from 'react';
import { Clock } from 'lucide-react';
import { WarehouseMovement } from '../types';

interface ValidityAnalysisPanelProps {
    warehouseLog: WarehouseMovement[];
}

const ValidityAnalysisPanel: React.FC<ValidityAnalysisPanelProps> = ({ warehouseLog }) => {
    
    // Calculates remaining quantity for each entry
    const stockItems = useMemo(() => {
        const movements = [...warehouseLog].sort((a, b) => a.timestamp - b.timestamp);
        const entries = movements.filter(m => m.type === 'entrada' && m.expirationDate);
        const exits = movements.filter(m => m.type === 'saida' || m.type === 'saída');

        return entries.map(entry => {
            const consumed = exits.filter(exit => exit.itemName === entry.itemName && exit.invoiceNumber === entry.invoiceNumber)
                                 .reduce((acc, curr) => acc + (curr.quantity || curr.kg || 0), 0);
            const remaining = (entry.quantity || entry.kg || 0) - consumed;
            return { ...entry, remaining };
        }).filter(item => item.remaining > 0);
    }, [warehouseLog]);

    const validityAnalysis = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return stockItems.map(item => {
            const expDate = new Date(item.expirationDate! + 'T00:00:00');
            const diffTime = expDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            return {
                ...item,
                daysUntilExpiration: diffDays
            };
        }).sort((a, b) => a.daysUntilExpiration - b.daysUntilExpiration);
    }, [stockItems]);

    return (
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
            <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex items-center gap-3">
                <div className="bg-amber-500 text-white p-2 rounded-[1rem]">
                    <Clock className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none italic">Monitoramento de Validade</h2>
                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Controle de Estoque por Shelf-Life</p>
                </div>
            </div>

            <div className="p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {validityAnalysis.length > 0 ? validityAnalysis.map(item => (
                    <div key={item.id} className={`p-4 rounded-2xl border ${item.daysUntilExpiration <= 15 ? 'bg-rose-50 border-rose-200' : 'bg-white border-gray-100'} shadow-sm flex flex-col justify-between`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-xs text-zinc-900 uppercase truncate leading-none">{item.itemName || item.item}</span>
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${item.daysUntilExpiration <= 15 ? 'bg-rose-600 text-white' : 'bg-green-600 text-white'}`}>
                                {item.daysUntilExpiration} dias
                            </span>
                        </div>
                        <div className="space-y-1 text-[10px] font-bold text-gray-500 uppercase">
                            <p>Fornecedor: {item.supplierName}</p>
                            <p>Validade: { (item.expirationDate || '').split('-').reverse().join('/') }</p>
                            <p>Estoque: {(item.remaining || 0).toFixed(2)}</p>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-10 text-center text-gray-400 font-bold uppercase tracking-[0.2em] italic">
                        Nenhum item em estoque com monitoramento de validade necessário.
                    </div>
                )}
            </div>
        </div>
    );
};

export default ValidityAnalysisPanel;
