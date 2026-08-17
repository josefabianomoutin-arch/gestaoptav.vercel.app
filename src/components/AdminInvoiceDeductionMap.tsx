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
    TrendingUp, 
    Layers, 
    Calendar,
    ChevronDown,
    Building2,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminInvoiceDeductionMapProps {
    warehouseLog: WarehouseMovement[];
    suppliers: Supplier[];
    perCapitaConfig?: PerCapitaConfig;
}

const MONTHS_ORDER = [
    { key: '01', name: 'Janeiro' },
    { key: '02', name: 'Fevereiro' },
    { key: '03', name: 'Março' },
    { key: '04', name: 'Abril' },
    { key: '05', name: 'Maio' },
    { key: '06', name: 'Junho' },
    { key: '07', name: 'Julho' },
    { key: '08', name: 'Agosto' },
    { key: '09', name: 'Setembro' },
    { key: '10', name: 'Outubro' },
    { key: '11', name: 'Novembro' },
    { key: '12', name: 'Dezembro' }
];

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
};

const formatNumber = (val: number, minDec = 2, maxDec = 2) => {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: minDec, maximumFractionDigits: maxDec });
};

const AdminInvoiceDeductionMap: React.FC<AdminInvoiceDeductionMapProps> = ({
    warehouseLog = [],
    suppliers = [],
    perCapitaConfig
}) => {
    // 1. Combine all suppliers and producers
    const allSuppliers = useMemo(() => {
        const combined = getCombinedSuppliers(suppliers, perCapitaConfig);
        // Only keep suppliers with contracts or items
        return combined.filter(s => s && (ensureArray(s.contractItems).length > 0 || (s.initialValue || 0) > 0 || ensureArray(s.deliveries).length > 0));
    }, [suppliers, perCapitaConfig]);

    const [selectedSupplierCpf, setSelectedSupplierCpf] = useState<string>(() => {
        if (allSuppliers.length > 0) return allSuppliers[0].cpf;
        return '';
    });

    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const [periodRange, setPeriodRange] = useState<'may_to_dec' | 'all_year'>('may_to_dec');

    // Selected supplier
    const currentSupplier = useMemo(() => {
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

        // 3. Auto-detect from warehouse movements and deliveries
        const newMap: Record<string, string> = {};
        const supNameNorm = superNormalize(currentSupplier.name || '');
        const supCpfNorm = String(currentSupplier.cpf || '').replace(/\D/g, '');

        const supplierLogs = warehouseLog.filter(l => {
            if (!l) return false;
            const logName = superNormalize(l.supplierName || '');
            const logCpf = String(l.supplierCpf || '').replace(/\D/g, '');
            return (supCpfNorm && logCpf === supCpfNorm) || (supNameNorm && (logName.includes(supNameNorm) || supNameNorm.includes(logName)));
        });

        const supplierDeliveries = ensureArray<any>(currentSupplier.deliveries);

        displayedMonths.forEach(m => {
            const monthPrefix = `${selectedYear}-${m.key}`;
            
            const monthLog = supplierLogs.find(l => {
                const dateStr = l.date || (typeof l.timestamp === 'number' ? new Date(l.timestamp).toISOString().split('T')[0] : '');
                return dateStr.startsWith(monthPrefix) && (l.inboundInvoice || l.invoiceNumber);
            });

            if (monthLog) {
                newMap[m.key] = String(monthLog.inboundInvoice || monthLog.invoiceNumber || '').trim();
                return;
            }

            const monthDelivery = supplierDeliveries.find(d => {
                const dateStr = String(d.date || '');
                return dateStr.startsWith(monthPrefix) && d.invoiceNumber;
            });

            if (monthDelivery) {
                newMap[m.key] = String(monthDelivery.invoiceNumber || '').trim();
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

    // 3. List all distinct NFs found in database for this supplier to offer quick dropdown selection
    const availableNfsForSupplier = useMemo(() => {
        if (!currentSupplier) return [];
        const nfs = new Set<string>();

        const supNameNorm = superNormalize(currentSupplier.name || '');
        const supCpfNorm = String(currentSupplier.cpf || '').replace(/\D/g, '');

        warehouseLog.forEach(l => {
            const logName = superNormalize(l.supplierName || '');
            const logCpf = String(l.supplierCpf || '').replace(/\D/g, '');
            if ((supCpfNorm && logCpf === supCpfNorm) || (supNameNorm && (logName.includes(supNameNorm) || supNameNorm.includes(logName)))) {
                if (l.inboundInvoice) nfs.add(String(l.inboundInvoice).trim());
                if (l.invoiceNumber) nfs.add(String(l.invoiceNumber).trim());
            }
        });

        ensureArray<any>(currentSupplier.deliveries).forEach(d => {
            if (d.invoiceNumber) nfs.add(String(d.invoiceNumber).trim());
        });

        return Array.from(nfs).filter(Boolean);
    }, [currentSupplier, warehouseLog]);

    // 4. Calculate Data for Table Matrix
    const contractItems = useMemo(() => {
        if (!currentSupplier) return [];
        return ensureArray<ContractItem>(currentSupplier.contractItems).filter(it => it && it.name);
    }, [currentSupplier]);

    // Map deliveries and logs by NF and Month
    const matrixData = useMemo(() => {
        if (!currentSupplier) return { items: [], monthTotals: {}, grandTotals: {} as any };

        const supNameNorm = superNormalize(currentSupplier.name || '');
        const supCpfNorm = String(currentSupplier.cpf || '').replace(/\D/g, '');

        const supplierLogs = warehouseLog.filter(l => {
            if (!l) return false;
            const logName = superNormalize(l.supplierName || '');
            const logCpf = String(l.supplierCpf || '').replace(/\D/g, '');
            return (supCpfNorm && logCpf === supCpfNorm) || (supNameNorm && (logName.includes(supNameNorm) || supNameNorm.includes(logName)));
        });

        const supplierDeliveries = ensureArray<any>(currentSupplier.deliveries);

        // Helper to find weight and value for an item under an assigned NF or month
        const getItemDeliveryForMonth = (itemName: string, monthKey: string, nfNumber: string) => {
            const cleanItemName = superNormalize(itemName);
            const cleanNf = nfNumber ? nfNumber.replace(/\D/g, '') : '';
            const monthPrefix = `${selectedYear}-${monthKey}`;

            let totalWeight = 0;
            let unitPrice = 0;

            // 1. Check in warehouse logs
            supplierLogs.forEach(l => {
                const logItem = superNormalize(l.itemName || l.item || '');
                const logNf = String(l.inboundInvoice || l.invoiceNumber || '').replace(/\D/g, '');
                const logDate = l.date || (typeof l.timestamp === 'number' ? new Date(l.timestamp).toISOString().split('T')[0] : '');

                const isItemMatch = logItem === cleanItemName || logItem.includes(cleanItemName) || cleanItemName.includes(logItem);
                
                // Match by specific NF number if assigned, or by month if no NF is assigned but month matches
                const isNfMatch = cleanNf ? (logNf === cleanNf || String(l.inboundInvoice || l.invoiceNumber || '').includes(nfNumber)) : logDate.startsWith(monthPrefix);

                if (isItemMatch && isNfMatch && l.type === 'entrada') {
                    const weight = Number(l.quantity || l.kg || l.weight || 0);
                    totalWeight += weight;
                    if (l.value && weight > 0) {
                        unitPrice = l.value / weight;
                    }
                }
            });

            // 2. Also check in supplier.deliveries if not found or to complement
            if (totalWeight === 0) {
                supplierDeliveries.forEach(d => {
                    const dItem = superNormalize(d.itemName || d.item || '');
                    const dNf = String(d.invoiceNumber || '').replace(/\D/g, '');
                    const dDate = String(d.date || '');

                    const isItemMatch = dItem === cleanItemName || dItem.includes(cleanItemName) || cleanItemName.includes(dItem);
                    const isNfMatch = cleanNf ? (dNf === cleanNf || String(d.invoiceNumber || '').includes(nfNumber)) : dDate.startsWith(monthPrefix);

                    if (isItemMatch && isNfMatch) {
                        const weight = Number(d.kg || 0);
                        totalWeight += weight;
                        if (d.value && weight > 0) {
                            unitPrice = d.value / weight;
                        }
                    }
                });
            }

            return { totalWeight, unitPrice };
        };

        // Month-level Totals (for the top yellow subtotal row)
        const monthTotals: Record<string, { weight: number; value: number }> = {};
        displayedMonths.forEach(m => {
            monthTotals[m.key] = { weight: 0, value: 0 };
        });

        // Compute rows for each contract item
        const items = contractItems.map(item => {
            const valPerKg = Number(item.valuePerKg || 0);
            const totalContractKg = Number(item.totalKg || 0);

            const monthsValues: Record<string, { weight: number; valPerKg: number; totalVal: number }> = {};
            let itemTotalDeliveredWeight = 0;
            let itemTotalDeliveredValue = 0;

            displayedMonths.forEach(m => {
                const assignedNf = monthNfMap[m.key] || '';
                const delivery = getItemDeliveryForMonth(item.name, m.key, assignedNf);
                
                const itemPrice = delivery.unitPrice > 0 ? delivery.unitPrice : valPerKg;
                const weight = delivery.totalWeight;
                const totalVal = weight * itemPrice;

                monthsValues[m.key] = {
                    weight,
                    valPerKg: itemPrice,
                    totalVal
                };

                itemTotalDeliveredWeight += weight;
                itemTotalDeliveredValue += totalVal;

                // Add to month column total
                monthTotals[m.key].weight += weight;
                monthTotals[m.key].value += totalVal;
            });

            const remainingWeight = Math.max(0, totalContractKg - itemTotalDeliveredWeight);
            const remainingValue = remainingWeight * valPerKg;

            return {
                name: item.name,
                unit: item.unit || 'Kg',
                valPerKg,
                totalContractKg,
                monthsValues,
                itemTotalDeliveredWeight,
                itemTotalDeliveredValue,
                remainingWeight,
                remainingValue
            };
        });

        // Grand Totals across all items and months
        const grandContractValue = contractItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0);
        const grandContractWeight = contractItems.reduce((acc, curr) => acc + Number(curr.totalKg || 0), 0);
        const grandDeliveredValue = items.reduce((acc, curr) => acc + curr.itemTotalDeliveredValue, 0);
        const grandDeliveredWeight = items.reduce((acc, curr) => acc + curr.itemTotalDeliveredWeight, 0);
        const grandRemainingValue = Math.max(0, grandContractValue - grandDeliveredValue);
        const grandRemainingWeight = Math.max(0, grandContractWeight - grandDeliveredWeight);

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
                percentDelivered: grandContractValue > 0 ? (grandDeliveredValue / grandContractValue) * 100 : 0
            }
        };
    }, [currentSupplier, contractItems, displayedMonths, monthNfMap, warehouseLog, selectedYear]);

    // 5. Print Layout Generator (Identical to the user's Excel sheet)
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
            <th class="sub-col">Peso</th>
            <th class="sub-col">Valor Kg</th>
            <th class="sub-col">Valor</th>
        `).join('');

        const monthYellowTotals = displayedMonths.map(m => {
            const mTotals = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
            return `
                <td class="yellow-cell font-bold text-center">${mTotals.weight > 0 ? formatNumber(mTotals.weight, 0, 2) : ''}</td>
                <td class="yellow-cell text-center"></td>
                <td class="yellow-cell font-bold text-right">${mTotals.value > 0 ? formatCurrency(mTotals.value) : ''}</td>
            `;
        }).join('');

        const itemRows = matrixData.items.map(it => {
            const monthCells = displayedMonths.map(m => {
                const cell = it.monthsValues[m.key] || { weight: 0, valPerKg: it.valPerKg, totalVal: 0 };
                return `
                    <td class="text-center font-bold">${cell.weight > 0 ? formatNumber(cell.weight, 0, 2) : ''}</td>
                    <td class="text-center font-mono text-muted">${cell.weight > 0 ? formatCurrency(cell.valPerKg) : ''}</td>
                    <td class="text-right font-bold font-mono">${cell.totalVal > 0 ? formatCurrency(cell.totalVal) : (cell.weight > 0 ? 'R$ 0,00' : '')}</td>
                `;
            }).join('');

            return `
                <tr>
                    <td class="item-name-cell">${it.name}</td>
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
                    @page {
                        size: landscape;
                        margin: 6mm;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        font-size: 8.5pt;
                        color: #000;
                        background: #fff;
                        margin: 0;
                        padding: 10px;
                    }
                    .table-container {
                        width: 100%;
                        overflow: visible;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        border: 2px solid #000;
                        font-size: 8pt;
                    }
                    th, td {
                        border: 1px solid #000;
                        padding: 3px 4px;
                        vertical-align: middle;
                    }
                    .supplier-title-cell {
                        background-color: #FFFF00;
                        font-weight: 900;
                        font-size: 10pt;
                        text-align: center;
                        text-transform: uppercase;
                        padding: 6px;
                    }
                    .month-header {
                        background-color: #f8fafc;
                        text-align: center;
                        font-weight: 800;
                        border-bottom: 2px solid #000;
                    }
                    .month-title {
                        font-size: 9pt;
                        font-weight: 900;
                    }
                    .month-nf {
                        font-size: 7.5pt;
                        color: #1e293b;
                        font-weight: bold;
                    }
                    .sub-col {
                        background-color: #f1f5f9;
                        font-size: 7pt;
                        font-weight: 700;
                        text-align: center;
                        text-transform: uppercase;
                    }
                    .yellow-cell {
                        background-color: #FFFF00 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .cyan-cell {
                        background-color: #B2EBF2 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .green-accent {
                        background-color: #E8F5E9 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .item-name-cell {
                        background-color: #E8F5E9;
                        font-weight: 800;
                        text-align: left;
                        white-space: nowrap;
                        padding-left: 6px;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .text-left { text-align: left; }
                    .font-bold { font-weight: bold; }
                    .font-mono { font-family: "Courier New", Courier, monospace; }
                    .text-muted { color: #475569; }
                    
                    .summary-box {
                        margin-top: 15px;
                        display: flex;
                        justify-content: flex-end;
                    }
                    .summary-table {
                        width: 320px;
                        border: 2px solid #000;
                        border-collapse: collapse;
                    }
                    .summary-table td {
                        padding: 4px 8px;
                        border: 1px solid #000;
                    }
                </style>
            </head>
            <body>
                <div style="margin-bottom: 8px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h2 style="margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: 900;">Acompanhamento de Notas Fiscais e Dedução Contratual</h2>
                        <p style="margin: 2px 0 0 0; font-size: 8pt; color: #334155;">Fornecedor: <strong>${currentSupplier.name}</strong> | CPF/CNPJ: <strong>${currentSupplier.cpf}</strong> | Ano Base: <strong>${selectedYear}</strong></p>
                    </div>
                    <div style="text-align: right; font-size: 8pt;">
                        <span>Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
                    </div>
                </div>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th rowspan="2" class="supplier-title-cell">${currentSupplier.name}</th>
                                ${monthsHeaders}
                                <th rowspan="2" class="cyan-cell text-center font-bold" style="width: 80px;">Total de Valores</th>
                                <th rowspan="2" class="cyan-cell text-center font-bold" style="width: 70px;">Total dos Peso</th>
                                <th rowspan="2" class="yellow-cell text-center font-bold" style="width: 80px;">Falta entregar Valor</th>
                                <th rowspan="2" class="yellow-cell text-center font-bold" style="width: 70px;">Falta entregar Peso</th>
                                <th colspan="2" class="text-center font-bold" style="background-color: #f8fafc;">Total contrato</th>
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
                                <td class="text-center font-bold" style="background-color: #f8fafc;">Total peso</td>
                                <td class="text-center font-bold font-mono">${formatNumber(matrixData.grandTotals.contractWeight, 2, 2)}</td>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemRows}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="${1 + (displayedMonths.length * 3) + 4}" style="border: none;"></td>
                                <td class="font-bold" style="background-color: #f8fafc;">Restante valor</td>
                                <td class="font-bold font-mono text-right">${formatCurrency(matrixData.grandTotals.remainingValue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // 6. Export to CSV
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
                    cell.weight.toFixed(2).replace('.', ','),
                    cell.valPerKg.toFixed(2).replace('.', ','),
                    cell.totalVal.toFixed(2).replace('.', ',')
                ];
            }),
            it.itemTotalDeliveredValue.toFixed(2).replace('.', ','),
            it.totalContractKg.toFixed(2).replace('.', ','),
            it.remainingValue.toFixed(2).replace('.', ','),
            it.remainingWeight.toFixed(2).replace('.', ',')
        ]);

        const csvContent = '\uFEFF' + [
            headers.join(';'),
            ...rows.map(r => r.join(';'))
        ].join('\r\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `Deducao_NFs_${currentSupplier.name.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedYear}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Planilha CSV exportada com sucesso!');
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-800 pb-12">
            
            {/* TOP BAR / SUPPLIER SELECTOR & CONTROLS */}
            <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-3.5">
                        <div className="bg-amber-500 text-white p-3 rounded-2xl shadow-md">
                            <Layers className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">
                                    Mapa de Dedução de Notas Fiscais
                                </h2>
                                <span className="bg-amber-100 text-amber-900 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border border-amber-200">
                                    Subtração Contratual
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                                Adicione os números das notas fiscais por mês para carregar os itens correspondentes e calcular automaticamente os saldos do contrato.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                        <button
                            onClick={() => autoDetectNfs(currentSupplier)}
                            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                            title="Buscar automaticamente as NFs registradas nas entradas do almoxarifado"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                            Auto-Detectar NFs
                        </button>

                        <button
                            onClick={handleExportCSV}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl px-3.5 py-2 text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shadow-sm"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Exportar CSV
                        </button>

                        <button
                            onClick={handlePrintTable}
                            className="bg-zinc-900 hover:bg-black text-white rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shadow-md"
                        >
                            <Printer className="h-3.5 w-3.5 text-amber-400" />
                            Imprimir Tabela (PDF)
                        </button>
                    </div>
                </div>

                {/* Filters & Supplier Picker */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
                    
                    {/* Select Supplier */}
                    <div className="md:col-span-2 space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-amber-600" />
                            Selecionar Produtor / Fornecedor:
                        </label>
                        <div className="relative">
                            <select
                                value={currentSupplier?.cpf || ''}
                                onChange={(e) => setSelectedSupplierCpf(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all cursor-pointer appearance-none"
                            >
                                {allSuppliers.map(s => (
                                    <option key={s.cpf} value={s.cpf}>
                                        {s.name} ({s.cpf}) - {ensureArray(s.contractItems).length} Itens Contratados
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Period View */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                            Meses de Exibição:
                        </label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            <button
                                onClick={() => setPeriodRange('may_to_dec')}
                                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                    periodRange === 'may_to_dec'
                                        ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Maio a Dez (2º/3º Quad)
                            </button>
                            <button
                                onClick={() => setPeriodRange('all_year')}
                                className={`flex-1 py-1.5 px-3 rounded-xl text-[11px] font-black uppercase transition-all ${
                                    periodRange === 'all_year'
                                        ? 'bg-white text-indigo-900 shadow-sm border border-slate-200/50'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                Ano Completo (12M)
                            </button>
                        </div>
                    </div>

                    {/* Base Year */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                            Ano de Referência:
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-300 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:border-indigo-500 outline-none"
                        >
                            <option value={2026}>Exercício 2026</option>
                            <option value={2025}>Exercício 2025</option>
                            <option value={2027}>Exercício 2027</option>
                        </select>
                    </div>
                </div>

                {/* Quick Info Bar for Selected Supplier */}
                {currentSupplier && (
                    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm uppercase shadow-sm">
                                {currentSupplier.name.substring(0, 2)}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{currentSupplier.name}</h3>
                                <p className="text-[11px] text-slate-500 font-medium">
                                    CPF/CNPJ: <span className="font-mono font-bold text-slate-700">{currentSupplier.cpf}</span>
                                    {currentSupplier.processNumber && <span> | Processo: <strong className="font-mono text-slate-700">{currentSupplier.processNumber}</strong></span>}
                                </p>
                            </div>
                        </div>

                        {/* Top Highlights Summary Cards */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-center">
                                <span className="text-[9px] font-black uppercase text-slate-400 block">Total Contrato</span>
                                <span className="text-xs font-black text-slate-900 font-mono">{formatCurrency(matrixData.grandTotals.contractValue)}</span>
                            </div>
                            <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-sm text-center">
                                <span className="text-[9px] font-black uppercase text-slate-400 block">Total Entregue</span>
                                <span className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(matrixData.grandTotals.deliveredValue)}</span>
                            </div>
                            <div className="bg-amber-400/20 px-3.5 py-1.5 rounded-xl border border-amber-300 shadow-sm text-center">
                                <span className="text-[9px] font-black uppercase text-amber-900 block">Restante Valor</span>
                                <span className="text-xs font-black text-amber-950 font-mono">{formatCurrency(matrixData.grandTotals.remainingValue)}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MAIN EXCEL-STYLE DEDUCTION TABLE */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* NF Input Control Bar for each month */}
                <div className="p-4 bg-slate-50 border-b border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-amber-600" />
                            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                                Vincular / Definir Notas Fiscais dos Meses:
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal italic hidden sm:inline">
                                (Digite o número da NF para que o sistema puxe os lançamentos daquela nota)
                            </span>
                        </div>
                        <button
                            onClick={handleResetNfs}
                            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer"
                            title="Restaurar identificação automática de notas fiscais"
                        >
                            <RefreshCw className="h-3 w-3 text-slate-500" />
                            Redefinir Auto-Detecção
                        </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2">
                        {displayedMonths.map(m => (
                            <div key={m.key} className="bg-white p-2 rounded-xl border border-slate-200 shadow-xs space-y-1">
                                <span className="text-[10px] font-black uppercase text-slate-500 block truncate">{m.name}</span>
                                <div className="relative">
                                    <input 
                                        type="text"
                                        list="supplier-nfs-datalist"
                                        placeholder="Ex: 116"
                                        value={monthNfMap[m.key] || ''}
                                        onChange={(e) => handleNfChange(m.key, e.target.value)}
                                        className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 text-center font-mono outline-none focus:ring-2 focus:ring-amber-400 transition-all"
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
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            {/* Row 1: Supplier Name on left, Month Names in center, Right side summary */}
                            <tr className="border-b border-slate-300">
                                <th 
                                    rowSpan={2} 
                                    className="p-3.5 bg-yellow-300 text-slate-950 font-black text-xs uppercase tracking-tight border-r-2 border-slate-400 sticky left-0 z-20 shadow-xs min-w-[220px]"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span>{currentSupplier?.name || 'Fornecedor'}</span>
                                    </div>
                                </th>

                                {displayedMonths.map(m => (
                                    <th 
                                        key={m.key} 
                                        colSpan={3} 
                                        className="p-2 text-center bg-slate-100 text-slate-900 border-r border-slate-300 border-b border-slate-300"
                                    >
                                        <div className="text-[11px] font-black uppercase tracking-tight">{m.name}</div>
                                        <div className="text-[10px] font-bold text-amber-700 font-mono mt-0.5">
                                            {monthNfMap[m.key] ? `NF - ${monthNfMap[m.key]}` : <span className="text-slate-400 italic">Sem NF</span>}
                                        </div>
                                    </th>
                                ))}

                                <th rowSpan={2} className="p-3 text-center bg-cyan-100 text-cyan-950 font-black text-[11px] uppercase border-r border-slate-300 min-w-[100px]">
                                    Total de Valores
                                </th>
                                <th rowSpan={2} className="p-3 text-center bg-cyan-100 text-cyan-950 font-black text-[11px] uppercase border-r border-slate-300 min-w-[90px]">
                                    Total dos Peso
                                </th>
                                <th rowSpan={2} className="p-3 text-center bg-yellow-300 text-yellow-950 font-black text-[11px] uppercase border-r border-slate-300 min-w-[100px]">
                                    Falta entregar Valor
                                </th>
                                <th rowSpan={2} className="p-3 text-center bg-yellow-300 text-yellow-950 font-black text-[11px] uppercase border-r border-slate-300 min-w-[90px]">
                                    Falta entregar Peso
                                </th>

                                <th colSpan={2} className="p-2 text-center bg-slate-200 text-slate-900 font-black text-[11px] uppercase border-b border-slate-300 min-w-[130px]">
                                    Total Contrato
                                </th>
                            </tr>

                            {/* Row 2: Sub-columns for Peso, Valor Kg, Valor under each month, and Total Contrato Value */}
                            <tr className="border-b border-slate-300 bg-slate-50 text-[9px] font-black uppercase text-slate-600">
                                {displayedMonths.map(m => (
                                    <React.Fragment key={m.key}>
                                        <th className="p-1.5 text-center border-r border-slate-200 bg-slate-100/70 w-16">Peso</th>
                                        <th className="p-1.5 text-center border-r border-slate-200 bg-slate-100/70 w-16">Valor Kg</th>
                                        <th className="p-1.5 text-center border-r border-slate-300 bg-slate-100/70 w-20">Valor</th>
                                    </React.Fragment>
                                ))}

                                <th colSpan={2} className="p-2 text-center bg-white text-slate-900 font-black font-mono text-xs border-r border-slate-300">
                                    {formatCurrency(matrixData.grandTotals.contractValue)}
                                </th>
                            </tr>

                            {/* Row 3: Subtotal Amarelo de cada Mês (Top Subtotal Row identical to Excel image) */}
                            <tr className="bg-yellow-300 text-slate-950 font-bold border-b-2 border-slate-400 text-xs">
                                <td className="p-2.5 font-black uppercase tracking-tight sticky left-0 bg-yellow-300 z-20 border-r-2 border-slate-400">
                                    Subtotal Entregas / NFs
                                </td>

                                {displayedMonths.map(m => {
                                    const mTotals = matrixData.monthTotals[m.key] || { weight: 0, value: 0 };
                                    return (
                                        <React.Fragment key={m.key}>
                                            <td className="p-1.5 text-center font-black border-r border-yellow-400 font-mono">
                                                {mTotals.weight > 0 ? formatNumber(mTotals.weight, 0, 2) : '-'}
                                            </td>
                                            <td className="p-1.5 text-center border-r border-yellow-400 font-mono text-[10px] text-yellow-900">
                                                -
                                            </td>
                                            <td className="p-1.5 text-right font-black border-r border-slate-400 font-mono">
                                                {mTotals.value > 0 ? formatCurrency(mTotals.value) : '-'}
                                            </td>
                                        </React.Fragment>
                                    );
                                })}

                                {/* Right Summaries for Totals Row */}
                                <td className="p-2 text-right font-black font-mono bg-cyan-200 text-cyan-950 border-r border-slate-300">
                                    {formatCurrency(matrixData.grandTotals.deliveredValue)}
                                </td>
                                <td className="p-2 text-center font-black font-mono bg-cyan-200 text-cyan-950 border-r border-slate-300">
                                    {formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)}
                                </td>
                                <td className="p-2 text-right font-black font-mono bg-yellow-400 text-yellow-950 border-r border-slate-300">
                                    {formatCurrency(matrixData.grandTotals.remainingValue)}
                                </td>
                                <td className="p-2 text-center font-black font-mono bg-yellow-400 text-yellow-950 border-r border-slate-300">
                                    {formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)}
                                </td>

                                {/* Total Peso do Contrato */}
                                <td className="p-2 text-center font-bold uppercase text-[10px] bg-slate-100">
                                    Total Peso
                                </td>
                                <td className="p-2 text-center font-black font-mono text-xs bg-slate-100">
                                    {formatNumber(matrixData.grandTotals.contractWeight, 2, 2)}
                                </td>
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 text-xs">
                            {matrixData.items.length === 0 ? (
                                <tr>
                                    <td colSpan={1 + (displayedMonths.length * 3) + 6} className="p-12 text-center text-slate-400 font-bold italic">
                                        Nenhum item contratado encontrado para este fornecedor.
                                    </td>
                                </tr>
                            ) : (
                                matrixData.items.map((it, idx) => (
                                    <tr key={it.name + idx} className="hover:bg-slate-50 transition-colors">
                                        
                                        {/* Item Name (Green highlight) */}
                                        <td className="p-2.5 font-black text-slate-900 bg-emerald-50/70 border-r-2 border-slate-300 sticky left-0 z-10 whitespace-nowrap">
                                            <div className="flex items-center justify-between gap-2">
                                                <span>{it.name}</span>
                                                <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                                                    {it.unit}
                                                </span>
                                            </div>
                                        </td>

                                        {/* Month Values */}
                                        {displayedMonths.map(m => {
                                            const cell = it.monthsValues[m.key] || { weight: 0, valPerKg: it.valPerKg, totalVal: 0 };
                                            return (
                                                <React.Fragment key={m.key}>
                                                    {/* Peso */}
                                                    <td className={`p-1.5 text-center font-bold border-r border-slate-200 font-mono ${cell.weight > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {cell.weight > 0 ? formatNumber(cell.weight, 0, 2) : ''}
                                                    </td>

                                                    {/* Valor Kg */}
                                                    <td className={`p-1.5 text-center font-mono text-[10px] border-r border-slate-200 ${cell.weight > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                                        {cell.weight > 0 ? formatCurrency(cell.valPerKg) : ''}
                                                    </td>

                                                    {/* Valor Total */}
                                                    <td className={`p-1.5 text-right font-bold font-mono border-r border-slate-300 ${cell.totalVal > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                                        {cell.totalVal > 0 ? formatCurrency(cell.totalVal) : (cell.weight > 0 ? 'R$ 0,00' : '')}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Total de Valores (Entregues) */}
                                        <td className="p-2 text-right font-black font-mono bg-cyan-50/60 text-slate-900 border-r border-slate-200">
                                            {formatCurrency(it.itemTotalDeliveredValue)}
                                        </td>

                                        {/* Total dos Peso (Contratado) */}
                                        <td className="p-2 text-center font-black font-mono bg-cyan-50/60 text-slate-900 border-r border-slate-200">
                                            {formatNumber(it.totalContractKg, 2, 2)}
                                        </td>

                                        {/* Falta entregar Valor */}
                                        <td className={`p-2 text-right font-black font-mono border-r border-slate-200 ${it.remainingValue <= 0 ? 'text-emerald-600 bg-emerald-50/40' : 'text-amber-900 bg-yellow-50/60'}`}>
                                            {formatCurrency(it.remainingValue)}
                                        </td>

                                        {/* Falta entregar Peso */}
                                        <td className={`p-2 text-center font-black font-mono border-r border-slate-200 ${it.remainingWeight <= 0 ? 'text-emerald-600 bg-emerald-50/40' : 'text-amber-900 bg-yellow-50/60'}`}>
                                            {formatNumber(it.remainingWeight, 2, 2)}
                                        </td>

                                        {/* Empty or Row-Level side notes */}
                                        <td colSpan={2} className="p-2 bg-slate-50/50 text-center text-slate-400 text-[10px]">
                                            {it.remainingWeight <= 0 ? (
                                                <span className="text-emerald-700 font-bold flex items-center justify-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Concluído
                                                </span>
                                            ) : (
                                                <span>{((it.itemTotalDeliveredWeight / (it.totalContractKg || 1)) * 100).toFixed(0)}% executado</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>

                        {/* Footer with Contract Remaining Balance Summary */}
                        <tfoot>
                            <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-900">
                                <td className="p-3 font-black uppercase text-xs sticky left-0 bg-slate-900 z-10">
                                    Resumo Geral do Fornecedor
                                </td>

                                <td colSpan={displayedMonths.length * 3} className="p-3 text-slate-400 text-xs">
                                    Total de {matrixData.items.length} itens contratados | {displayedMonths.length} meses apurados
                                </td>

                                <td className="p-3 text-right font-black font-mono text-cyan-300">
                                    {formatCurrency(matrixData.grandTotals.deliveredValue)}
                                </td>
                                <td className="p-3 text-center font-black font-mono text-cyan-300">
                                    {formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)}
                                </td>
                                <td className="p-3 text-right font-black font-mono text-amber-300">
                                    {formatCurrency(matrixData.grandTotals.remainingValue)}
                                </td>
                                <td className="p-3 text-center font-black font-mono text-amber-300">
                                    {formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)}
                                </td>

                                <td className="p-3 text-center font-bold uppercase text-[10px] bg-slate-950 text-slate-300">
                                    Restante Valor
                                </td>
                                <td className="p-3 text-right font-black font-mono text-amber-400 bg-slate-950">
                                    {formatCurrency(matrixData.grandTotals.remainingValue)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* BOTTOM SUMMARY STATS CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Valor Contratado Total</span>
                        <FileText className="h-4 w-4 text-indigo-500" />
                    </div>
                    <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.contractValue)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Peso total: <strong>{formatNumber(matrixData.grandTotals.contractWeight, 2, 2)} Kg</strong>
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Total Já Entregue (NFs)</span>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.deliveredValue)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Peso entregue: <strong>{formatNumber(matrixData.grandTotals.deliveredWeight, 2, 2)} Kg</strong>
                    </p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                    <div className="flex items-center justify-between text-slate-400">
                        <span className="text-[10px] font-black uppercase tracking-wider">Saldo Restante a Entregar</span>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </div>
                    <p className="text-2xl font-black text-amber-600 font-mono tracking-tight">
                        {formatCurrency(matrixData.grandTotals.remainingValue)}
                    </p>
                    <p className="text-[11px] text-slate-500 font-medium">
                        Peso restante: <strong>{formatNumber(matrixData.grandTotals.remainingWeight, 2, 2)} Kg</strong>
                    </p>
                </div>

                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-5 rounded-3xl shadow-md space-y-3">
                    <div className="flex items-center justify-between text-indigo-200">
                        <span className="text-[10px] font-black uppercase tracking-wider">Execução do Contrato</span>
                        <TrendingUp className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-3xl font-black font-mono tracking-tight text-amber-400">
                                {matrixData.grandTotals.percentDelivered.toFixed(1)}%
                            </span>
                            <span className="text-xs text-indigo-200 font-bold">
                                {matrixData.grandTotals.contractValue > 0 ? (matrixData.grandTotals.deliveredValue >= matrixData.grandTotals.contractValue ? '100% Concluído' : 'Em Execução') : '0%'}
                            </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-amber-400 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, matrixData.grandTotals.percentDelivered)}%` }}
                            />
                        </div>
                    </div>
                    <p className="text-[10px] text-slate-300">
                        Cálculo baseado nas entregas vinculadas por NF no período de {displayedMonths[0]?.name} a {displayedMonths[displayedMonths.length - 1]?.name}.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminInvoiceDeductionMap;
