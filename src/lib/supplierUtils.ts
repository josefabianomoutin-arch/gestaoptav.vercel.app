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

    const mapToSupplier = (p: any) => {
        const weeks: number[] = [];
        const year = 2026;
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        Object.entries(p.monthlySchedule || {}).forEach(([monthName, weekOfMonthList]) => {
            const monthIndex = monthNames.indexOf(monthName.toLowerCase());
            if (monthIndex === -1) return;

            if ((weekOfMonthList as number[]).length > 0) {
                const firstDayOfMonth = new Date(year, monthIndex, 1);
                const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                
                (weekOfMonthList as number[]).forEach(weekIdx => {
                    weeks.push(firstWeekOfYear + ((weekIdx as number) - 1));
                });
            }
        });

        return {
            ...p,
            cpf: p.cpfCnpj,
            deliveries: Object.values(p.deliveries || {}),
            allowedWeeks: Array.from(new Set(weeks)),
            initialValue: Object.values(p.contractItems || {}).reduce((acc: any, curr: any) => acc + (curr.totalKg * (curr.valuePerKg || 0)), 0)
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
                const mergedDeliveries = [...(existing.deliveries || []), ...(s.deliveries || [])];
                const uniqueDeliveries = Array.from(new Map(mergedDeliveries.map(d => [d.id, d])).values());
                const mergedWeeks = Array.from(new Set([...(existing.allowedWeeks || []), ...(s.allowedWeeks || [])])).sort((a, b) => a - b);
                
                // Merge contractItems preserving details
                const mergedItems = [...(existing.contractItems || []), ...(s.contractItems || [])];
                const uniqueItems = Array.from(new Map(mergedItems.map(item => [item.name + (item.period || ''), item])).values());

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
