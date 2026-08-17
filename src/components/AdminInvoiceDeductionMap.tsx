import React, { useState, useMemo, useCallback } from 'react';
import { Supplier, WarehouseMovement, PerCapitaConfig, ContractItem } from '../types';
import { getCombinedSuppliers } from '../lib/supplierUtils';
import { ensureArray, superNormalize, safeLocalStorageSetItem } from '../lib/utils';
import { 
    FileText, 
    Printer, 
    Download, 
    RefreshCw, 
    CheckCircle2, 
    Building2,
    Calendar,
    AlertCircle,
    Receipt,
    Maximize2,
    Minimize2,
    Eye,
    X
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminInvoiceDeductionMapProps {
    warehouseLog?: WarehouseMovement[];
    suppliers?: Supplier[];
    perCapitaConfig?: PerCapitaConfig;
}

const MONTHS_ORDER = [
    { key: '01', name: 'Jan/26', fullName: 'Janeiro' },
    { key: '02', name: 'Fev/26', fullName: 'Fevereiro' },
    { key: '03', name: 'Mar/26', fullName: 'Março' },
    { key: '04', name: 'Abr/26', fullName: 'Abril' },
    { key: '05', name: 'Mai/26', fullName: 'Maio' },
    { key: '06', name: 'Jun/26', fullName: 'Junho' },
    { key: '07', name: 'Jul/26', fullName: 'Julho' },
    { key: '08', name: 'Ago/26', fullName: 'Agosto' },
    { key: '09', name: 'Set/26', fullName: 'Setembro' },
    { key: '10', name: 'Out/26', fullName: 'Outubro' },
    { key: '11', name: 'Nov/26', fullName: 'Novembro' },
    { key: '12', name: 'Dez/26', fullName: 'Dezembro' }
];

const DEFAULT_GRAND_TOTALS = {
    contractValue: 0,
    contractWeight: 0,
    deliveredValue: 0,
    deliveredWeight: 0,
    remainingValue: 0,
    remainingWeight: 0,
    percentDelivered: 0
};

const formatCurrency = (val: number | null | undefined): string => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatNumber = (val: number | null | undefined, minDec = 0, maxDec = 2): string => {
    const num = Number(val || 0);
    return num.toLocaleString('pt-BR', { minimumFractionDigits: minDec, maximumFractionDigits: maxDec });
};

// Helper to clean long technical BEC descriptions into a short title (before first semicolon or colon)
const cleanShortTitle = (name: string): string => {
    if (!name) return '';
    const firstPart = name.split(/[;:\n]/)[0].trim();
    return firstPart.replace(/\s+/g, ' ');
};

// Normalized invoice string for comparison (consistent with AdminInvoices)
const cleanStr = (s: any): string => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();

// Normalized invoice digits for comparison
const normalizeNfDigits = (nf: string | null | undefined): string => {
    if (!nf) return '';
    const digits = String(nf).replace(/\D/g, '');
    return digits ? parseInt(digits, 10).toString() : String(nf).trim().toLowerCase();
};

// Clean item text for normalized comparison
const normalizeItemText = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

// Extract normalized primary product head (e.g. "beterraba", "chuchu", "pepino", "repolho", "batata doce", "cenoura", "abobora", "abobrinha")
const getProductHead = (name: string | null | undefined): string => {
    if (!name) return '';
    const rawHead = String(name).split(/[;:(\n]/)[0].trim();
    return normalizeItemText(rawHead);
};

// Robust Matcher that finds the EXACT matching contract item for a delivery (prevents false matches between similar words)
const findBestMatchingContractItem = (deliveryItemName: string, contractItems: ContractItem[]): ContractItem | null => {
    if (!deliveryItemName || !Array.isArray(contractItems) || contractItems.length === 0) return null;

    const delFullNorm = normalizeItemText(deliveryItemName);
    const delHead = getProductHead(deliveryItemName);

    // 1. Direct full string exact match
    const exactFull = contractItems.find(ci => ci && normalizeItemText(ci.name) === delFullNorm);
    if (exactFull) return exactFull;

    // 2. Direct product head exact match (e.g. "beterraba" === "beterraba", "abobrinha" === "abobrinha", "abobora" === "abobora")
    if (delHead) {
        // First try exact head match
        const exactHead = contractItems.find(ci => ci && getProductHead(ci.name) === delHead);
        if (exactHead) return exactHead;

        // Try where one head starts with the other with space boundary (e.g. "batata doce" with "batata doce rosada")
        const prefixHead = contractItems.find(ci => {
            if (!ci || !ci.name) return false;
            const ciHead = getProductHead(ci.name);
            if (!ciHead) return false;
            if (ciHead === delHead) return true;
            if (delHead.startsWith(ciHead + ' ') || ciHead.startsWith(delHead + ' ')) return true;
            return false;
        });
        if (prefixHead) return prefixHead;

        // Fallback: match by first word if length >= 4 and exact match (e.g. "beterraba" === "beterraba")
        // Ensuring distinct words like "abobora" and "abobrinha" never cross-match!
        const delFirstWord = delHead.split(/\s+/)[0];
        if (delFirstWord && delFirstWord.length >= 4) {
            const firstWordMatch = contractItems.find(ci => {
                if (!ci || !ci.name) return false;
                const ciHead = getProductHead(ci.name);
                const ciFirstWord = ciHead.split(/\s+/)[0];
                return ciFirstWord === delFirstWord;
            });
            if (firstWordMatch) return firstWordMatch;
        }
    }

    return null;
};

export const AdminInvoiceDeductionMap: React.FC<AdminInvoiceDeductionMapProps> = ({
    warehouseLog = [],
    suppliers = [],
    perCapitaConfig
}) => {
    // 1. Combine all available suppliers (Direct + Per Capita / PPAIS)
    const allSuppliers = useMemo(() => {
        const combined = getCombinedSuppliers(suppliers || [], perCapitaConfig);
        return combined.filter(s => s && (ensureArray(s.contractItems).length > 0 || (s.initialValue || 0) > 0 || ensureArray(s.deliveries).length > 0));
    }, [suppliers, perCapitaConfig]);

    const [selectedSupplierCpf, setSelectedSupplierCpf] = useState<string>(() => {
        if (allSuppliers.length > 0) return allSuppliers[0].cpf;
        return '';
    });

    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const [periodRange, setPeriodRange] = useState<'may_to_dec' | 'all_year'>('may_to_dec');
    const [compactView, setCompactView] = useState<boolean>(true);

    // Modal state to inspect individual NF items
    const [inspectedNfMonth, setInspectedNfMonth] = useState<string | null>(null);

    // Selected supplier
    const currentSupplier = useMemo(() => {
        if (allSuppliers.length === 0) return null;
        return allSuppliers.find(s => s.cpf === selectedSupplierCpf) || allSuppliers[0] || null;
    }, [allSuppliers, selectedSupplierCpf]);

    // Active months to display
    const displayedMonths = useMemo(() => {
        if (periodRange === 'may_to_dec') {
            return MONTHS_ORDER.slice(4); // Maio (05) to Dezembro (12)
        }
        return MONTHS_ORDER;
    }, [periodRange]);

    // 2. User Overrides State (keyed by CPF -> monthKey -> NF)
    const [userNfOverrides, setUserNfOverrides] = useState<Record<string, Record<string, string>>>(() => {
        try {
            const saved = localStorage.getItem('user_nf_overrides_map');
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    // 3. Reactively compute monthNfMap from user overrides, localStorage cache, and auto-detection
    const monthNfMap = useMemo(() => {
        if (!currentSupplier) return {};

        // 1. Check in-memory overrides
        const currentOverrides = userNfOverrides[currentSupplier.cpf];
        if (currentOverrides && Object.keys(currentOverrides).length > 0) {
            return currentOverrides;
        }

        // 2. Check legacy localStorage
        try {
            const saved = localStorage.getItem(`nf_deduction_map_${currentSupplier.cpf}`);
            if (saved) {
                return JSON.parse(saved);
            }
        } catch {
            // ignore
        }

        // 3. Auto-detect from deliveries and warehouse movements
        const newMap: Record<string, string> = {};
        const supNameNorm = superNormalize(currentSupplier.name || '');
        const supCpfDigits = String(currentSupplier.cpf || '').replace(/\D/g, '');

        const supplierDeliveries = ensureArray<any>(currentSupplier.deliveries);
        const supplierLogs = (warehouseLog || []).filter(l => {
            if (!l) return false;
            const logName = superNormalize(l.supplierName || '');
            const logCpf = String(l.supplierCpf || '').replace(/\D/g, '');
            return (supCpfDigits && logCpf === supCpfDigits) || (supNameNorm && (logName.includes(supNameNorm) || supNameNorm.includes(logName)));
        });

        displayedMonths.forEach(m => {
            const monthPrefix = `${selectedYear}-${m.key}`;
            
            // Look first in supplier.deliveries
            const monthDelivery = supplierDeliveries.find(d => {
                const dateStr = String(d.date || '');
                return dateStr.startsWith(monthPrefix) && d.invoiceNumber;
            });

            if (monthDelivery) {
                newMap[m.key] = String(monthDelivery.invoiceNumber || '').trim();
                return;
            }

            // Otherwise look in warehouseLog
            const monthLog = supplierLogs.find(l => {
                const dateStr = l.date || (typeof l.timestamp === 'number' ? new Date(l.timestamp).toISOString().split('T')[0] : '');
                return dateStr.startsWith(monthPrefix) && (l.inboundInvoice || l.invoiceNumber);
            });

            if (monthLog) {
                newMap[m.key] = String(monthLog.inboundInvoice || monthLog.invoiceNumber || '').trim();
            }
        });

        return newMap;
    }, [currentSupplier, userNfOverrides, displayedMonths, selectedYear, warehouseLog]);

    // Save NF mapping to state & localStorage
    const handleNfChange = useCallback((monthKey: string, nfValue: string) => {
        if (!currentSupplier) return;
        setUserNfOverrides(prev => {
            const supOverrides = { ...(prev[currentSupplier.cpf] || monthNfMap), [monthKey]: nfValue };
            const next = { ...prev, [currentSupplier.cpf]: supOverrides };
            safeLocalStorageSetItem('user_nf_overrides_map', JSON.stringify(next));
            safeLocalStorageSetItem(`nf_deduction_map_${currentSupplier.cpf}`, JSON.stringify(supOverrides));
            return next;
        });
    }, [currentSupplier, monthNfMap]);

    // Reset NFs to auto-detection
    const handleResetNfs = useCallback(() => {
        if (!currentSupplier) return;
        setUserNfOverrides(prev => {
            const next = { ...prev };
            delete next[currentSupplier.cpf];
            safeLocalStorageSetItem('user_nf_overrides_map', JSON.stringify(next));
            localStorage.removeItem(`nf_deduction_map_${currentSupplier.cpf}`);
            return next;
        });
        toast.success('Mapeamento de NFs redefinido para a detecção automática.');
    }, [currentSupplier]);

    // 4. List all distinct NFs found in database for this supplier
    const availableNfsForSupplier = useMemo(() => {
        if (!currentSupplier) return [];
        const nfs = new Set<string>();

        const supNameNorm = superNormalize(currentSupplier.name || '');
        const supCpfDigits = String(currentSupplier.cpf || '').replace(/\D/g, '');

        ensureArray<any>(currentSupplier.deliveries).forEach(d => {
            if (d.invoiceNumber) nfs.add(String(d.invoiceNumber).trim());
        });

        (warehouseLog || []).forEach(l => {
            const logName = superNormalize(l.supplierName || '');
            const logCpf = String(l.supplierCpf || '').replace(/\D/g, '');
            if ((supCpfDigits && logCpf === supCpfDigits) || (supNameNorm && (logName.includes(supNameNorm) || supNameNorm.includes(logName)))) {
                if (l.inboundInvoice) nfs.add(String(l.inboundInvoice).trim());
                if (l.invoiceNumber) nfs.add(String(l.invoiceNumber).trim());
            }
        });

        return Array.from(nfs).filter(Boolean);
    }, [currentSupplier, warehouseLog]);

    // 5. Contract Items of Current Supplier
    const contractItems = useMemo(() => {
        if (!currentSupplier) return [];
        return ensureArray<ContractItem>(currentSupplier.contractItems).filter(it => it && it.name);
    }, [currentSupplier]);

    // 6. Calculate Consolidated Matrix Data (WITHOUT duplicate entries)
    const matrixData = useMemo(() => {
        if (!currentSupplier) {
            return {
                items: [],
                monthTotals: {},
                grandTotals: DEFAULT_GRAND_TOTALS,
                consolidatedList: []
            };
        }

        // Helper to check if two CPFs are identical or share same root
        const isSameCpf = (c1: string, c2: string): boolean => {
            if (!c1 || !c2) return false;
            if (c1 === c2) return true;
            if (c1.length === 11 && c2.length === 14 && c2.startsWith(c1)) return true;
            if (c1.length === 14 && c2.length === 11 && c1.startsWith(c2)) return true;
            return false;
        };

        const supCleanName = cleanStr(currentSupplier.name || '');
        const supCleanCpf = cleanStr(currentSupplier.cpf || '');

        interface ConsolidatedEntry {
            id: string;
            date: string;
            itemName: string;
            kg: number;
            value: number;
            invoiceNumber: string;
            pdNumber?: string;
            neNumber?: string;
            lotNumber?: string;
            barcode?: string;
        }

        // Group supplier deliveries into unique invoice entries (identical to Gestão de Entradas)
        const supplierDeliveries = ensureArray<any>(currentSupplier.deliveries);
        const groupedInvoices: Record<string, {
            invoiceNumber: string;
            date: string;
            items: any[];
        }> = {};

        supplierDeliveries.forEach((d, idx) => {
            if (!d || (d.item === 'AGENDAMENTO PENDENTE' && !d.invoiceNumber)) return;
            const invNum = String(d.invoiceNumber || 'S/N').trim();
            const cleanDInvoice = cleanStr(invNum);
            const dItemName = String(d.item || d.itemName || '').trim();
            const cleanDItem = cleanStr(dItemName);
            const cleanDId = cleanStr(d.id);
            const dKg = Number(d.kg ?? d.quantity ?? 0);

            // Find matching movement in warehouseLog to retrieve recorded value, lot, barcode
            const itemMovement = (warehouseLog || []).find(log => {
                if (!log) return false;
                const cleanLogInv = cleanStr(log.invoiceNumber || log.inboundInvoice || log.outboundInvoice);
                const cleanLogItem = cleanStr(log.item || log.itemName);
                const cleanLogId = cleanStr(log.id);
                return cleanLogInv === cleanDInvoice &&
                    (cleanLogItem === cleanDItem || (cleanLogId && cleanLogId === cleanDId)) &&
                    (cleanStr(log.supplierName) === supCleanName || isSameCpf(cleanStr(log.supplierCpf), supCleanCpf));
            });

            const itemValue = Number((itemMovement as any)?.value ?? d.value ?? 0);
            const itemDate = String(d.invoiceDate || d.date || (itemMovement as any)?.date || '');

            if (!groupedInvoices[invNum]) {
                groupedInvoices[invNum] = {
                    invoiceNumber: invNum,
                    date: itemDate,
                    items: []
                };
            } else if (itemDate && (!groupedInvoices[invNum].date || new Date(itemDate) < new Date(groupedInvoices[invNum].date))) {
                groupedInvoices[invNum].date = itemDate;
            }

            // Deduplicate items within the same invoice by item name, kg, and ID
            const alreadyExists = groupedInvoices[invNum].items.some(existing => {
                const sameId = cleanDId && cleanStr(existing.id) === cleanDId;
                const sameItem = cleanStr(existing.item) === cleanDItem && Math.abs(Number(existing.kg || 0) - dKg) < 0.001;
                return sameId || sameItem;
            });

            if (!alreadyExists && (dKg > 0 || itemValue > 0)) {
                groupedInvoices[invNum].items.push({
                    id: d.id || `del_${invNum}_${idx}`,
                    item: dItemName,
                    kg: dKg,
                    value: itemValue,
                    date: itemDate,
                    barcode: (itemMovement as any)?.barcode || d.barcode || '',
                    lotNumber: (itemMovement as any)?.lotNumber || d.lotNumber || '',
                    pd: (itemMovement as any)?.pdNumber || d.pd || d.pdNumber || '',
                    ne: (itemMovement as any)?.neNumber || d.ne || d.neNumber || ''
                });
            }
        });

        // Mirror any additional entries from warehouseLog for this supplier
        (warehouseLog || []).forEach((log, idx) => {
            if (!log) return;
            const logItemName = String(log.item || log.itemName || '').trim();
            if (!logItemName || logItemName === 'AGENDAMENTO PENDENTE') return;

            const isEntrada = !log.type || String(log.type).toLowerCase().trim() === 'entrada';
            if (!isEntrada) return;

            const logName = cleanStr(log.supplierName);
            const logCpf = cleanStr(log.supplierCpf);
            const isMatch = (supCleanCpf && isSameCpf(logCpf, supCleanCpf)) || (supCleanName && (logName.includes(supCleanName) || supCleanName.includes(logName)));
            if (!isMatch) return;

            const invNum = String(log.inboundInvoice || log.invoiceNumber || 'S/N').trim();
            const cleanLogItem = cleanStr(logItemName);
            const logKg = Number(log.quantity ?? log.kg ?? log.weight ?? 0);
            const logValue = Number(log.value || 0);
            const logDate = String(log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : ''));

            if (!groupedInvoices[invNum]) {
                groupedInvoices[invNum] = {
                    invoiceNumber: invNum,
                    date: logDate,
                    items: []
                };
            }

            const alreadyExists = groupedInvoices[invNum].items.some(existing => {
                const sameId = log.id && cleanStr(existing.id) === cleanStr(log.id);
                const sameItem = cleanStr(existing.item) === cleanLogItem && Math.abs(Number(existing.kg || 0) - logKg) < 0.001;
                return sameId || sameItem;
            });

            if (!alreadyExists && (logKg > 0 || logValue > 0)) {
                groupedInvoices[invNum].items.push({
                    id: log.id || `wh_${invNum}_${idx}`,
                    item: logItemName,
                    kg: logKg,
                    value: logValue,
                    date: logDate,
                    barcode: log.barcode || '',
                    lotNumber: log.lotNumber || '',
                    pd: log.pdNumber || '',
                    ne: log.neNumber || ''
                });
            }
        });

        // Flatten into consolidated list of entries
        const consolidatedList: ConsolidatedEntry[] = [];
        Object.values(groupedInvoices).forEach(inv => {
            inv.items.forEach(it => {
                consolidatedList.push({
                    id: it.id,
                    date: it.date || inv.date,
                    itemName: it.item,
                    kg: Number(it.kg || 0),
                    value: Number(it.value || 0),
                    invoiceNumber: inv.invoiceNumber,
                    pdNumber: it.pd,
                    neNumber: it.ne,
                    lotNumber: it.lotNumber,
                    barcode: it.barcode
                });
            });
        });

        // 4. Initialize Month Totals
        const monthTotals: Record<string, { weight: number; value: number }> = {};
        displayedMonths.forEach(m => {
            monthTotals[m.key] = { weight: 0, value: 0 };
        });

        // 5. Compute matrix rows for each contract item
        const items = contractItems.map(item => {
            const valPerKg = Number(item.valuePerKg || 0);
            const totalContractKg = Number(item.totalKg || 0);

            const monthsValues: Record<string, { weight: number; valPerKg: number; totalVal: number }> = {};
            let itemTotalDeliveredWeight = 0;
            let itemTotalDeliveredValue = 0;

            displayedMonths.forEach(m => {
                const assignedNf = monthNfMap[m.key] || '';
                const cleanAssignedNf = normalizeNfDigits(assignedNf);
                const monthPrefix = `${selectedYear}-${m.key}`;

                let cellWeight = 0;
                let cellValue = 0;

                // Find all consolidated entries that belong to this item and this month/NF
                consolidatedList.forEach(entry => {
                    // Check item match using the exact product head matcher
                    const matchedItem = findBestMatchingContractItem(entry.itemName, contractItems);
                    if (!matchedItem || matchedItem.name !== item.name) return;

                    const cleanEntryNf = normalizeNfDigits(entry.invoiceNumber);
                    const isDateInMonth = entry.date.startsWith(monthPrefix);

                    let belongsToThisMonth = false;

                    // If month has an assigned NF and entry has an NF
                    if (cleanAssignedNf && cleanEntryNf) {
                        belongsToThisMonth = cleanAssignedNf === cleanEntryNf;
                    } 
                    // If month has an assigned NF but entry has no NF, place if date matches
                    else if (cleanAssignedNf && !cleanEntryNf && isDateInMonth) {
                        belongsToThisMonth = true;
                    }
                    // If month has NO assigned NF, place if date matches and entry NF isn't mapped to another displayed month
                    else if (!cleanAssignedNf && isDateInMonth) {
                        const isNfAssignedElsewhere = Object.entries(monthNfMap).some(([k, nf]) => k !== m.key && normalizeNfDigits(nf) === cleanEntryNf);
                        belongsToThisMonth = !isNfAssignedElsewhere;
                    }

                    if (belongsToThisMonth) {
                        cellWeight += entry.kg;
                        if (entry.value > 0) {
                            cellValue += entry.value;
                        } else {
                            cellValue += entry.kg * valPerKg;
                        }
                    }
                });

                const effectiveUnitPrice = cellWeight > 0 && cellValue > 0 ? cellValue / cellWeight : valPerKg;

                monthsValues[m.key] = {
                    weight: cellWeight,
                    valPerKg: effectiveUnitPrice,
                    totalVal: cellValue
                };

                itemTotalDeliveredWeight += cellWeight;
                itemTotalDeliveredValue += cellValue;

                // Add to month column total
                monthTotals[m.key].weight += cellWeight;
                monthTotals[m.key].value += cellValue;
            });

            const totalContractValue = totalContractKg * valPerKg;
            const remainingWeight = Math.max(0, totalContractKg - itemTotalDeliveredWeight);
            const remainingValue = Math.max(0, totalContractValue - itemTotalDeliveredValue);

            return {
                name: item.name,
                shortTitle: cleanShortTitle(item.name),
                unit: item.unit || 'Kg',
                valPerKg,
                totalContractKg,
                totalContractValue,
                monthsValues,
                itemTotalDeliveredWeight,
                itemTotalDeliveredValue,
                remainingWeight,
                remainingValue
            };
        });

        // 6. Grand Totals across all items and months
        const calculatedContractValue = contractItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0);
        const grandContractValue = calculatedContractValue > 0 ? calculatedContractValue : Number(currentSupplier.initialValue || 0);
        const grandContractWeight = contractItems.reduce((acc, curr) => acc + Number(curr.totalKg || 0), 0);
        const grandDeliveredValue = items.reduce((acc, curr) => acc + curr.itemTotalDeliveredValue, 0);
        const grandDeliveredWeight = items.reduce((acc, curr) => acc + curr.itemTotalDeliveredWeight, 0);
        const grandRemainingValue = Math.max(0, grandContractValue - grandDeliveredValue);
        const grandRemainingWeight = Math.max(0, grandContractWeight - grandDeliveredWeight);
        const percentDelivered = grandContractValue > 0 ? (grandDeliveredValue / grandContractValue) * 100 : 0;

        return {
            items,
            monthTotals,
            grandTotals: {
                contractValue: grandContractValue,
                contractWeight: grandContractWeight,
                deliveredValue: grandDeliveredValue,
                deliveredWeight: grandDeliveredWeight,
                remainingValue: grandRemainingValue,
                remainingWeight: grandRemainingWeight,
                percentDelivered: Number.isFinite(percentDelivered) ? percentDelivered : 0
            },
            consolidatedList
        };
    }, [currentSupplier, contractItems, displayedMonths, monthNfMap, warehouseLog, selectedYear]);

    // 7. Summary of Invoices List (Cards showing weight and value for each NF)
    const invoiceSummaryList = useMemo(() => {
        return displayedMonths.map(m => {
            const nf = monthNfMap[m.key] || '';
            const totals = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
            const activeItemsCount = (matrixData.items || []).filter(it => (it?.monthsValues?.[m.key]?.weight || 0) > 0).length;

            return {
                monthKey: m.key,
                monthName: m.name,
                fullName: m.fullName,
                nfNumber: nf,
                weight: totals.weight || 0,
                value: totals.value || 0,
                itemCount: activeItemsCount,
                hasData: (totals.weight || 0) > 0 || Boolean(nf)
            };
        });
    }, [displayedMonths, monthNfMap, matrixData]);

    // Entries for the inspected NF Modal
    const inspectedNfDetails = useMemo(() => {
        if (!inspectedNfMonth || !currentSupplier) return null;
        const monthObj = displayedMonths.find(m => m.key === inspectedNfMonth);
        if (!monthObj) return null;

        const assignedNf = monthNfMap[inspectedNfMonth] || '';
        const cleanAssignedNf = normalizeNfDigits(assignedNf);
        const monthPrefix = `${selectedYear}-${inspectedNfMonth}`;

        // Get all matching entries from consolidatedList
        const matchingEntries = matrixData.consolidatedList.filter(entry => {
            const cleanEntryNf = normalizeNfDigits(entry.invoiceNumber);
            const isDateInMonth = entry.date.startsWith(monthPrefix);

            if (cleanAssignedNf && cleanEntryNf) {
                return cleanAssignedNf === cleanEntryNf;
            } else if (cleanAssignedNf && !cleanEntryNf && isDateInMonth) {
                return true;
            } else if (!cleanAssignedNf && isDateInMonth) {
                return true;
            }
            return false;
        });

        const mappedItems = matchingEntries.map(e => {
            const matchedCi = findBestMatchingContractItem(e.itemName, contractItems);
            const valPerKg = e.kg > 0 && e.value > 0 ? e.value / e.kg : (matchedCi?.valuePerKg || 0);
            return {
                rawName: e.itemName,
                matchedContractItem: matchedCi?.name || 'Não vinculado ao contrato',
                shortTitle: matchedCi ? cleanShortTitle(matchedCi.name) : cleanShortTitle(e.itemName),
                kg: e.kg,
                valPerKg,
                value: e.value > 0 ? e.value : (e.kg * valPerKg),
                date: e.date,
                invoiceNumber: e.invoiceNumber || assignedNf || 'S/N',
                pdNumber: e.pdNumber,
                neNumber: e.neNumber,
                lotNumber: e.lotNumber
            };
        });

        const totalWeight = mappedItems.reduce((sum, it) => sum + it.kg, 0);
        const totalValue = mappedItems.reduce((sum, it) => sum + it.value, 0);

        return {
            monthObj,
            assignedNf,
            mappedItems,
            totalWeight,
            totalValue
        };
    }, [inspectedNfMonth, currentSupplier, displayedMonths, monthNfMap, selectedYear, matrixData, contractItems]);

    // 8. Print Layout Generator
    const handlePrintTable = () => {
        if (!currentSupplier) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Por favor, permita pop-ups no navegador para imprimir o mapa.');
            return;
        }

        const monthsHeaders = displayedMonths.map(m => {
            const nf = monthNfMap[m.key] ? `NF - ${monthNfMap[m.key]}` : '-';
            return `
                <th colspan="3" class="month-header">
                    <div class="month-title">${m.name}</div>
                    <div class="month-nf">${nf}</div>
                </th>
            `;
        }).join('');

        const subHeaders = displayedMonths.map(() => `
            <th class="sub-col">Peso (Kg)</th>
            <th class="sub-col">R$/Kg</th>
            <th class="sub-col">Valor (R$)</th>
        `).join('');

        const monthYellowTotals = displayedMonths.map(m => {
            const mTotals = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
            return `
                <td class="yellow-cell font-bold text-center">${(mTotals.weight || 0) > 0 ? formatNumber(mTotals.weight, 0, 2) : '-'}</td>
                <td class="yellow-cell text-center">-</td>
                <td class="yellow-cell font-bold text-right">${(mTotals.value || 0) > 0 ? formatCurrency(mTotals.value) : '-'}</td>
            `;
        }).join('');

        const itemRows = matrixData.items.map(it => {
            const monthCells = displayedMonths.map(m => {
                const cell = it.monthsValues[m.key] || { weight: 0, valPerKg: it.valPerKg, totalVal: 0 };
                return `
                    <td class="text-center font-bold">${(cell.weight || 0) > 0 ? formatNumber(cell.weight, 0, 2) : '-'}</td>
                    <td class="text-center font-mono text-muted">${(cell.weight || 0) > 0 ? formatCurrency(cell.valPerKg) : '-'}</td>
                    <td class="text-right font-bold font-mono">${(cell.totalVal || 0) > 0 ? formatCurrency(cell.totalVal) : '-'}</td>
                `;
            }).join('');

            return `
                <tr>
                    <td class="item-name-cell">
                        <strong>${it.shortTitle}</strong>
                        <div style="font-size: 6.5pt; color: #64748b;">${it.name}</div>
                    </td>
                    ${monthCells}
                    <td class="cyan-cell text-right font-bold font-mono">${formatCurrency(it.itemTotalDeliveredValue)}</td>
                    <td class="cyan-cell text-center font-bold">${formatNumber(it.totalContractKg, 2, 2)}</td>
                    <td class="yellow-cell text-center font-bold font-mono">${formatCurrency(it.remainingValue)}</td>
                    <td class="yellow-cell text-center font-bold">${formatNumber(it.remainingWeight, 2, 2)}</td>
                </tr>
            `;
        }).join('');

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Mapa de Dedução de NFs - ${currentSupplier.name}</title>
                <style>
                    @page { size: landscape; margin: 6mm; }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                        font-size: 8pt;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 8px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 1.5px solid #000;
                        font-size: 7.5pt;
                    }
                    th, td {
                        border: 1px solid #cbd5e1;
                        padding: 3px 4px;
                        vertical-align: middle;
                    }
                    .supplier-title-cell {
                        background-color: #FEF08A;
                        font-weight: 900;
                        font-size: 9pt;
                        text-align: center;
                        text-transform: uppercase;
                    }
                    .month-header {
                        background-color: #f8fafc;
                        text-align: center;
                        font-weight: 800;
                        border-bottom: 2px solid #64748b;
                    }
                    .month-title { font-size: 8pt; font-weight: 900; }
                    .month-nf { font-size: 7pt; color: #b45309; font-weight: bold; }
                    .sub-col { background-color: #f1f5f9; font-size: 6.5pt; font-weight: 700; text-align: center; }
                    .yellow-cell { background-color: #FEF08A !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .cyan-cell { background-color: #CFFAFE !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .item-name-cell { background-color: #F0FDF4; text-align: left; padding: 3px 5px; }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    .font-mono { font-family: "Courier New", monospace; }
                </style>
            </head>
            <body>
                <div style="margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h2 style="margin: 0; font-size: 11pt; text-transform: uppercase; font-weight: 900;">Acompanhamento de NFs & Dedução Contratual</h2>
                        <p style="margin: 2px 0 0 0; font-size: 7.5pt; color: #334155;">Fornecedor: <strong>${currentSupplier.name}</strong> | CPF/CNPJ: <strong>${currentSupplier.cpf}</strong> | Ano Base: <strong>${selectedYear}</strong></p>
                    </div>
                    <div style="text-align: right; font-size: 7pt;">
                        <span>Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th rowspan="2" class="supplier-title-cell" style="width: 140px;">${currentSupplier.name}</th>
                            ${monthsHeaders}
                            <th rowspan="2" class="cyan-cell text-center font-bold" style="width: 75px;">Total Valores</th>
                            <th rowspan="2" class="cyan-cell text-center font-bold" style="width: 65px;">Total Peso</th>
                            <th rowspan="2" class="yellow-cell text-center font-bold" style="width: 75px;">Falta Valor</th>
                            <th rowspan="2" class="yellow-cell text-center font-bold" style="width: 65px;">Falta Peso</th>
                            <th colspan="2" class="text-center font-bold" style="background-color: #f8fafc;">Total Contrato</th>
                        </tr>
                        <tr>
                            ${subHeaders}
                            <th colspan="2" class="text-center font-bold font-mono" style="background-color: #fff;">${formatCurrency(matrixData.grandTotals.contractValue)}</th>
                        </tr>
                        <tr>
                            <td class="yellow-cell text-center font-bold uppercase">Subtotal NFs</td>
                            ${monthYellowTotals}
                            <td class="cyan-cell text-right font-bold font-mono">${formatCurrency(matrixData.grandTotals.deliveredValue)}</td>
                            <td class="cyan-cell text-center font-bold">${formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)}</td>
                            <td class="yellow-cell text-center font-bold font-mono">${formatCurrency(matrixData.grandTotals.remainingValue)}</td>
                            <td class="yellow-cell text-center font-bold">${formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)}</td>
                            <td class="text-center font-bold" style="background-color: #f8fafc;">Total Peso</td>
                            <td class="text-center font-bold font-mono">${formatNumber(matrixData.grandTotals.contractWeight, 2, 2)}</td>
                        </tr>
                    </thead>
                    <tbody>
                        ${itemRows}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="${1 + (displayedMonths.length * 3) + 4}" style="border: none;"></td>
                            <td class="font-bold" style="background-color: #f8fafc;">Restante Valor</td>
                            <td class="font-bold font-mono text-right">${formatCurrency(matrixData.grandTotals.remainingValue)}</td>
                        </tr>
                    </tfoot>
                </table>

                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // 9. Export to CSV
    const handleExportCSV = () => {
        if (!currentSupplier) return;

        const headers = [
            'Item Contratado',
            ...displayedMonths.flatMap(m => [`${m.name} (${monthNfMap[m.key] ? `NF-${monthNfMap[m.key]}` : 'Sem NF'}) Peso (Kg)`, `${m.name} Valor/Kg`, `${m.name} Valor Total (R$)`]),
            'Total de Valores Entregues (R$)',
            'Total dos Peso Contratado (Kg)',
            'Falta Entregar Valor (R$)',
            'Falta Entregar Peso (Kg)'
        ];

        const rows = matrixData.items.map(it => [
            `"${it.name.replace(/"/g, '""')}"`,
            ...displayedMonths.flatMap(m => {
                const cell = it.monthsValues[m.key] || { weight: 0, valPerKg: 0, totalVal: 0 };
                return [
                    (cell.weight || 0).toFixed(2).replace('.', ','),
                    (cell.valPerKg || 0).toFixed(2).replace('.', ','),
                    (cell.totalVal || 0).toFixed(2).replace('.', ',')
                ];
            }),
            (it.itemTotalDeliveredValue || 0).toFixed(2).replace('.', ','),
            (it.totalContractKg || 0).toFixed(2).replace('.', ','),
            (it.remainingValue || 0).toFixed(2).replace('.', ','),
            (it.remainingWeight || 0).toFixed(2).replace('.', ',')
        ]);

        const totalsRow = [
            '"SUBTOTAL ENTREGAS / NFS"',
            ...displayedMonths.flatMap(m => {
                const mt = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
                return [
                    (mt.weight || 0).toFixed(2).replace('.', ','),
                    '-',
                    (mt.value || 0).toFixed(2).replace('.', ',')
                ];
            }),
            (matrixData.grandTotals.deliveredValue || 0).toFixed(2).replace('.', ','),
            (matrixData.grandTotals.deliveredWeight || 0).toFixed(2).replace('.', ','),
            (matrixData.grandTotals.remainingValue || 0).toFixed(2).replace('.', ','),
            (matrixData.grandTotals.remainingWeight || 0).toFixed(2).replace('.', ',')
        ];

        const csvContent = '\uFEFF' + [
            `"MAPA DE DEDUCAO DE NOTAS FISCAIS - ${currentSupplier.name.toUpperCase()} - EXERCICIO ${selectedYear}"`,
            `"CPF/CNPJ: ${currentSupplier.cpf}"`,
            '',
            headers.join(';'),
            totalsRow.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Mapa_NFs_${currentSupplier.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Arquivo CSV gerado com sucesso!');
    };

    if (allSuppliers.length === 0) {
        return (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-3">
                <Receipt className="h-10 w-10 text-amber-500 mx-auto" />
                <h3 className="text-base font-black text-slate-900 uppercase">Nenhum Fornecedor com Itens Contratados</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Cadastre os contratos ou produtores no módulo de Fornecedores / Per Capita para visualizar o mapa de dedução de notas fiscais.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4 animate-fade-in text-slate-800">
            {/* TOP HEADER CONTROLS */}
            <div className="bg-white p-4 md:p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 pb-3 border-b border-slate-100">
                    <div>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-base md:text-lg font-black text-slate-900 tracking-tight uppercase">
                                    Mapa de NFs & Dedução Contratual
                                </h2>
                                <p className="text-xs text-slate-500 font-medium">
                                    Controle mensal consolidado de pesos e valores por Nota Fiscal com dedução em tempo real
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Compact vs Complete View Toggle */}
                        <button
                            onClick={() => setCompactView(!compactView)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                compactView 
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 shadow-xs' 
                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                            }`}
                            title="Alternar entre modo compacto e detalhado"
                        >
                            {compactView ? <Minimize2 className="h-3.5 w-3.5 text-amber-600" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-500" />}
                            <span>{compactView ? 'Modo Compacto' : 'Modo Detalhado'}</span>
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                            <Download className="h-3.5 w-3.5" />
                            <span>Exportar Excel</span>
                        </button>
                        
                        <button
                            onClick={handlePrintTable}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                            <Printer className="h-3.5 w-3.5" />
                            <span>Imprimir / PDF</span>
                        </button>
                    </div>
                </div>

                {/* Filters & Supplier Selector */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Supplier Selector */}
                    <div className="md:col-span-6 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-amber-600" />
                            Selecionar Produtor / Fornecedor:
                        </label>
                        <select
                            value={selectedSupplierCpf}
                            onChange={(e) => setSelectedSupplierCpf(e.target.value)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-slate-900 outline-none focus:ring-2 focus:ring-amber-400 transition-all cursor-pointer"
                        >
                            {allSuppliers.map(s => (
                                <option key={s.cpf} value={s.cpf}>
                                    {s.name} ({s.cpf}) - {ensureArray(s.contractItems).length} itens contratados
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Period Range */}
                    <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-indigo-500" />
                            Período de Apuração:
                        </label>
                        <select
                            value={periodRange}
                            onChange={(e) => setPeriodRange(e.target.value as any)}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer"
                        >
                            <option value="may_to_dec">Maio a Dezembro (Padrão 2026)</option>
                            <option value="all_year">Ano Completo (Jan a Dez)</option>
                        </select>
                    </div>

                    {/* Year Selection */}
                    <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            Ano Exercício:
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400 transition-all cursor-pointer"
                        >
                            <option value={2026}>Exercício 2026</option>
                            <option value={2025}>Exercício 2025</option>
                            <option value={2027}>Exercício 2027</option>
                        </select>
                    </div>
                </div>

                {/* Quick Info Bar for Selected Supplier */}
                {currentSupplier && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/70 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-xs uppercase shadow-xs">
                                {currentSupplier.name.substring(0, 2)}
                            </div>
                            <div>
                                <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight">{currentSupplier.name}</h3>
                                <p className="text-[10px] text-slate-500 font-medium">
                                    CPF/CNPJ: <span className="font-mono font-bold text-slate-700">{currentSupplier.cpf}</span>
                                    {currentSupplier.processNumber && <span> | Processo: <strong className="font-mono text-slate-700">{currentSupplier.processNumber}</strong></span>}
                                </p>
                            </div>
                        </div>

                        {/* Top Highlights Summary Cards */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs text-center">
                                <span className="text-[8px] font-black uppercase text-slate-400 block">Total Contrato</span>
                                <span className="text-[11px] font-black text-slate-900 font-mono">{formatCurrency(matrixData.grandTotals.contractValue)}</span>
                            </div>
                            <div className="bg-white px-3 py-1 rounded-xl border border-slate-200 shadow-2xs text-center">
                                <span className="text-[8px] font-black uppercase text-emerald-600 block">Total Entregue</span>
                                <span className="text-[11px] font-black text-emerald-700 font-mono">{formatCurrency(matrixData.grandTotals.deliveredValue)}</span>
                            </div>
                            <div className="bg-amber-100/70 px-3 py-1 rounded-xl border border-amber-300/80 shadow-2xs text-center">
                                <span className="text-[8px] font-black uppercase text-amber-900 block">Saldo Restante</span>
                                <span className="text-[11px] font-black text-amber-950 font-mono">{formatCurrency(matrixData.grandTotals.remainingValue)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* RESUMO CONSOLIDADO POR NOTA FISCAL (PESOS E VALORES DE CADA NF) */}
            <div className="bg-white p-3.5 md:p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                            <Receipt className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                                Resumo de Pesos e Valores por Nota Fiscal
                            </h3>
                            <p className="text-[10px] text-slate-400 font-medium">
                                Total consolidado por cada mês e número de NF emitido pelo produtor (Clique para ver os itens de cada nota)
                            </p>
                        </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                        {invoiceSummaryList.filter(i => (i.weight || 0) > 0).length} NFs com Movimentação
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                    {invoiceSummaryList.map(item => (
                        <div 
                            key={item.monthKey}
                            onClick={() => (item.weight > 0 || item.nfNumber) && setInspectedNfMonth(item.monthKey)}
                            className={`p-2.5 rounded-2xl border transition-all cursor-pointer ${
                                (item.weight || 0) > 0
                                    ? 'bg-amber-50/60 border-amber-300/80 shadow-2xs hover:bg-amber-100/70 hover:scale-[1.02]'
                                    : 'bg-slate-50/50 border-slate-200/50 opacity-70 hover:opacity-100'
                            }`}
                            title={item.weight > 0 ? "Clique para inspecionar os itens desta nota fiscal" : undefined}
                        >
                            <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[10px] font-black uppercase text-slate-700">{item.monthName}</span>
                                {item.nfNumber ? (
                                    <span className="text-[9px] font-black text-amber-900 bg-amber-200/90 px-1.5 py-0.2 rounded font-mono">
                                        NF {item.nfNumber}
                                    </span>
                                ) : (
                                    <span className="text-[8px] text-slate-400 italic">S/ NF</span>
                                )}
                            </div>
                            
                            <div className="space-y-0.5 mt-1.5">
                                <div>
                                    <span className="text-[8px] font-bold uppercase text-slate-400 block">Peso da NF:</span>
                                    <span className="text-xs font-black text-slate-900 font-mono">
                                        {(item.weight || 0) > 0 ? `${formatNumber(item.weight, 0, 2)} kg` : '-'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[8px] font-bold uppercase text-slate-400 block">Valor da NF:</span>
                                    <span className="text-xs font-black text-emerald-700 font-mono">
                                        {(item.value || 0) > 0 ? formatCurrency(item.value) : '-'}
                                    </span>
                                </div>
                            </div>

                            {item.weight > 0 && (
                                <div className="mt-1.5 pt-1 border-t border-amber-200/60 flex items-center justify-between text-[8px] text-amber-800 font-bold">
                                    <span>{item.itemCount} itens</span>
                                    <Eye className="h-2.5 w-2.5" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* MAIN COMPACT DEDUCTION TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
                
                {/* NF Input Control Bar for each month */}
                <div className="p-3.5 bg-slate-50/90 border-b border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                            <FileText className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-tight">
                                Mapeamento / Número das Notas Fiscais:
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal italic hidden md:inline">
                                (Informe o número da NF para que o sistema relacione automaticamente os pesos e valores)
                            </span>
                        </div>
                        <button
                            onClick={handleResetNfs}
                            className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="Restaurar identificação automática de notas fiscais"
                        >
                            <RefreshCw className="h-3 w-3 text-slate-500" />
                            Redefinir Auto-Detecção
                        </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                        {displayedMonths.map(m => (
                            <div key={m.key} className="bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs space-y-0.5">
                                <span className="text-[9px] font-black uppercase text-slate-500 block truncate">{m.name}</span>
                                <div>
                                    <input 
                                        type="text"
                                        list="supplier-nfs-datalist"
                                        placeholder="Ex: 116"
                                        value={monthNfMap[m.key] || ''}
                                        onChange={(e) => handleNfChange(m.key, e.target.value)}
                                        className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 text-[11px] font-black text-slate-900 text-center font-mono outline-none focus:ring-2 focus:ring-amber-400 transition-all"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    {availableNfsForSupplier.length > 0 && (
                        <datalist id="supplier-nfs-datalist">
                            {availableNfsForSupplier.map(nf => (
                                <option key={nf} value={nf} />
                            ))}
                        </datalist>
                    )}
                </div>

                {/* The Grid Table */}
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse min-w-[960px]">
                        <thead>
                            {/* Row 1: Header Titles */}
                            <tr className="border-b border-slate-200 bg-slate-100/80">
                                <th 
                                    rowSpan={2} 
                                    className="p-2.5 bg-yellow-200/90 text-slate-950 font-black text-xs uppercase tracking-tight border-r border-slate-300 sticky left-0 z-20 shadow-xs w-48 min-w-[170px] max-w-[210px]"
                                >
                                    <div className="truncate font-black text-[11px]">{currentSupplier?.name || 'Fornecedor'}</div>
                                    <div className="text-[9px] font-normal text-slate-600 lowercase truncate">itens do contrato</div>
                                </th>

                                {displayedMonths.map(m => (
                                    <th 
                                        key={m.key} 
                                        colSpan={compactView ? 2 : 3} 
                                        className="p-1.5 text-center bg-slate-100 text-slate-900 border-r border-slate-200 border-b border-slate-200"
                                    >
                                        <div className="text-[10px] font-black uppercase tracking-tight">{m.name}</div>
                                        <div className="text-[9px] font-bold text-amber-800 font-mono flex items-center justify-center gap-1">
                                            {monthNfMap[m.key] ? (
                                                <button 
                                                    onClick={() => setInspectedNfMonth(m.key)} 
                                                    className="hover:underline flex items-center gap-0.5 cursor-pointer text-amber-900"
                                                    title="Clique para ver os itens detalhados desta NF"
                                                >
                                                    <span>NF {monthNfMap[m.key]}</span>
                                                    <Eye className="h-2.5 w-2.5" />
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 italic text-[8px]">S/ NF</span>
                                            )}
                                        </div>
                                    </th>
                                ))}

                                <th rowSpan={2} className="p-2 text-center bg-cyan-50 text-cyan-950 font-black text-[10px] uppercase border-r border-slate-200 min-w-[85px]">
                                    Total Entregue
                                </th>
                                <th rowSpan={2} className="p-2 text-center bg-cyan-50 text-cyan-950 font-black text-[10px] uppercase border-r border-slate-200 min-w-[75px]">
                                    Peso Entregue
                                </th>
                                <th rowSpan={2} className="p-2 text-center bg-yellow-200 text-yellow-950 font-black text-[10px] uppercase border-r border-slate-200 min-w-[85px]">
                                    Falta Valor
                                </th>
                                <th rowSpan={2} className="p-2 text-center bg-yellow-200 text-yellow-950 font-black text-[10px] uppercase border-r border-slate-200 min-w-[75px]">
                                    Falta Peso
                                </th>
                                <th rowSpan={2} className="p-2 text-center bg-slate-200 text-slate-900 font-black text-[10px] uppercase min-w-[80px]">
                                    Total Contrato
                                </th>
                            </tr>

                            {/* Row 2: Sub-columns under each month */}
                            <tr className="border-b border-slate-200 bg-slate-50 text-[8px] font-black uppercase text-slate-500">
                                {displayedMonths.map(m => (
                                    <React.Fragment key={m.key}>
                                        <th className="p-1 text-center border-r border-slate-200 bg-slate-50/80 w-14">Peso (kg)</th>
                                        {!compactView && <th className="p-1 text-center border-r border-slate-200 bg-slate-50/80 w-14">R$/kg</th>}
                                        <th className="p-1 text-center border-r border-slate-200 bg-slate-50/80 w-16">Valor</th>
                                    </React.Fragment>
                                ))}
                            </tr>

                            {/* Row 3: Subtotal Amarelo de cada Mês (Top Subtotal Row) */}
                            <tr className="bg-yellow-100/90 text-slate-950 font-bold border-b border-slate-300 text-[10px]">
                                <td className="p-2 font-black uppercase tracking-tight sticky left-0 bg-yellow-200/90 z-20 border-r border-slate-300">
                                    Subtotal NFs (Mês)
                                </td>

                                {displayedMonths.map(m => {
                                    const mTotals = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
                                    return (
                                        <React.Fragment key={m.key}>
                                            <td className="p-1 text-center font-black border-r border-yellow-300 font-mono text-[10px]">
                                                {(mTotals.weight || 0) > 0 ? formatNumber(mTotals.weight, 0, 2) : '-'}
                                            </td>
                                            {!compactView && (
                                                <td className="p-1 text-center border-r border-yellow-300 font-mono text-[9px] text-yellow-900">
                                                    -
                                                </td>
                                            )}
                                            <td className="p-1 text-right font-black border-r border-slate-300 font-mono text-[10px]">
                                                {(mTotals.value || 0) > 0 ? formatCurrency(mTotals.value) : '-'}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Right Summaries for Totals Row */}
                                <td className="p-1.5 text-right font-black font-mono bg-cyan-100 text-cyan-950 border-r border-slate-200 text-[10px]">
                                    {formatCurrency(matrixData.grandTotals.deliveredValue)}
                                </td>
                                <td className="p-1.5 text-center font-black font-mono bg-cyan-100 text-cyan-950 border-r border-slate-200 text-[10px]">
                                    {formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)}
                                </td>
                                <td className="p-1.5 text-right font-black font-mono bg-yellow-300 text-yellow-950 border-r border-slate-200 text-[10px]">
                                    {formatCurrency(matrixData.grandTotals.remainingValue)}
                                </td>
                                <td className="p-1.5 text-center font-black font-mono bg-yellow-300 text-yellow-950 border-r border-slate-200 text-[10px]">
                                    {formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)}
                                </td>
                                <td className="p-1.5 text-center font-black font-mono bg-slate-200 text-slate-900 text-[10px]">
                                    {formatCurrency(matrixData.grandTotals.contractValue)}
                                </td>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 text-[11px]">
                            {matrixData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={1 + (displayedMonths.length * (compactView ? 2 : 3)) + 5} className="p-8 text-center text-slate-400 font-bold italic">
                                        Nenhum item contratado encontrado para este fornecedor.
                                    </td>
                                </tr>
                            ) : (
                                matrixData.items.map((it, idx) => (
                                    <tr key={it.name + idx} className="hover:bg-slate-50/90 transition-colors">
                                        
                                        {/* Item Name (Clean Short Title with full tooltip) */}
                                        <td 
                                            className="p-2 font-bold text-slate-900 bg-emerald-50/50 border-r border-slate-200 sticky left-0 z-10 w-48 min-w-[170px] max-w-[210px]"
                                            title={it.name}
                                        >
                                            <div className="flex items-center justify-between gap-1">
                                                <span className="truncate font-black text-slate-900 text-[11px]">{it.shortTitle}</span>
                                                <span className="text-[8px] font-bold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded shrink-0">
                                                    {it.unit}
                                                </span>
                                            </div>
                                            <div className="text-[8px] text-slate-400 font-normal truncate mt-0.5" title={it.name}>
                                                {it.name}
                                            </div>
                                        </td>

                                        {/* Month Values */}
                                        {displayedMonths.map(m => {
                                            const cell = it.monthsValues[m.key] || { weight: 0, valPerKg: it.valPerKg, totalVal: 0 };
                                            return (
                                                <React.Fragment key={m.key}>
                                                    {/* Peso */}
                                                    <td className={`p-1 text-center font-bold border-r border-slate-100 font-mono text-[10px] ${(cell.weight || 0) > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {(cell.weight || 0) > 0 ? formatNumber(cell.weight, 0, 2) : '-'}
                                                    </td>

                                                    {/* Valor Kg (when not compact) */}
                                                    {!compactView && (
                                                        <td className={`p-1 text-center font-mono text-[9px] border-r border-slate-100 ${(cell.weight || 0) > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                                            {(cell.weight || 0) > 0 ? formatCurrency(cell.valPerKg) : '-'}
                                                        </td>
                                                    )}

                                                    {/* Valor Total */}
                                                    <td 
                                                        className={`p-1 text-right font-bold font-mono border-r border-slate-200 text-[10px] ${(cell.totalVal || 0) > 0 ? 'text-emerald-700' : 'text-slate-300'}`}
                                                        title={(cell.weight || 0) > 0 ? `${formatNumber(cell.weight, 0, 2)} ${it.unit} x ${formatCurrency(cell.valPerKg)}` : undefined}
                                                    >
                                                        {(cell.totalVal || 0) > 0 ? formatCurrency(cell.totalVal) : ((cell.weight || 0) > 0 ? 'R$ 0,00' : '-')}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Total de Valores (Entregues) */}
                                        <td className="p-1.5 text-right font-black font-mono bg-cyan-50/50 text-slate-900 border-r border-slate-200 text-[10px]">
                                            {formatCurrency(it.itemTotalDeliveredValue)}
                                        </td>

                                        {/* Total dos Peso (Entregues) */}
                                        <td className="p-1.5 text-center font-black font-mono bg-cyan-50/50 text-slate-900 border-r border-slate-200 text-[10px]">
                                            {formatNumber(it.itemTotalDeliveredWeight, 2, 2)}
                                        </td>

                                        {/* Falta entregar Valor */}
                                        <td className={`p-1.5 text-right font-black font-mono border-r border-slate-200 text-[10px] ${it.remainingValue <= 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-amber-950 bg-yellow-50/50'}`}>
                                            {formatCurrency(it.remainingValue)}
                                        </td>

                                        {/* Falta entregar Peso */}
                                        <td className={`p-1.5 text-center font-black font-mono border-r border-slate-200 text-[10px] ${it.remainingWeight <= 0 ? 'text-emerald-600 bg-emerald-50/30' : 'text-amber-950 bg-yellow-50/50'}`}>
                                            {formatNumber(it.remainingWeight, 2, 2)}
                                        </td>

                                        {/* Total Contrato (Peso e Valor) */}
                                        <td className="p-1.5 text-center font-bold font-mono text-[9px] bg-slate-50/60 text-slate-700">
                                            <div>{formatNumber(it.totalContractKg, 2, 2)} {it.unit}</div>
                                            <div className="text-slate-400 text-[8px]">{formatCurrency(it.totalContractKg * it.valPerKg)}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Footer with Summary Totals */}
                        <tfoot>
                            <tr className="bg-slate-900 text-white font-bold border-t border-slate-800 text-[10px]">
                                <td className="p-2.5 font-black uppercase text-[11px] sticky left-0 bg-slate-900 z-10 border-r border-slate-800">
                                    Resumo Geral
                                </td>

                                <td colSpan={displayedMonths.length * (compactView ? 2 : 3)} className="p-2 text-slate-300 text-[10px]">
                                    {matrixData.items.length} itens | {displayedMonths.length} meses apurados
                                </td>

                                <td className="p-2 text-right font-black font-mono text-cyan-300 border-r border-slate-800">
                                    {formatCurrency(matrixData.grandTotals.deliveredValue)}
                                </td>
                                <td className="p-2 text-center font-black font-mono text-cyan-300 border-r border-slate-800">
                                    {formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)}
                                </td>
                                <td className="p-2 text-right font-black font-mono text-amber-300 border-r border-slate-800">
                                    {formatCurrency(matrixData.grandTotals.remainingValue)}
                                </td>
                                <td className="p-2 text-center font-black font-mono text-amber-300 border-r border-slate-800">
                                    {formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)}
                                </td>
                                <td className="p-2 text-center font-black font-mono text-slate-200">
                                    {formatCurrency(matrixData.grandTotals.contractValue)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* BOTTOM SUMMARY STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-wider">Valor Contratado</span>
                        <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <p className="text-xl font-black text-slate-900 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.contractValue)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        Peso total: <strong className="font-mono text-slate-700">{formatNumber(matrixData.grandTotals.contractWeight, 2, 2)} Kg</strong>
                    </p>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-wider">Total Já Entregue (NFs)</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-xl font-black text-emerald-600 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.deliveredValue)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        Peso entregue: <strong className="font-mono text-emerald-700">{formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)} Kg</strong> ({(matrixData.grandTotals?.percentDelivered || 0).toFixed(1)}%)
                    </p>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[9px] font-black uppercase tracking-wider">Saldo Restante a Entregar</span>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-xl font-black text-amber-600 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.remainingValue)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                        Peso restante: <strong className="font-mono text-amber-700">{formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)} Kg</strong>
                    </p>
                </div>
            </div>

            {/* MODAL: INSPECT INDIVIDUAL NF ITEMS */}
            {inspectedNfDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden space-y-0 animate-scale-up">
                        {/* Header */}
                        <div className="p-4 bg-amber-500 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <Receipt className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black text-sm uppercase tracking-tight">
                                        Detalhamento da Nota Fiscal {inspectedNfDetails.assignedNf ? `NF #${inspectedNfDetails.assignedNf}` : 'Sem Número'}
                                    </h3>
                                    <p className="text-[11px] text-amber-100 font-medium">
                                        Mês de Referência: <strong>{inspectedNfDetails.monthObj.name} ({inspectedNfDetails.monthObj.fullName})</strong> | Fornecedor: <strong>{currentSupplier?.name}</strong>
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setInspectedNfMonth(null)}
                                className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all cursor-pointer"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Body content */}
                        <div className="p-4 space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{inspectedNfDetails.mappedItems.length} registros cadastrados para esta NF</span>
                                <div className="flex gap-2">
                                    <span className="font-bold text-slate-900">Peso Total: <strong className="font-mono">{formatNumber(inspectedNfDetails.totalWeight, 2, 2)} Kg</strong></span>
                                    <span className="font-bold text-emerald-700">Valor Total: <strong className="font-mono">{formatCurrency(inspectedNfDetails.totalValue)}</strong></span>
                                </div>
                            </div>

                            {inspectedNfDetails.mappedItems.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-100">
                                    Nenhum item individual encontrado especificamente para esta NF no período.
                                </div>
                            ) : (
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-slate-100 text-slate-700 font-black text-[10px] uppercase border-b border-slate-200">
                                                <th className="p-2.5">Item da NF / Contrato</th>
                                                <th className="p-2.5 text-center">Peso (Kg)</th>
                                                <th className="p-2.5 text-center">Preço (R$/Kg)</th>
                                                <th className="p-2.5 text-right">Valor Total (R$)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {inspectedNfDetails.mappedItems.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-2.5">
                                                        <div className="font-black text-slate-900">{item.shortTitle}</div>
                                                        <div className="text-[9px] text-slate-400 truncate max-w-xs">{item.rawName}</div>
                                                        {item.date && (
                                                            <div className="text-[8px] text-slate-400 mt-0.5">
                                                                Data: {new Date(item.date + 'T12:00:00').toLocaleDateString('pt-BR')} {item.pdNumber ? `| PD: ${item.pdNumber}` : ''}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-2.5 text-center font-mono font-bold text-slate-900">
                                                        {formatNumber(item.kg, 2, 2)}
                                                    </td>
                                                    <td className="p-2.5 text-center font-mono text-slate-600">
                                                        {formatCurrency(item.valPerKg)}
                                                    </td>
                                                    <td className="p-2.5 text-right font-mono font-black text-emerald-700">
                                                        {formatCurrency(item.value)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
                                                <td className="p-2.5 uppercase text-[10px]">Total Consolidado da NF</td>
                                                <td className="p-2.5 text-center font-mono text-amber-900">{formatNumber(inspectedNfDetails.totalWeight, 2, 2)}</td>
                                                <td className="p-2.5 text-center">-</td>
                                                <td className="p-2.5 text-right font-mono text-emerald-700">{formatCurrency(inspectedNfDetails.totalValue)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
                            <button
                                onClick={() => setInspectedNfMonth(null)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminInvoiceDeductionMap;
