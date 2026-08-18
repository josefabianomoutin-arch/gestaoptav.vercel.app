import type { Supplier } from '../types';
import { ensureArray } from './utils';

export const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

export const calculateAllowedWeeksFromSchedule = (monthlySchedule: Record<string, number[]> | undefined | null, year = 2026): number[] => {
    if (!monthlySchedule || typeof monthlySchedule !== 'object') return [];
    
    const monthNames = [
        'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
        'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    const allowedWeeksSet = new Set<number>();

    for (let m = 0; m <= 11; m++) {
        const monthName = monthNames[m];
        
        const matchingKey = Object.keys(monthlySchedule).find(k => {
            const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cleanM = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cleanK === cleanM;
        });
        if (!matchingKey) continue;

        const rawWeeks = monthlySchedule[matchingKey];
        const selectedWeeks = ensureArray(rawWeeks).map(w => Number(String(w).replace(/\D/g, ''))).filter(w => !isNaN(w) && w > 0);
        if (selectedWeeks.length === 0) continue;

        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0).getDate();
        
        const businessRowWeeks: number[] = [];
        const totalDaysInGrid = firstDay.getDay() + lastDay;
        const totalRows = Math.ceil(totalDaysInGrid / 7);

        for (let r = 0; r < totalRows; r++) {
            let hasBusinessDay = false;
            for (let d = 0; d < 7; d++) {
                const dayOfMonth = (r * 7) + d + 1 - firstDay.getDay();
                if (dayOfMonth >= 1 && dayOfMonth <= lastDay) {
                    const date = new Date(year, m, dayOfMonth);
                    const dayOfWeek = date.getDay();
                    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                        hasBusinessDay = true;
                        break;
                    }
                }
            }
            
            if (hasBusinessDay) {
                const rowDate = new Date(year, m, (r * 7) + 1 - firstDay.getDay() + 3);
                businessRowWeeks.push(getWeekNumber(rowDate));
            }
        }

        selectedWeeks.forEach(w => {
            if (w >= 1 && w <= 5) {
                const targetRowIndex = w - 1;
                if (targetRowIndex < businessRowWeeks.length) {
                    allowedWeeksSet.add(businessRowWeeks[targetRowIndex]);
                }
                if (w === 5 && businessRowWeeks.length > 5) {
                    allowedWeeksSet.add(businessRowWeeks[5]);
                }
            } else if (w > 5 && w <= 53) {
                allowedWeeksSet.add(w);
            }
        });
    }

    return Array.from(allowedWeeksSet).sort((a, b) => a - b);
};

export const getCombinedSuppliers = (suppliers: Supplier[], perCapitaConfig: any): Supplier[] => {
    const producers = ensureArray(perCapitaConfig?.ppaisProducers);
    const pereciveis = ensureArray(perCapitaConfig?.pereciveisSuppliers);
    const estocaveis = ensureArray(perCapitaConfig?.estocaveisSuppliers);

    const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
        return 0;
    };

    const mapToSupplier = (p: any) => {
        const weeks = calculateAllowedWeeksFromSchedule(p.monthlySchedule, 2026);
        const deliveriesRaw = ensureArray<any>(p.deliveries);
        const deliveries = deliveriesRaw.filter((d: any) => d && d.id);
        const contractItemsRaw = ensureArray<any>(p.contractItems);
        const contractItems = contractItemsRaw.filter((p: any) => p);

        return {
            ...p,
            cpf: p.cpfCnpj || p.cpf,
            deliveries: deliveries,
            allowedWeeks: weeks,
            contractItems: contractItems,
            initialValue: contractItems.reduce((acc: any, curr: any) => acc + (parseNum(curr.totalKg) * parseNum(curr.valuePerKg || 0)), 0)
        } as Supplier;
    };

    const mappedProducers = producers.map(mapToSupplier);
    const mappedPereciveis = pereciveis.map(mapToSupplier);
    const mappedEstocaveis = estocaveis.map(mapToSupplier);

    const cleanCpf = (c: any) => String(c || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
    const all = [...suppliers, ...mappedProducers, ...mappedPereciveis, ...mappedEstocaveis];
    const uniqueMap = new Map<string, Supplier>();
    all.forEach(s => {
        if (s && s.cpf) {
            const rawKey = cleanCpf(s.cpf);
            if (!rawKey) return;

            // Find matching key (exact, or 11 vs 14 chars starting with same prefix to merge truncated legacy values)
            let key = rawKey;
            for (const existingKey of uniqueMap.keys()) {
                if (existingKey === rawKey || 
                    (existingKey.length === 11 && rawKey.length === 14 && rawKey.startsWith(existingKey)) ||
                    (existingKey.length === 14 && rawKey.length === 11 && existingKey.startsWith(rawKey))) {
                    key = existingKey;
                    break;
                }
            }

            // Prefer the longer/full key if rawKey has 14 and matched existingKey has 11
            if (rawKey.length === 14 && key.length === 11) {
                const existingVal = uniqueMap.get(key);
                uniqueMap.delete(key);
                key = rawKey;
                if (existingVal) {
                    uniqueMap.set(key, existingVal);
                }
            }

            const existing = uniqueMap.get(key);
            if (!existing) {
                uniqueMap.set(key, { ...s, cpf: key });
            } else {
                const sDeliveriesRaw = ensureArray<any>(s.deliveries);
                const extDeliveriesRaw = ensureArray<any>(existing.deliveries);
                
                const mergedDeliveries = [...extDeliveriesRaw, ...sDeliveriesRaw].filter(d => d && (d.id || d.date));
                const uniqueDeliveriesMap = new Map<string, any>();
                mergedDeliveries.forEach((d: any) => {
                    const idKey = d.id ? String(d.id) : `${d.date}_${d.time || ''}_${d.item || ''}`;
                    if (!uniqueDeliveriesMap.has(idKey)) {
                        uniqueDeliveriesMap.set(idKey, d);
                    } else {
                        // Enrich existing record if the new record has more details (e.g. arrivalTime, exitTime, invoiceNumber)
                        const existing = uniqueDeliveriesMap.get(idKey);
                        uniqueDeliveriesMap.set(idKey, {
                            ...existing,
                            time: existing.time || d.time,
                            arrivalTime: existing.arrivalTime || d.arrivalTime,
                            exitTime: existing.exitTime || d.exitTime,
                            invoiceNumber: existing.invoiceNumber || d.invoiceNumber,
                            invoiceUploaded: existing.invoiceUploaded || d.invoiceUploaded,
                            observations: existing.observations || d.observations
                        });
                    }
                });
                const uniqueDeliveries = Array.from(uniqueDeliveriesMap.values());
                const mergedWeeks = Array.from(new Set([...(existing.allowedWeeks || []), ...(s.allowedWeeks || [])])).sort((a, b) => a - b);
                
                // Merge contractItems preserving details
                const sItemsRaw = ensureArray<any>(s.contractItems);
                const extItemsRaw = ensureArray<any>(existing.contractItems);
                const mergedItems = [...extItemsRaw, ...sItemsRaw].filter(item => item && (item.name || (item as any).itemName));
                const uniqueItems = Array.from(new Map(mergedItems.map((item: any) => [((item.name || item.itemName) + (item.period || '')), item])).values());

                uniqueMap.set(key, {
                    ...existing,
                    cpf: key,
                    deliveries: uniqueDeliveries,
                    allowedWeeks: mergedWeeks,
                    contractItems: uniqueItems as any[],
                    initialValue: uniqueItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0)
                });
            }
        }
    });

    return Array.from(uniqueMap.values());
};
