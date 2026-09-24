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
            const rowDate = new Date(year, m, (r * 7) + 1 - firstDay.getDay() + 3);
            const rowWeek = getWeekNumber(rowDate);

            for (let d = 0; d < 7; d++) {
                const dayOfMonth = (r * 7) + d + 1 - firstDay.getDay();
                if (dayOfMonth >= 1 && dayOfMonth <= lastDay) {
                    if (d >= 1 && d <= 5) {
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
    const pereciveis = [
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers1Q),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers2Q),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers3Q),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers2027_1Q),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers2027_2Q),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers2027_3Q)
    ];
    const estocaveis = [
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers1Q),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers2Q),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers3Q),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers2027_1Q),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers2027_2Q),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers2027_3Q)
    ];

    const parseNum = (val: any) => {
        if (typeof val === 'number') return val;
        if (typeof val === 'string') return parseFloat(val.replace(',', '.')) || 0;
        return 0;
    };

    const mapToSupplier = (p: any) => {
        const weeksFromSchedule = calculateAllowedWeeksFromSchedule(p.monthlySchedule, 2026);
        const hasSchedule = p.monthlySchedule && typeof p.monthlySchedule === 'object' && Object.keys(p.monthlySchedule).length > 0;
        const rawAllowedWeeks = ensureArray<number>(p.allowedWeeks);
        const weeks = hasSchedule ? weeksFromSchedule : Array.from(new Set([...rawAllowedWeeks, ...weeksFromSchedule])).sort((a, b) => a - b);
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
            uniqueMap.set(rawKey, s);
        }
    });

    return Array.from(uniqueMap.values());
};
