import React, { useState, useMemo } from 'react';
import { ensureArray } from '../lib/utils';
import type { Supplier, Delivery, MonthlyQuota } from '../types';
import Calendar from './Calendar';
import DeliveryModal from './DeliveryModal';
import ViewDeliveryModal from './ViewDeliveryModal';
import SummaryCard from './SummaryCard';
import InvoiceUploader from './InvoiceUploader';
import EmailConfirmationModal from './EmailConfirmationModal';
import SendInvoiceModal from './SendInvoiceModal';
import ConfirmModal from './ConfirmModal';
import EditInvoiceItemsModal from './EditInvoiceItemsModal';
import { speechService } from '../services/speechService';
import { HelpCircle, Volume2, Calendar as CalendarIcon, FileText, Search, Download, Upload, Plus, Edit2 } from 'lucide-react';
import { HOLIDAYS_2026 } from '../constants';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebaseConfig';
import { toast } from 'sonner';

// Definindo uma data simulada para garantir que o painel mostre o mês de Maio corretamente
const SIMULATED_TODAY = new Date('2026-05-07T00:00:00');

interface DashboardProps {
  supplier: Supplier;
  type?: 'PRODUTOR' | 'FORNECEDOR';
  monthlySchedule?: Record<string, number[]>;
  isRegisteredForNextPeriod?: boolean;
  onLogout: () => void;
  onScheduleDelivery: (supplierCpf: string, date: string, time: string, invoiceNumber?: string, invoiceUrl?: string) => void;
  onCancelDeliveries: (supplierCpf: string, deliveryIds: string[]) => void;
  onSaveInvoice: (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => Promise<void>;
  onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
  emailModalData: {
    recipient: string;
    cc: string;
    subject: string;
    body: string;
    mailtoLink: string;
  } | null;
  onCloseEmailModal: () => void;
}

const getWeekNumber = (d: Date): number => {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const Dashboard: React.FC<DashboardProps> = ({ 
  supplier, 
  type = 'PRODUTOR',
  monthlySchedule,
  isRegisteredForNextPeriod = false,
  onLogout, 
  onScheduleDelivery, 
  onCancelDeliveries,
  onSaveInvoice,
  onUpdateInvoiceUrl,
  emailModalData,
  onCloseEmailModal
}) => {
  const currentMonth = new Date().getMonth();
  const isAbrilVerde = currentMonth === 3;
  const activeContractPeriod = currentMonth >= 4 ? '2_3_QUAD' : '1_QUAD';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSendInvoiceModalOpen, setIsSendInvoiceModalOpen] = useState(false);
  const [selectedInvoiceToEdit, setSelectedInvoiceToEdit] = useState<any | null>(null);
  const [isEditInvoiceModalOpen, setIsEditInvoiceModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'calendar' | 'invoices'>('calendar');
  const [invoiceToSend, setInvoiceToSend] = useState<{ date: string; deliveries: Delivery[] } | null>(null);
  const [deliveriesToShow, setDeliveriesToShow] = useState<Delivery[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [printMonth, setPrintMonth] = useState<string>('');
  
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

  const handleDayClick = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    const deliveriesOnDate = ensureArray<Delivery>(supplier.deliveries).filter(d => d.date === dateString);
    
    // Check if week is allowed
    if (supplier.allowedWeeks && supplier.allowedWeeks.length > 0) {
        const weekNum = getWeekNumber(date);
        if (!supplier.allowedWeeks.includes(weekNum) && deliveriesOnDate.length === 0) {
            toast.error(`Agendamento bloqueado: A semana ${weekNum} não está liberada para o seu contrato.`);
            return;
        }
    }

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
  
  const pendingDailyInvoices = useMemo((): {date: string, deliveries: Delivery[]}[] => {
    const pending = ensureArray<Delivery>(supplier.deliveries).filter(d => {
        const deliveryDate = new Date(d.date + 'T00:00:00');
        return !d.invoiceNumber && deliveryDate <= SIMULATED_TODAY;
    });
    const groupedByDate = pending.reduce((acc, delivery) => {
        if (!acc[delivery.date]) acc[delivery.date] = [];
        acc[delivery.date].push(delivery);
        return acc;
    }, {} as Record<string, any[]>);
    return Object.entries(groupedByDate).map(([date, deliveries]) => ({ date, deliveries: deliveries as Delivery[] })).sort((a,b) => b.date.localeCompare(a.date));
  }, [supplier.deliveries]);

  const uploadedInvoices = useMemo((): any[] => {
    const deliveries = ensureArray<Delivery>(supplier.deliveries);
    const groupedByNf = deliveries.reduce((acc, delivery) => {
        if (delivery.invoiceNumber) {
            if (!acc[delivery.invoiceNumber]) {
                acc[delivery.invoiceNumber] = {
                    invoiceNumber: delivery.invoiceNumber,
                    invoiceUrl: delivery.invoiceUrl,
                    date: delivery.date,
                    items: [],
                    isUploaded: true
                };
            }
            acc[delivery.invoiceNumber].items.push(delivery);
        } else {
            // Delivery without invoice number - show it as a pending entry
            // only if it's in the past
            const deliveryDate = new Date(delivery.date + 'T00:00:00');
            if (deliveryDate <= SIMULATED_TODAY) {
                const key = `pending-${delivery.date}`;
                if (!acc[key]) {
                    acc[key] = {
                        invoiceNumber: 'PENDENTE',
                        invoiceUrl: null,
                        date: delivery.date,
                        items: [],
                        isUploaded: false,
                        isPending: true
                    };
                }
                acc[key].items.push(delivery);
            }
        }
        return acc;
    }, {} as Record<string, any>);
    return Object.values(groupedByNf).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [supplier.deliveries]);

  const monthlyQuotas = useMemo((): MonthlyQuota[] => {
    if (!selectedDate || !supplier.contractItems) return [];
    const currentMonth = selectedDate.getMonth();
    return ensureArray<any>(supplier.contractItems).map((item: any) => {
        const deliveredThisMonth = ensureArray<Delivery>(supplier.deliveries)
            .filter((d: any) => d.item === item.name && new Date(String(d.date) + 'T00:00:00').getMonth() === currentMonth)
            .reduce((sum, d: any) => sum + (d.kg || 0), 0);
        
        const isQ1 = currentMonth <= 3;
        const divisor = isQ1 ? 4 : 8; // Everything uses 8 for the long period except specifically quadrimestral contracts
        const monthlyQuota = item.totalKg / divisor;
        return { name: item.name, monthlyQuota, deliveredThisMonth, remainingThisMonth: monthlyQuota - deliveredThisMonth, unit: 'Kg' };
    });
  }, [selectedDate, supplier.contractItems, supplier.deliveries]);

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

    const targetMonthKey = printMonth || new Date().toISOString().substring(0, 7);
    const targetMonthDate = new Date(targetMonthKey + '-15');
    const targetMonthName = targetMonthDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();

    const monthIndex = targetMonthDate.getMonth();
    const selectedYear = targetMonthDate.getFullYear();

    const isQ1 = monthIndex <= 3;
    const divisor = isQ1 ? 4 : 8;

    const contractItems = ensureArray<any>(supplier.contractItems);

    const availableDatesList: string[] = [];
    const daysInMonthObj = new Date(selectedYear, monthIndex + 1, 0).getDate();
    const validWeeksForPC = supplier.monthlySchedule?.[targetMonthName.split(' ')[0].toLowerCase()];
    const allowedWeeksArray = supplier.allowedWeeks || [];

    const getWeekNumberLocal = (d: Date): number => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    };

    for (let d = 1; d <= daysInMonthObj; d++) {
        const date = new Date(selectedYear, monthIndex, d);
        const dateStrRaw = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = !!HOLIDAYS_2026[dateStrRaw];
        
        if (!isWeekend && !isHoliday) {
            if (validWeeksForPC && validWeeksForPC.length > 0) {
                const wNum = getWeekNumberLocal(new Date(dateStrRaw + 'T12:00:00'));
                if (validWeeksForPC.includes(wNum)) {
                    availableDatesList.push(date.toLocaleDateString('pt-BR'));
                }
            } else if (allowedWeeksArray.length > 0) {
                const wNum = getWeekNumberLocal(new Date(dateStrRaw + 'T12:00:00'));
                if (allowedWeeksArray.includes(wNum)) {
                    availableDatesList.push(date.toLocaleDateString('pt-BR'));
                }
            } else {
                availableDatesList.push(date.toLocaleDateString('pt-BR'));
            }
        }
    }

    const datesScheduled = availableDatesList.length > 0 ? availableDatesList.join(', ') : 'NENHUM DIA DISPONÍVEL';

    const printItems = contractItems.map(item => {
        const quota = (item.totalKg || 0) / divisor;
        return {
            item: item.name,
            totalKg: quota,
            datesScheduled: datesScheduled
        };
    }).sort((a, b) => a.item.localeCompare(b.item));

    const commitmentNumbers = [...new Set(printItems.map(d => {
        const contractItem = contractItems.find((ci: any) => ci.name === d.item);
        return contractItem?.commitmentNumber;
    }).filter(Boolean))];
    const commitmentStr = commitmentNumbers.length > 0 ? commitmentNumbers.join(' / ') : 'NÃO INFORMADO';

    const now = new Date();
    const totalWeight = printItems.reduce((sum, i) => sum + (i.totalKg || 0), 0);

    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Romaneio - ${supplier.name}</title>
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
                .signatures { margin-top: 50px; display: flex; justify-content: space-around; }
                .signature-block { text-align: center; width: 300px; }
                .signature-line { border-top: 1px solid #000; margin-bottom: 5px; }
                .signature-name { font-weight: bold; text-transform: uppercase; font-size: 9pt; }
                .signature-title { font-size: 8pt; }
                .location-date { margin-top: 20px; text-align: right; font-weight: bold; }
                .text-xs { font-size: 7.5pt; }
            </style>
        </head>
        <body>
            <div class="header">ROMANEIO - ${targetMonthName}</div>
            <div class="info-grid">
                <div class="info-box">
                    <strong>FORNECEDOR:</strong> ${supplier.name.toUpperCase()}<br>
                    <strong>CPF/CNPJ:</strong> ${supplier.cpf}<br>
                    <strong>ENDEREÇO:</strong> ${supplier.address || 'NÃO INFORMADO'}
                </div>
                <div class="info-box">
                    <strong>PROCESSO SEI:</strong> ${supplier.processNumber || 'NÃO INFORMADO'}<br>
                    <strong>UNIDADE:</strong> PENITENCIÁRIA DE TAIÚVA<br>
                    <strong>PERÍODO:</strong> ${targetMonthName}<br>
                    <strong>Nº EMPENHO:</strong> ${commitmentStr}
                </div>
            </div>
            <div class="opening-text">
                Solicitamos as devidas providências no sentido de fornecer a esta Unidade Prisional os itens relacionados abaixo, conforme especificações contratuais.
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
                    ${printItems.length > 0 ? printItems.map(itemGroup => {
                        return `
                            <tr>
                                <td><strong>${itemGroup.item}</strong></td>
                                <td class="text-center font-bold">${itemGroup.totalKg.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</td>
                                <td class="text-center text-xs">${itemGroup.datesScheduled}</td>
                                <td></td>
                            </tr>
                        `;
                    }).join('') : '<tr><td colspan="4" class="text-center">Nenhum item contratual cadastrado.</td></tr>'}
                    <tr style="background-color: #f2f2f2; font-weight: bold; font-size: 11pt;">
                        <td class="text-right">TOTAIS DO PERÍODO</td>
                        <td class="text-center">${totalWeight.toLocaleString('pt-BR', { minimumFractionDigits: 3 })} Kg</td>
                        <td colspan="2"></td>
                    </tr>
                </tbody>
            </table>
            <div class="location-date">Taiúva, ${now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div class="signatures">
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-name">${supplier.name.toUpperCase()}</div>
                    <div class="signature-title">Contratado</div>
                </div>
                <div class="signature-block">
                    <div class="signature-line"></div>
                    <div class="signature-title text-black font-bold uppercase" style="margin-top: 4px;">Responsável pelo Almoxarifado</div>
                </div>
            </div>
            <script>window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 500); }</script>
        </body>
        </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const deliveriesList = ensureArray<any>(supplier.deliveries);
  const allowedWeeksArray = supplier.allowedWeeks || [];
  const todayWeek = getWeekNumber(SIMULATED_TODAY);
  const currentMonthIdx = SIMULATED_TODAY.getMonth(); // 4 for May 2026

  const monthsList = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  // Define period-specific months that are valid for activeContractPeriod
  const periodMonths = activeContractPeriod === '2_3_QUAD'
    ? ['maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
    : ['janeiro', 'fevereiro', 'março', 'abril'];

  // Filter it down to only months of the current period that have already arrived (<= currentMonthIdx)
  const arrivedMonths = periodMonths.filter(m => {
    const mIdx = monthsList.indexOf(m);
    return mIdx <= currentMonthIdx;
  });

  // Helper to determine the month of a week number in 2026
  const getWeekMonth = (weekNum: number): number => {
    const janFirst = new Date(2026, 0, 1);
    const dayOffset = (4 - (janFirst.getDay() || 7));
    const firstThursday = new Date(2026, 0, 1 + dayOffset);
    const targetThursday = new Date(firstThursday.getTime() + (weekNum - 1) * 7 * 24 * 60 * 60 * 1000);
    return targetThursday.getMonth();
  };

  // Helper to verify if a week belongs to any of the arrived months
  const isWeekInArrivedMonth = (w: number): boolean => {
    if (supplier.monthlySchedule && Object.keys(supplier.monthlySchedule).length > 0) {
      return arrivedMonths.some(mName => {
        const weeksForMonth = supplier.monthlySchedule?.[mName] || supplier.monthlySchedule?.[mName.toUpperCase()] || [];
        return weeksForMonth.includes(w);
      });
    } else {
      const wMonthIdx = getWeekMonth(w);
      const wMonthName = monthsList[wMonthIdx];
      return arrivedMonths.includes(wMonthName);
    }
  };

  const lateWeeks: number[] = [];

  // 1. If there are pending appointments in the past
  deliveriesList.forEach(d => {
    if (d.item === 'AGENDAMENTO PENDENTE') {
      const dDate = new Date(d.date + 'T00:00:00');
      if (dDate < SIMULATED_TODAY) {
        const wNo = getWeekNumber(dDate);
        const dMonthName = monthsList[dDate.getMonth()];
        if (arrivedMonths.includes(dMonthName) && isWeekInArrivedMonth(wNo)) {
          if (!lateWeeks.includes(wNo)) {
            lateWeeks.push(wNo);
          }
        }
      }
    }
  });

  // 2. Check each allowed week prior to today's week
  for (const w of allowedWeeksArray) {
    if (w < todayWeek) {
      if (isWeekInArrivedMonth(w)) {
        // Did they deliver in this week?
        const hasDelivery = deliveriesList.some(d => {
          const dDate = new Date(d.date + 'T00:00:00');
          const isCompleted = d.item !== 'AGENDAMENTO PENDENTE' && (d.invoiceNumber || d.invoiceUploaded);
          return getWeekNumber(dDate) === w && isCompleted;
        });
        if (!hasDelivery) {
          if (!lateWeeks.includes(w)) {
            lateWeeks.push(w);
          }
        }
      }
    }
  }

  lateWeeks.sort((a, b) => a - b);
  const isLateCalc = lateWeeks.length > 0;

  // 3. Invoice or PDF missing (pendência de envio da nota fiscal)
  const hasInvoicePendency = deliveriesList.some(d => {
    if (d.item === 'AGENDAMENTO PENDENTE') return false;
    const dDate = new Date(d.date + 'T00:00:00');
    const dMonthName = monthsList[dDate.getMonth()];
    if (!arrivedMonths.includes(dMonthName)) return false;

    // Past or today deliveries that are completed but don't have invoiceNumber or invoiceUrl
    return dDate <= SIMULATED_TODAY && (!d.invoiceNumber || !d.invoiceUrl);
  });

  // 4. Current month alert check: are there ANY allowed weeks in the current month (May) that do not have a scheduled delivery yet?
  const currentMonthName = monthsList[currentMonthIdx]; // "maio"
  const isWeekInCurrentMonth = (w: number): boolean => {
    if (supplier.monthlySchedule && Object.keys(supplier.monthlySchedule).length > 0) {
      const weeksForMonth = supplier.monthlySchedule?.[currentMonthName] || supplier.monthlySchedule?.[currentMonthName.toUpperCase()] || [];
      return weeksForMonth.includes(w);
    } else {
      const wMonthIdx = getWeekMonth(w);
      const wMonthName = monthsList[wMonthIdx];
      return wMonthName === currentMonthName;
    }
  };

  const hasPendingSchedulingInCurrentMonth = allowedWeeksArray.some(w => {
    if (!isWeekInCurrentMonth(w)) return false;
    const hasDeliveryInWeek = deliveriesList.some(d => {
      const dDate = new Date(d.date + 'T00:00:00');
      return getWeekNumber(dDate) === w;
    });
    return !hasDeliveryInWeek;
  });

  // Let's build the array of warning messages to display inside the marquee
  const alertMessages: string[] = [];

  if (isLateCalc) {
    const weekLabel = lateWeeks.length === 1 ? 'SEMANA' : 'SEMANAS';
    alertMessages.push(`⚠️ ATENÇÃO, CONFORME AGENDAMENTOS E CRONOGRAMAS HÁ ENTREGAS A SEREM REALIZADAS • ENTREGA EM ATRASO (${weekLabel}: ${lateWeeks.join(', ')})`);
  }

  if (hasInvoicePendency) {
    alertMessages.push("⚠️ CONSTA PENDENCIA DE ENVIO DA NOTA FISCAL - FAVOR REGULARIZAR");
  }

  if (hasPendingSchedulingInCurrentMonth) {
    alertMessages.push("⚠️ ATENÇÃO SEMANA DE ENTREGA REALIZAR O AGENDAMENTO");
  }

  const isYellowAlert = alertMessages.length > 0;
  const marqueeText = isYellowAlert 
    ? alertMessages.join(' • ') 
    : '✅ ENTREGA DENTRO DO CRONOGRAMA • PARABÉNS! SEU CONTRATO ENCONTRA-SE TOTALMENTE EM DIA COM TODAS AS ENTREGAS PROGRAMADAS! AGRADECEMOS SUA EFICIÊNCIA • ENTREGA DENTRO DO CRONOGRAMA ✅';

  const deliveryStatus = {
    isLate: isYellowAlert,
    message: marqueeText
  };

  return (
    <div className={`min-h-screen text-gray-800 pb-20 transition-colors duration-500 relative overflow-hidden ${isAbrilVerde ? 'bg-[#f0fdf4]' : 'bg-gray-50'}`}>
      {isAbrilVerde && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none flex flex-col items-center justify-center opacity-[0.015] select-none">
          <h1 className="text-[20vw] font-black text-emerald-900 rotate-[-12deg] whitespace-nowrap">ABRIL VERDE</h1>
          <h1 className="text-[15vw] font-black text-emerald-950 rotate-[-12deg] whitespace-nowrap mt-[-5vw]">SEGURANÇA</h1>
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

        {/* Letreiro de Texto Corrido (Marquee/Letreiro de Texto) */}
        <div className="flex-1 max-w-sm md:max-w-xl lg:max-w-3xl mx-6 hidden sm:block">
          <div className={`px-5 py-3 rounded-2xl flex items-center gap-3.5 overflow-hidden border-2 shadow-sm transition-all duration-350 ${
            deliveryStatus.isLate 
              ? 'bg-yellow-50 border-yellow-400 text-yellow-700 font-sans' 
              : 'bg-green-50 border-green-400 text-green-700 font-sans'
          }`}>
            <span className="relative flex h-3 w-3 flex-shrink-0">
              {deliveryStatus.isLate && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${deliveryStatus.isLate ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
            </span>
            <div className="flex-1 overflow-hidden select-none whitespace-nowrap">
              <div className="inline-block animate-[marquee_20s_linear_infinite] font-extrabold text-[11px] uppercase tracking-wider">
                {deliveryStatus.message}
              </div>
            </div>
          </div>
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
            {/* Banner de Calendário Livre */}
            <div className={`${bannerColor} text-white p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-center gap-4 border-b-8 animate-fade-in`}>
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase tracking-tight leading-none">Calendário Liberado</h2>
                        <p className={`text-xs font-bold ${bannerTextColor} mt-1 uppercase tracking-widest`}>Agendamento disponível para todos os dias úteis</p>
                    </div>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-3">
                    <div className="flex flex-wrap justify-center gap-2">
                        <span className="bg-green-400 text-green-950 font-black px-6 py-2 rounded-xl text-sm shadow-md uppercase tracking-widest">Aberto para Agendamento</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <select 
                            value={printMonth}
                            onChange={(e) => setPrintMonth(e.target.value)}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all outline-none"
                        >
                            <option value="" className="text-black">Mês Atual</option>
                            {['05','06','07','08','09','10','11','12'].map(m => {
                                const ym = `2026-${m}`;
                                const d = new Date(ym + '-15');
                                const label = `${d.toLocaleDateString('pt-BR', { month: 'long' })} DE 2026`.toUpperCase();
                                return <option key={ym} value={ym} className="text-black">{label}</option>;
                            })}
                        </select>
                        <button 
                            onClick={handleGenerateReport}
                            className="bg-white hover:bg-gray-100 text-blue-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <Download className="h-3.5 w-3.5" />
                            Imprimir Romaneio
                        </button>
                    </div>
                </div>
            </div>

            {/* Legenda do Calendário Otimizada */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-white rounded-full border border-gray-200 shadow-sm"></div> Dia Disponível</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-100 rounded-full border-2 border-green-400"></div> Agendado</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-600 rounded-full"></div> Faturado</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div> Pendente NF</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded-sm border border-gray-400"></div> Feriado / Bloqueado</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
              <div className="lg:col-span-2">
                  <Calendar 
                    onDayClick={handleDayClick} 
                    deliveries={ensureArray<Delivery>(supplier.deliveries)} 
                    allowedWeeks={supplier.allowedWeeks}
                    monthlySchedule={monthlySchedule}
                    activeContractPeriod={activeContractPeriod}
                  />
              </div>
              <div className="space-y-6">
                <button 
                  onClick={() => handleOpenSendInvoiceModal({ date: new Date().toISOString().split('T')[0], deliveries: [] })}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white p-5 rounded-3xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all active:scale-95 group"
                >
                  <div className="bg-white/20 p-2 rounded-xl group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="leading-none">Cadastrar Nota PDF</p>
                    <p className="text-[9px] font-bold opacity-70 mt-1">Vincular arquivos aos agendamentos</p>
                  </div>
                </button>

                <SummaryCard 
                  supplier={supplier} 
                  activeContractPeriod={activeContractPeriod} 
                  isRegisteredForNextPeriod={isRegisteredForNextPeriod}
                  isPpaisProducer={type === 'PRODUTOR'}
                  onOpenSendInvoiceModal={handleOpenSendInvoiceModal}
                />
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
              <div className="p-6 md:p-8 bg-gray-50 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Minhas Notas Fiscais</h2>
                    <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Histórico de notas enviadas e processadas</p>
                  </div>
                  <button 
                    onClick={() => handleOpenSendInvoiceModal({ date: new Date().toISOString().split('T')[0], deliveries: [] })}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Enviar Nova Nota Fiscal
                  </button>
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
                                      <tr key={idx} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${invoice.isPending ? 'bg-rose-50/30' : ''}`}>
                                          <td className="p-4 font-mono text-sm text-gray-600">
                                              {new Date(invoice.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                                          </td>
                                          <td className={`p-4 font-black font-mono ${invoice.isPending ? 'text-rose-500' : 'text-indigo-600'}`}>
                                              {invoice.invoiceNumber}
                                          </td>
                                          <td className="p-4">
                                              <div className="flex flex-wrap gap-1">
                                                  {invoice.items.map((it: any, i: number) => (
                                                      <span key={i} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-2 py-1 rounded-md uppercase">
                                                          {it.item || it.itemName || ''} ({(it.kg || 0).toFixed(2).replace('.',',')} Kg)
                                                      </span>
                                                  ))}
                                              </div>
                                          </td>
                                          <td className="p-4 text-center">
                                              <div className="flex items-center justify-center gap-3">
                                                  <button 
                                                      onClick={() => {
                                                          setSelectedInvoiceToEdit(invoice);
                                                          setIsEditInvoiceModalOpen(true);
                                                      }}
                                                      className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 hover:bg-amber-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm active:scale-95 cursor-pointer"
                                                      title="Editar Itens da Nota"
                                                  >
                                                      <Edit2 className="h-3.5 w-3.5" />
                                                      Editar Itens
                                                  </button>

                                                  {invoice.invoiceUrl ? (
                                                      <button 
                                                          onClick={() => handleOpenPdf(invoice.invoiceUrl)}
                                                          className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
                                                      >
                                                          <Download className="h-3.5 w-3.5" />
                                                          Baixar
                                                      </button>
                                                  ) : (
                                                      <div className="flex flex-col items-center">
                                                          <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter">Pendente Anexo</span>
                                                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">Envie o PDF abaixo</span>
                                                      </div>
                                                  )}
                                                  
                                                  <div className="relative group">
                                                      <input 
                                                          type="file" 
                                                          id={`file-upload-${invoice.isPending ? invoice.items[0].id : invoice.invoiceNumber}`} 
                                                          className="hidden" 
                                                          accept="application/pdf"
                                                          onChange={(e) => {
                                                              if (e.target.files && e.target.files[0]) {
                                                                  try {
                                                                      const file = e.target.files[0];
                                                                      const reader = new FileReader();
                                                                      reader.onload = async (event) => {
                                                                          try {
                                                                              const result = await onUpdateInvoiceUrl(supplier.cpf, invoice.invoiceNumber, event.target?.result as string);
                                                                              if (result && result.success === false) {
                                                                                  toast.error(result.message || 'Erro ao enviar a nota.');
                                                                              } else {
                                                                                  toast.success('Nota enviada com sucesso!');
                                                                              }
                                                                          } catch (_err) {
                                                                              toast.error('Erro de conexão ao enviar a nota.');
                                                                          }
                                                                      };
                                                                      reader.onerror = () => {
                                                                          toast.error('Erro ao ler o arquivo.');
                                                                      };
                                                                      reader.readAsDataURL(file);
                                                                  } catch (error) {
                                                                      console.error(error);
                                                                      toast.error('Erro ao processar o arquivo.');
                                                                  }
                                                              }
                                                          }} 
                                                      />
                                                      <button 
                                                          onClick={() => {
                                                              if (invoice.isPending) {
                                                                  handleOpenSendInvoiceModal({ date: invoice.date, deliveries: invoice.items });
                                                              } else {
                                                                  document.getElementById(`file-upload-${invoice.isPending ? invoice.items[0].id : invoice.invoiceNumber}`)?.click();
                                                              }
                                                          }} 
                                                          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 ${invoice.invoiceUrl ? 'bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white' : 'bg-rose-600 text-white hover:bg-rose-700'}`} 
                                                          title="Upload Nota"
                                                      >
                                                          <Upload className="h-3.5 w-3.5" />
                                                          {invoice.invoiceUrl ? 'Reenviar' : invoice.isPending ? 'Vincular Nota' : 'Enviar PDF'}
                                                      </button>
                                                  </div>
                                              </div>
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
                          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1 mb-8">Suas notas aparecerão aqui após o envio</p>
                          <button 
                            onClick={() => handleOpenSendInvoiceModal({ date: new Date().toISOString().split('T')[0], deliveries: [] })}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all active:scale-95"
                          >
                            <Plus className="w-5 h-5" />
                            Enviar Primeira Nota Fiscal
                          </button>
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
                    title: ids.length > 1 ? 'Excluir Agendamentos' : 'Excluir Agendamento',
                    message: ids.length > 1 ? `Deseja realmente excluir os ${ids.length} agendamentos selecionados? Esta ação não pode ser desfeita.` : 'Deseja realmente excluir este agendamento? Esta ação não pode ser desfeita.',
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

      {isEditInvoiceModalOpen && selectedInvoiceToEdit && (
        <EditInvoiceItemsModal
          key={selectedInvoiceToEdit.invoiceNumber || 'edit-invoice-modal'}
          isOpen={isEditInvoiceModalOpen}
          invoice={selectedInvoiceToEdit}
          contractItems={supplier.contractItems || []}
          onClose={() => {
            setIsEditInvoiceModalOpen(false);
            setSelectedInvoiceToEdit(null);
          }}
          onSave={async (invoiceNumber, invoiceUrl, updatedDeliveries, invoiceDate, originalDeliveryIds) => {
            await onSaveInvoice(supplier.cpf, originalDeliveryIds, invoiceNumber, invoiceUrl, updatedDeliveries, invoiceDate);
            setIsEditInvoiceModalOpen(false);
            setSelectedInvoiceToEdit(null);
          }}
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
