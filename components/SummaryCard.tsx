
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
        // Always show full year for the annual view to avoid confusion as requested
        return MONTHS_2026;
    }, []);

    const totalDeliveredValue = deliveries.reduce((sum: number, delivery: any) => sum + (delivery.value || 0), 0);
    const valueProgress = supplier.initialValue > 0 ? (totalDeliveredValue / supplier.initialValue) * 100 : 0;

    const aggregatedTotals = useMemo(() => {
        const contracted = new Map<string, number>();
        const delivered = new Map<string, number>();
        contractItems.forEach(item => {
            const { quantity, unit } = getContractItemDisplayInfo(item as any);
            // Only count items for the current active period or yearly items
            if (!item.period || item.period === activeContractPeriod) {
                contracted.set(unit, (contracted.get(unit) || 0) + quantity);
            }
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
    }, [contractItems, deliveries, activeContractPeriod]);

    const totalContractedKgForProgress = aggregatedTotals.contracted.get('Kg') || 0;
    const totalDeliveredKgForProgress = aggregatedTotals.delivered.get('Kg') || 0;
    const kgProgress = totalContractedKgForProgress > 0 ? (totalDeliveredKgForProgress / totalContractedKgForProgress) * 100 : 0;

    const monthlyDataByItem = useMemo(() => {
        const data = new Map<string, any[]>();
        
        const groupedItems = new Map<string, any[]>();
        contractItems.forEach(item => {
            const list = groupedItems.get(item.name) || [];
            list.push(item);
            groupedItems.set(item.name, list);
        });

        groupedItems.forEach((items, itemName) => {
            const itemMonthlyData = [];
            const { unit: itemUnit } = getContractItemDisplayInfo(items[0] as any);

            // Period 1 Totals for the summary row
            let p1TotalDeliveredQty = 0;
            let p1TotalDeliveredVal = 0;

            // Determine if this is a PPAIS item/supplier
            // We consider it PPAIS if explicitly marked or if it belongs to the 2nd period group
            const isThisItemPPAIS = items.some(it => it.period === '2_3_QUAD' || it.category === 'PPAIS' || !it.period);

            for (const month of visibleMonths) {
                const isPeriod1 = month.number <= 3; // Jan, Fev, Mar, Abr
                
                let monthlyValueQuota = 0;
                let monthlyQuantityQuota = 0;

                if (!isPeriod1) {
                    // Period 2 (Maio a Dezembro) - 8 months
                    // We sum up items that are NOT for the 1st period
                    const period2Items = items.filter(it => it.period !== '1_QUAD');
                    
                    if (period2Items.length > 0) {
                        let totalQty = 0;
                        let totalVal = 0;
                        
                        period2Items.forEach(it => {
                            const { quantity } = getContractItemDisplayInfo(it as any);
                            totalQty += quantity;
                            totalVal += (it.totalKg || 0) * (it.valuePerKg || 0);
                        });
                        
                        // Strictly divide by 8 as requested for PPAIS (Maio a Dezembro)
                        monthlyValueQuota = totalVal / 8;
                        monthlyQuantityQuota = totalQty / 8;
                    }
                } else {
                    // Period 1 (Janeiro a Abril) - Meta is 0, only show delivered values
                    monthlyValueQuota = 0;
                    monthlyQuantityQuota = 0;
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
                
                if (isPeriod1) {
                    p1TotalDeliveredQty += deliveredQuantity;
                    p1TotalDeliveredVal += deliveredValue;
                }

                const remainingValue = monthlyValueQuota - deliveredValue;
                const remainingQuantity = monthlyQuantityQuota - deliveredQuantity;

                // Add header before May
                if (month.number === 4) {
                    itemMonthlyData.push({
                        isHeader: true,
                        label: 'Início do 2º Contrato (Maio-Dez)'
                    });
                }

                itemMonthlyData.push({
                    monthNumber: month.number,
                    monthName: month.name,
                    contractedValue: monthlyValueQuota,
                    contractedQuantity: monthlyQuantityQuota,
                    deliveredValue,
                    deliveredQuantity,
                    remainingValue: Math.max(0, remainingQuantity > 0 ? remainingValue : 0),
                    remainingQuantity: Math.max(0, remainingQuantity),
                    unit: itemUnit,
                    isPeriod1
                });

                // Add summary row after April
                if (month.number === 3) {
                    itemMonthlyData.push({
                        isSummary: true,
                        label: 'SALDO 1º CONTRATO',
                        deliveredQuantity: p1TotalDeliveredQty,
                        deliveredValue: p1TotalDeliveredVal,
                        unit: itemUnit
                    });
                }
            }
            data.set(itemName, itemMonthlyData);
        });
        return data;
    }, [contractItems, deliveries, visibleMonths]);

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
                                    {itemMonthlyData.map((data, idx) => {
                                        if (data.isHeader) {
                                            return (
                                                <tr key={`header-${idx}`} className="bg-indigo-50">
                                                    <td colSpan={4} className="p-1 text-center font-black text-indigo-800 text-[9px] uppercase tracking-widest">
                                                        {data.label}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        if (data.isSummary) {
                                            return (
                                                <tr key={`summary-${idx}`} className="bg-blue-100 border-y-2 border-blue-300">
                                                    <td className="p-2 font-black text-blue-900 uppercase text-[10px] italic">{data.label}</td>
                                                    <td colSpan={2} className="p-2 text-right text-blue-900 font-black">
                                                        <div className="text-xs">{formatQuantity(data.deliveredQuantity, data.unit)}</div>
                                                        <div className="text-[10px] opacity-80">{formatCurrency(data.deliveredValue)}</div>
                                                    </td>
                                                    <td className="p-2 text-right text-blue-900 font-black">
                                                        <div className="bg-blue-600 text-white text-[8px] px-2 py-0.5 rounded-full inline-block uppercase tracking-tighter">Encerrado</div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={data.monthNumber} className={`border-t ${data.isPeriod1 ? 'bg-white/50' : 'bg-white'}`}>
                                                <td className="p-1 font-bold align-top">{data.monthName}</td>
                                                <td className="p-1 text-right align-top">
                                                    {data.contractedQuantity > 0 ? (
                                                        <>
                                                            <div className="font-black">{formatQuantity(data.contractedQuantity, data.unit)}</div>
                                                            <div className="text-[9px] text-gray-400 font-normal">{formatCurrency(data.contractedValue)}</div>
                                                        </>
                                                    ) : (
                                                        <span className="text-gray-300">-</span>
                                                    )}
                                                </td>
                                                <td className="p-1 text-right text-green-600 font-bold align-top">
                                                    <div>{formatQuantity(data.deliveredQuantity, data.unit)}</div>
                                                    <div className="text-[9px] text-green-400 font-normal">{formatCurrency(data.deliveredValue)}</div>
                                                </td>
                                                <td className={`p-1 text-right font-bold align-top ${data.remainingQuantity > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                                                    {data.remainingQuantity > 0 ? formatQuantity(data.remainingQuantity, data.unit) : 'OK'}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
