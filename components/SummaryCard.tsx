
import React, { useMemo } from 'react';
import type { Supplier } from '../types';
import { MONTHS_2026 } from '../constants';

interface SummaryCardProps {
    supplier: Supplier;
    activeContractPeriod?: '1_QUAD' | '2_3_QUAD';
    isRegisteredForNextPeriod?: boolean;
}

const getContractItemDisplayInfo = (item: Supplier['contractItems'][0]): { quantity: number; unit: string } => {
    if (!item) return { quantity: 0, unit: 'N/A' };
    const [unitType, unitWeightStr] = (item.unit || 'kg-1').split('-');
    const contractQuantity = item.totalKg || 0;
    const unitWeight = parseFloat(unitWeightStr) || 1;
    let displayQuantity = contractQuantity;
    let displayUnit = 'Un';
    switch (unitType) {
        case 'kg': case 'un': displayQuantity = contractQuantity; displayUnit = 'Kg'; break;
        case 'saco': case 'balde': case 'pacote': case 'pote': displayQuantity = contractQuantity * unitWeight; displayUnit = 'Kg'; break;
        case 'litro': case 'l': case 'caixa': case 'embalagem': displayQuantity = contractQuantity * unitWeight; displayUnit = 'L'; break;
        case 'dz': displayQuantity = contractQuantity; displayUnit = 'Dz'; break;
        default: displayQuantity = contractQuantity; displayUnit = 'Un';
    }
    return { quantity: displayQuantity, unit: displayUnit };
};

const formatQuantity = (quantity: number, unit: string): string => {
    const options: Intl.NumberFormatOptions = {
        minimumFractionDigits: (unit === 'Dz' || unit === 'Un') ? 0 : 2,
        maximumFractionDigits: (unit === 'Dz' || unit === 'Un') ? 0 : 2,
    };
    return `${quantity.toLocaleString('pt-BR', options)} ${unit}`;
};

