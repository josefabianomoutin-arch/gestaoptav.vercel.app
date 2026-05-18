
import React, { useState, useMemo, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer, Plus, Trash2, FileText, Barcode as BarcodeIcon, FileIcon, Eye, Search } from 'lucide-react';
import { HOLIDAYS_2026 } from '../constants';
import type { Supplier, WarehouseMovement, ThirdPartyEntryLog, AcquisitionItem, PublicInfo, StandardMenu, DailyMenus, Delivery } from '../types';
import AdminInvoices from './AdminInvoices';
import AgendaChegadas from './AgendaChegadas';
import WarehouseMovementForm from './WarehouseMovementForm';
import AdminWarehouseLog from './AdminWarehouseLog';
import ValidityAnalysisPanel from './ValidityAnalysisPanel';
import SynchronizationModule from './SynchronizationModule';
import AdminStandardMenu from './AdminStandardMenu';
import { getWeekNumber } from '../lib/supplierUtils';
import { ensureArray } from '../lib/utils';

interface AlmoxarifadoDashboardProps {
    suppliers: Supplier[];
    warehouseLog: WarehouseMovement[];
    onLogout: () => void;
    onRegisterEntry: (payload: any) => Promise<{ success: boolean; message: string }>;
    onRegisterWithdrawal: (payload: any) => Promise<{ success: boolean; message: string }>;
    onResetExits: () => Promise<{ success: boolean; message: string }>;
    onReopenInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
    onDeleteInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<any>;
    onDeleteDelivery: (supplierCpf: string, deliveryId: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateDelivery: (supplierCpf: string, deliveryId: string, updates: Partial<Delivery>) => Promise<{ success: boolean; message?: string }>;
    onSaveInvoice: (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => Promise<void>;
    onUpdateInvoiceItems: (supplierCpf: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
    onMarkInvoiceAsOpened: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
    onManualInvoiceEntry: (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, type?: 'entrada' | 'saída') => Promise<{ success: boolean; message?: string }>;
    onDeleteWarehouseEntry?: (logEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onUpdateWarehouseEntry?: (updatedEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    thirdPartyEntries: ThirdPartyEntryLog[];
    perCapitaConfig?: any;
    acquisitionItems?: AcquisitionItem[];
    publicInfoList: PublicInfo[];
    onRegisterThirdPartyEntry: (log: Omit<ThirdPartyEntryLog, 'id'>) => Promise<{ success: boolean; message: string }>;
    onUpdateThirdPartyEntry: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message: string }>;
    onDeleteThirdPartyEntry: (id: string) => Promise<void>;
    standardMenu: StandardMenu;
    dailyMenus: DailyMenus;
    onUpdateStandardMenu: (menu: StandardMenu) => Promise<void | { success: boolean; message: string }>;
    onUpdateDailyMenu: (menus: DailyMenus) => Promise<void | { success: boolean; message: string }>;
    [key: string]: any;
}

const Barcode: React.FC<{ value: string }> = ({ value }) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (svgRef.current && value) {
            try {
                JsBarcode(svgRef.current, value, {
                    format: "CODE128",
                    width: 1.5,
                    height: 30,
                    displayValue: true,
                    fontSize: 12,
                    margin: 0
                });
            } catch (e) {
                console.error("Barcode generation error:", e);
            }
        }
    }, [value]);

    return <svg ref={svgRef}></svg>;
};

const MONTHS_PT = [
    'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 
    'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

const YEARS = [2025, 2026, 2027];

const getFirstBusinessDayOfMonth = (monthIndex: number, year: number) => {
    const date = new Date(year, monthIndex, 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    return date;
};

const AlmoxarifadoDashboard: React.FC<AlmoxarifadoDashboardProps> = ({ 
    suppliers, 
    warehouseLog, 
    onLogout, 
    onRegisterEntry,
    onRegisterWithdrawal, 
    onReopenInvoice,
    onDeleteInvoice,
    onDeleteDelivery,
    onUpdateDelivery,
    onSaveInvoice,
    onUpdateInvoiceItems,
    onUpdateInvoiceUrl,
    onManualInvoiceEntry,
    onMarkInvoiceAsOpened,
    onDeleteWarehouseEntry,
    onUpdateWarehouseEntry,
    thirdPartyEntries,
    perCapitaConfig,
    acquisitionItems = [],
    standardMenu,
    dailyMenus,
    onUpdateDailyMenu
}) => {
    const [activeTab, setActiveTab] = useState<string>('history');
    const [receiptSupplierCpf, setReceiptSupplierCpf] = useState('');
    const [receiptInvoice, setReceiptInvoice] = useState('');
    const [receiptProcessoSei, setReceiptProcessoSei] = useState('');
    
    // Manual Receipt State
    const [manualReceipt, setManualReceipt] = useState<any>({
        supplierName: '',
        supplierCpf: '',
        processoSei: '',
        invoiceNumber: '',
        receiptTermNumber: '',
        invoiceDate: '',
        receiptDate: '',
        barcode: '',
        items: [{ name: '', quantity: 0, unit: 'UN', totalValue: 0 }]
    });
    
    // New states for month filtering and Cronograma
    const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS_PT[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [cronogramaType, setCronogramaType] = useState<'PPAIS' | 'ESTOCÁVEIS' | 'PERECÍVEIS'>('PPAIS');
    const [selectedCronogramaSupplier, setSelectedCronogramaSupplier] = useState('');
    const [invoiceSearch, setInvoiceSearch] = useState('');



    const imageDeliveries = useMemo(() => {
        try {
            const deliveries: any[] = [];
            const seenUrls = new Set<string>();
            
            ensureArray(suppliers).forEach(s => {
                if (!s) return;
                const supplierDeliveries = ensureArray(s.deliveries);
                supplierDeliveries.forEach((d: any) => {
                    if (d && d.invoiceUrl && !seenUrls.has(d.invoiceUrl)) {
                        seenUrls.add(d.invoiceUrl);
                        let finalTimestamp = d.timestamp;
                        if (!finalTimestamp && d.date) {
                            const parsedDate = new Date(d.date + 'T12:00:00');
                            finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                        } else if (!finalTimestamp) {
                            finalTimestamp = 0;
                        }

                        deliveries.push({
                            id: d.id || `del-${crypto.randomUUID().substring(0, 8)}`,
                            invoiceUrl: d.invoiceUrl,
                            date: d.invoiceDate || d.date,
                            timestamp: finalTimestamp,
                            type: 'entrada',
                            supplierName: s.name || 'Desconhecido',
                            supplierCpf: s.cpf || '',
                            itemName: d.item || 'Item s/ nome',
                            quantity: Number(d.kg || d.quantity) || 0,
                            inboundInvoice: d.invoiceNumber,
                            receiptTermNumber: d.receiptTermNumber,
                            nl: d.nl,
                            pd: d.pd,
                            lotNumber: d.lotNumber,
                            expirationDate: d.expirationDate,
                        });
                    }
                });
            });

            if (perCapitaConfig) {
                const pcLists = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
                pcLists.forEach(listKey => {
                    ensureArray(perCapitaConfig[listKey]).forEach((p: any) => {
                        if (!p) return;
                        ensureArray(p.deliveries).forEach((d: any) => {
                            if (d && d.invoiceUrl && !seenUrls.has(d.invoiceUrl)) {
                                seenUrls.add(d.invoiceUrl);
                                let finalTimestamp = d.timestamp;
                                if (!finalTimestamp && d.date) {
                                    const parsedDate = new Date(d.date + 'T12:00:00');
                                    finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                                }
                                deliveries.push({
                                    id: d.id || `del-pc-${crypto.randomUUID().substring(0, 8)}`,
                                    invoiceUrl: d.invoiceUrl,
                                    date: d.invoiceDate || d.date,
                                    timestamp: finalTimestamp || 0,
                                    type: 'entrada',
                                    supplierName: p.name || 'Desconhecido',
                                    supplierCpf: p.cpfCnpj || p.cpf || '',
                                    itemName: d.item || 'Item s/ nome',
                                    quantity: Number(d.kg || d.quantity) || 0,
                                    inboundInvoice: d.invoiceNumber,
                                    receiptTermNumber: d.receiptTermNumber,
                                    pd: d.pd,
                                    lotNumber: d.lotNumber,
                                    expirationDate: d.expirationDate,
                                });
                            }
                        });
                    });
                });
            }

            (warehouseLog || []).forEach(l => {
                if (l && l.invoiceUrl && !seenUrls.has(l.invoiceUrl)) {
                    seenUrls.add(l.invoiceUrl);
                    let finalTimestamp = l.timestamp ? new Date(l.timestamp).getTime() : 0;
                    if ((!finalTimestamp || isNaN(finalTimestamp)) && l.date) {
                        const parsedDate = new Date(l.date + 'T12:00:00');
                        finalTimestamp = isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
                    } else if (!finalTimestamp || isNaN(finalTimestamp)) {
                        finalTimestamp = 0;
                    }

                    let foundSupplierName = l.supplierName && l.supplierName !== 'Desconhecido' ? l.supplierName : 'Desconhecido';
                    if (foundSupplierName === 'Desconhecido' && l.supplierCpf) {
                        const supplier = suppliers?.find(s => s.cpf === l.supplierCpf || s.cpfCnpj === l.supplierCpf);
                        if (supplier) {
                            foundSupplierName = supplier.name;
                        } else if (perCapitaConfig) {
                            const allPcSuppliers = [
                                ...(perCapitaConfig.ppaisProducers || []),
                                ...(perCapitaConfig.pereciveisSuppliers || []),
                                ...(perCapitaConfig.estocaveisSuppliers || [])
                            ];
                            const pcSupplier = allPcSuppliers.find(s => s.cpf === l.supplierCpf || s.cpfCnpj === l.supplierCpf);
                            if (pcSupplier) {
                                foundSupplierName = pcSupplier.name;
                            }
                        }
                    }

                    deliveries.push({
                        ...l,
                        supplierName: foundSupplierName,
                        itemName: l.itemName || l.item || 'Item s/ nome',
                        quantity: Number(l.quantity || l.kg || l.weight) || 0,
                        inboundInvoice: l.inboundInvoice || l.invoiceNumber,
                        nl: l.nlNumber || (l as any).nl,
                        pd: l.pdNumber || (l as any).pd,
                        timestamp: finalTimestamp,
                    });
                }
            });

            return deliveries;
        } catch (error) {
            console.error("Critical error in imageDeliveries memo:", error);
            return [];
        }
    }, [suppliers, warehouseLog, perCapitaConfig]);

    const availableImageMonths = useMemo(() => {
        const months = new Set<string>();
        imageDeliveries.forEach(log => {
            const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    months.add(`${d.getFullYear()}-${d.getMonth()}`);
                }
            }
        });

        return Array.from(months).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yB * 12 + mB) - (yA * 12 + mA);
        });
    }, [imageDeliveries]);

    const [activeImageMonth, setActiveImageMonth] = useState<string>(() => {
        const months = new Set<string>();
        imageDeliveries.forEach(log => {
            const dateStr = log.date || (typeof log.timestamp === 'number' ? new Date(log.timestamp).toISOString().split('T')[0] : (log.timestamp as any)?.split?.('T')?.[0]);
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    months.add(`${d.getFullYear()}-${d.getMonth()}`);
                }
            }
        });
        const sorted = Array.from(months).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yB * 12 + mB) - (yA * 12 + mA);
        });
        return sorted[0] || '';
    });

    useEffect(() => {
        if (!activeImageMonth && availableImageMonths.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setActiveImageMonth(availableImageMonths[0]);
        }
    }, [availableImageMonths, activeImageMonth]);

    const filteredImages = useMemo(() => {
        return imageDeliveries.filter(l => {
            if (!l.invoiceUrl) return false;
            
            // Apply month filter
            let monthMatch = true;
            if (activeImageMonth) {
                const dateStr = l.date || (typeof l.timestamp === 'number' ? new Date(l.timestamp).toISOString().split('T')[0] : (l.timestamp as any)?.split?.('T')?.[0]);
                if (dateStr) {
                    const d = new Date(dateStr + 'T00:00:00');
                    monthMatch = `${d.getFullYear()}-${d.getMonth()}` === activeImageMonth;
                } else {
                    monthMatch = false;
                }
            }

            // Apply search filter (supplierName, itemName, invoiceNumber)
            const searchLower = invoiceSearch.toLowerCase();
            const searchMatch = !invoiceSearch || 
                (l.supplierName || '').toLowerCase().includes(searchLower) ||
                (l.itemName || '').toLowerCase().includes(searchLower) ||
                (l.inboundInvoice || '').toLowerCase().includes(searchLower) ||
                (l.outboundInvoice || '').toLowerCase().includes(searchLower) ||
                (l.invoiceNumber || '').toLowerCase().includes(searchLower);

            return monthMatch && searchMatch;
        }).sort((a, b) => b.timestamp - a.timestamp);
    }, [imageDeliveries, activeImageMonth, invoiceSearch]);

    const handlePrintCronograma = () => {
        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        const firstBusinessDay = getFirstBusinessDayOfMonth(monthIndex, selectedYear);
        
        const SeiNumber = perCapitaConfig?.seiProcessNumbers?.[cronogramaType] || '';
        
        // Find supplier details in PC config
        const pcSupplier = ensureArray(perCapitaConfig?.ppaisProducers).find((p: any) => (p.cpfCnpj === selectedCronogramaSupplier || p.cpf === selectedCronogramaSupplier)) ||
                           ensureArray(perCapitaConfig?.pereciveisSuppliers).find((p: any) => (p.cpfCnpj === selectedCronogramaSupplier || p.cpf === selectedCronogramaSupplier)) ||
                           ensureArray(perCapitaConfig?.estocaveisSuppliers).find((p: any) => (p.cpfCnpj === selectedCronogramaSupplier || p.cpf === selectedCronogramaSupplier));

        // Always find the actual supplier with deliveries from the main suppliers prop
        const mainSupplier = ensureArray(suppliers).find(s => s.cpf === selectedCronogramaSupplier);
        
        if (!mainSupplier && !pcSupplier) {
            alert('Por favor, selecione um fornecedor.');
            return;
        }

        // Merge info: use pcSupplier for metadata, both for deliveries
        const supplier: any = {
            ...((pcSupplier as any) || {}),
            ...((mainSupplier as any) || {}),
            name: (pcSupplier as any)?.name || (mainSupplier as any)?.name || 'DESCONHECIDO',
            cpfCnpj: (pcSupplier as any)?.cpfCnpj || (mainSupplier as any)?.cpf || selectedCronogramaSupplier
        };

        const divisor = (monthIndex <= 3) ? 4 : 8;

        const itemsSource = supplier.contractItems || {};
        const supplierItems = ensureArray(itemsSource) as any[];

        const availableDatesList: string[] = [];
        const daysInMonthObj = new Date(selectedYear, monthIndex + 1, 0).getDate();
        const validWeeksForPC = supplier.monthlySchedule?.[selectedMonth.toLowerCase()];
        const allowedWeeksArray = supplier.allowedWeeks || [];

        for (let d = 1; d <= daysInMonthObj; d++) {
            const date = new Date(selectedYear, monthIndex, d);
            // Corrige fuso horário
            const dateStrRaw = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
            
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            const isHoliday = !!HOLIDAYS_2026[dateStrRaw];
            
            if (!isWeekend && !isHoliday) {
                if (validWeeksForPC && validWeeksForPC.length > 0) {
                    const wNum = getWeekNumber(new Date(dateStrRaw + 'T12:00:00'));
                    if (validWeeksForPC.includes(wNum)) {
                        availableDatesList.push(date.toLocaleDateString('pt-BR'));
                    }
                } else if (allowedWeeksArray.length > 0) {
                    const wNum = getWeekNumber(new Date(dateStrRaw + 'T12:00:00'));
                    if (allowedWeeksArray.includes(wNum)) {
                        availableDatesList.push(date.toLocaleDateString('pt-BR'));
                    }
                } else {
                    availableDatesList.push(date.toLocaleDateString('pt-BR'));
                }
            }
        }

        const datesScheduled = availableDatesList.length > 0 ? availableDatesList.join(', ') : 'NENHUM DIA DISPONÍVEL';

        const printItems = supplierItems.map(item => {
            const quota = (item.totalKg || 0) / divisor;
            return {
                item: item.name,
                totalKg: quota,
                datesScheduled: datesScheduled
            };
        }).sort((a, b) => a.item.localeCompare(b.item));

        const normalize = (s: string) => (s || '').trim().toUpperCase().replace(/\s+/g, ' ');
        const commitmentNumbers = [...new Set(printItems.map(d => {
            const normIt = normalize(d.item);
            const acqItem = acquisitionItems?.find(ai => normalize(ai.name) === normIt || normalize(ai.nickname) === normIt);
            if (acqItem?.commitmentNumber) return acqItem.commitmentNumber;
            const contractItem = supplierItems.find(ci => normalize(ci.name) === normIt);
            return contractItem?.commitmentNumber;
        }).filter(Boolean))];
        const commitmentStr = commitmentNumbers.length > 0 ? commitmentNumbers.join(' / ') : 'N/A';

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Romaneio - ${selectedMonth} de ${selectedYear}</title>
                <style>
                    @page { size: A4 portrait; margin: 15mm; }
                    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; }
                    .header-title { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    
                    .header-boxes { display: flex; gap: 10px; margin-bottom: 20px; }
                    .header-box { flex: 1; border: 1.5px solid #000; padding: 10px; border-radius: 4px; }
                    .box-row { margin-bottom: 4px; }
                    .label { font-weight: bold; text-transform: uppercase; }
                    
                    .intro-text { text-align: justify; margin-bottom: 20px; font-size: 9pt; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-transform: uppercase; }
                    th, td { border: 1.5px solid #000; padding: 6px; text-align: left; vertical-align: middle; }
                    th { font-weight: bold; text-transform: uppercase; background-color: #f2f2f2; text-align: center; }
                    
                    .footer-location { text-align: right; margin-top: 40px; font-weight: bold; }
                    .signature-section { margin-top: 80px; text-align: center; }
                    .signature-line { border-top: 1.5px solid #000; width: 300px; margin: 0 auto 5px auto; }
                    .signature-name { font-weight: bold; text-transform: uppercase; }
                    .signature-role { font-size: 9pt; }
                    
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-xs { font-size: 8pt; }
                </style>
            </head>
            <body>
                <div class="header-title">ROMANEIO - ${selectedMonth} DE ${selectedYear}</div>
                
                <div class="header-boxes">
                    <div class="header-box">
                        <div class="box-row"><span class="label">FORNECEDOR:</span> ${supplier.name.toUpperCase()}</div>
                        <div class="box-row"><span class="label">CPF/CNPJ:</span> ${supplier.cpfCnpj || supplier.cpf}</div>
                        <div class="box-row"><span class="label">ENDEREÇO:</span> ${supplier.address || 'N/A'}</div>
                    </div>
                    <div class="header-box">
                        <div class="box-row"><span class="label">PROCESSO SEI:</span> ${SeiNumber || 'N/A'}</div>
                        <div class="box-row"><span class="label">UNIDADE:</span> PENITENCIÁRIA DE TAIUVA</div>
                        <div class="box-row"><span class="label">PERÍODO:</span> ${selectedMonth} DE ${selectedYear}</div>
                        <div class="box-row"><span class="label">Nº EMPENHO:</span> ${commitmentStr}</div>
                    </div>
                </div>
                
                <div class="intro-text">
                    Solicitamos as devidas providências no sentido de fornecer a esta Unidade Prisional os itens relacionados abaixo, conforme especificações contratuais. As entregas deverão ser efetuadas no endereço mencionado, das 08:00 às 11:00 horas e das 13:00 às 16:00 horas, conforme estipulado neste romaneio.
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>ITEM</th>
                            <th style="width: 100px;">PESO DO MÊS (KG)</th>
                            <th>DIAS DISPONÍVEIS PARA AGENDAMENTO</th>
                            <th style="width: 120px;">PESO ENTREGUE</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${printItems.length > 0 ? printItems.map((itemGroup: any) => {
                            return `
                            <tr>
                                <td><strong>${itemGroup.item || itemGroup.itemName || ''}</strong></td>
                                <td class="text-center font-bold">${(itemGroup.totalKg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                                <td class="text-center text-xs">${itemGroup.datesScheduled}</td>
                                <td></td>
                            </tr>
                            `;
                        }).join('') : `
                            <tr>
                                <td colspan="4" class="text-center italic" style="padding: 20px;">Nenhum item contratual cadastrado para este fornecedor</td>
                            </tr>
                        `}
                        <tr class="font-bold uppercase" style="background-color: #f2f2f2;">
                            <td class="text-right">TOTAIS DO PERÍODO</td>
                            <td class="text-center">${printItems.reduce((acc: number, curr: any) => acc + (curr.totalKg || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                            <td colspan="2"></td>
                        </tr>
                    </tbody>
                </table>

                <div style="display: flex; justify-content: space-between; margin-top: 50px;">
                    <div style="text-align: center; flex: 1;">
                        <div style="border-top: 1.5px solid #000; width: 250px; margin: 0 auto 5px auto;"></div>
                        <div style="font-weight: bold; font-size: 8pt;">${supplier.name.toUpperCase()}</div>
                        <div style="font-size: 9pt;">Contratado</div>
                    </div>
                </div>

                <div class="footer-location">
                    Taiuva, ${firstBusinessDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                
                <div class="signature-section" style="margin-top: 50px;">
                    <div class="signature-line"></div>
                    <div class="signature-role">Responsável pelo Almoxarifado</div>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.print();
        }, 500);
    };

    /*
    const handlePrintScheduleReport = () => {
        const filteredDeliveries = weeklyDeliveries.filter(d => 
            d.type === 'FORNECEDOR' && selectedScheduleSuppliers.includes(d.supplierName)
        );

        if (filteredDeliveries.length === 0) {
            alert('Nenhum agendamento encontrado para os fornecedores selecionados.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o cronograma.');
            return;
        }

        const htmlContent = `
            <html>
            <head>
                <title>Cronograma de Entregas</title>
                <style>
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    @media print {
                        header, footer { display: none !important; }
                    }
                    body { 
                        font-family: 'Times New Roman', Times, serif; 
                        padding: 20mm; 
                        line-height: 1.5; 
                        color: #000; 
                        font-size: 12pt; 
                        margin: 0;
                    }
                    .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    .info-section { margin-bottom: 20px; }
                    .info-row { margin-bottom: 5px; }
                    .info-label { font-weight: bold; text-transform: uppercase; display: inline-block; width: 220px; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; }
                    .text-center { text-align: center; }
                    .footer-text { margin-top: 30px; text-align: justify; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    CRONOGRAMA DE ENTREGAS
                </div>

                <div class="info-section">
                    <div class="info-row"><span class="info-label">PROCESSO SEI Nº:</span> ${scheduleReportSeiNumber || 'N/A'}</div>
                    <div class="info-row"><span class="info-label">DATA DE EMISSÃO:</span> ${new Date().toLocaleDateString('pt-BR')}</div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>DATA</th>
                            <th>HORÁRIO</th>
                            <th>FORNECEDOR</th>
                            <th>ITEM AGENDADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredDeliveries.map(d => `
                            <tr>
                                <td class="text-center">${d.date.split('-').reverse().join('/')}</td>
                                <td class="text-center">${d.time}</td>
                                <td>${d.supplierName}</td>
                                <td>${d.itemName || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="footer-text">
                    <p>Cronograma gerado para conferência e acompanhamento das entregas de gêneros alimentícios.</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
            printWindow.print();
            // printWindow.close(); // Optional: keep open for review
        }, 500);
    };
    */



    const receiptSupplier = useMemo(() => {
        const main = ensureArray(suppliers).find(s => s && s.cpf === receiptSupplierCpf);
        if (!main) return null;
        
        return {
            ...main,
            deliveries: ensureArray(main.deliveries)
        };
    }, [suppliers, receiptSupplierCpf]);

    const supplierInvoices = useMemo(() => {
        if (!receiptSupplier) return [];
        const invoices = new Set<string>();
        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        
        const deliveries = (receiptSupplier.deliveries as any) || [];
        deliveries.forEach((d: any) => {
            if (!d || !d.invoiceNumber) return;
            const dateStr = d.invoiceDate || d.date;
            if (dateStr) {
                const deliveryDate = new Date(dateStr + 'T12:00:00');
                if (deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === selectedYear) {
                    invoices.add(d.invoiceNumber);
                }
            }
        });
        return Array.from(invoices).sort();
    }, [receiptSupplier, selectedMonth, selectedYear]);

    const receiptData = useMemo(() => {
        if (!receiptSupplier || !receiptInvoice) return null;
        
        const cleanTargetInvoice = String(receiptInvoice).trim().replace(/^0+/, '');
        
        // Obter itens da nota fiscal diretamente das entregas do fornecedor (Fonte Primária)
        const deliveriesData = receiptSupplier.deliveries || {};
        const deliveriesList = ensureArray(deliveriesData);
        const deliveries = (deliveriesList as any[]).filter(d => {
            if (!d) return false;
            const cleanDInv = String(d.invoiceNumber || '').trim().replace(/^0+/, '');
            return cleanDInv === cleanTargetInvoice;
        });

        if (deliveries.length === 0) return null;

        // Group items by name to avoid duplicates in the receipt term
        const groupedItemsMap = new Map<string, any>();

        deliveries.forEach(d => {
            if (!d) return;
            const itemName = d.item || 'N/A';
            const quantity = Number(d.kg || d.quantity || 0);
            
            // Tentar buscar o valor registrado no warehouseLog para este item específico
            const itemMovement = (warehouseLog || []).find(log => {
                if (!log) return false;
                const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
                const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
                const lInv = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
                
                return (lInbound === cleanTargetInvoice || lOutbound === cleanTargetInvoice || lInv === cleanTargetInvoice) &&
                       (log.item === itemName || log.itemName === itemName) &&
                       (String(log.supplierCpf || '').replace(/\D/g, '') === String(receiptSupplier.cpf || '').replace(/\D/g, ''));
            });

            const contractItemsData = receiptSupplier.contractItems || {};
            const contractItemsList = ensureArray(contractItemsData);
            const contractItem = (contractItemsList as any[]).find((ci: any) => ci && ci.name === itemName);
            const unitPrice = Number(itemMovement?.value || d.value || 0);
            
            let unit = 'Kg';
            if (contractItem?.unit) {
                const [unitType] = contractItem.unit.split('-');
                const unitMap: { [key: string]: string } = {
                    kg: 'Kg', un: 'Un', saco: 'Sc', balde: 'Bd', pacote: 'Pct', pote: 'Pt',
                    litro: 'L', l: 'L', caixa: 'Cx', embalagem: 'Emb', dz: 'Dz'
                };
                unit = unitMap[unitType] || 'Un';
            }

            if (groupedItemsMap.has(itemName)) {
                const existing = groupedItemsMap.get(itemName);
                existing.quantity += quantity;
                existing.totalValue += unitPrice;
            } else {
                groupedItemsMap.set(itemName, {
                    name: itemName,
                    quantity,
                    unit,
                    unitPrice,
                    totalValue: unitPrice,
                    category: contractItem?.category,
                    barcode: itemMovement?.barcode || d.barcode || ''
                });
            }
        });

        const items = Array.from(groupedItemsMap.values());

        const totalInvoiceValue = items.reduce((sum, it) => sum + it.totalValue, 0);
        const firstDelivery = deliveries[0];
        const invoiceDate = firstDelivery.invoiceDate || firstDelivery.date || '';
        const receiptDate = firstDelivery.date || '';
        const barcode = items.find(it => it.barcode)?.barcode || '';
        const receiptTermNumber = firstDelivery.receiptTermNumber || '';

        return {
            supplierName: receiptSupplier.name,
            supplierCpf: receiptSupplier.cpf,
            invoiceNumber: receiptInvoice,
            invoiceDate,
            receiptDate,
            totalInvoiceValue,
            items,
            barcode,
            receiptTermNumber,
            processoSei: receiptProcessoSei
        };
    }, [receiptSupplier, receiptInvoice, receiptProcessoSei, warehouseLog]);

    // Auto-fill SEI Number based on categories
    const handleInvoiceChange = (invoice: string) => {
        setReceiptInvoice(invoice);
        if (receiptSupplier && invoice && perCapitaConfig?.seiProcessNumbers) {
            const deliveries = ensureArray(receiptSupplier.deliveries).filter((d: any) => 
                d.invoiceNumber === invoice && d.item !== 'AGENDAMENTO PENDENTE'
            );
            
            const categories = new Set<string>();
            deliveries.forEach((d: any) => {
                const contractItem = ensureArray(receiptSupplier.contractItems).find((ci: any) => ci.name === d.item);
                if (contractItem?.category) {
                    categories.add(contractItem.category);
                }
            });

            const priorityList = ['ESTOCÁVEIS', 'PPAIS', 'PERECÍVEIS', 'ESTOCAVEIS', 'PERECIVEIS'];
            let autoSei = '';
            for (const cat of priorityList) {
                if (categories.has(cat) && perCapitaConfig.seiProcessNumbers[cat]) {
                    autoSei = perCapitaConfig.seiProcessNumbers[cat];
                    break;
                }
            }

            if (!autoSei) {
                // Tenta fallback baseado na lista de produtores/fornecedores per capita
                const isPpais = ensureArray(perCapitaConfig.ppaisProducers).some((p: any) => (p.cpfCnpj === receiptSupplier.cpf || p.cpf === receiptSupplier.cpf));
                const isPereciveis = ensureArray(perCapitaConfig.pereciveisSuppliers).some((p: any) => (p.cpfCnpj === receiptSupplier.cpf || p.cpf === receiptSupplier.cpf));
                const isEstocaveis = ensureArray(perCapitaConfig.estocaveisSuppliers).some((p: any) => (p.cpfCnpj === receiptSupplier.cpf || p.cpf === receiptSupplier.cpf));
                
                if (isPpais) autoSei = perCapitaConfig.seiProcessNumbers?.['PPAIS'] || '';
                else if (isPereciveis) autoSei = perCapitaConfig.seiProcessNumbers?.['PERECÍVEIS'] || perCapitaConfig.seiProcessNumbers?.['PERECIVEIS'] || '';
                else if (isEstocaveis) autoSei = perCapitaConfig.seiProcessNumbers?.['ESTOCÁVEIS'] || perCapitaConfig.seiProcessNumbers?.['ESTOCAVEIS'] || '';
            }

            if (!autoSei) {
                for (const cat of Array.from(categories)) {
                    if (perCapitaConfig.seiProcessNumbers[cat]) {
                        autoSei = perCapitaConfig.seiProcessNumbers[cat];
                        break;
                    }
                }
            }
            
            if (autoSei) {
                setReceiptProcessoSei(autoSei);
            }
        }
    };

    const handlePrintAllLabels = () => {
        if (!receiptData) return;
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Etiquetas - NF ${receiptData.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { size: 100mm 50mm; margin: 0; }
                    body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
                    .label-card {
                        width: 100mm; height: 50mm;
                        padding: 2mm 4mm; box-sizing: border-box;
                        display: flex; flex-direction: column;
                        border: 0.1mm solid #eee;
                        page-break-after: always;
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
                ${receiptData.items.map((item, idx) => `
                    <div class="label-card">
                        <h1>${item.name.split(' ').slice(0, 2).join(' ')}</h1>
                        <h2>${receiptData!.supplierName}</h2>
                        <div class="info">
                            <p><strong>LOTE:</strong> <span>${(receiptData as any).items[idx].lotNumber || 'UNICO'}</span></p>
                            <p><strong>VAL:</strong> <span>${item.expiration ? item.expiration.split('-').reverse().join('/') : 'N/A'}</span></p>
                            <p><strong>QUANT:</strong> <span>${(item.quantity || 0).toFixed(2)} ${item.unit || 'kg'}</span> / <strong>DOC:</strong> <span>${receiptData!.invoiceNumber}</span></p>
                            <p><strong>PROCESSO:</strong> <span>${receiptData!.processoSei || 'N/A'}</span></p>
                        </div>
                        <div class="barcode-container">
                            <svg id="barcode-${idx}" class="barcode-svg"></svg>
                        </div>
                    </div>
                `).join('')}
                <script>
                    window.onload = function() {
                        try {
                            ${receiptData.items.map((item, idx) => `
                                JsBarcode("#barcode-${idx}", "${(receiptData as any).items[idx].barcode || 'N/A'}", {
                                    format: "CODE128", width: 1.2, height: 40, displayValue: true, margin: 0
                                });
                            `).join('')}
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

    const handlePrintReceipt = () => {
        if (!receiptData) return;
        
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        const formatDate = (dateStr: string) => (dateStr || '').split('-').reverse().join('/') || 'N/A';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o termo.');
            return;
        }

        const htmlContent = `
            <html>
            <head>
                <title>Termo de Recebimento - NF ${receiptData.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    @media print {
                        header, footer { display: none !important; }
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        padding: 0; 
                        margin: 0;
                        background: white;
                    }
                    .page {
                        width: 210mm;
                        min-height: 297mm;
                        padding: 15mm;
                        margin: 0 auto;
                        box-sizing: border-box;
                        background: white;
                    }
                    .header { 
                        text-align: center; 
                        font-weight: bold; 
                        text-transform: uppercase; 
                        margin-bottom: 25px; 
                        border-bottom: 2px solid #000; 
                        padding-bottom: 15px;
                        font-size: 13pt;
                    }
                    .info-section { margin-bottom: 20px; font-size: 11pt; }
                    .info-row { margin-bottom: 8px; display: flex; align-items: flex-start; }
                    .info-label { font-weight: bold; text-transform: uppercase; width: 200px; flex-shrink: 0; }
                    .info-value { flex: 1; }
                    
                    .barcode-row { margin-top: 15px; display: flex; align-items: center; }
                    .barcode-label { font-weight: bold; text-transform: uppercase; width: 200px; flex-shrink: 0; }
                    .barcode-container { flex: 1; display: flex; flex-direction: column; align-items: center; }
                    .barcode-svg { width: 100%; height: 18mm !important; }
                    .barcode-text { font-size: 8pt; font-family: monospace; margin-top: 2px; }

                    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 9pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    
                    .footer-text { margin-top: 30px; text-align: justify; font-size: 11pt; line-height: 1.4; }
                    .location-date { margin-top: 40px; text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; }
                    
                    .signature-section { margin-top: 60px; text-align: center; }
                    .signature-title { font-weight: bold; margin-bottom: 50px; text-transform: uppercase; font-size: 11pt; }
                    .signature-line { border-top: 1px solid #000; width: 350px; margin: 0 auto 10px auto; }
                    .signature-name { font-weight: bold; margin: 0; text-transform: uppercase; font-size: 11pt; }
                    .signature-info { margin: 0; font-size: 10pt; text-transform: uppercase; }

                    @media print {
                        body { margin: 0; padding: 0; }
                        .page { margin: 0; border: none; box-shadow: none; padding: 15mm; }
                    }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header">
                        ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                    </div>

                    <div class="info-section">
                        <div class="info-row"><span class="info-label">FORNECEDOR:</span> <span class="info-value">${receiptData.supplierName.toUpperCase()}</span></div>
                        <div class="info-row"><span class="info-label">C.N.P.J.:</span> <span class="info-value">${receiptData.supplierCpf}</span></div>
                        <div class="info-row"><span class="info-label">PROCESSO SEI:</span> <span class="info-value">${receiptData.processoSei || 'N/A'}</span></div>
                        <div class="info-row"><span class="info-label">NOTA FISCAL Nº:</span> <span class="info-value">${receiptData.invoiceNumber}</span></div>
                        <div class="info-row"><span class="info-label">NOTA DE EMPENHO:</span> <span class="info-value">${receiptData.receiptTermNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="info-label">DATA NOTA FISCAL:</span> <span class="info-value">${formatDate(receiptData.invoiceDate)}</span></div>
                        <div class="info-row"><span class="info-label">DATA RECEBIMENTO:</span> <span class="info-value">${formatDate(receiptData.receiptDate)}</span></div>
                        <div class="info-row"><span class="info-label">VALOR TOTAL NF:</span> <span class="info-value">${formatCurrency(receiptData.totalInvoiceValue)}</span></div>
                        
                        ${receiptData.barcode ? `
                        <div class="barcode-row">
                            <span class="barcode-label">CÓD. BARRAS NF:</span>
                            <div class="barcode-container">
                                <svg id="barcode-receipt" class="barcode-svg"></svg>
                                <div class="barcode-text">${receiptData.barcode}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th style="width: 40px;">ITEM</th>
                                <th style="width: 80px;">QUANT.</th>
                                <th style="width: 60px;">UNID.</th>
                                <th>DESCRIÇÃO</th>
                                <th style="width: 120px;">VR. TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${receiptData.items.map((it, idx) => `
                                <tr>
                                    <td class="text-center">${String(idx + 1).padStart(2, '0')}</td>
                                    <td class="text-right">${(it.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    <td class="text-center">${it.unit || 'N/A'}</td>
                                    <td>${it.name || 'N/A'}</td>
                                    <td class="text-right">${formatCurrency(it.totalValue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #f2f2f2;">
                                <td colspan="4" class="text-right">TOTAL GERAL:</td>
                                <td class="text-right">${formatCurrency(receiptData.items.reduce((sum, it) => sum + (it.totalValue || 0), 0))}</td>
                            </tr>
                        </tfoot>
                    </table>

                    <div class="footer-text">
                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                    </div>

                    <div class="location-date">
                        TAIÚVA, ${receiptData.receiptDate ? new Date(receiptData.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                    </div>

                    <div class="signature-section">
                        <div class="signature-title">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</div>
                        <div class="signature-line"></div>
                        <div class="signature-name">FERNANDO RODRIGUES SOARES</div>
                        <div class="signature-info">CPF: 347.810.448-32</div>
                        <div class="signature-info">PRESIDENTE</div>
                    </div>

                    <script>
                        window.onload = function() {
                            ${receiptData.barcode ? `
                            try {
                                JsBarcode("#barcode-receipt", "${receiptData.barcode}", {
                                    format: "CODE128",
                                    width: 2,
                                    height: 50,
                                    displayValue: false,
                                    margin: 0
                                });
                            } catch (e) { console.error(e); }
                            ` : ''}
                            
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        }
                    </script>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintManualReceipt = () => {
        if (!manualReceipt) return;
        
        const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
        const formatDate = (dateStr: string) => (dateStr || '').split('-').reverse().join('/') || 'N/A';

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita popups para imprimir o termo.');
            return;
        }

        const totalValue = manualReceipt.items.reduce((sum: number, it: any) => sum + Number(it.totalValue || 0), 0);

        const htmlContent = `
            <html>
            <head>
                <title>Termo Manual - NF ${manualReceipt.invoiceNumber}</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { size: A4; margin: 0; }
                    body { font-family: Arial, sans-serif; padding: 0; margin: 0; background: white; }
                    .page { width: 210mm; min-height: 297mm; padding: 15mm; margin: 0 auto; box-sizing: border-box; background: white; }
                    .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 25px; border-bottom: 2px solid #000; padding-bottom: 15px; font-size: 13pt; }
                    .info-section { margin-bottom: 20px; font-size: 11pt; }
                    .info-row { margin-bottom: 8px; display: flex; align-items: flex-start; }
                    .label { font-weight: bold; width: 180px; text-transform: uppercase; }
                    .value { flex: 1; text-transform: uppercase; }
                    table { width: 100%; border-collapse: collapse; margin: 25px 0; font-size: 9pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
                    .footer-text { font-size: 9pt; text-align: justify; line-height: 1.5; margin-bottom: 30px; }
                    .sig-section { text-align: center; margin-top: 50px; font-size: 10pt; }
                    .sig-line { width: 300px; border-top: 1px solid #000; margin: 30px auto 10px; }
                </style>
            </head>
            <body>
                <div class="page">
                    <div class="header italic">
                        Atestamos o recebimento dos materiais/serviços relacionados, entrega pela empresa:
                    </div>
                    <div class="info-section">
                        <div class="info-row"><span class="label">Fornecedor:</span> <span class="value">${manualReceipt.supplierName || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">C.N.P.J.:</span> <span class="value">${manualReceipt.supplierCpf || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Processo SEI:</span> <span class="value">${manualReceipt.processoSei || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Nota Fiscal Nº:</span> <span class="value">${manualReceipt.invoiceNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Nota de Empenho:</span> <span class="value">${manualReceipt.receiptTermNumber || 'N/A'}</span></div>
                        <div class="info-row"><span class="label">Data Nota Fiscal:</span> <span class="value">${formatDate(manualReceipt.invoiceDate)}</span></div>
                        <div class="info-row"><span class="label">Data Recebimento:</span> <span class="value">${formatDate(manualReceipt.receiptDate)}</span></div>
                        <div class="info-row"><span class="label">Valor Total NF:</span> <span class="value">${formatCurrency(totalValue)}</span></div>
                        <div class="info-row">
                            <span class="label">Cód. Barras NF:</span> 
                            <div class="barcode">
                                ${manualReceipt.barcode ? `<svg id="barcode-manual"></svg>` : 'N/A'}
                            </div>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th style="text-align: right">Quant.</th>
                                <th>Unid.</th>
                                <th>Descrição</th>
                                <th style="text-align: right">Vr. Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${manualReceipt.items.map((it: any, idx: number) => `
                                <tr>
                                    <td style="text-align: center">${idx + 1}</td>
                                    <td style="text-align: right">${(Number(it.quantity) || 0).toFixed(2)}</td>
                                    <td style="text-align: center">${it.unit || 'N/A'}</td>
                                    <td>${it.name || 'N/A'}</td>
                                    <td style="text-align: right">${formatCurrency(it.totalValue || 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="font-weight: bold; background-color: #f2f2f2;">
                                <td colspan="4" style="text-align: right">TOTAL GERAL:</td>
                                <td style="text-align: right">${formatCurrency(totalValue)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    <div class="footer-text">
                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                    </div>
                    <div class="sig-section">
                        <p class="font-bold uppercase">TAIÚVA, ${manualReceipt.receiptDate ? new Date(manualReceipt.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}</p>
                        <p style="font-weight: bold; margin-top: 30px;">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                        <div class="sig-line"></div>
                        <p style="font-weight: bold">FERNANDO RODRIGUES SOARES</p>
                        <p>CPF: 347.810.448-32</p>
                        <p>PRESIDENTE</p>
                    </div>
                </div>
                <script>
                    if (document.getElementById('barcode-manual') && "${manualReceipt.barcode}") {
                        JsBarcode("#barcode-manual", "${manualReceipt.barcode}", {
                            format: "CODE128",
                            width: 1.5,
                            height: 35,
                            displayValue: true
                        });
                    }
                    window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const addManualItem = () => {
        setManualReceipt({
            ...manualReceipt,
            items: [...manualReceipt.items, { name: '', quantity: 0, unit: 'UN', totalValue: 0 }]
        });
    };

    const removeManualItem = (index: number) => {
        const newItems = manualReceipt.items.filter((_: any, i: number) => i !== index);
        setManualReceipt({ ...manualReceipt, items: newItems });
    };

    const updateManualItem = (index: number, field: string, value: any) => {
        const newItems = manualReceipt.items.map((it: any, i: number) => {
            if (i === index) return { ...it, [field]: value };
            return it;
        });
        setManualReceipt({ ...manualReceipt, items: newItems });
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
            <header className="bg-white shadow-sm p-4 flex justify-between items-center sticky top-0 z-20 border-b border-slate-200">
                <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Módulo de Estoque</h1>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Dados P Taiuva 2026</p>
                </div>
                <div className="flex items-center gap-3">
                    {typeof navigator !== 'undefined' && !navigator.onLine && (
                        <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            Modo Offline
                        </div>
                    )}
                    <div className="flex bg-slate-100 p-1 rounded-2xl">
                        {['history', 'movement_history', 'image_history', 'validity', 'agenda', 'cronograma', 'menu', 'receipt', 'manual_receipt', 'sync'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)} 
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {tab === 'history' ? 'Consulta & Gestão' : 
                                 tab === 'movement_history' ? 'Log de Movimentação' : 
                                 tab === 'image_history' ? 'Notas Fiscais' : 
                                 tab === 'validity' ? 'Validade' : 
                                 tab === 'agenda' ? 'Agenda' : 
                                 tab === 'cronograma' ? 'Cronograma' : 
                                 tab === 'menu' ? 'Cardápio' : 
                                 tab === 'receipt' ? 'Controle Doc.' : 
                                 tab === 'manual_receipt' ? 'Termo Manual' : 'Sincronização'}
                            </button>
                        ))}
                    </div>
                    <button onClick={onLogout} className="bg-slate-100 text-slate-600 font-black py-2 px-6 rounded-xl text-xs uppercase border border-slate-200 shadow-sm hover:bg-slate-200 active:scale-95 transition-all">Sair</button>
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
                {activeTab === 'history' ? (
                    <div className="space-y-8">
                        <WarehouseMovementForm 
                            key="warehouse-movement-form"
                            suppliers={suppliers} 
                            warehouseLog={warehouseLog} 
                            onRegisterEntry={onRegisterEntry}
                            onRegisterWithdrawal={onRegisterWithdrawal}
                            initialMode="entrada"
                            perCapitaConfig={perCapitaConfig}
                            acquisitionItems={acquisitionItems}
                        />

                        <div className="border-t border-gray-100 pt-8">
                            <AdminInvoices 
                                suppliers={suppliers} 
                                warehouseLog={warehouseLog}
                                onReopenInvoice={onReopenInvoice} 
                                onDeleteInvoice={onDeleteInvoice} 
                                onUpdateInvoiceItems={onUpdateInvoiceItems} 
                                onUpdateInvoiceUrl={onUpdateInvoiceUrl}
                                onManualInvoiceEntry={onManualInvoiceEntry}
                                onMarkInvoiceAsOpened={onMarkInvoiceAsOpened}
                                mode="warehouse_entry"
                                perCapitaConfig={perCapitaConfig}
                                acquisitionItems={acquisitionItems}
                            />
                        </div>
                    </div>
                ) : activeTab === 'movement_history' ? (
                    <AdminWarehouseLog 
                        warehouseLog={warehouseLog}
                        suppliers={suppliers}
                        onDeleteEntry={onDeleteWarehouseEntry!}
                        onUpdateWarehouseEntry={onUpdateWarehouseEntry!}
                        perCapitaConfig={perCapitaConfig}
                    />
                ) : activeTab === 'image_history' ? (
                    <div className="space-y-6 animate-fade-in">
                        {/* Compact Modern Header */}
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="p-4 bg-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg">
                                        <FileIcon className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-black uppercase tracking-tighter leading-none text-white italic">Notas Fiscais</h2>
                                        <p className="text-zinc-400 font-bold text-[7px] uppercase tracking-widest mt-0.5 opacity-80">Gestão Documental e Visualização</p>
                                    </div>
                                </div>

                                <div className="relative w-full md:w-64 group">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 group-focus-within:text-indigo-400 transition-colors" />
                                    <input 
                                        type="text"
                                        placeholder="BUSCAR FORNECEDOR OU NOTA..."
                                        value={invoiceSearch}
                                        onChange={e => setInvoiceSearch(e.target.value)}
                                        className="w-full h-9 pl-9 pr-4 bg-zinc-800 border-none rounded-xl text-[9px] font-black uppercase tracking-widest text-white placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:italic"
                                    />
                                </div>
                            </div>

                            {/* Dense Month Selector */}
                            {availableImageMonths.length > 0 && (
                                <div className="px-4 py-3 flex gap-2 bg-gray-50 border-b border-gray-100 overflow-x-auto scrollbar-hide">
                                    <button
                                        onClick={() => setActiveImageMonth('')}
                                        className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                            activeImageMonth === '' 
                                            ? 'bg-zinc-900 text-white shadow-md' 
                                            : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                                        }`}
                                    >
                                        VER TUDO
                                    </button>
                                    {availableImageMonths.map(monthKey => {
                                        const [year, monthIdx] = monthKey.split('-').map(Number);
                                        const monthName = [
                                            'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
                                            'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'
                                        ][monthIdx];
                                        return (
                                            <button
                                                key={monthKey}
                                                onClick={() => setActiveImageMonth(monthKey)}
                                                className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                                    activeImageMonth === monthKey 
                                                    ? 'bg-indigo-600 text-white shadow-md' 
                                                    : 'bg-white text-zinc-400 border border-zinc-200 hover:border-zinc-300'
                                                }`}
                                            >
                                                {monthName} / {year}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="p-4 min-h-[400px]">
                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                                    {filteredImages.length > 0 ? (
                                        filteredImages.map(log => (
                                            <div key={log.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-xl hover:border-indigo-200 transition-all group flex flex-col h-full relative">
                                                {/* Smaller Thumbnail - Aspect Document */}
                                                <div 
                                                    className="aspect-[3/4] bg-slate-100 flex items-center justify-center cursor-pointer relative overflow-hidden border-b border-gray-50"
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
                                                        <img src={log.invoiceUrl} alt="NF" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1 text-slate-300 group-hover:text-indigo-400 transition-colors">
                                                            <FileText className="h-5 w-5" />
                                                            <span className="text-[6px] font-black uppercase tracking-widest italic">PDF</span>
                                                        </div>
                                                    )}
                                                    <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                        <Eye className="text-white h-4 w-4 animate-pulse" />
                                                    </div>
                                                    
                                                    {/* Floating Date Badge */}
                                                    <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-md px-1 py-0.5 rounded shadow-sm border border-white/20">
                                                        <span className="text-[6px] font-mono font-bold text-indigo-950">{(log.date || '').split('-').reverse().join('/')}</span>
                                                    </div>
                                                </div>

                                                <div className="p-2 flex flex-col flex-grow">
                                                    <div className="mb-1">
                                                        <div className="flex flex-wrap gap-0.5 mb-1">
                                                            <span className={`text-[5px] font-black ${log.type === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'} text-white px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm`}>{log.type}</span>
                                                            {log.pd && <span className="text-[5px] font-black bg-indigo-500 text-white px-1 py-0.5 rounded uppercase tracking-tighter shadow-sm">PD {log.pd}</span>}
                                                        </div>
                                                        <h4 className="text-[8px] font-black text-slate-800 uppercase leading-tight mb-0.5 line-clamp-2 h-7 group-hover:text-indigo-600 transition-colors">{log.supplierName}</h4>
                                                    </div>

                                                    <div className="mt-auto">
                                                        <p className="text-[6px] text-slate-400 font-bold uppercase truncate mb-1" title={log.itemName}>{log.itemName}</p>
                                                        
                                                        <div className="pt-1 border-t border-slate-50 grid grid-cols-2 gap-1">
                                                            <div className="flex flex-col">
                                                                <span className="text-slate-400 text-[5px] uppercase font-black tracking-tighter">NF</span>
                                                                <span className="text-slate-900 font-mono text-[7px] font-black truncate">{log.inboundInvoice || log.outboundInvoice || log.invoiceNumber || '-'}</span>
                                                            </div>
                                                            <div className="text-right flex flex-col">
                                                                <span className="text-slate-400 text-[5px] uppercase font-black tracking-tighter block">QTD</span>
                                                                <span className="text-indigo-700 font-black text-[7px] italic">{Number(log.quantity).toFixed(1)}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="col-span-full py-24 flex flex-col items-center justify-center">
                                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4 border-2 border-dashed border-slate-200">
                                                <Search className="h-10 w-10 text-slate-200" />
                                            </div>
                                            <h3 className="text-slate-300 font-black uppercase tracking-[0.3em] text-xs italic">Nenhuma nota encontrada</h3>
                                            <p className="text-slate-400 text-[8px] font-bold uppercase mt-2">Tente ajustar seus filtros ou busca</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'validity' ? (
                    <ValidityAnalysisPanel warehouseLog={warehouseLog} />
                ) : activeTab === 'manual_receipt' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in relative">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-amber-600 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Termo Manual</h2>
                                    <p className="text-amber-100 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Preenchimento Manual de Termo de Recebimento</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handlePrintManualReceipt}
                                    className="bg-white text-amber-600 hover:bg-gray-100 font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                >
                                    <Printer className="h-3 w-3" />
                                    Imprimir Termo
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-8 space-y-8">
                            {/* Form Section */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-amber-50/50 p-6 rounded-[2.5rem] border border-amber-100">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Fornecedor / Produtor</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.supplierName} 
                                        onChange={e => setManualReceipt({...manualReceipt, supplierName: e.target.value})}
                                        placeholder="NOME DO FORNECEDOR"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">CNPJ / CPF</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.supplierCpf} 
                                        onChange={e => setManualReceipt({...manualReceipt, supplierCpf: e.target.value})}
                                        placeholder="00.000.000/0001-00"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Processo SEI</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.processoSei} 
                                        onChange={e => setManualReceipt({...manualReceipt, processoSei: e.target.value})}
                                        placeholder="Nº DO PROCESSO SEI"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Nota Fiscal Nº</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.invoiceNumber} 
                                        onChange={e => setManualReceipt({...manualReceipt, invoiceNumber: e.target.value})}
                                        placeholder="Nº DA NOTA FISCAL"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Nota de Empenho</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.receiptTermNumber} 
                                        onChange={e => setManualReceipt({...manualReceipt, receiptTermNumber: e.target.value})}
                                        placeholder="Nº DO EMPENHO"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Cód. Barras NF</label>
                                    <input 
                                        type="text" 
                                        value={manualReceipt.barcode} 
                                        onChange={e => setManualReceipt({...manualReceipt, barcode: e.target.value})}
                                        placeholder="CÓDIGO DE BARRAS"
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Data Nota Fiscal</label>
                                    <input 
                                        type="date" 
                                        value={manualReceipt.invoiceDate} 
                                        onChange={e => setManualReceipt({...manualReceipt, invoiceDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-amber-700 uppercase tracking-widest ml-1">Data Recebimento</label>
                                    <input 
                                        type="date" 
                                        value={manualReceipt.receiptDate} 
                                        onChange={e => setManualReceipt({...manualReceipt, receiptDate: e.target.value})}
                                        className="w-full h-12 px-4 border border-amber-200 rounded-2xl bg-white shadow-sm font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all text-xs" 
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center px-4">
                                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em]">Itens da Nota</h3>
                                    <button 
                                        onClick={addManualItem}
                                        className="flex items-center gap-2 bg-amber-100 text-amber-700 hover:bg-amber-200 font-bold py-2 px-4 rounded-xl transition-all text-[10px] uppercase"
                                    >
                                        <Plus className="h-3 w-3" />
                                        Add Item
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {manualReceipt.items.map((it: any, idx: number) => (
                                        <div key={idx} className="grid grid-cols-1 md:grid-cols-12 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm animate-fade-in group">
                                            <div className="md:col-span-1 flex items-center justify-center font-black text-slate-300">
                                                {idx + 1}
                                            </div>
                                            <div className="md:col-span-5 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Descrição do Item</label>
                                                <input 
                                                    type="text" 
                                                    list="available-items-manual"
                                                    value={it.name} 
                                                    onChange={e => updateManualItem(idx, 'name', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px] uppercase" 
                                                />
                                                <datalist id="available-items-manual">
                                                    {Array.from(new Set([
                                                        ...(receiptSupplier?.contractItems?.map((ci: any) => ci.name) || []),
                                                        ...acquisitionItems.map(ai => ai.name)
                                                    ])).sort().map(name => (
                                                        <option key={name} value={name} />
                                                    ))}
                                                </datalist>
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Quantidade</label>
                                                <input 
                                                    type="number" 
                                                    value={it.quantity} 
                                                    onChange={e => updateManualItem(idx, 'quantity', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px]" 
                                                />
                                            </div>
                                            <div className="md:col-span-1 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Unid.</label>
                                                <input 
                                                    type="text" 
                                                    value={it.unit} 
                                                    onChange={e => updateManualItem(idx, 'unit', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px] uppercase" 
                                                />
                                            </div>
                                            <div className="md:col-span-2 space-y-1">
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor Total</label>
                                                <input 
                                                    type="number" 
                                                    value={it.totalValue} 
                                                    onChange={e => updateManualItem(idx, 'totalValue', e.target.value)}
                                                    className="w-full h-9 px-3 border border-slate-200 rounded-lg bg-slate-50 font-bold text-zinc-900 outline-none focus:ring-2 focus:ring-amber-500 transition-all text-[10px]" 
                                                />
                                            </div>
                                            <div className="md:col-span-1 flex items-end pb-1 justify-center">
                                                <button 
                                                    onClick={() => removeManualItem(idx)}
                                                    disabled={manualReceipt.items.length === 1}
                                                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-0"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview Display */}
                            <div className="border-t border-slate-100 pt-8">
                                <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] mb-6 px-4">Pré-visualização do Documento</h3>
                                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-white shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                                    <div className="max-w-3xl mx-auto space-y-8 text-black font-serif">
                                        <div className="text-center font-bold uppercase border-b-2 border-black pb-4">
                                            ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                                        </div>

                                        <div className="space-y-2 uppercase text-sm">
                                            <p><span className="font-bold inline-block w-48">FORNECEDOR:</span> {manualReceipt.supplierName || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">C.N.P.J.:</span> {manualReceipt.supplierCpf || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">PROCESSO SEI:</span> {manualReceipt.processoSei || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">NOTA FISCAL Nº:</span> {manualReceipt.invoiceNumber || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">NOTA DE EMPENHO:</span> {manualReceipt.receiptTermNumber || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">DATA NOTA FISCAL:</span> {(manualReceipt.invoiceDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">DATA RECEBIMENTO:</span> {(manualReceipt.receiptDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                            <p><span className="font-bold inline-block w-48">VALOR TOTAL NF:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manualReceipt.items.reduce((sum: number, it: any) => sum + (Number(it.totalValue) || 0), 0))}</p>
                                            <p className="flex items-center gap-2">
                                                <span className="font-bold inline-block w-48">CÓD. BARRAS NF:</span> 
                                                {manualReceipt.barcode ? <Barcode value={manualReceipt.barcode} /> : 'N/A'}
                                            </p>
                                        </div>

                                        <table className="w-full border-collapse border border-black text-[10px]">
                                            <thead>
                                                <tr className="bg-gray-100 uppercase font-bold">
                                                    <th className="border border-black p-1">ITEM</th>
                                                    <th className="border border-black p-1">QUANT.</th>
                                                    <th className="border border-black p-1">UNID.</th>
                                                    <th className="border border-black p-1">DESCRIÇÃO</th>
                                                    <th className="border border-black p-1">VR. TOTAL</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {manualReceipt.items.map((it: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                        <td className="border border-black p-1 text-right">{(Number(it.quantity) || 0).toFixed(2)}</td>
                                                        <td className="border border-black p-1 text-center">{it.unit || 'N/A'}</td>
                                                        <td className="border border-black p-1 uppercase">{it.name || 'N/A'}</td>
                                                        <td className="border border-black p-1 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(it.totalValue) || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="font-bold">
                                                    <td colSpan={4} className="border border-black p-1 text-right">TOTAL GERAL:</td>
                                                    <td className="border border-black p-1 text-right">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(manualReceipt.items.reduce((sum: number, it: any) => sum + (Number(it.totalValue) || 0), 0))}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        <div className="text-xs text-justify leading-relaxed">
                                            Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                                        </div>

                                        <div className="text-center font-bold pt-4 uppercase">
                                            TAIÚVA, {manualReceipt.receiptDate ? new Date(manualReceipt.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                                        </div>

                                        <div className="text-center space-y-1 pt-8">
                                            <p className="font-bold uppercase">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                                            <div className="w-64 h-px bg-black mx-auto mt-8 mb-2"></div>
                                            <p className="font-bold">FERNANDO RODRIGUES SOARES</p>
                                            <p>CPF: 347.810.448-32</p>
                                            <p>PRESIDENTE</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : activeTab === 'sync' ? (
                    <SynchronizationModule onSyncWithFirebase={async (data) => {
                        for (const entry of data) {
                            const res = entry.type === 'entrada' ? await onRegisterEntry(entry) : await onRegisterWithdrawal(entry);
                            if (!res.success) throw new Error(res.message);
                        }
                        return true;
                    }} />
                ) : activeTab === 'agenda' ? (
                    <AgendaChegadas 
                        suppliers={suppliers} 
                        thirdPartyEntries={thirdPartyEntries} 
                        embedded={true} 
                        perCapitaConfig={perCapitaConfig}
                        onDeleteDelivery={onDeleteDelivery}
                        onUpdateDelivery={onUpdateDelivery}
                        onSaveInvoice={onSaveInvoice}
                    />
                ) : activeTab === 'cronograma' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Cronograma de Entrega</h2>
                                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Gestão e Impressão de Calendário</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handlePrintCronograma}
                                    disabled={!selectedCronogramaSupplier}
                                    className="bg-white text-zinc-900 hover:bg-gray-100 font-black py-2 px-6 rounded-xl transition-all active:scale-95 disabled:opacity-50 uppercase tracking-widest text-[9px] flex items-center gap-2"
                                >
                                    <Printer className="h-3 w-3" />
                                    Imprimir
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Processo</label>
                                    <select 
                                        value={cronogramaType} 
                                        onChange={e => { setCronogramaType(e.target.value as any); setSelectedCronogramaSupplier(''); }}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                    >
                                        <option value="PPAIS">PPAIS</option>
                                        <option value="ESTOCÁVEIS">ESTOCÁVEIS</option>
                                        <option value="PERECÍVEIS">PERECÍVEIS</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Fornecedor / Produtor</label>
                                    <select 
                                        value={selectedCronogramaSupplier} 
                                        onChange={e => setSelectedCronogramaSupplier(e.target.value)}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                    >
                                        <option value="">-- SELECIONE --</option>
                                        {(cronogramaType === 'PPAIS' ? (perCapitaConfig?.ppaisProducers || []) : 
                                          cronogramaType === 'PERECÍVEIS' ? (perCapitaConfig?.pereciveisSuppliers || []) : 
                                          (perCapitaConfig?.estocaveisSuppliers || [])).map((s: any) => (
                                            <option key={s.cpfCnpj} value={s.cpfCnpj}>{s.name.toUpperCase()}</option>
                                          ))}
                                        {cronogramaType === 'ESTOCÁVEIS' && ensureArray(suppliers).filter(s => !ensureArray(perCapitaConfig?.estocaveisSuppliers).some((p: any) => (p.cpfCnpj === s.cpf || p.cpf === s.cpf))).map(s => (
                                            <option key={s.cpf} value={s.cpf}>{s.name.toUpperCase()}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Mês Ref.</label>
                                    <select 
                                        value={selectedMonth} 
                                        onChange={e => setSelectedMonth(e.target.value)}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                    >
                                        {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Ano Ref.</label>
                                    <select 
                                        value={selectedYear} 
                                        onChange={e => setSelectedYear(Number(e.target.value))}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-[10px] uppercase"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                            </div>
                            
                            {selectedCronogramaSupplier ? (
                                <div className="animate-fade-in space-y-4">
                                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4 italic font-bold text-[10px] uppercase">
                                        <div>
                                            <span className="text-indigo-400 mr-2">Processo SEI:</span>
                                            <span className="text-zinc-900">{perCapitaConfig?.seiProcessNumbers?.[cronogramaType] || 'Indefinido'}</span>
                                        </div>
                                        <div>
                                            <span className="text-indigo-400 mr-2">Data do Documento:</span>
                                            <span className="text-zinc-900">{getFirstBusinessDayOfMonth(MONTHS_PT.indexOf(selectedMonth), selectedYear).toLocaleDateString('pt-BR')} (1º Dia Útil)</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {/* Grade de visualização dos agendamentos do mês */}
                                        {Array.from({ length: 4 }, (_, i) => i + 1).map(week => {
                                            const supplier = (cronogramaType === 'PPAIS' ? (perCapitaConfig?.ppaisProducers || []) : 
                                                             cronogramaType === 'PERECÍVEIS' ? (perCapitaConfig?.pereciveisSuppliers || []) : 
                                                             (perCapitaConfig?.estocaveisSuppliers || [])).find((s: any) => (s.cpfCnpj === selectedCronogramaSupplier || s.cpf === selectedCronogramaSupplier)) || 
                                                             suppliers.find(s => s.cpf === selectedCronogramaSupplier);
                                            
                                            const isScheduled = supplier?.monthlySchedule?.[selectedMonth]?.includes(week);
                                            
                                            return (
                                                <div key={week} className={`p-4 rounded-2xl border-2 transition-all ${isScheduled ? 'bg-white border-indigo-500 shadow-md' : 'bg-gray-50 border-gray-100 opacity-50'}`}>
                                                    <div className="flex justify-between items-center mb-3">
                                                        <h4 className="text-[10px] font-black uppercase text-zinc-900 tracking-tighter">Semana {week}</h4>
                                                        {isScheduled ? (
                                                            <span className="bg-indigo-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Agendado</span>
                                                        ) : (
                                                            <span className="bg-gray-200 text-gray-500 text-[8px] font-bold px-2 py-0.5 rounded-full uppercase">Livre</span>
                                                        )}
                                                    </div>
                                                    <div className="space-y-2 text-[9px] font-bold uppercase italic">
                                                        <p className="text-zinc-500 mb-1">Notas Fiscais:</p>
                                                        {(() => {
                                                            const deliveries = ensureArray(supplier?.deliveries) as any[];
                                                            const monthIndex = MONTHS_PT.indexOf(selectedMonth);
                                                            const invoices = new Set<string>();
                                                            
                                                            deliveries.forEach((d: any) => {
                                                                const deliveryDate = new Date((d.invoiceDate || d.date) + 'T12:00:00');
                                                                // Simple logic: mapping delivery weeks to 1-4. Real logic is complex, 
                                                                // for now checking month and year:
                                                                if (deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === selectedYear) {
                                                                     // Here, to filter by week, would need more complex logic. 
                                                                     // Showing all for the month for now.
                                                                     if (d.invoiceNumber) invoices.add(String(d.invoiceNumber).trim());
                                                                }
                                                            });
                                                            return Array.from(invoices).map(inv => (
                                                                <span key={inv} className="block text-indigo-900 bg-indigo-100 p-1 rounded my-0.5">NF: {inv}</span>
                                                            ));
                                                        })()}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-20 text-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                                    <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px]">Selecione um processo e fornecedor para visualizar o cronograma</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'menu' ? (
                    <AdminStandardMenu 
                        suppliers={suppliers} 
                        template={standardMenu} 
                        dailyMenus={dailyMenus} 
                        onUpdateDailyMenus={onUpdateDailyMenu} 
                        inmateCount={perCapitaConfig?.inmateCount || 0} 
                    />
                ) : activeTab === 'receipt' ? (
                    <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
                        <div className="p-4 md:p-6 border-b border-gray-100 bg-zinc-900 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 italic shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-white/10 text-white">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase tracking-tighter leading-none">Termo de Recebimento</h2>
                                    <p className="text-zinc-400 font-bold text-[8px] uppercase tracking-widest mt-0.5 italic">Consolidação de Documentos de Conferência</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    type="button"
                                    onClick={handlePrintReceipt}
                                    disabled={!receiptData}
                                    className="bg-zinc-800 hover:bg-black text-white font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-inner"
                                >
                                    <Printer className="h-3 w-3" />
                                    Termo
                                </button>
                                <button 
                                    type="button"
                                    onClick={handlePrintAllLabels}
                                    disabled={!receiptData}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-6 rounded-xl transition-all shadow-xl active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-inner"
                                >
                                    <BarcodeIcon className="h-3 w-3" />
                                    Etiquetas
                                </button>
                            </div>
                        </div>

                        <div className="p-4 md:p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">Mês Ref.</label>
                                    <select 
                                        value={selectedMonth} 
                                        onChange={e => { setSelectedMonth(e.target.value); setReceiptInvoice(''); }}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase"
                                    >
                                        {MONTHS_PT.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">Ano Ref.</label>
                                    <select 
                                        value={selectedYear} 
                                        onChange={e => { setSelectedYear(Number(e.target.value)); setReceiptInvoice(''); }}
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">1. Fornecedor</label>
                                    <select 
                                        value={receiptSupplierCpf} 
                                        onChange={e => { setReceiptSupplierCpf(e.target.value); setReceiptInvoice(''); }} 
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase cursor-pointer"
                                    >
                                        <option value="">-- SELECIONE --</option>
                                        {suppliers.sort((a, b) => a.name.localeCompare(b.name)).map(s => <option key={s.cpf} value={s.cpf}>{s.name.toUpperCase()}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1 md:col-span-1">
                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1 text-teal-600">2. Nota Fiscal</label>
                                    <select 
                                        value={receiptInvoice} 
                                        onChange={e => handleInvoiceChange(e.target.value)} 
                                        className="w-full h-9 px-3 border border-gray-200 rounded-lg bg-white shadow-sm font-bold outline-none focus:ring-2 focus:ring-teal-400 transition-all text-[10px] uppercase disabled:opacity-50 cursor-pointer" 
                                        disabled={!receiptSupplierCpf}
                                    >
                                        <option value="">-- SELECIONE --</option>
                                        {supplierInvoices.map(nf => <option key={nf} value={nf}>NF {nf}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="bg-slate-50 border-2 border-dashed border-gray-200 p-4 rounded-2xl space-y-1">
                                <label className="text-[9px] font-black text-teal-600 uppercase tracking-[0.2em] ml-1">3. Processo SEI (Auto-Preenchimento)</label>
                                <input 
                                    type="text" 
                                    value={receiptProcessoSei} 
                                    onChange={e => setReceiptProcessoSei(e.target.value)} 
                                    placeholder="Nº do Processo SEI"
                                    className="w-full h-10 px-4 border border-gray-200 rounded-xl bg-white shadow-inner font-black text-zinc-900 outline-none focus:ring-4 focus:ring-teal-50 transition-all text-xs" 
                                />
                            </div>
                        </div>

                        {receiptData ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-3xl p-8 bg-white shadow-inner max-h-[500px] overflow-y-auto custom-scrollbar">
                                <div className="max-w-3xl mx-auto space-y-8 text-black font-serif">
                                    <div className="text-center font-bold uppercase border-b-2 border-black pb-4">
                                        ATESTAMOS O RECEBIMENTO DOS MATERIAIS/SERVIÇOS RELACIONADOS, ENTREGA PELA EMPRESA:
                                    </div>

                                    <div className="space-y-2 uppercase text-sm">
                                        <p><span className="font-bold inline-block w-48">FORNECEDOR:</span> {receiptData.supplierName || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">C.N.P.J.:</span> {receiptData.supplierCpf || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">PROCESSO SEI:</span> {receiptData.processoSei || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">NOTA FISCAL Nº:</span> {receiptData.invoiceNumber || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">NOTA DE EMPENHO:</span> {receiptData.receiptTermNumber || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">DATA NOTA FISCAL:</span> {(receiptData.invoiceDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">DATA RECEBIMENTO:</span> {(receiptData.receiptDate || '').split('-').reverse().join('/') || 'N/A'}</p>
                                        <p><span className="font-bold inline-block w-48">VALOR TOTAL NF:</span> {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receiptData.totalInvoiceValue || 0)}</p>
                                        <p className="flex items-center gap-2">
                                            <span className="font-bold inline-block w-48">CÓD. BARRAS NF:</span> 
                                            {receiptData.barcode ? <Barcode value={receiptData.barcode} /> : 'N/A'}
                                        </p>
                                    </div>

                                    <table className="w-full border-collapse border border-black text-[10px]">
                                        <thead>
                                            <tr className="bg-gray-100 uppercase font-bold">
                                                <th className="border border-black p-1">ITEM</th>
                                                <th className="border border-black p-1">QUANT.</th>
                                                <th className="border border-black p-1">UNID.</th>
                                                <th className="border border-black p-1">DESCRIÇÃO</th>
                                                <th className="border border-black p-1">VR. TOTAL</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {receiptData.items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                    <td className="border border-black p-1 text-right">{(it.quantity || 0).toFixed(2)}</td>
                                                    <td className="border border-black p-1 text-center">{it.unit || 'N/A'}</td>
                                                    <td className="border border-black p-1">{it.name || 'N/A'}</td>
                                                    <td className="border border-black p-1 text-right">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(it.totalValue || 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="font-bold">
                                                <td colSpan={4} className="border border-black p-1 text-right">TOTAL GERAL:</td>
                                                <td className="border border-black p-1 text-right">
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receiptData.items.reduce((sum, it) => sum + (it.totalValue || 0), 0))}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="text-xs text-justify leading-relaxed">
                                        Recebemos em ordem e na quantidade devida os materiais/serviços acima discriminados, os quais foram inspecionados pela comissão de recepção materiais, foi considerado de acordo com solicitado, satisfazendo as especificações e demais exigências do empenho conforme determina o inciso II do artigo 140 da lei nº 14.133/21.
                                    </div>

                                    <div className="text-center font-bold pt-4">
                                        TAIÚVA, {receiptData.receiptDate ? new Date(receiptData.receiptDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase() : 'DATA NÃO INFORMADA'}
                                    </div>

                                    <div className="text-center space-y-1 pt-8">
                                        <p className="font-bold uppercase">COMISSÃO DE RECEPÇÃO DE MATERIAIS/SERVIÇOS</p>
                                        <div className="w-64 h-px bg-black mx-auto mt-8 mb-2"></div>
                                        <p className="font-bold">FERNANDO RODRIGUES SOARES</p>
                                        <p>CPF: 347.810.448-32</p>
                                        <p>PRESIDENTE</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center bg-gray-50/50 rounded-[2.5rem] border-2 border-dashed border-gray-200 m-8 mt-0">
                                <p className="text-gray-400 font-black uppercase tracking-[0.2em] text-xs">Selecione um fornecedor e uma NF para visualizar o termo de recebimento</p>
                            </div>
                        )}
                    </div>
                ) : null}
            </main>
            <style>{`
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};

export default AlmoxarifadoDashboard;