import type { Supplier } from '../types';

export const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

export const getCombinedSuppliers = (suppliers: Supplier[], perCapitaConfig: any): Supplier[] => {
    const producers = perCapitaConfig?.ppaisProducers || [];
    const pereciveis = perCapitaConfig?.pereciveisSuppliers || [];
    const estocaveis = perCapitaConfig?.estocaveisSuppliers || [];

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

            const weeksList = weekOfMonthList as number[];
            if (weeksList && weeksList.length > 0) {
                const firstDayOfMonth = new Date(year, monthIndex, 1);
                const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                
                weeksList.forEach(weekIdx => {
                    weeks.push(firstWeekOfYear + (parseNum(weekIdx) - 1));
                });
            }
        });

        const deliveriesRaw = p.deliveries ? (typeof p.deliveries === 'object' ? Object.values(p.deliveries) : (Array.isArray(p.deliveries) ? p.deliveries : [])) : [];
        const deliveries = deliveriesRaw.filter((d: any) => d && d.id);
        const contractItemsRaw = p.contractItems ? (typeof p.contractItems === 'object' ? Object.values(p.contractItems) : (Array.isArray(p.contractItems) ? p.contractItems : [])) : [];
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

    const all = [...suppliers, ...mappedProducers, ...mappedPereciveis, ...mappedEstocaveis];
    const uniqueMap = new Map<string, Supplier>();
    all.forEach(s => {
        if (s.cpf) {
            const existing = uniqueMap.get(s.cpf);
            if (!existing) {
                uniqueMap.set(s.cpf, { ...s });
            } else {
                const sDeliveriesRaw = s.deliveries ? (typeof s.deliveries === 'object' ? Object.values(s.deliveries) : (Array.isArray(s.deliveries) ? s.deliveries : [])) : [];
                const extDeliveriesRaw = existing.deliveries ? (typeof existing.deliveries === 'object' ? Object.values(existing.deliveries) : (Array.isArray(existing.deliveries) ? existing.deliveries : [])) : [];
                
                const mergedDeliveries = [...extDeliveriesRaw, ...sDeliveriesRaw].filter(d => d && d.id);
                const uniqueDeliveries = Array.from(new Map(mergedDeliveries.map(d => [d.id, d])).values());
                const mergedWeeks = Array.from(new Set([...(existing.allowedWeeks || []), ...(s.allowedWeeks || [])])).sort((a, b) => a - b);
                
                // Merge contractItems preserving details
                const sItemsRaw = s.contractItems ? (typeof s.contractItems === 'object' ? Object.values(s.contractItems) : (Array.isArray(s.contractItems) ? s.contractItems : [])) : [];
                const extItemsRaw = existing.contractItems ? (typeof existing.contractItems === 'object' ? Object.values(existing.contractItems) : (Array.isArray(existing.contractItems) ? existing.contractItems : [])) : [];
                const mergedItems = [...extItemsRaw, ...sItemsRaw].filter(item => item && (item.name || item.itemName));
                const uniqueItems = Array.from(new Map(mergedItems.map(item => [((item.name || item.itemName) + (item.period || '')), item])).values());

                uniqueMap.set(s.cpf, {
                    ...existing,
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
