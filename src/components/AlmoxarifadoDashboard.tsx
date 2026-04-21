
import React, { useState, useMemo, useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';
import type { Supplier, WarehouseMovement, ThirdPartyEntryLog, AcquisitionItem } from '../types';
import AdminInvoices from './AdminInvoices';
import AgendaChegadas from './AgendaChegadas';
import WarehouseMovementForm from './WarehouseMovementForm';
import AdminWarehouseLog from './AdminWarehouseLog';
import SynchronizationModule from './SynchronizationModule';

interface AlmoxarifadoDashboardProps {
    suppliers: Supplier[];
    warehouseLog: WarehouseMovement[];
    onLogout: () => void;
    onRegisterEntry: (payload: any) => Promise<{ success: boolean; message: string }>;
    onRegisterWithdrawal: (payload: any) => Promise<{ success: boolean; message: string }>;
    onResetExits: () => Promise<{ success: boolean; message: string }>;
    onReopenInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
    onDeleteInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
    onUpdateInvoiceItems: (supplierCpf: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
    onMarkInvoiceAsOpened: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
    onManualInvoiceEntry: (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, type?: 'entrada' | 'saída') => Promise<{ success: boolean; message?: string }>;
    onDeleteWarehouseEntry?: (logEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onUpdateWarehouseEntry?: (updatedEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    thirdPartyEntries: ThirdPartyEntryLog[];
    perCapitaConfig?: any;
    acquisitionItems?: AcquisitionItem[];
    onRegisterThirdPartyEntry: (log: Omit<ThirdPartyEntryLog, 'id'>) => Promise<{ success: boolean; message: string }>;
    onUpdateThirdPartyEntry: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message: string }>;
    onDeleteThirdPartyEntry: (id: string) => Promise<void>;
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
    onUpdateInvoiceItems,
    onUpdateInvoiceUrl,
    onManualInvoiceEntry,
    onMarkInvoiceAsOpened,
    onDeleteWarehouseEntry,
    onUpdateWarehouseEntry,
    thirdPartyEntries,
    perCapitaConfig,
    acquisitionItems = []
}) => {
    const [activeTab, setActiveTab] = useState<string>('history');
    const [selectedAgendaDate] = useState(new Date().toISOString().split('T')[0]);
    const [receiptSupplierCpf, setReceiptSupplierCpf] = useState('');
    const [receiptInvoice, setReceiptInvoice] = useState('');
    const [receiptProcessoSei, setReceiptProcessoSei] = useState('');
    
    // New states for month filtering and Cronograma
    const [selectedMonth, setSelectedMonth] = useState<string>(MONTHS_PT[new Date().getMonth()]);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [cronogramaType, setCronogramaType] = useState<'PPAIS' | 'ESTOCÁVEIS' | 'PERECÍVEIS'>('PPAIS');
    const [selectedCronogramaSupplier, setSelectedCronogramaSupplier] = useState('');

    const weeklyDeliveries = useMemo(() => {
        const list: { date: string; supplierName: string; time: string; status: 'AGENDADO' | 'CONCLUÍDO' | 'TERCEIRO' | 'CANCELADO'; id: string; type: 'FORNECEDOR' | 'TERCEIRO'; itemName?: string }[] = [];
        
        const current = new Date(selectedAgendaDate + 'T12:00:00');
        const day = current.getDay();
        const diff = current.getDate() - day;
        const startOfWeek = new Date(current.setDate(diff));
        
        const weekDates: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(startOfWeek);
            d.setDate(startOfWeek.getDate() + i);
            weekDates.push(d.toISOString().split('T')[0]);
        }

        suppliers.forEach(s => {
            Object.values((s.deliveries as any) || {}).forEach((d: any) => {
                if (weekDates.includes(d.date)) {
                    const isFaturado = d.item !== 'AGENDAMENTO PENDENTE';
                    list.push({
                        id: d.id,
                        date: d.date,
                        supplierName: s.name,
                        time: d.time,
                        status: isFaturado ? 'CONCLUÍDO' : 'AGENDADO',
                        type: 'FORNECEDOR',
                        itemName: d.item
                    });
                }
            });
        });

        (thirdPartyEntries || []).forEach(log => {
            if (weekDates.includes(log.date)) {
                let status: 'AGENDADO' | 'CONCLUÍDO' | 'TERCEIRO' | 'CANCELADO' = 'TERCEIRO';
                if (log.status === 'concluido') status = 'CONCLUÍDO';
                else if (log.status === 'cancelado') status = 'CANCELADO';
                else if (log.status === 'agendado') status = 'AGENDADO';

                list.push({
                    id: log.id,
                    date: log.date,
                    supplierName: log.companyName,
                    time: log.time || '00:00',
                    status: status,
                    type: 'TERCEIRO',
                    itemName: 'ENTRADA DE TERCEIROS'
                });
            }
        });

        return list.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
    }, [suppliers, thirdPartyEntries, selectedAgendaDate]);

    /* 
    const uniqueWeeklySuppliers = useMemo(() => {
        const suppliersMap = new Set<string>();
        weeklyDeliveries.forEach(d => {
            if (d.type === 'FORNECEDOR') {
                suppliersMap.add(d.supplierName);
            }
        });
        return Array.from(suppliersMap).sort();
    }, [weeklyDeliveries]);
    */

    const handlePrintCronograma = () => {
        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        const firstBusinessDay = getFirstBusinessDayOfMonth(monthIndex, selectedYear);
        
        const SeiNumber = perCapitaConfig?.seiProcessNumbers?.[cronogramaType] || '';
        
        // Find supplier details in PC config
        const pcSupplier = (perCapitaConfig?.ppaisProducers || []).find((p: any) => p.cpfCnpj === selectedCronogramaSupplier) ||
                           (perCapitaConfig?.pereciveisSuppliers || []).find((p: any) => p.cpfCnpj === selectedCronogramaSupplier) ||
                           (perCapitaConfig?.estocaveisSuppliers || []).find((p: any) => p.cpfCnpj === selectedCronogramaSupplier);

        // Always find the actual supplier with deliveries from the main suppliers prop
        const mainSupplier = suppliers.find(s => s.cpf === selectedCronogramaSupplier);
        
        if (!mainSupplier && !pcSupplier) {
            alert('Por favor, selecione um fornecedor.');
            return;
        }

        // Merge info: use pcSupplier for metadata, both for deliveries
        const supplier = {
            ...(pcSupplier || {}),
            ...(mainSupplier || {}),
            name: pcSupplier?.name || mainSupplier?.name || 'DESCONHECIDO',
            cpfCnpj: pcSupplier?.cpfCnpj || mainSupplier?.cpf || selectedCronogramaSupplier
        };

        // Obter todas as entregas do fornecedor para o mês selecionado
        const allDeliveries = [
            ...(Object.values(pcSupplier?.deliveries || {}) as any[]),
            ...(Object.values(mainSupplier?.deliveries || {}) as any[])
        ];

        const supplierDeliveries = allDeliveries.filter(d => {
            const dateStr = d.invoiceDate || d.date;
            if (!dateStr) return false;
            const deliveryDate = new Date(dateStr + 'T12:00:00');
            return deliveryDate.getMonth() === monthIndex && deliveryDate.getFullYear() === selectedYear;
        });

        // Agrupar por data para o cronograma
        const groupedDeliveriesMap = supplierDeliveries.reduce((acc: any, d: any) => {
            const displayDate = d.invoiceDate || d.date;
            if (!acc[displayDate]) acc[displayDate] = [];
            
            // Tentar buscar o valor no warehouseLog
            const cleanInv = String(d.invoiceNumber || '').trim().replace(/^0+/, '');
            const logEntry = warehouseLog.find(log => {
                const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
                const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
                const lInvLog = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
                
                return (lInbound === cleanInv || lOutbound === cleanInv || lInvLog === cleanInv) &&
                       (log.item === d.item || log.itemName === d.item) &&
                       (String(log.supplierCpf || '').replace(/\D/g, '') === String(selectedCronogramaSupplier).replace(/\D/g, ''));
            });

            acc[displayDate].push({
                item: d.item,
                kg: d.kg || d.quantity || 0,
                value: logEntry?.value || d.value || 0,
                invoiceNumber: d.invoiceNumber
            });
            return acc;
        }, {} as Record<string, any[]>);

        const deliveries = Object.entries(groupedDeliveriesMap).map(([date, items]) => ({
            date,
            items: items as any[],
            totalKg: (items as any[]).reduce((sum, it) => sum + (it.kg || 0), 0),
            totalValue: (items as any[]).reduce((sum, it) => sum + ((it.kg || 0) * (it.value || 0)), 0)
        })).sort((a, b) => a.date.localeCompare(b.date));

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Cronograma de Entrega - ${selectedMonth} de ${selectedYear}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #000; }
                    .header-title { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    
                    .header-boxes { display: flex; gap: 10px; margin-bottom: 20px; }
                    .header-box { flex: 1; border: 1.5px solid #000; padding: 10px; border-radius: 4px; }
                    .box-row { margin-bottom: 4px; }
                    .label { font-weight: bold; text-transform: uppercase; }
                    
                    .intro-text { text-align: justify; margin-bottom: 20px; font-size: 9pt; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
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
                    
                    .item-badge { background: #f9f9f9; padding: 4px 8px; border: 1px solid #ddd; border-radius: 6px; display: inline-block; margin: 2px; font-size: 8.5pt; }
                </style>
            </head>
            <body>
                <div class="header-title">CRONOGRAMA DE ENTREGA - ${selectedMonth} DE ${selectedYear}</div>
                
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
                    </div>
                </div>
                
                <div class="intro-text">
                    Solicitamos as devidas providências no sentido de fornecer a esta Unidade Prisional os itens relacionados abaixo, conforme especificações contratuais. As entregas deverão ser efetuadas no endereço mencionado, das 08:00 às 11:00 horas e das 13:00 às 16:00 horas, conforme estipulado neste cronograma.
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 80px;">DATA</th>
                            <th>PRODUTO / ITEM</th>
                            <th style="width: 80px;">QUANT.</th>
                            <th style="width: 90px;">VALOR UNIT.</th>
                            <th style="width: 100px;">VALOR TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${deliveries.length > 0 ? deliveries.map((day: any) => 
                            day.items.map((it: any, itIdx: number) => `
                            <tr>
                                ${itIdx === 0 ? `<td class="text-center font-bold" rowspan="${day.items.length}">${day.date.split('-').reverse().join('/')}</td>` : ''}
                                <td>${(it.item || 'N/A').toUpperCase()}</td>
                                <td class="text-center font-bold">${(it.kg || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td class="text-right">R$ ${(it.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                                <td class="text-right font-bold">R$ ${((it.kg || 0) * (it.value || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                            </tr>
                            `).join('')
                        ).join('') : `
                            <tr>
                                <td colspan="5" class="text-center italic" style="padding: 20px;">Nenhum agendamento para este período</td>
                            </tr>
                        `}
                    </tbody>
                    <tfoot>
                        <tr class="font-bold uppercase" style="background-color: #f2f2f2;">
                            <td colspan="2" class="text-right">TOTAIS DO PERÍODO</td>
                            <td class="text-center">${deliveries.reduce((acc: number, curr: any) => acc + (curr.totalKg || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                            <td colspan="2" class="text-right">R$ ${deliveries.reduce((acc: number, curr: any) => acc + (curr.totalValue || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer-location">
                    Taiuva, ${firstBusinessDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
                
                <div class="signature-section">
                    <div class="signature-line"></div>
                    <div class="signature-name">JOSÉ FABIANO MOUTIN</div>
                    <div class="signature-role">Chefe de Seção de Finanças e Suprimentos</div>
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
        const main = suppliers.find(s => s.cpf === receiptSupplierCpf);
        const pc = (perCapitaConfig?.ppaisProducers || []).find((p: any) => p.cpfCnpj === receiptSupplierCpf) ||
                   (perCapitaConfig?.pereciveisSuppliers || []).find((p: any) => p.cpfCnpj === receiptSupplierCpf) ||
                   (perCapitaConfig?.estocaveisSuppliers || []).find((p: any) => p.cpfCnpj === receiptSupplierCpf);
        
        if (!main && !pc) return null;
        
        return {
            ...(pc || {}),
            ...(main || {}),
            name: pc?.name || main?.name || 'DESCONHECIDO',
            cpf: receiptSupplierCpf,
            deliveries: [
                ...(Object.values(pc?.deliveries || {}) as any[]),
                ...(Object.values(main?.deliveries || {}) as any[])
            ]
        };
    }, [suppliers, receiptSupplierCpf, perCapitaConfig]);

    const supplierInvoices = useMemo(() => {
        if (!receiptSupplier) return [];
        const invoices = new Set<string>();
        const monthIndex = MONTHS_PT.indexOf(selectedMonth);
        
        Object.values((receiptSupplier.deliveries as any) || {}).forEach((d: any) => {
            const dateStr = d.invoiceDate || d.date;
            if (d.invoiceNumber && dateStr) {
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
        const deliveries = (Object.values(receiptSupplier.deliveries || {}) as any[]).filter(d => {
            const cleanDInv = String(d.invoiceNumber || '').trim().replace(/^0+/, '');
            return cleanDInv === cleanTargetInvoice;
        });

        if (deliveries.length === 0) return null;

        const items = deliveries.map(d => {
            // Tentar buscar o valor registrado no warehouseLog para este item específico
            const itemMovement = warehouseLog.find(log => {
                const lInbound = String(log.inboundInvoice || '').trim().replace(/^0+/, '');
                const lOutbound = String(log.outboundInvoice || '').trim().replace(/^0+/, '');
                const lInv = String(log.invoiceNumber || '').trim().replace(/^0+/, '');
                
                return (lInbound === cleanTargetInvoice || lOutbound === cleanTargetInvoice || lInv === cleanTargetInvoice) &&
                       (log.item === d.item || log.itemName === d.item) &&
                       (log.supplierCpf === receiptSupplier.cpf || log.supplierName === receiptSupplier.name);
            });

            const contractItem = (Object.values(receiptSupplier.contractItems || {}) as any[]).find((ci: any) => ci.name === d.item);
            const unitPrice = itemMovement?.value || d.value || 0;
            const quantity = d.kg || d.quantity || 0;
            const totalValue = quantity * unitPrice;
            
            let unit = 'Kg';
            if (contractItem?.unit) {
                const [unitType] = contractItem.unit.split('-');
                const unitMap: { [key: string]: string } = {
                    kg: 'Kg', un: 'Un', saco: 'Sc', balde: 'Bd', pacote: 'Pct', pote: 'Pt',
                    litro: 'L', l: 'L', caixa: 'Cx', embalagem: 'Emb', dz: 'Dz'
                };
                unit = unitMap[unitType] || 'Un';
            }

            return {
                name: d.item || 'N/A',
                quantity,
                unit,
                unitPrice,
                totalValue,
                category: contractItem?.category,
                barcode: itemMovement?.barcode || d.barcode || ''
            };
        });

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
            const deliveries = Object.values((receiptSupplier.deliveries as any) || {}).filter((d: any) => 
                d.invoiceNumber === invoice && d.item !== 'AGENDAMENTO PENDENTE'
            );
            
            const categories = new Set<string>();
            deliveries.forEach((d: any) => {
                const contractItem = (Object.values(receiptSupplier.contractItems || {}) as any[]).find((ci: any) => ci.name === d.item);
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
                const isPpais = (perCapitaConfig.ppaisProducers || []).some((p: any) => p.cpfCnpj === receiptSupplier.cpf);
                const isPereciveis = (perCapitaConfig.pereciveisSuppliers || []).some((p: any) => p.cpfCnpj === receiptSupplier.cpf);
                const isEstocaveis = (perCapitaConfig.estocaveisSuppliers || []).some((p: any) => p.cpfCnpj === receiptSupplier.cpf);
                
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
                                <td class="text-right">${formatCurrency(receiptData.totalInvoiceValue)}</td>
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

    return (
        <div className="min-h-screen bg-gray-100 text-gray-800 pb-20">
            <header className="bg-white shadow-md p-4 flex justify-between items-center sticky top-0 z-20 border-b-2 border-indigo-100">
                <div>
                    <h1 className="text-xl font-bold text-indigo-900 uppercase tracking-tighter leading-none">Módulo de Estoque</h1>
                    <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mt-1">Controle de Dados Finanças 2026</p>
                </div>
                <div className="flex items-center gap-3">
                    {typeof navigator !== 'undefined' && !navigator.onLine && (
                        <div className="flex items-center gap-1.5 bg-amber-500 text-white px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm italic">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                            </span>
                            Modo Offline
                        </div>
                    )}
                    <div className="flex bg-gray-100 p-1 rounded-xl">
                        <button onClick={() => setActiveTab('history')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Histórico Geral</button>
                        <button onClick={() => setActiveTab('agenda')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'agenda' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Agenda</button>
                        <button onClick={() => setActiveTab('cronograma')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'cronograma' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Cronograma</button>
                        <button onClick={() => setActiveTab('receipt')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'receipt' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Termo</button>
                        <button onClick={() => setActiveTab('sync')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'sync' ? 'bg-white text-amber-600 shadow-sm' : 'text-amber-500'}`}>Sincronização</button>
                    </div>
                    <button onClick={onLogout} className="bg-red-50 text-red-600 font-black py-2 px-6 rounded-xl text-xs uppercase border border-red-100 shadow-sm active:scale-95">Sair</button>
                </div>
            </header>

            <main className="p-4 md:p-8 max-w-6xl mx-auto space-y-8">
                {activeTab === 'history' ? (
                    <div className="space-y-8">
                        <WarehouseMovementForm 
                            key="warehouse-history-entry"
                            suppliers={suppliers} 
                            warehouseLog={warehouseLog} 
                            onRegisterEntry={onRegisterEntry}
                            onRegisterWithdrawal={onRegisterWithdrawal}
                            initialMode="entrada"
                            perCapitaConfig={perCapitaConfig}
                            acquisitionItems={acquisitionItems}
                        />

                        <WarehouseMovementForm 
                            key="warehouse-exit"
                            suppliers={suppliers} 
                            warehouseLog={warehouseLog} 
                            onRegisterEntry={async (_) => { return { success: false, message: 'Not allowed here' } }}
                            onRegisterWithdrawal={onRegisterWithdrawal}
                            initialMode="saída"
                            perCapitaConfig={perCapitaConfig}
                            acquisitionItems={acquisitionItems}
                        />

                        <div className="border-t border-gray-100 pt-8">
                            <AdminWarehouseLog 
                                warehouseLog={warehouseLog}
                                suppliers={suppliers}
                                onDeleteEntry={onDeleteWarehouseEntry!}
                                onUpdateWarehouseEntry={onUpdateWarehouseEntry!}
                                onRegisterEntry={onRegisterEntry}
                                onRegisterWithdrawal={onRegisterWithdrawal}
                            />
                        </div>

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
                            />
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
                                        {cronogramaType === 'ESTOCÁVEIS' && suppliers.filter(s => !(perCapitaConfig?.estocaveisSuppliers || []).some((p: any) => p.cpfCnpj === s.cpf)).map(s => (
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
                                                             (perCapitaConfig?.estocaveisSuppliers || [])).find((s: any) => s.cpfCnpj === selectedCronogramaSupplier) || 
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
                                                            const deliveries = Object.values(supplier?.deliveries || {}) as any[];
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
                                    className="bg-teal-600 hover:bg-teal-700 text-white font-black py-2 px-6 rounded-xl transition-all shadow-xl shadow-teal-100 active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 uppercase tracking-widest text-[9px] flex items-center gap-2 shadow-inner"
                                >
                                    <Printer className="h-3 w-3" />
                                    Imprimir
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
                                                <th className="border border-black p-1">VR. MEDIANA</th>
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
                                                    <td className="border border-black p-1 text-right">{(it.unitPrice || 0).toFixed(2)}</td>
                                                    <td className="border border-black p-1 text-right">{(it.totalValue || 0).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
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