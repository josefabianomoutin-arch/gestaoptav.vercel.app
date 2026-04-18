
import React, { useState, useMemo, useEffect } from 'react';
import type { Supplier, Delivery, ThirdPartyEntryLog } from '../types';
import WeeklyScheduleControl from './WeeklyScheduleControl';
import ConfirmModal from './ConfirmModal';

interface AdminScheduleViewProps {
  suppliers: Supplier[];
  thirdPartyEntries: ThirdPartyEntryLog[];
  onCancelDeliveries: (supplierCpf: string, deliveryIds: string[]) => void;
  onDeleteThirdPartyEntry: (id: string) => Promise<any>;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
};

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const AdminScheduleView: React.FC<AdminScheduleViewProps> = ({ suppliers, thirdPartyEntries, onCancelDeliveries, onDeleteThirdPartyEntry }) => {
    const [activeSubTab, setActiveSubTab] = useState<'daily' | 'weekly' | 'report'>('daily');
    const [searchTerm, setSearchTerm] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    // States for Report
    const [reportSupplierCpf, setReportSupplierCpf] = useState('');
    const [reportSelectedMonth, setReportSelectedMonth] = useState('');
    const [reportSeiNumber, setReportSeiNumber] = useState('');
    const [reportSupplierAddress, setReportSupplierAddress] = useState('');
    const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

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

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(p => {
            const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
            
            if (!nameMatch) return false;
            if (!dateFilter) return true;

            const deliveriesArray = (Object.values((p.deliveries as any) || {}) as any[]);
            const hasDeliveryOnDate = deliveriesArray.some((d: any) => d.date === dateFilter);
            
            if (hasDeliveryOnDate) return true;

            // Check if supplier is available this week
            const filterDate = new Date(dateFilter + 'T00:00:00');
            const weekNo = getWeekNumber(filterDate);
            const isAvailable = (p.allowedWeeks || []).includes(weekNo);

            return isAvailable;
        });
    }, [suppliers, searchTerm, dateFilter]);

    const reportSuppliers = useMemo(() => {
        return suppliers.sort((a, b) => a.name.localeCompare(b.name));
    }, [suppliers]);

    const reportAvailableMonths = useMemo(() => {
        if (!reportSupplierCpf) return [];
        const supplier = suppliers.find(s => s.cpf === reportSupplierCpf);
        if (!supplier) return [];
        
        const months = new Set<string>();
        
        // Add months from deliveries
        Object.values((supplier.deliveries as any) || {}).forEach((d: any) => {
            if (d.date) {
                months.add(d.date.substring(0, 7)); // YYYY-MM
            }
        });

        // Add current and next month as options even if no deliveries
        const now = new Date();
        for (let i = -1; i <= 2; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
            months.add(d.toISOString().substring(0, 7));
        }

        return Array.from(months).sort().reverse();
    }, [suppliers, reportSupplierCpf]);

    const getMonthName = (monthStr: string) => {
        if (!monthStr) return '';
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    };

    const reportItems = useMemo(() => {
        const supplier = suppliers.find(s => s.cpf === reportSupplierCpf);
        if (!supplier || !reportSelectedMonth) return [];

        return (Object.values((supplier.deliveries as any) || {}) as any[])
            .filter((d: any) => d.date.startsWith(reportSelectedMonth))
            .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [suppliers, reportSupplierCpf, reportSelectedMonth]);

    useEffect(() => {
        if (reportItems.length > 0) {
            setSelectedItemIds(reportItems.map(item => item.id));
        } else {
            setSelectedItemIds([]);
        }
    }, [reportItems]);

    const selectedReportItems = useMemo(() => {
        return reportItems.filter(item => selectedItemIds.includes(item.id));
    }, [reportItems, selectedItemIds]);

    const reportTotals = useMemo(() => {
        const totalWeight = selectedReportItems.reduce((sum: number, item: any) => sum + (item.kg || 0), 0);
        const totalValue = selectedReportItems.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
        return { totalWeight, totalValue };
    }, [selectedReportItems]);

    const handleGenerateReport = () => {
        const supplier = suppliers.find(s => s.cpf === reportSupplierCpf);
        if (!supplier || !reportSelectedMonth || selectedReportItems.length === 0) return;

        const { totalWeight, totalValue } = reportTotals;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const getReportDate = () => {
            const [year, month] = reportSelectedMonth.split('-');
            const date = new Date(parseInt(year), parseInt(month) - 1, 1);
            return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
        };

        // Agrupar itens por data para layout compacto
        const groupedByDate = new Map<string, any[]>();
        selectedReportItems.forEach(item => {
            const date = item.date;
            if (!groupedByDate.has(date)) groupedByDate.set(date, []);
            groupedByDate.get(date)!.push(item);
        });

        const sortedDates = Array.from(groupedByDate.keys()).sort();

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cronograma de Entrega - ${supplier.name}</title>
                <style>
                    @page { 
                        size: A4 landscape; 
                        margin: 10mm; 
                    }
                    body { 
                        font-family: Arial, sans-serif; 
                        line-height: 1.3; 
                        color: #000; 
                        font-size: 10pt; 
                        margin: 0; 
                        padding: 0; 
                    }
                    .header { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; font-size: 14pt; border-bottom: 2px solid #000; padding-bottom: 10px; }
                    
                    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
                    .info-box { border: 1px solid #000; padding: 8px; background: #f9f9f9; }
                    
                    .opening-text { text-align: justify; margin-bottom: 15px; font-size: 9pt; }
                    
                    table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
                    th, td { border: 1px solid #000; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; text-transform: uppercase; font-weight: bold; text-align: center; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .item-tag { display: inline-block; background: #eee; padding: 2px 5px; border-radius: 3px; margin: 1px; border: 1px solid #ccc; font-size: 8pt; }

                    .signatures { margin-top: 30px; display: flex; justify-content: space-around; }
                    .signature-block { text-align: center; width: 300px; }
                    .signature-line { border-top: 1px solid #000; margin-bottom: 5px; }
                    .signature-name { font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                    .signature-title { font-size: 8pt; }
                    
                    .location-date { margin-top: 20px; text-align: right; font-weight: bold; }
                </style>
            </head>
            <body>
                <div class="header">CRONOGRAMA DE ENTREGA - ${getMonthName(reportSelectedMonth)}</div>

                <div class="info-grid">
                    <div class="info-box">
                        <strong>FORNECEDOR:</strong> ${supplier.name.toUpperCase()}<br>
                        <strong>CPF/CNPJ:</strong> ${supplier.cpf}<br>
                        <strong>ENDEREÇO:</strong> ${reportSupplierAddress || 'NÃO INFORMADO'}
                    </div>
                    <div class="info-box">
                        <strong>PROCESSO SEI:</strong> ${reportSeiNumber || 'NÃO INFORMADO'}<br>
                        <strong>UNIDADE:</strong> PENITENCIÁRIA DE TAIUVA<br>
                        <strong>PERÍODO:</strong> ${getMonthName(reportSelectedMonth)}
                    </div>
                </div>

                <div class="opening-text">
                    Solicitamos as devidas providências no sentido de fornecer a esta Unidade Prisional os itens relacionados abaixo, conforme especificações contratuais. As entregas deverão ser efetuadas no endereço mencionado, das 08:00 às 11:00 horas e das 13:00 às 16:00 horas, conforme estipulado neste cronograma.
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 100px;">DATA</th>
                            <th>ITENS AGENDADOS (DESCRIÇÃO / QUANTIDADE / VALOR)</th>
                            <th style="width: 100px;">PESO TOTAL (KG)</th>
                            <th style="width: 120px;">VALOR TOTAL (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sortedDates.map(date => {
                            const items = groupedByDate.get(date)!;
                            const dayWeight = items.reduce((sum, i) => sum + (i.kg || 0), 0);
                            const dayValue = items.reduce((sum, i) => sum + (i.value || 0), 0);
                            return `
                                <tr>
                                    <td class="text-center font-bold">${formatDate(date)}</td>
                                    <td>
                                        <div style="display: flex; flex-wrap: wrap; gap: 4px;">
                                            ${items.map(item => `
                                                <div class="item-tag">
                                                    <strong>${item.item}</strong>: ${item.kg?.toFixed(2).replace('.',',')}Kg - ${formatCurrency(item.value || 0)}
                                                </div>
                                            `).join('')}
                                        </div>
                                    </td>
                                    <td class="text-center font-bold">${dayWeight.toFixed(3).replace('.',',')}</td>
                                    <td class="text-right font-bold">${formatCurrency(dayValue)}</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #f2f2f2; font-weight: bold; font-size: 11pt;">
                            <td colspan="2" class="text-right">TOTAIS DO PERÍODO</td>
                            <td class="text-center">${reportTotals.totalWeight.toFixed(3).replace('.',',')} Kg</td>
                            <td class="text-right">${formatCurrency(reportTotals.totalValue)}</td>
                        </tr>
                    </tfoot>
                </table>

                <div class="location-date">
                    Taiuva, ${getReportDate()}
                </div>

                <div class="signatures">
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div class="signature-name">${supplier.name.toUpperCase()}</div>
                        <div class="signature-title">Contratado</div>
                    </div>
                    <div class="signature-block">
                        <div class="signature-line"></div>
                        <div class="signature-name">JOSÉ FABIANO MOUTIN</div>
                        <div class="signature-title">Chefe de Seção de Finanças e Suprimentos</div>
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); window.close(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const filteredThirdParties = useMemo(() => {
        return (thirdPartyEntries || []).filter(log => {
            const nameMatch = log.companyName.toLowerCase().includes(searchTerm.toLowerCase());
            const dateMatch = !dateFilter || log.date === dateFilter;
            return nameMatch && dateMatch;
        });
    }, [thirdPartyEntries, searchTerm, dateFilter]);
    
    const sortedSuppliers = useMemo(() => {
        return [...filteredSuppliers].sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredSuppliers]);

    const sortedThirdParties = useMemo(() => {
        return [...filteredThirdParties].sort((a, b) => a.companyName.localeCompare(b.companyName));
    }, [filteredThirdParties]);

    const handleCancel = (supplierCpf: string, deliveryIds: string[], date: string, isInvoice: boolean) => {
        const type = isInvoice ? 'FATURAMENTO' : 'AGENDAMENTO';
        setConfirmConfig({
            isOpen: true,
            title: `Excluir ${type}`,
            message: `ATENÇÃO: Deseja realmente EXCLUIR o ${type} do dia ${formatDate(date)}?\n\nEsta ação removerá o registro permanentemente.`,
            onConfirm: () => {
                onCancelDeliveries(supplierCpf, deliveryIds);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            },
            variant: 'danger'
        });
    };

    const handleDeleteThirdParty = async (id: string, company: string, date: string) => {
        setConfirmConfig({
            isOpen: true,
            title: 'Excluir Agendamento',
            message: `ATENÇÃO: Deseja realmente EXCLUIR o agendamento de ${company} do dia ${formatDate(date)}?`,
            onConfirm: async () => {
                await onDeleteThirdPartyEntry(id);
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            },
            variant: 'danger'
        });
    };

    const handleClearDayForSupplier = (supplierCpf: string, supplierName: string, date: string) => {
        const p = suppliers.find(s => s.cpf === supplierCpf);
        if (!p) return;
        const deliveriesOnDate = Object.values((p.deliveries as any) || {}).filter((d: any) => d.date === date);
        if (deliveriesOnDate.length === 0) return;

        setConfirmConfig({
            isOpen: true,
            title: 'Limpar Dia',
            message: `ATENÇÃO: Deseja excluir TODOS os registros (${deliveriesOnDate.length}) do fornecedor ${supplierName} no dia ${formatDate(date)}?`,
            onConfirm: () => {
                onCancelDeliveries(supplierCpf, (deliveriesOnDate as any[]).map(d => d.id));
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
            },
            variant: 'danger'
        });
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex bg-white p-1 rounded-2xl shadow-md border border-purple-100 max-w-md mx-auto">
                <button 
                    onClick={() => setActiveSubTab('daily')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'daily' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-50'}`}
                >
                    Agenda Diária
                </button>
                <button 
                    onClick={() => setActiveSubTab('weekly')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'weekly' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-50'}`}
                >
                    Controle Semanal
                </button>
                <button 
                    onClick={() => setActiveSubTab('report')} 
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${activeSubTab === 'report' ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-400 hover:bg-purple-50'}`}
                >
                    Cronograma de Entrega
                </button>
            </div>

            {activeSubTab === 'daily' ? (
                <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-7xl mx-auto border-t-8 border-purple-600">
                    {/* ... existing daily content ... */}
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4 border-b pb-6">
                        <div>
                            <h2 className="text-3xl font-black text-purple-900 uppercase tracking-tighter">Agenda de Entregas</h2>
                            <p className="text-gray-400 font-medium">Gerencie os agendamentos. Use os filtros abaixo para localizar datas específicas.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Pesquisar Fornecedor</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Dominato..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all"
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Filtrar por Data</label>
                                <input
                                    type="date"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full border rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400 transition-all bg-white"
                                />
                            </div>
                            {dateFilter && (
                                <button 
                                    onClick={() => setDateFilter('')}
                                    className="mt-5 text-xs text-purple-600 font-bold hover:underline"
                                >
                                    Limpar Data
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Seção de Terceiros */}
                        {sortedThirdParties.length > 0 && (
                            <div className="space-y-4 mb-8">
                                <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                    Agendamentos de Terceiros
                                </h3>
                                {sortedThirdParties.map(log => (
                                    <div key={log.id} className="p-5 border rounded-2xl bg-amber-50/30 hover:bg-white transition-all border-l-8 border-l-amber-400 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-black text-lg text-amber-900 uppercase">{log.companyName}</h3>
                                                <p className="text-[10px] font-mono text-gray-400">{log.companyCnpj}</p>
                                                <div className="flex gap-4 mt-2">
                                                    <span className="text-xs font-black text-amber-800 font-mono">{formatDate(log.date)}</span>
                                                    <span className="text-[10px] font-bold text-amber-600 uppercase">Agendado p/ {log.time || '00:00'}</span>
                                                </div>
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                                                    log.status === 'concluido' ? 'bg-green-100 text-green-700' : log.arrivalTime ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                    {log.status === 'concluido' ? '✓ Concluído' : log.arrivalTime ? '● Em Serviço' : '○ Aguardando'}
                                                </span>
                                                <button 
                                                    onClick={() => handleDeleteThirdParty(log.id, log.companyName, log.date)}
                                                    className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Seção de Fornecedores */}
                        {sortedSuppliers.length > 0 && (
                             <h3 className="text-xs font-black text-purple-600 uppercase tracking-[0.2em] ml-2 flex items-center gap-2 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Entregas de Fornecedores
                            </h3>
                        )}
                        {sortedSuppliers.length > 0 ? sortedSuppliers.map(supplier => {
                            const deliveriesArray = (Object.values((supplier.deliveries as any) || {}) as any[]);
                            const displayDeliveries = dateFilter 
                                ? deliveriesArray.filter((d: any) => d.date === dateFilter)
                                : deliveriesArray;

                            const sortedDeliveries = [...displayDeliveries].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
                            const pendingDeliveries = sortedDeliveries.filter((d: any) => d.item === 'AGENDAMENTO PENDENTE');
                            const realDeliveries = sortedDeliveries.filter((d: any) => d.item !== 'AGENDAMENTO PENDENTE');

                            return (
                                <div key={supplier.cpf} className="p-5 border rounded-2xl bg-gray-50/50 hover:bg-white transition-all border-l-8 border-l-purple-400 shadow-sm">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-black text-lg text-purple-900 uppercase">{supplier.name}</h3>
                                                {dateFilter && !displayDeliveries.length && (
                                                    <span className="bg-green-100 text-green-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-200">
                                                        Disponível p/ Agendamento
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-mono text-gray-400">{supplier.cpf}</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            {dateFilter && displayDeliveries.length > 0 && (
                                                <button 
                                                    onClick={() => handleClearDayForSupplier(supplier.cpf, supplier.name, dateFilter)}
                                                    className="bg-red-50 text-red-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                >
                                                    Limpar este dia
                                                </button>
                                            )}
                                            <span className="text-[10px] font-black text-gray-400 uppercase block">Resultados no Filtro</span>
                                            <span className="font-mono font-bold text-purple-600">{sortedDeliveries.length} registro(s)</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-white p-4 rounded-xl border shadow-inner">
                                            <h4 className="text-[10px] font-black uppercase text-red-600 mb-3 tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                                Agendamentos em Aberto (Aguardando)
                                            </h4>
                                            {pendingDeliveries.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                            {pendingDeliveries.map((delivery: any) => (
                                                                <div key={delivery.id} className="flex flex-col gap-2 p-3 bg-red-50/50 rounded-xl border border-red-100">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs font-black text-red-800 font-mono">{formatDate(delivery.date)}</span>
                                                                        <span className="text-[10px] font-bold text-red-600">Agendado p/ {delivery.time}</span>
                                                                        <button 
                                                                            onClick={() => handleCancel(supplier.cpf, [delivery.id], delivery.date, false)}
                                                                            className="hover:bg-red-600 hover:text-white bg-white rounded-lg p-1 text-red-500 transition-all border border-red-100 shadow-sm ml-auto"
                                                                            title="Excluir Agendamento"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                        </button>
                                                                    </div>
                                                            
                                                            {/* INFORMAÇÃO DA SUBPORTARIA ABERTA AQUI */}
                                                            {delivery.arrivalTime && (
                                                                <div className="bg-green-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-between shadow-sm animate-pulse">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                                                                        <span className="text-[10px] font-black uppercase tracking-tight">Veículo em Pátio</span>
                                                                    </div>
                                                                    <span className="text-[10px] font-bold">Entrou às {delivery.arrivalTime}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-300 italic">Nenhum agendamento nesta visualização.</p>
                                            )}
                                        </div>
                                        <div className="bg-white p-4 rounded-xl border shadow-inner">
                                            <h4 className="text-[10px] font-black uppercase text-green-500 mb-3 tracking-widest flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                Faturamentos Concluídos
                                            </h4>
                                            {realDeliveries.length > 0 ? (
                                                <div className="flex flex-wrap gap-2">
                                                    {(() => {
                                                        const invoices = new Map<string, { date: string, invoiceNumber: string, ids: string[] }>();
                                                        realDeliveries.forEach((d: any) => {
                                                            const nf = (d.invoiceNumber || '').toString().trim();
                                                            const key = nf || `no-nf-${d.id}`;
                                                            if (!invoices.has(key)) {
                                                                invoices.set(key, { date: d.date, invoiceNumber: nf || 'S/N', ids: [] });
                                                            }
                                                            invoices.get(key)!.ids.push(d.id);
                                                        });
                                                        return Array.from(invoices.values()).map((inv, idx) => (
                                                            <div key={idx} className="flex items-center gap-2 bg-green-50 text-green-700 text-xs font-black px-3 py-1.5 rounded-xl border border-green-100">
                                                                <span className="font-mono">{formatDate(inv.date)}</span>
                                                                <span className="text-[9px] px-1 bg-green-100 rounded">NF {inv.invoiceNumber}</span>
                                                                <button 
                                                                    onClick={() => handleCancel(supplier.cpf, inv.ids, inv.date, true)}
                                                                    className="hover:bg-red-600 hover:text-white bg-white rounded-lg p-1 text-red-500 transition-all border border-red-100 shadow-sm"
                                                                    title="Excluir Faturamento"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                </button>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-300 italic">Nenhum faturamento nesta visualização.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed">
                                <p className="text-gray-400 font-bold uppercase tracking-widest">Nenhum registro encontrado para estes filtros.</p>
                                {dateFilter && <p className="text-xs text-gray-400 mt-2">Dica: Verifique se o dia {formatDate(dateFilter)} realmente possui entregas agendadas.</p>}
                            </div>
                        )}
                    </div>
                </div>
            ) : activeSubTab === 'report' ? (
                <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-4xl mx-auto border-t-8 border-purple-600">
                    <h2 className="text-2xl font-black text-purple-900 uppercase tracking-tighter mb-6">Gerador de Cronograma de Entrega</h2>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">1. Selecione o Fornecedor</label>
                            <select 
                                value={reportSupplierCpf} 
                                onChange={e => { 
                                    const s = suppliers.find(x => x.cpf === e.target.value);
                                    setReportSupplierCpf(e.target.value); 
                                    setReportSelectedMonth(''); 
                                    setReportSeiNumber(s?.processNumber || '');
                                    setReportSupplierAddress(s?.address || '');
                                }}
                                className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 font-bold text-gray-700 bg-white"
                            >
                                <option value="">Selecione um fornecedor...</option>
                                {reportSuppliers.map(s => (
                                    <option key={s.cpf} value={s.cpf}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        {reportSupplierCpf && (
                            <div className="animate-fade-in">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">2. Selecione o Mês de Referência</label>
                                <select 
                                    value={reportSelectedMonth} 
                                    onChange={e => setReportSelectedMonth(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 font-bold text-gray-700 bg-white"
                                >
                                    <option value="">Selecione um mês...</option>
                                    {reportAvailableMonths.map(month => (
                                        <option key={month} value={month}>{getMonthName(month)}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {reportSelectedMonth && (
                            <div className="animate-fade-in space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">3. Número do Processo SEI</label>
                                    <input 
                                        type="text" 
                                        value={reportSeiNumber} 
                                        onChange={e => setReportSeiNumber(e.target.value)}
                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 font-bold text-gray-700"
                                        placeholder="Ex: 12345.000000/2026-00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">4. Endereço do Fornecedor</label>
                                    <input 
                                        type="text" 
                                        value={reportSupplierAddress} 
                                        onChange={e => setReportSupplierAddress(e.target.value)}
                                        className="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-purple-100 font-bold text-gray-700"
                                        placeholder="Ex: Rua Antonio Nunes da Silva, 84, Bairro laranjeiras..."
                                    />
                                </div>

                                {reportItems.length > 0 && (
                                    <div className="animate-fade-in space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-bold text-gray-500 uppercase ml-1">5. Selecione os Itens para o Cronograma</label>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setSelectedItemIds(reportItems.map(i => i.id))}
                                                    className="text-[10px] font-black text-purple-600 uppercase hover:underline"
                                                >
                                                    Selecionar Todos
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button 
                                                    onClick={() => setSelectedItemIds([])}
                                                    className="text-[10px] font-black text-red-600 uppercase hover:underline"
                                                >
                                                    Desmarcar Todos
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto p-4 border-2 border-gray-50 rounded-2xl custom-scrollbar bg-gray-50/30">
                                            {reportItems.map((item) => (
                                                <label 
                                                    key={item.id} 
                                                    className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                                        selectedItemIds.includes(item.id) 
                                                            ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-sm' 
                                                            : 'bg-white border-transparent text-gray-400 hover:border-gray-100'
                                                    }`}
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedItemIds.includes(item.id)}
                                                        onChange={() => {
                                                            setSelectedItemIds(prev => 
                                                                prev.includes(item.id) 
                                                                    ? prev.filter(id => id !== item.id) 
                                                                    : [...prev, item.id]
                                                            );
                                                        }}
                                                        className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-[10px] font-black uppercase truncate">{item.item}</p>
                                                        <div className="flex gap-2 mt-1">
                                                            <span className="text-[8px] font-bold opacity-60 uppercase">{formatDate(item.date)}</span>
                                                            <span className="text-[8px] font-bold opacity-60 uppercase">NF: {item.invoiceNumber}</span>
                                                        </div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Preview Section */}
                                <div className="mt-8 border-2 border-dashed border-purple-100 rounded-[2.5rem] p-8 bg-purple-50/30">
                                    <h3 className="text-sm font-black text-purple-900 uppercase tracking-widest mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-purple-600 animate-pulse"></div>
                                        Pré-visualização do Cronograma
                                    </h3>
                                    
                                    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-8 space-y-6 text-[11px] font-serif overflow-x-auto">
                                        <div className="text-center font-bold uppercase text-sm border-b-2 border-black pb-4 mb-6">
                                            CRONOGRAMA DE ENTREGA
                                        </div>
                                        
                                        <div className="text-justify leading-relaxed">
                                            <strong>Fornecedor:</strong> {(suppliers.find(s => s.cpf === reportSupplierCpf)?.name || '').toUpperCase()}, maior, capaz e residente na {reportSupplierAddress || '__________________________________________________________________'}, inscrito no CPF: {reportSupplierCpf} doravante designado Contratado.
                                        </div>

                                        <div className="text-justify leading-relaxed italic">
                                            Solicitamos as devidas providências de Vossa Senhoria, no sentido de fornecer a esta Unidade Prisional, os itens relacionados abaixo, conforme especificações constantes no Folheto Descritivo, durante o período de {getMonthName(reportSelectedMonth)}.
                                        </div>

                                        <table className="w-full border-collapse border border-black">
                                            <thead>
                                                <tr className="bg-gray-100 uppercase font-bold">
                                                    <th className="border border-black p-2">Data</th>
                                                    <th className="border border-black p-2">Item</th>
                                                    <th className="border border-black p-2">Peso (Kg)</th>
                                                    <th className="border border-black p-2">Valor (R$)</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReportItems.map((item, idx) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-2 text-center">{formatDate(item.date)}</td>
                                                        <td className="border border-black p-2">{item.item}</td>
                                                        <td className="border border-black p-2 text-center">{item.kg?.toFixed(3)}</td>
                                                        <td className="border border-black p-2 text-right">{formatCurrency(item.value || 0)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot className="font-bold bg-gray-50">
                                                <tr>
                                                    <td colSpan={2} className="border border-black p-2 text-right uppercase">Totais</td>
                                                    <td className="border border-black p-2 text-center">{reportTotals.totalWeight.toFixed(3)} Kg</td>
                                                    <td className="border border-black p-2 text-right">{formatCurrency(reportTotals.totalValue)}</td>
                                                </tr>
                                            </tfoot>
                                        </table>

                                        {/* Invoices List for Conference */}
                                        <div className="mt-8 border-t pt-6">
                                            <h4 className="text-[10px] font-black text-purple-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Notas Fiscais Vinculadas (Para Conferência)
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {(() => {
                                                    const uniqueInvoices = Array.from(new Set(selectedReportItems.filter(i => i.invoiceUrl).map(i => i.invoiceUrl as string)));
                                                    if (uniqueInvoices.length === 0) return <p className="text-[10px] text-gray-400 italic">Nenhum anexo de nota fiscal encontrado.</p>;
                                                    
                                                    return uniqueInvoices.map((url: string, idx: number) => {
                                                        const item = selectedReportItems.find(i => i.invoiceUrl === url);
                                                        return (
                                                            <div key={idx} className="bg-white border border-purple-100 rounded-xl p-3 flex flex-col gap-3 shadow-sm hover:shadow-md transition-all">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 font-black text-[10px]">
                                                                            {idx + 1}
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] font-black text-purple-900 uppercase leading-none">NF: {item?.invoiceNumber || 'S/N'}</p>
                                                                            <p className="text-[8px] font-bold text-gray-400 uppercase mt-1">{formatDate(item?.date || '')}</p>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        onClick={() => window.open(url, '_blank')}
                                                                        className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                                                        title="Abrir em Nova Aba"
                                                                    >
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 00-2 2v4a2 2 0 002 2h10a2 2 0 002-2v-4a2 2 0 00-2-2h-4m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                                                    </button>
                                                                </div>
                                                                <div className="aspect-[4/3] bg-gray-100 rounded-lg overflow-hidden border border-gray-100 relative">
                                                                    {url.startsWith('data:image/') || url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                                                                        <img src={url} alt="NF" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                                                                    ) : (
                                                                        <iframe src={url} className="w-full h-full border-none scale-75 origin-top" title={`NF ${idx + 1}`} />
                                                                    )}
                                                                    <div className="absolute inset-0 bg-transparent cursor-pointer" onClick={() => window.open(url, '_blank')}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    });
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <button 
                            onClick={handleGenerateReport}
                            disabled={!reportSupplierCpf || !reportSelectedMonth}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-black py-4 px-8 rounded-2xl uppercase tracking-widest transition-all shadow-lg shadow-purple-200 active:scale-95 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Gerar PDF do Cronograma
                        </button>
                    </div>
                </div>
            ) : (
                <WeeklyScheduleControl suppliers={suppliers} thirdPartyEntries={thirdPartyEntries} />
            )}
             <style>{`.custom-scrollbar::-webkit-scrollbar { width: 8px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #E5E7EB; border-radius: 10px; }`}</style>
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

export default AdminScheduleView;