const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const SummaryCard: React.FC<SummaryCardProps> = ({ supplier, activeContractPeriod = '1_QUAD', isRegisteredForNextPeriod = false }) => {
    const deliveries = (Object.values(supplier.deliveries || {}) as any[]);
    const contractItems = (Object.values(supplier.contractItems || {}) as any[]);

    const visibleMonths = useMemo(() => {
        if (activeContractPeriod === '1_QUAD') {
            return MONTHS_2026.filter(m => m.number <= 3 || isRegisteredForNextPeriod);
        }
        return MONTHS_2026.filter(m => m.number >= 4);
    }, [activeContractPeriod, isRegisteredForNextPeriod]);

    const totalDeliveredValue = deliveries.reduce((sum: number, delivery: any) => sum + (delivery.value || 0), 0);
    const valueProgress = supplier.initialValue > 0 ? (totalDeliveredValue / supplier.initialValue) * 100 : 0;

    const aggregatedTotals = useMemo(() => {
        const contracted = new Map<string, number>();
        const delivered = new Map<string, number>();
        contractItems.forEach(item => {
            const { quantity, unit } = getContractItemDisplayInfo(item as any);
            contracted.set(unit, (contracted.get(unit) || 0) + quantity);
        });
        deliveries.forEach(delivery => {
            if (!delivery.item || (delivery.kg || 0) === 0) return;
            const contractItem = contractItems.find(ci => ci.name === delivery.item);
            if (contractItem) {
                const { unit } = getContractItemDisplayInfo(contractItem as any);
                delivered.set(unit, (delivered.get(unit) || 0) + (delivery.kg || 0));
            }
        });
        return { contracted, delivered };
    }, [contractItems, deliveries]);

    const totalContractedKgForProgress = aggregatedTotals.contracted.get('Kg') || 0;
    const totalDeliveredKgForProgress = aggregatedTotals.delivered.get('Kg') || 0;
    const kgProgress = totalContractedKgForProgress > 0 ? (totalDeliveredKgForProgress / totalContractedKgForProgress) * 100 : 0;

    const monthlyDataByItem = useMemo(() => {
        const data = new Map<string, any[]>();
        
        // Group items by name to handle different periods for the same item
        const groupedItems = new Map<string, any[]>();
        contractItems.forEach(item => {
            const list = groupedItems.get(item.name) || [];
            list.push(item);
            groupedItems.set(item.name, list);
        });

        groupedItems.forEach((items, itemName) => {
            const itemMonthlyData = [];
            let accumulatedQuantityRemainder = 0;
            let accumulatedValueRemainder = 0;

            // Use the first item to get unit info (assuming same name means same unit)
            const { unit: itemUnit } = getContractItemDisplayInfo(items[0] as any);

            for (const month of visibleMonths) {
                const isQ1 = month.number <= 3;
                const divisor = isQ1 ? 4 : 8;
                const currentPeriod = isQ1 ? '1_QUAD' : '2_3_QUAD';

                // Find the item that applies to this period
                // If an item has no period, we treat it as Q1 if we are in Q1, 
                // but we must be careful not to double count if there's a Q2/Q3 item.
                let activeItem = items.find(it => it.period === currentPeriod);
                
                // Fallback for legacy data or main suppliers
                if (!activeItem) {
                    activeItem = items.find(it => !it.period);
                }

                let monthlyValueQuota = 0;
                let monthlyQuantityQuota = 0;

                if (activeItem) {
                    const { quantity: itemTotalQuantity } = getContractItemDisplayInfo(activeItem as any);
                    const itemTotalValue = (activeItem.totalKg || 0) * (activeItem.valuePerKg || 0);
                    
                    // If the item has a specific period, use the period's divisor (4 or 8)
                    // If it's a yearly item (no period), use 12 to distribute across the whole year
                    const itemDivisor = activeItem.period ? divisor : 12;
                    
                    monthlyValueQuota = itemTotalValue / itemDivisor;
                    monthlyQuantityQuota = itemTotalQuantity / itemDivisor;
                }

                const lastMonthOfPeriod = isQ1 ? 3 : 11;

                if (month.number === lastMonthOfPeriod) {
                    monthlyValueQuota += accumulatedValueRemainder;
                    monthlyQuantityQuota += accumulatedQuantityRemainder;
                }

                const deliveredInMonth = deliveries.filter(d => {
                    if (d.item !== itemName) return false;
                    const parts = d.date.split('-');
                    if (parts.length < 2) return false;
                    const monthNumber = parseInt(parts[1], 10);
                    return (monthNumber - 1) === month.number;
                });
                const deliveredValue = deliveredInMonth.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
                const deliveredQuantity = deliveredInMonth.reduce((sum: number, d: any) => sum + (d.kg || 0), 0);
                
                const remainingValue = monthlyValueQuota - deliveredValue;
                const remainingQuantity = monthlyQuantityQuota - deliveredQuantity;

                if (month.number < lastMonthOfPeriod) {
                    accumulatedValueRemainder += remainingValue;
                    accumulatedQuantityRemainder += remainingQuantity;
                }

                itemMonthlyData.push({
                    monthName: month.name,
                    contractedValue: monthlyValueQuota,
                    contractedQuantity: monthlyQuantityQuota,
                    deliveredValue,
                    deliveredQuantity,
                    remainingValue: remainingValue,
                    remainingQuantity: remainingQuantity,
                    unit: itemUnit,
                });
            }
            data.set(itemName, itemMonthlyData);
        });
        return data;
    }, [supplier.contractItems, supplier.deliveries, visibleMonths]);

    const uniqueItemNames = useMemo(() => {
        return Array.from(new Set(contractItems.map(item => item.name)));
    }, [contractItems]);

    return (
        <div className="bg-white/90 backdrop-blur-sm p-6 rounded-xl shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-700 border-b pb-2">
                {activeContractPeriod === '1_QUAD' 
                    ? (isRegisteredForNextPeriod ? 'Contrato Anual 2026' : 'Contrato 1º Quadr. 2026') 
                    : 'Contrato 2º e 3º Quadr. 2026'}
            </h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {uniqueItemNames.map(itemName => {
                    const itemMonthlyData = monthlyDataByItem.get(itemName) || [];
                    return (
                        <div key={itemName} className="p-3 bg-gray-50 rounded-lg text-sm border">
                            <p className="font-bold text-gray-800 mb-2 uppercase">{itemName}</p>
                            <table className="w-full text-[10px]">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-500 font-black uppercase">
                                        <th className="p-1 text-left">Mês</th>
                                        <th className="p-1 text-right">Meta</th>
                                        <th className="p-1 text-right text-green-600">Real</th>
                                        <th className="p-1 text-right text-blue-600">Resto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {itemMonthlyData.map(data => (
                                        <tr key={data.monthName} className="border-t">
                                            <td className="p-1 font-bold align-top">{data.monthName}</td>
                                            <td className="p-1 text-right align-top">
                                                <div>{formatQuantity(data.contractedQuantity, data.unit)}</div>
                                                <div className="text-[9px] text-gray-400 font-normal">{formatCurrency(data.contractedValue)}</div>
                                            </td>
                                            <td className="p-1 text-right text-green-600 font-bold align-top">
                                                <div>{formatQuantity(data.deliveredQuantity, data.unit)}</div>
                                                <div className="text-[9px] text-green-400 font-normal">{formatCurrency(data.deliveredValue)}</div>
                                            </td>
                                            <td className="p-1 text-right text-blue-600 font-bold align-top">
                                                <div>{formatQuantity(data.remainingQuantity, data.unit)}</div>
                                                <div className="text-[9px] text-blue-400 font-normal">{formatCurrency(data.remainingValue)}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    );
                })}
            </div>
            <div className="mt-4 pt-4 border-t space-y-2">
                 <div className="flex justify-between text-xs">
                    <span className="text-gray-500 font-bold">VALOR TOTAL:</span>
                    <span className="font-black text-green-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(supplier.initialValue)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                    <div className="bg-green-500 h-3 rounded-full transition-all duration-500" style={{ width: `${valueProgress}%` }} />
                </div>
            </div>
            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }`}</style>
        </div>
    );
};

export default SummaryCard;
