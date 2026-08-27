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
        
        const matchingKeys = Object.keys(monthlySchedule).filter(k => {
            const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const cleanM = monthName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return cleanK === cleanM;
        });
        if (matchingKeys.length === 0) continue;

        const rawWeeks: any[] = [];
        matchingKeys.forEach(k => {
            rawWeeks.push(...ensureArray(monthlySchedule[k]));
        });

        const selectedWeeks = Array.from(new Set(rawWeeks.map(w => Number(String(w).replace(/\D/g, ''))).filter(w => !isNaN(w) && w > 0)));
        if (selectedWeeks.length === 0) continue;

        const firstDay = new Date(year, m, 1);
        const lastDay = new Date(year, m + 1, 0).getDate();
        
        const businessRowWeeks: number[] = [];
        const totalDaysInGrid = firstDay.getDay() + lastDay;
        const totalRows = Math.ceil(totalDaysInGrid / 7);

        for (let r = 0; r < totalRows; r++) {
            let hasBusinessDayInMonth = false;
            // Use the same reference day (Wednesday) as Calendar.tsx to guarantee ISO week match
            const rowDate = new Date(year, m, (r * 7) + 1 - firstDay.getDay() + 3);
            const rowWeek = getWeekNumber(rowDate);

            // A delivery week (S1-S5) represents a business week where deliveries can occur.
            // Check if there is at least one working day (Monday to Friday, d = 1 to 5) belonging to THIS month in this row.
            for (let d = 0; d < 7; d++) {
                const dayOfMonth = (r * 7) + d + 1 - firstDay.getDay();
                if (dayOfMonth >= 1 && dayOfMonth <= lastDay) {
                    if (d >= 1 && d <= 5) { // 1 = Monday, ..., 5 = Friday
                        hasBusinessDayInMonth = true;
                    }
                }
            }

            if (hasBusinessDayInMonth) {
                if (!businessRowWeeks.includes(rowWeek)) {
                    businessRowWeeks.push(rowWeek);
                }
            }
        }

        selectedWeeks.forEach(w => {
            if (w >= 1 && w <= 5) {
                const idx = w - 1;
                if (businessRowWeeks.length > idx) {
                    allowedWeeksSet.add(businessRowWeeks[idx]);
                } else if (businessRowWeeks.length > 0) {
                    // Fallback para a última semana útil do mês se a semana solicitada não existir
                    allowedWeeksSet.add(businessRowWeeks[businessRowWeeks.length - 1]);
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
        const weeksFromSchedule = calculateAllowedWeeksFromSchedule(p.monthlySchedule, 2026);
        const rawAllowedWeeks = ensureArray<number>(p.allowedWeeks);
        const weeks = Array.from(new Set([...rawAllowedWeeks, ...weeksFromSchedule])).sort((a, b) => a - b);
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
                
                // If s has a monthlySchedule or allowedWeeks defined, let its Q2/Q3 weeks override existing stale weeks
                const existingQ1 = (existing.allowedWeeks || []).filter(w => w <= 18);
                const sQ1 = (s.allowedWeeks || []).filter(w => w <= 18);
                const sQ2Q3 = (s.allowedWeeks || []).filter(w => w > 18);
                const existingQ2Q3 = (s.monthlySchedule || (s.allowedWeeks && s.allowedWeeks.length > 0)) ? [] : (existing.allowedWeeks || []).filter(w => w > 18);
                const mergedWeeks = Array.from(new Set([...existingQ1, ...sQ1, ...sQ2Q3, ...existingQ2Q3])).sort((a, b) => a - b);
                
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
