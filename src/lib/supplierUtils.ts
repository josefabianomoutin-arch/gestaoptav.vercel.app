import type { Supplier } from '../types';
import { ensureArray } from './utils';

export const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
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
        const weeks: number[] = [];
        const year = 2026;
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const schedule = p.monthlySchedule || {};
        Object.entries(schedule).forEach(([monthName, weekOfMonthList]) => {
            const monthIndex = monthNames.indexOf(monthName.toLowerCase());
            if (monthIndex === -1) return;

            const weeksList = ensureArray<any>(weekOfMonthList);
            if (weeksList.length > 0) {
                const firstDayOfMonth = new Date(year, monthIndex, 1);
                const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                
                weeksList.forEach((weekIdx: any) => {
                    weeks.push(firstWeekOfYear + (parseNum(weekIdx) - 1));
                });
            }
        });

        const deliveriesRaw = ensureArray<any>(p.deliveries);
        const deliveries = deliveriesRaw.filter((d: any) => d && d.id);
        const contractItemsRaw = ensureArray<any>(p.contractItems);
        const contractItems = contractItemsRaw.filter((p: any) => p);

        return {
            ...p,
            cpf: p.cpfCnpj,
            deliveries: deliveries,
            allowedWeeks: Array.from(new Set(weeks)),
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
                
                const mergedDeliveries = [...extDeliveriesRaw, ...sDeliveriesRaw].filter(d => d && d.id);
                const uniqueDeliveries = Array.from(new Map(mergedDeliveries.map((d: any) => [d.id, d])).values());
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
