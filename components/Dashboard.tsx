
import React, { useState, useMemo } from 'react';
import type { Supplier, Delivery, ContractItem } from '../types';
import Calendar from './Calendar';
import DeliveryModal from './DeliveryModal';
import ViewDeliveryModal from './ViewDeliveryModal';
import SummaryCard from './SummaryCard';
import InvoiceUploader from './InvoiceUploader';
import EmailConfirmationModal from './EmailConfirmationModal';
import SendInvoiceModal from './SendInvoiceModal';
import ConfirmModal from './ConfirmModal';
import { speechService } from '../src/services/speechService';
import { HelpCircle, Volume2, Loader2, Calendar as CalendarIcon, FileText, Search, Download } from 'lucide-react';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebaseConfig';

const SIMULATED_TODAY = new Date('2026-04-30T00:00:00');

interface DashboardProps {
  supplier: Supplier;
  type?: 'PRODUTOR' | 'FORNECEDOR';
  monthlySchedule?: Record<string, number[]>;
  onLogout: () => void;
  onScheduleDelivery: (supplierCpf: string, date: string, time: string) => void;
  onCancelDeliveries: (supplierCpf: string, deliveryIds: string[]) => void;
  onSaveInvoice: (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string) => Promise<void>;
  emailModalData: {
    recipient: string;
    cc: string;
    subject: string;
    body: string;
    mailtoLink: string;
  } | null;
  onCloseEmailModal: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  supplier, 
  type = 'PRODUTOR',
  monthlySchedule,
  onLogout, 
  onScheduleDelivery, 
  onCancelDeliveries,
  onSaveInvoice,
  emailModalData,
  onCloseEmailModal
}) => {
  const isAbrilVerde = new Date().getMonth() === 3;
  const activeContractPeriod = '1_QUAD';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSendInvoiceModalOpen, setIsSendInvoiceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'invoices'>('calendar');
  const [invoiceToSend, setInvoiceToSend] = useState<{ date: string; deliveries: Delivery[] } | null>(null);
  const [deliveriesToShow, setDeliveriesToShow] = useState<Delivery[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
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

  const panelTitle = type === 'PRODUTOR' ? 'Painel do Produtor 2026' : 'Painel do Fornecedor 2026';
  const headerColor = type === 'PRODUTOR' ? 'text-green-800' : 'text-indigo-800';
  const bannerColor = type === 'PRODUTOR' ? 'bg-indigo-600 border-indigo-800' : 'bg-emerald-600 border-emerald-800';
  const bannerTextColor = type === 'PRODUTOR' ? 'text-indigo-200' : 'text-emerald-100';
  const weekBadgeColor = type === 'PRODUTOR' ? 'bg-white text-indigo-800' : 'bg-white text-emerald-800';

  const handleDayClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const deliveriesOnDate = (Object.values(supplier.deliveries || {}) as any[]).filter(d => d.date === dateString);
    setSelectedDate(date);
    if (deliveriesOnDate.length > 0) {
      setDeliveriesToShow(deliveriesOnDate);
      setIsViewModalOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleCloseModal = () => { setIsModalOpen(false); setSelectedDate(null); };
  const handleCloseViewModal = () => { setIsViewModalOpen(false); setDeliveriesToShow([]); setSelectedDate(null); };
  const handleAddNewFromView = () => { setIsViewModalOpen(false); setDeliveriesToShow([]); setIsModalOpen(true); };

  const handleScheduleSave = (time: string) => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      onScheduleDelivery(supplier.cpf, dateString, time);
    }
    handleCloseModal();
  };

  const handleOpenSendInvoiceModal = (invoiceInfo: { date: string; deliveries: Delivery[] }) => {
    setInvoiceToSend(invoiceInfo);
    setIsSendInvoiceModalOpen(true);
    setIsViewModalOpen(false);
  };

  const handleCloseSendInvoiceModal = () => { setInvoiceToSend(null); setIsSendInvoiceModalOpen(false); };
  
  const handlePlayGeneralHelp = async () => {
    if (isSpeaking) return;
    setIsSpeaking(true);
    try {
      const text = "Olá! Este é o seu painel de entregas. Para agendar uma nova entrega, clique em um dia vazio no calendário. Para enviar uma nota fiscal de uma entrega já realizada, clique no dia da entrega e selecione 'Enviar Nota Fiscal'. Se precisar de ajuda em cada passo, procure pelo ícone de som.";
      await speechService.speak(text);
    } finally {
      setIsSpeaking(false);
    }
  };
  
  const pendingDailyInvoices = useMemo(() => {
    const pending = (Object.values(supplier.deliveries || {}) as any[]).filter(d => {
        const deliveryDate = new Date(d.date + 'T00:00:00');
        return d.item === 'AGENDAMENTO PENDENTE' && deliveryDate < SIMULATED_TODAY;
    });
    const groupedByDate = pending.reduce((acc, delivery) => {
        if (!acc[delivery.date]) acc[delivery.date] = [];
        acc[delivery.date].push(delivery);
        return acc;
    }, {} as Record<string, any[]>);
    return Object.entries(groupedByDate).map(([date, deliveries]) => ({ date, deliveries })).sort((a,b) => a.date.localeCompare(b.date));
  }, [supplier.deliveries]);

  const uploadedInvoices = useMemo(() => {
    const uploaded = (Object.values(supplier.deliveries || {}) as any[]).filter(d => d.invoiceUploaded && d.invoiceNumber);
    const groupedByNf = uploaded.reduce((acc, delivery) => {
        if (!acc[delivery.invoiceNumber]) {
            acc[delivery.invoiceNumber] = {
                invoiceNumber: delivery.invoiceNumber,
                invoiceUrl: delivery.invoiceUrl,
                date: delivery.date,
                items: []
            };
        }
        acc[delivery.invoiceNumber].items.push(delivery);
        return acc;
    }, {} as Record<string, any>);
    return Object.values(groupedByNf).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [supplier.deliveries]);

  const monthlyQuotas = useMemo(() => {
    if (!selectedDate || !supplier.contractItems) return [];
    const currentMonth = selectedDate.getMonth();
    return (Object.values(supplier.contractItems || {}) as any[]).map(item => {
        const deliveredThisMonth = (Object.values(supplier.deliveries || {}) as any[])
            .filter(d => d.item === item.name && new Date(d.date + 'T00:00:00').getMonth() === currentMonth)
            .reduce((sum, d) => sum + (d.kg || 0), 0);
        
        const isWithinContract = activeContractPeriod === '1_QUAD' 
            ? currentMonth <= 3 
            : currentMonth >= 4;
            
        const divisor = activeContractPeriod === '1_QUAD' ? 4 : 8;
        const monthlyQuota = isWithinContract ? item.totalKg / divisor : 0;
        return { name: item.name, monthlyQuota, deliveredThisMonth, remainingThisMonth: monthlyQuota - deliveredThisMonth, unit: 'Kg' };
    });
  }, [selectedDate, supplier.contractItems, supplier.deliveries, activeContractPeriod]);

  const handleOpenPdf = async (url: string) => {
    let finalUrl = url;
    if (url.startsWith('rtdb://')) {
        const path = url.substring(7); // remove 'rtdb://'
        const db = getDatabase(app);
        const refPath = ref(db, path);
        try {
            const snapshot = await get(refPath);
            if (snapshot.exists()) {
                finalUrl = snapshot.val();
            } else {
                alert("PDF não encontrado no banco de dados.");
                return;
            }
        } catch (e) {
            console.error("Error fetching PDF from RTDB:", e);
            alert("Erro ao buscar o PDF.");
            return;
        }
    }

    if (finalUrl.startsWith('data:')) {
        try {
            const arr = finalUrl.split(',');
            const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
            const bstr = atob(arr[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            const blob = new Blob([u8arr], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            window.open(blobUrl, '_blank');
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        } catch (e) {
            console.error("Error opening PDF:", e);
            alert("Erro ao abrir o PDF.");
        }
    } else {
        window.open(finalUrl, '_blank');
    }
  };

  const handleGenerateReport = () => {
    if (!supplier) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const now = new Date();
    const currentMonthName = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    const currentMonthKey = now.toISOString().substring(0, 7);

    const deliveriesArray = Object.values(supplier.deliveries || {}) as any[];
    const monthDeliveries = deliveriesArray
      .filter(d => d.date.startsWith(currentMonthKey))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalWeight = monthDeliveries.reduce((sum, d) => sum + (d.kg || 0), 0);
    const totalValue = monthDeliveries.reduce((sum, d) => sum + (d.value || 0), 0);

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
    const formatDate = (dateString: string) => {
        const date = new Date(dateString + 'T00:00:00');
        return date.toLocaleDateString('pt-BR');
    };

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cronograma de Entrega - ${supplier.name}</title>
            <style>
                @page { size: A4 landscape; margin: 10mm; }
                body { font-family: Arial, sans-serif; line-height: 1.3; color: #000; font-size: 10pt; margin: 0; padding: 0; }
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
            <div class="header">CRONOGRAMA DE ENTREGA - ${currentMonthName}</div>
            <div class="info-grid">
                <div class="info-box">
                    <strong>FORNECEDOR:</strong> ${supplier.name.toUpperCase()}<br>
                    <strong>CPF/CNPJ:</strong> ${supplier.cpf}<br>
                    <strong>ENDEREÇO:</strong> ${supplier.address || 'NÃO INFORMADO'}
                </div>
                <div class="info-box">
                    <strong>PROCESSO SEI:</strong> ${supplier.processNumber || 'NÃO INFORMADO'}<br>
                    <strong>UNIDADE:</strong> PENITENCIÁRIA DE TAIUVA<br>
                    <strong>PERÍODO:</strong> ${currentMonthName}
                </div>
            </div>
            <div class="opening-text">
                Solicitamos as devidas providências no sentido de fornecer a esta Unidade Prisional os itens relacionados abaixo, conforme especificações contratuais.
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
                    ${monthDeliveries.length > 0 ? monthDeliveries.map(d => `
                        <tr>
                            <td class="text-center font-bold">${formatDate(d.date)}</td>
                            <td>
                                <div class="item-tag">
                                    <strong>${d.item || 'ENTREGA'}</strong>: ${d.kg?.toFixed(2).replace('.',',')}Kg - ${formatCurrency(d.value || 0)}
                                </div>
                            </td>
                            <td class="text-center font-bold">${(d.kg || 0).toFixed(3).replace('.',',')}</td>
                            <td class="text-right font-bold">${formatCurrency(d.value || 0)}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="4" class="text-center">Nenhuma entrega agendada para este mês.</td></tr>'}
                </tbody>
                <tfoot>
                    <tr style="background-color: #f2f2f2; font-weight: bold; font-size: 11pt;">
                        <td colspan="2" class="text-right">TOTAIS DO PERÍODO</td>
                        <td class="text-center">${totalWeight.toFixed(3).replace('.',',')} Kg</td>
                        <td class="text-right">${formatCurrency(totalValue)}</td>
                    </tr>
                </tfoot>
            </table>
            <div class="location-date">Taiuva, ${now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
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
            <script>window.onload = function() { window.print(); window.close(); }</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className={`min-h-screen text-gray-800 pb-20 transition-colors duration-500 relative overflow-hidden ${isAbrilVerde ? 'bg-[#f0fdf4]' : 'bg-gray-50'}`}>
      {isAbrilVerde && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col items-center justify-center opacity-[0.015] select-none">
          <h1 className="text-[20vw] font-black text-emerald-900 rotate-[-12deg] whitespace-nowrap">ABRIL VERDE</h1>
          <h1 className="text-[15vw] font-black text-emerald-900 rotate-[-12deg] whitespace-nowrap mt-[-5vw]">SEGURANÇA</h1>
        </div>
      )}
      <header className={`shadow-md p-4 flex justify-between items-center sticky top-0 z-50 transition-all duration-500 ${isAbrilVerde ? 'bg-emerald-950 text-white' : 'bg-white'}`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg rotate-3 transition-colors duration-500 ${isAbrilVerde ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <div>
            <h1 className={`text-xl font-black uppercase tracking-tighter italic leading-none ${isAbrilVerde ? 'text-white' : headerColor}`}>Olá, {supplier.name.split(' ')[0]}!</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 ${isAbrilVerde ? 'text-emerald-400' : 'text-gray-400'}`}>
              {isAbrilVerde ? 'Campanha Abril Verde 💚' : panelTitle}
            </p>
          </div>
          <button 
            onClick={handlePlayGeneralHelp}
            disabled={isSpeaking}
            className={`p-2 rounded-full transition-all ${isSpeaking ? (isAbrilVerde ? 'bg-emerald-800 text-white animate-pulse' : 'bg-indigo-200 text-indigo-800 animate-pulse') : (isAbrilVerde ? 'bg-emerald-900 text-emerald-400 hover:bg-emerald-800' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100')}`}
            title="Ajuda por Voz"
          >
            {isSpeaking ? <Volume2 className="h-5 w-5 animate-pulse" /> : <HelpCircle className="h-5 w-5" />}
          </button>
        </div>
        <button onClick={onLogout} className={`font-black py-2.5 px-6 rounded-xl transition-all border text-[10px] uppercase tracking-widest active:scale-95 ${isAbrilVerde ? 'bg-emerald-900 text-emerald-100 border-emerald-800 hover:bg-rose-600 hover:text-white hover:border-rose-500' : 'bg-red-50 text-red-600 border-red-100 hover:bg-red-600 hover:text-white'}`}>Sair</button>
      </header>

      <main className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Tabs de Navegação */}
        <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
            <button 
                onClick={() => setActiveTab('calendar')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'calendar' ? (isAbrilVerde ? 'bg-emerald-600 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-lg') : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <CalendarIcon className="h-4 w-4" />
                Calendário e Agendamento
            </button>
            <button 
                onClick={() => setActiveTab('invoices')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'invoices' ? (isAbrilVerde ? 'bg-emerald-600 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-lg') : 'text-gray-400 hover:bg-gray-50'}`}
            >
                <FileText className="h-4 w-4" />
                Consulta de Notas Fiscais
            </button>
        </div>

        {activeTab === 'calendar' ? (
          <>
            {/* Banner de Semanas Liberadas */}
            <div className={`${bannerColor} text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 border-b-8 animate-fade-in`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight leading-none">Semanas Liberadas</h2>
                        <p className={`text-xs font-bold ${bannerTextColor} mt-1 uppercase tracking-widest`}>Suas janelas de entrega para 2026</p>
                    </div>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="flex flex-wrap justify-center gap-2">
                        {monthlySchedule ? (
                            Object.entries(monthlySchedule).filter(([_, weeks]) => Object.values(weeks || {}).length > 0).map(([month, weeks]) => (
                                <div key={month} className="flex items-center gap-1 bg-white/20 px-3 py-1.5 rounded-xl border border-white/30">
                                    <span className="text-[9px] font-black uppercase">{month.substring(0,3)}:</span>
                                    <div className="flex gap-1">
                                        {Object.values(weeks || {}).map(w => (
                                            <span key={w as number} className="bg-white text-gray-800 w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-black shadow-sm">{w as number}</span>
                                        ))}
                                    </div>
                                </div>
                            ))
                        ) : supplier.allowedWeeks && Object.values(supplier.allowedWeeks || {}).length > 0 ? (
                            Object.values(supplier.allowedWeeks || {}).sort((a: any, b: any) => a-b).map(w => (
                                <span key={w as number} className={`${weekBadgeColor} font-black px-4 py-2 rounded-xl text-sm shadow-md`}>Semana {w as number}</span>
                            ))
                        ) : (
                            <span className="bg-green-400 text-green-950 font-black px-6 py-2 rounded-xl text-sm shadow-md uppercase">Calendário Livre</span>
                        )}
                    </div>
                    <button 
                        onClick={handleGenerateReport}
                        className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Imprimir Cronograma
                    </button>
                </div>
            </div>

            {/* Legenda do Calendário Otimizada */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-50 rounded-full border border-green-200"></div> Semana Liberada</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white rounded-full border border-gray-200 shadow-sm"></div> Dia Agendável</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 rounded-full border-2 border-green-400"></div> Agendado</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-full"></div> Faturado</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div> Pendente NF</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded-sm border border-gray-400"></div> Feriado / Bloqueado</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2">
                  <Calendar 
                    onDayClick={handleDayClick} 
                    deliveries={Object.values(supplier.deliveries || {})} 
                    simulatedToday={SIMULATED_TODAY} 
                    allowedWeeks={supplier.allowedWeeks}
                    monthlySchedule={monthlySchedule}
                    activeContractPeriod={activeContractPeriod}
                  />
              </div>
              <div className="space-y-6">
                <SummaryCard supplier={supplier} activeContractPeriod={activeContractPeriod} />
                {pendingDailyInvoices.length > 0 && (
                    <InvoiceUploader 
                        pendingInvoices={pendingDailyInvoices} 
                        onSendInvoice={handleOpenSendInvoiceModal}
                        onCancel={(ids) => onCancelDeliveries(supplier.cpf, ids)}
                    />
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
              <div className="p-6 md:p-8 bg-gray-50 border-b border-gray-100">
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Minhas Notas Fiscais</h2>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Histórico de notas enviadas e processadas</p>
              </div>
              <div className="p-4 md:p-8">
                  {uploadedInvoices.length > 0 ? (
                      <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                              <thead>
                                  <tr className="border-b-2 border-gray-100">
                                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Número NF</th>
                                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens</th>
                                      <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Arquivo</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {uploadedInvoices.map((invoice, idx) => (
                                      <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                                          <td className="p-4 font-mono text-sm text-gray-600">
                                              {new Date(invoice.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                          </td>
                                          <td className="p-4 font-black text-indigo-600 font-mono">
                                              {invoice.invoiceNumber}
                                          </td>
                                          <td className="p-4">
                                              <div className="flex flex-wrap gap-1">
                                                  {invoice.items.map((it: any, i: number) => (
                                                      <span key={i} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md uppercase">
                                                          {it.item} ({(it.kg || 0).toFixed(2).replace('.',',')} Kg)
                                                      </span>
                                                  ))}
                                              </div>
                                          </td>
                                          <td className="p-4 text-center">
                                              {invoice.invoiceUrl ? (
                                                  <button 
                                                      onClick={() => handleOpenPdf(invoice.invoiceUrl)}
                                                      className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                                  >
                                                      <Download className="h-3.5 w-3.5" />
                                                      Baixar PDF
                                                  </button>
                                              ) : (
                                                  <span className="text-[10px] font-bold text-gray-300 uppercase">Sem Anexo</span>
                                              )}
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div className="text-center py-20">
                          <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Search className="h-8 w-8 text-gray-300" />
                          </div>
                          <h3 className="text-lg font-black text-gray-400 uppercase tracking-tighter italic">Nenhuma nota encontrada</h3>
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Suas notas aparecerão aqui após o envio</p>
                      </div>
                  )}
              </div>
          </div>
        )}
      </main>

      {isModalOpen && selectedDate && (
        <DeliveryModal date={selectedDate} onClose={handleCloseModal} onSave={handleScheduleSave} monthlyQuotas={monthlyQuotas} />
      )}

      {isViewModalOpen && selectedDate && (
        <ViewDeliveryModal 
            date={selectedDate} 
            deliveries={deliveriesToShow} 
            onClose={handleCloseViewModal} 
            onAddNew={handleAddNewFromView} 
            onCancel={(ids) => { 
                setConfirmConfig({
                    isOpen: true,
                    title: 'Excluir',
                    message: 'Excluir?',
                    onConfirm: () => {
                        onCancelDeliveries(supplier.cpf, ids); 
                        handleCloseViewModal();
                        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                    },
                    variant: 'danger'
                });
            }} 
            onFulfill={handleOpenSendInvoiceModal} 
            simulatedToday={SIMULATED_TODAY} 
        />
      )}
      
      {isSendInvoiceModalOpen && invoiceToSend && (
        <SendInvoiceModal 
          invoiceInfo={invoiceToSend} 
          contractItems={supplier.contractItems || []}
          onClose={handleCloseSendInvoiceModal} 
          onSave={(invoiceNumber, invoiceUrl, deliveries, invoiceDate) => onSaveInvoice(supplier.cpf, deliveries.map(d => d.id), invoiceNumber, invoiceUrl, deliveries, invoiceDate)}
        />
      )}

      {emailModalData && <EmailConfirmationModal data={emailModalData} onClose={onCloseEmailModal} />}
      
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

export default Dashboard;
