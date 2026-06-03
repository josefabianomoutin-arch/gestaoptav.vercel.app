
import React, { useState, useMemo } from 'react';
import { 
    Printer, 
    FileIcon, 
    Search, 
    Trash2, 
    Clock,
    Eye,
    FileText,
    ImageIcon
} from 'lucide-react';
import type { WarehouseMovement, Supplier } from '../types';
import { roundToTwoDecimalPlaces, ensureArray } from '../lib/utils';
import ConfirmModal from './ConfirmModal';

const monthNamesInOrder = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

interface AdminWarehouseLogProps {
    warehouseLog: WarehouseMovement[];
    suppliers: Supplier[];
    onDeleteEntry: (logEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onUpdateWarehouseEntry: (updatedEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    perCapitaConfig?: any;
}

const superNormalize = (text: string) => {
    return (text || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
};

const getWeekNumber = (d: Date): number => {
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const getSundayOfWeek = (year: number, weekNum: number): Date => {
    const janFirst = new Date(year, 0, 1);
    const dayOffset = (4 - (janFirst.getDay() || 7));
    const firstThursday = new Date(year, 0, 1 + dayOffset);
    const targetThursday = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    const targetSunday = new Date(targetThursday.getTime() + 3 * 24 * 60 * 60 * 1000);
    targetSunday.setHours(23, 59, 59, 999);
    return targetSunday;
};

const AdminWarehouseLog: React.FC<AdminWarehouseLogProps> = ({ warehouseLog, suppliers, onDeleteEntry, perCapitaConfig }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saída'>('all');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    // Persistence: Pending Offline Entries
    const offlineEntries = useMemo(() => {
        try {
            const saved = localStorage.getItem('offline_warehouse_entries');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Error loading offline entries:", e);
            return [];
        }
    }, []);

    const combinedLog = useMemo(() => {
        const mappedOffline = (offlineEntries || []).map((off: any, idx: number) => ({
            ...off,
            id: `offline-${idx}-${off.timestamp}`,
            isOffline: true,
            supplierName: (suppliers || []).find(s => s && s.cpf === off.supplierCpf)?.name || off.supplierName || 'FORNECEDOR OFFLINE'
        }));
        return [...(warehouseLog || []), ...mappedOffline];
    }, [warehouseLog, offlineEntries, suppliers]);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        combinedLog.forEach(log => {
            const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
            if (dateStr && dateStr.length >= 7) {
                months.add(dateStr.substring(0, 7)); // YYYY-MM
            }
        });

        // Add 2026 projection months (May to December)
        for (let m = 5; m <= 12; m++) { // 05 = May, 12 = December
            months.add(`2026-${m.toString().padStart(2, '0')}`);
        }

        return Array.from(months).sort().reverse();
    }, [combinedLog]);

    const [activeMonthTab, setActiveMonthTab] = useState<string>(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        return availableMonths.includes(currentMonthKey) ? currentMonthKey : (availableMonths[0] || currentMonthKey);
    });

    const [prevAvailableMonths, setPrevAvailableMonths] = useState(availableMonths);
    if (availableMonths !== prevAvailableMonths) {
        setPrevAvailableMonths(availableMonths);
        if (availableMonths.length > 0 && !availableMonths.includes(activeMonthTab)) {
            setActiveMonthTab(availableMonths[0]);
        }
    }

    // Confirmation Modal State
    const [confirmConfig, setConfirmConfig] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        variant?: 'danger' | 'warning' | 'info';
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
    });

    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const tableRef = React.useRef<HTMLTableElement>(null);

    React.useEffect(() => {
        const topScroll = topScrollRef.current;
        const bottomScroll = bottomScrollRef.current;

        if (!topScroll || !bottomScroll) return;

        const handleTopScroll = () => {
            bottomScroll.scrollLeft = topScroll.scrollLeft;
        };

        const handleBottomScroll = () => {
            topScroll.scrollLeft = bottomScroll.scrollLeft;
        };

        topScroll.addEventListener('scroll', handleTopScroll);
        bottomScroll.addEventListener('scroll', handleBottomScroll);

        return () => {
            topScroll.removeEventListener('scroll', handleTopScroll);
            bottomScroll.removeEventListener('scroll', handleBottomScroll);
        };
    }, []);

    const filteredLog = useMemo(() => {
        const searchLower = String(searchTerm || '').toLowerCase();
        return (combinedLog || [])
            .filter(log => {
                if (!log) return false;
                const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
                // dateStr should be YYYY-MM-DD
                const monthMatch = dateStr ? dateStr.substring(0, 7) : ''; // "2026-05"
                const activeMonthKey = (activeMonthTab || '').split('-').map((v, i) => i === 1 ? (parseInt(v) + 1).toString().padStart(2, '0') : v).join('-');
                
                const matchesMonth = monthMatch === activeMonthKey;

                const typeMatch = filterType === 'all' || log.type === filterType;
                
                const itemName = String(log.itemName || '').toLowerCase();
                const lotNumber = String(log.lotNumber || '').toLowerCase();
                const barcode = String(log.barcode || '').toLowerCase();
                const nlNumber = String(log.nlNumber || '').toLowerCase();
                const pdNumber = String(log.pdNumber || '').toLowerCase();
                const inboundInvoice = String(log.inboundInvoice || '').toLowerCase();
                const outboundInvoice = String(log.outboundInvoice || '').toLowerCase();
                const supplierName = String(log.supplierName || '').toLowerCase();

                const searchMatch = searchLower === '' ||
                    itemName.includes(searchLower) ||
                    lotNumber.includes(searchLower) ||
                    barcode.includes(searchLower) ||
                    nlNumber.includes(searchLower) ||
                    pdNumber.includes(searchLower) ||
                    inboundInvoice.includes(searchLower) ||
                    outboundInvoice.includes(searchLower) ||
                    supplierName.includes(searchLower);

                return matchesMonth && typeMatch && searchMatch;
            })
            .sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp).getTime();
                const dateB = new Date(b.date || b.timestamp).getTime();
                return dateB - dateA;
            });
    }, [combinedLog, filterType, searchTerm, activeMonthTab]);

    const groupedProjectionData = useMemo(() => {
        if (!perCapitaConfig) return [];
        
        const [, monthStr] = activeMonthTab.split('-');
        const monthIdx = parseInt(monthStr);
        const monthName = monthNamesInOrder[monthIdx - 1];
        
        const allPCSupers = [
            ...(perCapitaConfig.ppaisProducers || []).map((p: any) => ({...p, sourceCategory: 'PPAIS'})),
            ...(perCapitaConfig.pereciveisSuppliers || []).map((p: any) => ({...p, sourceCategory: 'PERECÍVEIS'})),
            ...(perCapitaConfig.estocaveisSuppliers || []).map((p: any) => ({...p, sourceCategory: 'ESTOCÁVEIS'}))
        ];

        const grouped: Record<string, any> = {};

        allPCSupers.forEach((s: any) => {
            const schedule = s?.monthlySchedule || {};
            const monthsNamesMatch = [monthName, monthName.toLowerCase()];
            const weeks = monthsNamesMatch.reduce((acc, m) => acc.length > 0 ? acc : (schedule[m] || []), [] as number[]);
            
            if (weeks.length > 0) {
                const items = ensureArray(s.contractItems) as any[];
                items.forEach(it => {
                    if (!grouped[it.name]) {
                        grouped[it.name] = {
                            itemName: it.name,
                            producers: [],
                            totalItemWeight: 0,
                            totalItemValue: 0
                        };
                    }
                    
                    const getMonthlyValues = () => {
                        // User specifically requested the system to use "dividido por 8 (maio a dezembro)" for all standard items
                        return { 
                            weight: roundToTwoDecimalPlaces(it.totalKg / 8), 
                            value: (it.totalKg * (it.valuePerKg || 0)) / 8 
                        };
                    };

                    const { weight: monthlyWeight, value: monthlyValue } = getMonthlyValues();

                    // Find actual deliveries in this month for this item/supplier
                    const deliveredForThis = combinedLog.filter(l => 
                        superNormalize(l.itemName) === superNormalize(it.name) && 
                        superNormalize(l.supplierName) === superNormalize(s.name) && 
                        l.type === 'entrada' &&
                        (l.date || '').startsWith(activeMonthTab)
                    );
                    const deliveredWeight = deliveredForThis.reduce((sum, l) => sum + (l.quantity || 0), 0);
                    
                    let status = 'AGUARDANDO';
                    if (deliveredWeight > 0) {
                        if (deliveredWeight >= monthlyWeight * 0.95) status = 'CONCLUÍDO';
                        else status = 'EM ANDAMENTO';
                    }

                    const [activeYearStr, activeMonthStr] = activeMonthTab.split('-');
                    const activeYear = parseInt(activeYearStr);
                    const activeMonthIdx = parseInt(activeMonthStr) - 1;

                    const firstDayOfMonth = new Date(activeYear, activeMonthIdx, 1);
                    const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                    const today = new Date();

                    let isLate = false;
                    if (status !== 'CONCLUÍDO') {
                        for (const w of weeks) {
                            const absoluteWeek = firstWeekOfYear + (w - 1);
                            const sunday = getSundayOfWeek(activeYear, absoluteWeek);
                            
                            if (today > sunday) {
                                const hasDeliveryInWeek = deliveredForThis.some(l => {
                                    const dDate = new Date(l.date + 'T00:00:00');
                                    return getWeekNumber(dDate) === absoluteWeek;
                                });
                                if (!hasDeliveryInWeek) {
                                    isLate = true;
                                    break;
                                }
                            }
                        }
                    }
                    
                    grouped[it.name].producers.push({
                        supplier: s.name,
                        monthlyWeight: monthlyWeight,
                        monthlyValue: monthlyValue,
                        totalContractWeight: it.totalKg || 0,
                        totalContractValue: (it.totalKg || 0) * (it.valuePerKg || 0),
                        weeks: weeks,
                        deliveredWeight,
                        status,
                        isLate
                    });
                    
                    grouped[it.name].totalItemWeight += monthlyWeight;
                    grouped[it.name].totalItemValue += monthlyValue;
                });
            }
        });

        return Object.values(grouped).sort((a, b) => a.itemName.localeCompare(b.itemName));
    }, [perCapitaConfig, activeMonthTab, combinedLog]);

    React.useEffect(() => {
        const table = tableRef.current;
        const topScroll = topScrollRef.current;

        if (!table || !topScroll) return;

        const observer = new ResizeObserver(() => {
            const dummyDiv = topScroll.firstChild as HTMLDivElement;
            if (dummyDiv) {
                dummyDiv.style.width = `${table.offsetWidth}px`;
            }
        });

        observer.observe(table);

        return () => observer.disconnect();
    }, [filteredLog]);

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Relatório de Movimentações de Estoque</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { color: #333; font-size: 18px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .text-gray-500 { color: #6b7280; }
                    .text-xs { font-size: 10px; }
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <h1>Relatório de Movimentações de Estoque</h1>
                <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Data Doc.</th>
                            <th>Produto</th>
                            <th>Barras</th>
                            <th>Lote</th>
                            <th class="text-right">Quantidade</th>
                            <th>NF/Doc</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLog.map(log => `
                            <tr>
                                <td>${log.type.toUpperCase()}</td>
                                <td>${(log.date || '').split('-').reverse().join('/')}</td>
                                <td>
                                    <div class="font-bold">${log.itemName}</div>
                                    <div class="text-xs text-gray-500">${log.supplierName}</div>
                                </td>
                                <td>${log.barcode || '-'}</td>
                                <td>${log.lotNumber}</td>
                                <td class="text-right font-bold">${(log.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                                <td>${log.inboundInvoice || log.outboundInvoice || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>
                    window.onload = () => {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintLateSuppliersPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const SIMULATED_TODAY_LOCAL = new Date('2026-05-07T00:00:00');
        const todayWeek = getWeekNumber(SIMULATED_TODAY_LOCAL);
        const currentMonthIdx = SIMULATED_TODAY_LOCAL.getMonth();

        const monthsList = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        const currentMonthName = monthsList[currentMonthIdx];

        const getWeekMonth = (weekNum: number): number => {
            const janFirst = new Date(2026, 0, 1);
            const dayOffset = (4 - (janFirst.getDay() || 7));
            const firstThursday = new Date(2026, 0, 1 + dayOffset);
            const targetThursday = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
            return targetThursday.getMonth();
        };

        const ppaisCpfs = new Set(
            ensureArray<any>(perCapitaConfig?.ppaisProducers)
                .map(p => {
                    const cpf = p.cpfCnpj || p.cpf || '';
                    return cpf.replace(/\D/g, '');
                })
                .filter(Boolean)
        );

        const suppliersList = ensureArray<Supplier>(suppliers).filter(sup => {
            const cpf = (sup.cpf || '').replace(/\D/g, '');
            return ppaisCpfs.has(cpf);
        });

        const lateSuppliersData = suppliersList.map(sup => {
            const deliveriesList = ensureArray<any>(sup.deliveries);
            const allowedWeeksArray = sup.allowedWeeks || [];

            const isWeekInCurrentMonth = (w: number): boolean => {
                if (sup?.monthlySchedule && Object.keys(sup.monthlySchedule).length > 0) {
                    const weeksForMonth = sup.monthlySchedule?.[currentMonthName] || sup.monthlySchedule?.[currentMonthName.toUpperCase()] || [];
                    return weeksForMonth.includes(w);
                } else {
                    const wMonthIdx = getWeekMonth(w);
                    const wMonthName = monthsList[wMonthIdx];
                    return wMonthName === currentMonthName;
                }
            };

            const schedulingDelays: { week: number; info: string }[] = [];
            const deliveryDelays: { week: number; info: string }[] = [];

            // Helper to format date in Brazilian style DD/MM/YYYY
            const formatDate = (dateStr: string) => {
                if (!dateStr) return '';
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    return `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
                return dateStr;
            };

            // 1. Verify Scheduling Delay (Atraso de Agendamento):
            // Check each allowed week to see if there is any scheduled delivery.
            for (const w of allowedWeeksArray) {
                if (isWeekInCurrentMonth(w)) {
                    const deliveriesInWeek = deliveriesList.filter(d => {
                        const dDate = new Date(d.date + 'T00:00:00');
                        return getWeekNumber(dDate) === w;
                    });

                    if (deliveriesInWeek.length === 0) {
                        if (w < todayWeek) {
                            schedulingDelays.push({
                                week: w,
                                info: `Semana ${w}: Prazo para agendamento expirado (Mês corrente). Nenhuma entrega foi programada.`
                            });
                        }
                    }
                }
            }

            // 2. Verify Delivery Delay (Atraso de Entrega):
            // Check scheduled deliveries inside the current month
            deliveriesList.forEach(d => {
                const dDate = new Date(d.date + 'T00:00:00');
                const dMonthName = monthsList[dDate.getMonth()];
                const w = getWeekNumber(dDate);

                if (dMonthName === currentMonthName) {
                    if (d.item === 'AGENDAMENTO PENDENTE') {
                        if (dDate < SIMULATED_TODAY_LOCAL) {
                            deliveryDelays.push({
                                week: w,
                                info: `Agendamento pendente em aberto para a data de entrega: ${formatDate(d.date)} (Excedeu o prazo de entrega).`
                            });
                        }
                    }
                }
            });

            // Sort all descriptive outputs
            schedulingDelays.sort((a, b) => a.week - b.week);
            deliveryDelays.sort((a, b) => a.week - b.week);

            const hasAnyPendency = schedulingDelays.length > 0 || deliveryDelays.length > 0;

            return {
                supplier: sup,
                schedulingDelays,
                deliveryDelays,
                invoiceDelays: [],
                hasAnyPendency
            };
        }).filter(item => item.hasAnyPendency);

        // Build simplified flat list of delay entries for the table
        const divisor = 8;
        const simplifiedEntries: {
            supplierName: string;
            supplierCpf: string;
            itemName: string;
            week: string;
            quantity: number;
            unit: string;
            value: number;
            inconformidade: string;
        }[] = [];

        lateSuppliersData.forEach(item => {
            const sup = item.supplier;
            const contractItems = ensureArray<any>(sup.contractItems);
            const allowedWeeksArray = sup.allowedWeeks || [];

            const isWeekInCurrentMonth = (w: number): boolean => {
                if (sup?.monthlySchedule && Object.keys(sup.monthlySchedule).length > 0) {
                    const weeksForMonth = sup.monthlySchedule?.[currentMonthName] || sup.monthlySchedule?.[currentMonthName.toUpperCase()] || [];
                    return weeksForMonth.includes(w);
                } else {
                    const wMonthIdx = getWeekMonth(w);
                    const wMonthName = monthsList[wMonthIdx];
                    return wMonthName === currentMonthName;
                }
            };

            const allowedWeeksCurrentMonth = allowedWeeksArray.filter(w => isWeekInCurrentMonth(w));
            const numWeeksInMonth = allowedWeeksCurrentMonth.length || 4;

            // 1. Scheduling Delays (Count value for past weeks)
            item.schedulingDelays.forEach(sd => {
                contractItems.forEach(cItem => {
                    const monthlyQuota = (Number(cItem.totalKg) || 0) / divisor;
                    const weeklyQty = monthlyQuota / numWeeksInMonth;
                    const weeklyValue = weeklyQty * (Number(cItem.valuePerKg) || 0);

                    simplifiedEntries.push({
                        supplierName: sup.name,
                        supplierCpf: sup.cpf || 'N/A',
                        itemName: (cItem.name || '').split(' ').slice(0, 2).join(' '),
                        week: `Semana ${sd.week}`,
                        quantity: weeklyQty,
                        unit: cItem.unit || 'Kg',
                        value: weeklyValue,
                        inconformidade: 'Sem Reservas de Agendamento'
                    });
                });
            });

            // 2. Delivery Delays
            item.deliveryDelays.forEach(dd => {
                contractItems.forEach(cItem => {
                    const monthlyQuota = (Number(cItem.totalKg) || 0) / divisor;
                    const weeklyQty = monthlyQuota / numWeeksInMonth;
                    const weeklyValue = weeklyQty * (Number(cItem.valuePerKg) || 0);

                    simplifiedEntries.push({
                        supplierName: sup.name,
                        supplierCpf: sup.cpf || 'N/A',
                        itemName: (cItem.name || '').split(' ').slice(0, 2).join(' '),
                        week: `Semana ${dd.week}`,
                        quantity: weeklyQty,
                        unit: cItem.unit || 'Kg',
                        value: weeklyValue,
                        inconformidade: 'Atraso na Entrega Física'
                    });
                });
            });
        });

        // Sum of all values representing the total monthly accumulated supply delay invoice loss
        const totalLossValue = simplifiedEntries.reduce((sum, entry) => sum + entry.value, 0);

        const htmlContent = `
            <html>
            <head>
                <title>Relatório de Ativos em Atraso (Simplificado)</title>
                <style>
                    body { font-family: 'Inter', system-ui, sans-serif; padding: 30px; color: #1f2937; line-height: 1.5; }
                    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 16px; }
                    .title { font-size: 17px; font-weight: 800; color: #111827; text-transform: uppercase; margin: 0; letter-spacing: -0.02em; }
                    .meta { font-size: 10px; color: #4b5563; text-align: right; font-family: monospace; }
                    .meta div { margin-bottom: 2px; }
                    
                    /* Summary Panel */
                    .summary-card { 
                        background-color: #fff5f5; 
                        border: 1px dashed #feb2b2; 
                        border-radius: 12px; 
                        padding: 14px 18px; 
                        margin-bottom: 20px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center; 
                    }
                    .summary-info h3 { margin: 0; font-size: 13px; font-weight: 800; color: #9b2c2c; text-transform: uppercase; }
                    .summary-info p { margin: 4px 0 0 0; font-size: 10.5px; color: #c53030; font-weight: 500; }
                    .summary-value { font-size: 20px; font-weight: 900; color: #9b2c2c; font-family: monospace; }

                    table { width: 100%; border-collapse: collapse; margin-top: 5px; font-size: 10.5px; }
                    th, td { border: 1px solid #e5e7eb; padding: 10px 12px; text-align: left; vertical-align: middle; }
                    th { background-color: #f9fafb; font-weight: bold; color: #374151; text-transform: uppercase; font-size: 9px; letter-spacing: 0.05em; }
                    
                    /* Truncated text and styled numbers */
                    .item-badge { font-family: monospace; font-size: 10px; font-weight: bold; color: #111827; background: #f3f4f6; padding: 2px 6px; border-radius: 4px; border: 1px solid #e5e7eb; display: inline-block; text-transform: uppercase; }
                    .val-num { font-family: monospace; text-align: right; font-weight: bold; }
                    .badge-delay-type { display: inline-block; font-size: 8px; font-weight: 900; padding: 1px 5px; border-radius: 3px; border: 1px solid #e5e7eb; text-transform: uppercase; }
                    .badge-red { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
                    
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    @media print {
                        @page { size: A4 portrait; margin: 12mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">Relatório de Ativos em Atraso (PPAIS)</h1>
                        <p style="margin: 3px 0 0 0; font-size: 10px; color: #6b7280; font-weight: 500;">Módulo de Estoque - Gestão de Dados P Taiúva - Exercício 2026 - Apenas Produtores PPAIS</p>
                    </div>
                    <div class="meta">
                        <div><b>Emissão:</b> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
                        <div><b>Mês de Controle:</b> ${currentMonthName.toUpperCase()} / 2026</div>
                        <div><b>Data de Controle:</b> 07/05/2026</div>
                    </div>
                </div>

                <div class="summary-card">
                    <div class="summary-info">
                        <h3>Valor Acumulado do Prejuízo (Cotas em Atraso - PPAIS)</h3>
                        <p>Total financeiro não entregue ou sem agendamento regular verificado para produtores do PPAIS no mês vigente de ${currentMonthName.toUpperCase()} / 2026.</p>
                    </div>
                    <div class="summary-value">
                        R$ ${totalLossValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 25%;">Fornecedor</th>
                            <th style="width: 20%;">Item Contr. (2p)</th>
                            <th style="width: 12%; text-align: center;">Semana</th>
                            <th style="width: 15%; text-align: right;">Quantidade</th>
                            <th style="width: 15%; text-align: right;">Valor (R$)</th>
                            <th style="width: 13%; text-align: center;">Inconformidade</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${simplifiedEntries.length === 0 ? `
                            <tr>
                                <td colspan="6" class="text-center" style="padding: 24px; font-style: italic; color: #6b7280; font-size: 11px;">
                                    Excelente! Nenhum item com inconformidade ou atraso registrado no período.
                                </td>
                            </tr>
                        ` : simplifiedEntries.map(entry => `
                            <tr>
                                <td style="font-weight: 600; color: #374151;">${entry.supplierName}</td>
                                <td><span class="item-badge">${entry.itemName}</span></td>
                                <td class="text-center" style="font-weight: 700; color: #4b5563;">${entry.week}</td>
                                <td class="val-num text-right">${entry.quantity.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${entry.unit}</td>
                                <td class="val-num text-right" style="color: #991b1b;">R$ ${entry.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td class="text-center">
                                    <span class="badge-delay-type badge-red">${entry.inconformidade}</span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <script>
                    window.onload = () => {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintLabel = (item: WarehouseMovement) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Etiqueta - ${item.itemName}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { size: 100mm 50mm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
                    .label-card {
                        width: 100mm; height: 50mm;
                        padding: 2mm 4mm; box-sizing: border-box;
                        display: flex; flex-direction: column;
                        border: 0.1mm solid #eee;
                    }
                    h1 { font-size: 11pt; margin: 0 0 1mm 0; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; }
                    h2 { font-size: 7.5pt; margin: 0.5mm 0 1.5mm 0; font-weight: bold; text-transform: uppercase; color: #333; }
                    .info { font-size: 7.5pt; line-height: 1.1; flex-grow: 1; }
                    .info p { margin: 0.2mm 0; display: flex; justify-content: space-between; }
                    .info strong { font-weight: 900; text-transform: uppercase; margin-right: 1mm; }
                    .barcode-container { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .barcode-svg { max-width: 90%; height: 14mm !important; }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <h1>${item.itemName.split(' ').slice(0, 2).join(' ')}</h1>
                    <h2>${item.supplierName}</h2>
                    <div class="info">
                        <p><strong>LOTE:</strong> <span>${item.lotNumber}</span></p>
                        <p><strong>VAL:</strong> <span>${item.expirationDate ? item.expirationDate.split('-').reverse().join('/') : 'N/A'}</span></p>
                        <p><strong>QUANT:</strong> <span>${item.quantity.toFixed(2)} kg</span> / <strong>DOC:</strong> <span>${item.inboundInvoice || item.outboundInvoice || 'N/A'}</span></p>
                        <p><strong>DATA:</strong> <span>${(item.date || '').split('-').reverse().join('/')}</span></p>
                    </div>
                    <div class="barcode-container">
                        <svg id="barcode-item" class="barcode-svg"></svg>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        try {
                            JsBarcode("#barcode-item", "${item.barcode || 'N/A'}", {
                                format: "CODE128", width: 1.2, height: 40, displayValue: true, margin: 0
                            });
                        } catch (e) { console.error(e); }
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    }
                </script>
            </body>
            </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };


    const handleDelete = async (log: WarehouseMovement) => {
        const msg = log.type === 'entrada' 
            ? 'Excluir esta entrada? O lote será removido e o saldo voltará ao contrato.' 
            : 'Excluir esta saída? A quantidade voltará ao saldo do lote atual.';
            
        setConfirmConfig({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: msg,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsDeleting(log.id);
                const result = await onDeleteEntry(log);
                setIsDeleting(null);
                if (!result.success) {
                    alert(`Erro ao excluir: ${result.message}`);
                }
            }
        });
    };

    return (
        <div className="bg-white p-3 md:p-5 rounded-[2rem] shadow-sm max-w-full mx-auto animate-fade-in space-y-6">
            
            {/* CABEÇALHO E FILTROS */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-50">
                    <div>
                        <button 
                            onClick={handlePrintLateSuppliersPDF}
                            className="border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-2xl p-1.5 px-4 flex items-center gap-3 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                            <div className="bg-amber-500 text-white p-1 rounded-lg">
                                <Clock className="h-3 md:h-3.5 w-3 md:w-3.5" />
                            </div>
                            <div className="text-left">
                                <h4 className="text-[10px] font-black text-amber-950 uppercase tracking-tighter italic leading-none">Relatório de Ativos em Atraso</h4>
                                <p className="text-[8px] text-amber-500 font-bold uppercase tracking-widest mt-0.5">Gerar PDF de Fornecedores Pendentes</p>
                            </div>
                        </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={handlePrintPDF}
                            className="bg-zinc-800 hover:bg-black text-white font-black py-1.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-tighter text-[9px] flex items-center gap-1.5 italic"
                        >
                            <FileIcon className="h-3 w-3" />
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Sub-abas de meses */}
                {availableMonths.length > 0 && (
                    <div className="flex overflow-x-auto pb-1 gap-1 custom-scrollbar scrollbar-hide">
                        {availableMonths.map(monthKey => {
                            const [year, month] = monthKey.split('-').map(Number);
                            const label = `${monthNamesInOrder[month - 1]} / ${year}`;
                            const isActive = activeMonthTab === monthKey;
                            return (
                                <button
                                    key={monthKey}
                                    onClick={() => setActiveMonthTab(monthKey)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all italic border-2 ${
                                        isActive 
                                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-105 z-10' 
                                        : 'bg-white text-zinc-400 border-zinc-50 hover:bg-zinc-50 hover:text-zinc-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="relative w-full sm:w-80 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                            <Search className="h-3 w-3" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Pesquisar (Nome, Lote, Código de Barras)..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full bg-gray-50/50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-[10px] outline-none focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold placeholder:text-gray-300 italic" 
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                        <button 
                            onClick={() => setFilterType('all')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            onClick={() => setFilterType('entrada')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-zinc-400 hover:text-green-500'}`}
                        >
                            Entradas
                        </button>
                        <button 
                            onClick={() => setFilterType('saída')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-400 hover:text-red-500'}`}
                        >
                            Saídas
                        </button>
                    </div>
                </div>
            </div>

            {/* PROJEÇÃO DE ABASTECIMENTO */}
            {groupedProjectionData.length > 0 && (
                <div className="bg-amber-50/30 p-4 md:p-6 rounded-[2rem] border-2 border-amber-100/50 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                            <Clock className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-amber-900 uppercase tracking-tighter italic">
                                Projeção de Abastecimento para {monthNamesInOrder[parseInt(activeMonthTab.split('-')[1]) - 1]} / {activeMonthTab.split('-')[0]}
                            </h3>
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest italic mt-0.5">Organizado por Item: Planejamento Mensal vs Contrato Total</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-separate border-spacing-y-2">
                            <thead>
                                <tr className="text-zinc-400 font-black uppercase tracking-tighter italic text-[9px]">
                                    <th className="px-4 py-2 text-left">Item / Fornecedor</th>
                                    <th className="px-4 py-2 text-center">Semanas</th>
                                    <th className="px-4 py-2 text-right">Entrega Mês (KG)</th>
                                    <th className="px-4 py-2 text-right">Total Contrato (KG)</th>
                                    <th className="px-4 py-2 text-right">Valor Total</th>
                                    <th className="px-4 py-2 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {groupedProjectionData.map((item, idx) => (
                                    <React.Fragment key={idx}>
                                        {/* Row for Item Header */}
                                        <tr className="bg-white/50 border-b border-amber-100">
                                            <td colSpan={3} className="px-4 py-4">
                                                <h4 className="text-[11px] font-black text-zinc-800 uppercase leading-snug max-w-2xl">{item.itemName}</h4>
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono font-black text-zinc-900 bg-amber-50/50 rounded-l-xl">
                                                {item.producers.reduce((acc: number, p: any) => acc + p.totalContractWeight, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Kg
                                            </td>
                                            <td className="px-4 py-4 text-right font-mono font-black text-amber-600 bg-amber-50/50 rounded-r-xl">
                                                {formatCurrency(item.producers.reduce((acc: number, p: any) => acc + p.totalContractValue, 0))}
                                            </td>
                                            <td className="px-4 py-4"></td>
                                        </tr>
                                        {/* Rows for Producers */}
                                        {item.producers.map((prod: any, pIdx: number) => (
                                            <tr key={`${idx}-${pIdx}`} className="bg-white/30 hover:bg-white transition-all group">
                                                <td className="px-10 py-3 text-zinc-500 font-black italic uppercase text-[9px]">{prod.supplier}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex justify-center gap-1">
                                                        {(prod.weeks || []).map((w: number) => (
                                                            <span key={w} className="bg-amber-100 text-amber-700 text-[8px] font-black px-1.5 py-0.5 rounded italic">S{w}</span>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold">
                                                    <div className="flex flex-col">
                                                        <span className="text-indigo-600">{prod.monthlyWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} KG</span>
                                                        <span className="text-[7px] text-zinc-400 italic">(valor arredondado)</span>
                                                        {prod.deliveredWeight > 0 && (
                                                            <span className="text-[7px] text-zinc-400">Entrega Real: {prod.deliveredWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-400 font-bold">{prod.totalContractWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} KG</td>
                                                <td className="px-4 py-3 text-right font-mono text-zinc-400 font-bold">{formatCurrency(prod.totalContractValue)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className={`text-[8px] font-black px-3 py-1 rounded-full uppercase italic tracking-tighter ${
                                                            prod.status === 'CONCLUÍDO' ? 'bg-green-100 text-green-600' :
                                                            prod.status === 'EM ANDAMENTO' ? 'bg-indigo-100 text-indigo-600' :
                                                            'bg-gray-100 text-gray-400'
                                                        }`}>
                                                            {prod.status}
                                                        </span>
                                                        {prod.isLate && (
                                                            <span className="bg-yellow-100 text-yellow-700 border-2 border-yellow-400 text-[8px] font-black px-3 py-1 rounded uppercase italic tracking-tighter shadow-sm flex items-center justify-center">
                                                                EM ATRASO
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-amber-100/50">
                                    <td colSpan={4} className="px-4 py-3 text-right">
                                        <span className="text-[10px] font-black text-amber-900 uppercase italic tracking-widest mr-4">Total Geral do Período:</span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-black text-zinc-900 border-2 border-amber-200 rounded-lg bg-white shadow-sm">
                                        {groupedProjectionData.reduce((acc, item) => 
                                            acc + item.producers.reduce((pAcc: number, p: any) => pAcc + (p.totalContractWeight || 0), 0)
                                        , 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} Kg
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono font-black text-amber-600 border-2 border-amber-200 rounded-lg bg-white shadow-sm">
                                        {formatCurrency(groupedProjectionData.reduce((acc, item) => 
                                            acc + item.producers.reduce((pAcc: number, p: any) => pAcc + (p.totalContractValue || 0), 0)
                                        , 0))}
                                    </td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* VISUALIZAÇÃO DE IMAGENS / DOCUMENTOS (Opcional) */}
            {filteredLog.some(l => l.invoiceUrl) && (
                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm animate-fade-in space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded-lg">
                                <ImageIcon className="h-4 w-4" />
                            </div>
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-900 italic">Comprovantes & Imagens do Período</h3>
                        </div>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter italic">{filteredLog.filter(l => l.invoiceUrl).length} DOCUMENTO(S) ENCONTRADO(S)</span>
                    </div>
                    <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                        {filteredLog.filter(l => l.invoiceUrl).slice(0, 10).map(log => (
                            <div 
                                key={`img-${log.id}`} 
                                className="min-w-[120px] aspect-[3/4] bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group cursor-pointer shadow-sm hover:shadow-md transition-all"
                                onClick={() => {
                                    if (log.invoiceUrl) {
                                        const win = window.open();
                                        if (win) {
                                            win.document.write(`<iframe src="${log.invoiceUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                        }
                                    }
                                }}
                            >
                                {log.invoiceUrl?.startsWith('data:image') ? (
                                    <img src={log.invoiceUrl} alt="NF" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 group-hover:text-amber-500 transition-colors">
                                        <FileText className="h-8 w-8" />
                                        <span className="text-[7px] font-black uppercase mt-1">PDF</span>
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-zinc-900/80 p-2 transform translate-y-full group-hover:translate-y-0 transition-transform">
                                    <p className="text-[7px] text-white font-black uppercase truncate leading-none mb-1">{log.itemName}</p>
                                    <p className="text-[6px] text-zinc-400 font-bold uppercase truncate">{log.supplierName}</p>
                                </div>
                                <div className="absolute top-2 right-2 bg-white/90 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Eye className="h-3 w-3 text-indigo-600" />
                                </div>
                            </div>
                        ))}
                        {filteredLog.filter(l => l.invoiceUrl).length > 10 && (
                            <div className="min-w-[120px] aspect-[3/4] bg-indigo-50 rounded-xl border border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-400 font-black uppercase text-[8px] italic tracking-tighter">
                                <span>+{filteredLog.filter(l => l.invoiceUrl).length - 10}</span>
                                <span>Documentos</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* RESUMO DO CONTRATO / FORNECEDOR */}
            {filteredLog.length > 0 && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                        {/* Summary for real logs */}
                        {Object.entries(
                            filteredLog.reduce((acc, log) => {
                                const key = `${log.supplierName}-${log.itemName}`;
                                if (!acc[key]) acc[key] = { 
                                    supplier: log.supplierName, 
                                    item: log.itemName, 
                                    totalWeight: 0, 
                                    totalValue: 0, 
                                    weeks: new Set<number>() 
                                };
                                acc[key].totalWeight += log.quantity || 0;
                                acc[key].totalValue += log.value || 0;
                                
                                const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
                                const logDate = new Date(dateStr + 'T00:00:00');
                                const week = Math.ceil(logDate.getDate() / 7);
                                acc[key].weeks.add(week);
                                
                                return acc;
                            }, {} as Record<string, { supplier: string; item: string; totalWeight: number; totalValue: number; weeks: Set<number> }>)
                        ).map(([key, data]: [string, any]) => (
                            <div key={key} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all border-l-4 border-l-indigo-500 group">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">{data.supplier}</span>
                                    <div className="flex gap-1">
                                        {Array.from(data.weeks as Set<number>).sort().map(w => (
                                            <span key={w} className="bg-white border border-slate-200 text-[7px] font-black px-1.5 py-0.5 rounded text-slate-400 italic">S{w}</span>
                                        ))}
                                    </div>
                                </div>
                                <h3 className="text-[11px] font-black text-slate-900 uppercase leading-tight mb-3 group-hover:text-indigo-600 transition-colors">{data.item || data.itemName || ''}</h3>
                                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                                    <div className="space-y-0.5">
                                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Peso Realizado</p>
                                        <p className="text-[12px] font-black text-slate-900">{data.totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} <span className="text-[8px] text-slate-400">Kg</span></p>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                        <p className="text-[7px] text-slate-400 font-bold uppercase tracking-tighter">Valor Realizado</p>
                                        <p className="text-[12px] font-black text-emerald-600">{data.totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {filteredLog.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                        ref={topScrollRef} 
                        className="overflow-x-auto overflow-y-hidden custom-scrollbar border-b border-gray-50" 
                        style={{ height: '8px' }}
                    >
                        <div style={{ height: '1px' }}></div>
                    </div>
                    <div ref={bottomScrollRef} className="overflow-x-auto max-h-[50vh] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-200">
                        <table ref={tableRef} className="w-full text-[10px] border-separate border-spacing-0">
                            <thead className="bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
                                <tr className="italic">
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Tipo</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100 whitespace-nowrap">Data Doc.</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Produto / Origem</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Cód. Barras</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Lote</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Validade</th>
                                    <th className="p-3 text-right font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Quantidade</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">NF / REQ</th>
                                    <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Situação PD</th>
                                    <th className="p-3 text-center font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredLog.map(log => (
                                    <tr key={log.id} className={`hover:bg-indigo-50/30 transition-colors group ${log.isOffline ? 'bg-amber-50/50' : (!log.pdNumber ? 'bg-red-100' : 'bg-green-100')}`}>
                                        <td className="p-2 pl-3">
                                            <div className="flex flex-col gap-1">
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase italic ${log.type === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{log.type}</span>
                                                {log.isOffline && (
                                                    <span className="text-[7px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse uppercase italic">
                                                        <Clock className="h-2 w-2" />
                                                        Pendente Sync
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-2 font-mono text-indigo-700 text-[10px] font-black">{(log.date || '').split('-').reverse().join('/')}</td>
                                        <td className="p-2">
                                            <p className="font-black text-gray-900 uppercase leading-none">{log.itemName}</p>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{log.supplierName}</p>
                                        </td>
                                        <td className="p-2 font-mono text-[10px] text-blue-600 font-black tracking-tighter">{log.barcode || '-'}</td>
                                        <td className="p-2 font-mono text-[10px] uppercase font-bold text-gray-500">{log.lotNumber || '-'}</td>
                                        <td className="p-2 font-mono text-[10px] uppercase font-bold text-gray-400">
                                            {log.expirationDate ? log.expirationDate.split('-').reverse().join('/') : '-'}
                                        </td>
                                        <td className="p-2 text-right font-mono font-black text-gray-900 bg-gray-50/30 group-hover:bg-transparent">
                                            {(log.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                        </td>
                                        <td className="p-2 font-mono text-[10px] text-gray-400 font-bold italic">{log.inboundInvoice || log.outboundInvoice || '-'}</td>
                                        <td className={`p-2 font-mono text-[10px] font-black italic ${!log.pdNumber ? 'text-red-700' : 'text-green-700'}`}>
                                            PD - {log.pdNumber ? 'C/ PD' : 'S/ PD'}
                                        </td>
                                        <td className="p-2 text-center">
                                            <div className="flex justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {log.invoiceUrl && (
                                                    <button 
                                                        onClick={() => {
                                                            const win = window.open();
                                                            if (win) {
                                                                win.document.write(`<iframe src="${log.invoiceUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
                                                            }
                                                        }}
                                                        className="text-gray-400 hover:text-amber-600 hover:bg-amber-50 p-1.5 rounded-lg transition-all"
                                                        title="Ver Comprovante"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handlePrintLabel(log)}
                                                    className="text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 p-1.5 rounded-lg transition-all"
                                                    title="Imprimir Etiqueta"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(log)} 
                                                    disabled={isDeleting === log.id}
                                                    className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all disabled:opacity-50"
                                                    title="Excluir Registro"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center text-gray-400 italic font-black uppercase tracking-[0.2em] text-[10px]">Sem registros para este filtro</div>
            )}

            <ConfirmModal 
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                variant={confirmConfig.variant}
            />
        </div>
    );
};

export default AdminWarehouseLog;
