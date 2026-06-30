
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Supplier, ThirdPartyEntryLog, Delivery } from '../types';
import { Calendar, Clock, Truck, UserCheck, AlertCircle, Search, Trash2, CheckCircle2, FilePlus, QrCode, FileText } from 'lucide-react';
import { toast } from 'sonner';
import SendInvoiceModal from './SendInvoiceModal';
import { Html5Qrcode } from 'html5-qrcode';
import { ensureArray } from '../lib/utils';

interface AgendaChegadasProps {
    suppliers: Supplier[];
    thirdPartyEntries: ThirdPartyEntryLog[];
    embedded?: boolean;
    perCapitaConfig?: any;
    onDeleteDelivery?: (supplierCpf: string, deliveryId: string) => Promise<{ success: boolean; message?: string }>;
    onUpdateDelivery?: (supplierCpf: string, deliveryId: string, updates: Partial<Delivery>) => Promise<{ success: boolean; message?: string }>;
    onSaveInvoice?: (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => Promise<void>;
    onUpdateThirdPartyEntry?: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message?: string }>;
}

const AgendaChegadas: React.FC<AgendaChegadasProps> = ({ 
    suppliers, 
    thirdPartyEntries, 
    embedded,
    perCapitaConfig,
    onDeleteDelivery,
    onUpdateDelivery,
    onSaveInvoice,
    onUpdateThirdPartyEntry
}) => {
    const [selectedAgendaDate, setSelectedAgendaDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isArrivalModalOpen, setIsArrivalModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [arrivalData, setArrivalData] = useState({ arrivalTime: '', invoiceNumber: '' });
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const [invoiceInfo, setInvoiceInfo] = useState<{ date: string; deliveries: Delivery[]; supplierCpf: string } | null>(null);

    // QR Code Scanner States
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerMode, setScannerMode] = useState<'camera' | 'manual'>('camera');
    const [scanAction, setScanAction] = useState<'entrada' | 'saida'>('entrada');
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [exitTimeInput, setExitTimeInput] = useState('');
    const [manualInputValue, setManualInputValue] = useState('');
    const manualInputRef = useRef<HTMLInputElement>(null);

    // Auto focus manual scan input
    useEffect(() => {
        if (isScannerOpen && scannerMode === 'manual') {
            const timer = setTimeout(() => {
                manualInputRef.current?.focus();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isScannerOpen, scannerMode]);

    const locateDeliveryForCpfAndDate = (cpf: string, targetDate: string) => {
        const groups: Record<string, any> = {};
        
        const processDelivery = (s: Supplier, d: any) => {
            if (!d || d.date !== targetDate) return;
            const sClean = (s.cpf || '').replace(/[^\d]/g, '');
            const targetClean = (cpf || '').replace(/[^\d]/g, '');
            if (sClean !== targetClean) return;
            
            const groupKey = `${s.cpf || ''}-${d.time}`;
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    id: d.id,
                    allIds: [d.id],
                    supplierName: s.name,
                    supplierCpf: s.cpf,
                    time: d.time,
                    arrivalTime: d.arrivalTime,
                    deliveries: [d]
                };
            } else {
                groups[groupKey].allIds.push(d.id);
                groups[groupKey].deliveries.push(d);
            }
        };

        ensureArray(suppliers).forEach(s => {
            if (!s) return;
            const deliveries = ensureArray(s.deliveries);
            deliveries.forEach(d => processDelivery(s as any, d));
        });

        if (perCapitaConfig) {
            ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'].forEach(key => {
                const producers = ensureArray(perCapitaConfig[key]);
                producers.forEach((p: any) => {
                    const deliveries = ensureArray(p.deliveries);
                    deliveries.forEach(d => processDelivery({ name: p.name, cpf: p.cpfCnpj || p.cpf } as any, d));
                });
            });
        }

        const list = Object.values(groups);
        return list.length > 0 ? list[0] : null;
    };

    const handleScanSuccess = async (text: string) => {
        if (!text) return;
        
        let cpf = '';
        let date = selectedAgendaDate;
        
        if (text.startsWith('CHECKIN_DELIVERY:')) {
            const parts = text.split(':');
            if (parts.length >= 3) {
                cpf = parts[1];
                date = parts[2];
            }
        } else {
            // Tenta buscar por CPF bruto ou CNPJ
            cpf = text.replace(/[^\d]/g, '');
        }

        if (!cpf) {
            toast.error("Código QR ou CPF inválido.");
            setIsScannerOpen(false);
            return;
        }
        
        if (date !== selectedAgendaDate) {
            toast.error(`Ação NÃO liberada! Este agendamento é para o dia ${date}, mas a data selecionada na portaria é ${selectedAgendaDate}.`);
            setIsScannerOpen(false);
            return;
        }
        
        const foundGroup = locateDeliveryForCpfAndDate(cpf, date);
        const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (foundGroup) {
            if (scanAction === 'entrada') {
                if (foundGroup.arrivalTime) {
                    toast.info(`Chegada de ${foundGroup.supplierName} já foi registrada às ${foundGroup.arrivalTime}`);
                    setIsScannerOpen(false);
                    return;
                }
                
                if (onUpdateDelivery) {
                    let success = true;
                    for (const id of foundGroup.allIds) {
                        const res = await onUpdateDelivery(foundGroup.supplierCpf, id, {
                            arrivalTime: nowTime
                        });
                        if (!res.success) success = false;
                    }
                    if (success) {
                        toast.success(`Check-In Realizado! Entrada de ${foundGroup.supplierName} liberada às ${nowTime}`);
                    } else {
                        toast.error(`Falha ao registrar a chegada no servidor.`);
                    }
                } else {
                    toast.success(`QR Code validado com sucesso para ${foundGroup.supplierName}!`);
                }
            } else {
                // scanAction === 'saida'
                if (foundGroup.exitTime) {
                    toast.info(`Saída de ${foundGroup.supplierName} já foi registrada às ${foundGroup.exitTime}`);
                    setIsScannerOpen(false);
                    return;
                }
                
                if (onUpdateDelivery) {
                    let success = true;
                    for (const id of foundGroup.allIds) {
                        const res = await onUpdateDelivery(foundGroup.supplierCpf, id, {
                            exitTime: nowTime
                        });
                        if (!res.success) success = false;
                    }
                    if (success) {
                        toast.success(`Check-Out Realizado! Saída de ${foundGroup.supplierName} confirmada às ${nowTime}`);
                    } else {
                        toast.error(`Falha ao registrar a saída no servidor.`);
                    }
                } else {
                    toast.success(`Saída validada com sucesso para ${foundGroup.supplierName}!`);
                }
            }
            setIsScannerOpen(false);
        } else {
            // Tenta localizar nos Terceiros
            const log = (thirdPartyEntries || []).find(l => 
                l.date === date && 
                l.companyCnpj.replace(/[^\d]/g, '') === cpf
            );

            if (log) {
                if (scanAction === 'entrada') {
                    if (log.arrivalTime) {
                        toast.info(`Chegada de ${log.companyName} já foi registrada às ${log.arrivalTime}`);
                        setIsScannerOpen(false);
                        return;
                    }
                    if (onUpdateThirdPartyEntry) {
                        const res = await onUpdateThirdPartyEntry({
                            ...log,
                            arrivalTime: nowTime,
                            status: 'concluido'
                        });
                        if (res.success) {
                            toast.success(`Check-In Realizado! Entrada de ${log.companyName} confirmada às ${nowTime}`);
                        } else {
                            toast.error("Erro ao registrar entrada.");
                        }
                    }
                } else {
                    // scanAction === 'saida'
                    if (log.exitTime) {
                        toast.info(`Saída de ${log.companyName} já foi registrada às ${log.exitTime}`);
                        setIsScannerOpen(false);
                        return;
                    }
                    if (onUpdateThirdPartyEntry) {
                        const res = await onUpdateThirdPartyEntry({
                            ...log,
                            exitTime: nowTime,
                            status: 'concluido'
                        });
                        if (res.success) {
                            toast.success(`Check-Out Realizado! Saída de ${log.companyName} confirmada às ${nowTime}`);
                        } else {
                            toast.error("Erro ao registrar saída.");
                        }
                    }
                }
                setIsScannerOpen(false);
            } else {
                toast.error(`Nenhum agendamento pendente encontrado para o CPF/CNPJ ${cpf} no dia ${date}.`);
                setIsScannerOpen(false);
            }
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualInputValue.trim()) {
            handleScanSuccess(manualInputValue.trim());
            setManualInputValue('');
        }
    };

    // Camera Scan effect
    useEffect(() => {
        let html5QrCode: Html5Qrcode | null = null;
        let isStopped = false;

        if (isScannerOpen && scannerMode === 'camera') {
            const timer = setTimeout(() => {
                try {
                    const element = document.getElementById("qr-reader");
                    if (!element) return;

                    html5QrCode = new Html5Qrcode("qr-reader");
                    
                    const startScanner = async () => {
                        try {
                            await html5QrCode?.start(
                                { facingMode: "environment" },
                                {
                                    fps: 10,
                                    qrbox: { width: 250, height: 250 }
                                },
                                (decodedText) => {
                                    handleScanSuccess(decodedText);
                                    if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                        isStopped = true;
                                        html5QrCode.stop().catch(err => console.warn("Erro ao parar camera:", err));
                                    }
                                },
                                () => {}
                            );
                        } catch (err) {
                            console.warn("Failed with environment camera, trying user camera...", err);
                            if (isStopped) return;
                            try {
                                await html5QrCode?.start(
                                    { facingMode: "user" },
                                    {
                                        fps: 10,
                                        qrbox: { width: 250, height: 250 }
                                    },
                                    (decodedText) => {
                                        handleScanSuccess(decodedText);
                                        if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                            isStopped = true;
                                            html5QrCode.stop().catch(stopErr => console.warn("Erro:", stopErr));
                                        }
                                    },
                                    () => {}
                                );
                            } catch (fallbackErr) {
                                console.error("Camera fallback failed too:", fallbackErr);
                                try {
                                    const devices = await Html5Qrcode.getCameras();
                                    if (devices && devices.length > 0 && !isStopped) {
                                        const cameraId = devices[devices.length - 1].id;
                                        await html5QrCode?.start(
                                            cameraId,
                                            { fps: 10, qrbox: { width: 250, height: 250 } },
                                            (decodedText) => {
                                                handleScanSuccess(decodedText);
                                                if (html5QrCode && html5QrCode.isScanning && !isStopped) {
                                                    isStopped = true;
                                                    html5QrCode.stop().catch(() => {});
                                                }
                                            },
                                            () => {}
                                        );
                                    } else {
                                        toast.error("Nenhuma câmera encontrada no dispositivo.");
                                    }
                                } catch (_deviceErr) {
                                    toast.error("Não foi possível acessar a câmera do dispositivo.");
                                }
                            }
                        }
                    };

                    startScanner();
                } catch (e) {
                    console.error("Camera scanner instance error:", e);
                }
            }, 300);

            return () => {
                clearTimeout(timer);
                isStopped = true;
                if (html5QrCode) {
                    const stopScanner = async () => {
                        try {
                            if (html5QrCode && html5QrCode.isScanning) {
                                await html5QrCode.stop();
                            }
                        } catch (err) {
                            console.warn("Erro ao parar camera no cleanup:", err);
                        }
                    };
                    stopScanner();
                }
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScannerOpen, scannerMode, selectedAgendaDate]);

    const dailyDeliveries = useMemo(() => {
        const groups: Record<string, any> = {};
        
        const processDelivery = (s: Supplier, d: any, type: 'FORNECEDOR' | 'TERCEIRO') => {
            if (!d || d.date !== selectedAgendaDate) return;
            
            const groupKey = `${type}-${s.cpf}-${d.time}`;
            if (!groups[groupKey]) {
                const isFaturado = d.item !== 'AGENDAMENTO PENDENTE' && (d.invoiceNumber || d.invoiceUploaded);
                groups[groupKey] = {
                    id: d.id, // Primary ID for modal usage
                    allIds: [d.id],
                    supplierName: s.name,
                    supplierCpf: s.cpf,
                    time: d.time,
                    arrivalTime: d.arrivalTime,
                    exitTime: d.exitTime,
                    status: isFaturado ? 'CONCLUÍDO' : 'AGENDADO',
                    type: type,
                    items: [d],
                    deliveries: [d],
                    observations: d.observations || ''
                };
            } else {
                groups[groupKey].allIds.push(d.id);
                groups[groupKey].items.push(d);
                groups[groupKey].deliveries.push(d);
                if (d.exitTime && !groups[groupKey].exitTime) {
                    groups[groupKey].exitTime = d.exitTime;
                }
                if (d.observations && !groups[groupKey].observations.includes(d.observations)) {
                    groups[groupKey].observations = groups[groupKey].observations 
                        ? `${groups[groupKey].observations}; ${d.observations}`
                        : d.observations;
                }
                // If any item is NOT faturado, the group should probably be AGENDADO? 
                // Usually they are all faturado together.
                if (!(d.item !== 'AGENDAMENTO PENDENTE' && (d.invoiceNumber || d.invoiceUploaded))) {
                    groups[groupKey].status = 'AGENDADO';
                }
            }
        };

        ensureArray(suppliers).forEach(s => {
            if (!s) return;
            const deliveries = ensureArray(s.deliveries);
            deliveries.forEach(d => processDelivery(s as any, d, 'FORNECEDOR'));
        });

        // Also check perCapitaConfig if they are not in main suppliers
        if (perCapitaConfig) {
            ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'].forEach(key => {
                const producers = ensureArray(perCapitaConfig[key]);
                producers.forEach((p: any) => {
                    const deliveries = ensureArray(p.deliveries);
                    deliveries.forEach(d => processDelivery({ name: p.name, cpf: p.cpfCnpj || p.cpf } as any, d, 'FORNECEDOR'));
                });
            });
        }

        const list = Object.values(groups);

        (thirdPartyEntries || []).forEach(log => {
            if (log.date === selectedAgendaDate) {
                let status: 'AGENDADO' | 'CONCLUÍDO' | 'TERCEIRO' | 'CANCELADO' = 'TERCEIRO';
                if (log.status === 'concluido') status = 'CONCLUÍDO';
                else if (log.status === 'cancelado') status = 'CANCELADO';
                else if (log.status === 'agendado') status = 'AGENDADO';

                list.push({
                    id: log.id,
                    allIds: [log.id],
                    supplierName: log.companyName,
                    supplierCpf: log.companyCnpj,
                    time: log.time || '00:00',
                    arrivalTime: log.arrivalTime,
                    exitTime: log.exitTime,
                    status: status,
                    type: 'TERCEIRO',
                    items: [],
                    deliveries: []
                });
            }
        });

        return list
            .filter(item => 
                (item.supplierName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.supplierCpf || '').toLowerCase().includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => a.time.localeCompare(b.time));
    }, [suppliers, thirdPartyEntries, selectedAgendaDate, searchTerm, perCapitaConfig]);

    const handleDelete = async (item: any) => {
        if (!onDeleteDelivery) return;
        const msg = item.status === 'CONCLUÍDO' 
            ? `ATENÇÃO: Este agendamento já possui Nota Fiscal vinculada. Deseja realmente EXCLUIR permanentemente o agendamento de ${item.supplierName}?`
            : `Excluir agendamento de ${item.supplierName}?`;
            
        if (confirm(msg)) {
            let success = true;
            for (const id of item.allIds) {
                const res = await onDeleteDelivery(item.supplierCpf, id);
                if (!res.success) success = false;
            }
            if (success) toast.success("Agendamentos excluídos!");
            else toast.error("Erro ao excluir alguns itens.");
        }
    };

    const handleRegisterArrival = (item: any) => {
        setSelectedItem(item);
        setArrivalData({ 
            arrivalTime: item.arrivalTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), 
            invoiceNumber: item.items?.[0]?.invoiceNumber || '' 
        });
        setIsArrivalModalOpen(true);
    };

    const handleOpenInvoiceModal = (item: any) => {
        if (!item.deliveries || item.deliveries.length === 0) return;
        setSelectedItem(item);
        setInvoiceInfo({
            date: item.deliveries[0].date,
            deliveries: item.deliveries.map((d: any) => ({ ...d })),
            supplierCpf: item.supplierCpf
        });
        setIsInvoiceModalOpen(true);
    };

    const saveArrival = async () => {
        if (!selectedItem || !onUpdateDelivery) return;
        
        try {
            if (selectedItem.type === 'FORNECEDOR') {
                for (const id of selectedItem.allIds) {
                    await onUpdateDelivery(selectedItem.supplierCpf, id, { 
                        arrivalTime: arrivalData.arrivalTime,
                        invoiceNumber: arrivalData.invoiceNumber || selectedItem.items?.[0]?.invoiceNumber
                    });
                }
                toast.success("Chegada registrada!");
            }
            setIsArrivalModalOpen(false);
        } catch (_e) {
            toast.error("Erro ao salvar chegada.");
        }
    };

    const handleRegisterExit = (item: any) => {
        setSelectedItem(item);
        setExitTimeInput(item.exitTime || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setIsExitModalOpen(true);
    };

    const saveExit = async () => {
        if (!selectedItem || !onUpdateDelivery) return;
        
        try {
            if (selectedItem.type === 'FORNECEDOR') {
                for (const id of selectedItem.allIds) {
                    await onUpdateDelivery(selectedItem.supplierCpf, id, { 
                        exitTime: exitTimeInput
                    });
                }
                toast.success("Saída registrada!");
            }
            setIsExitModalOpen(false);
        } catch (_e) {
            toast.error("Erro ao salvar saída.");
        }
    };

    const handleGenerateReport = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error("Por favor, permita popups para imprimir o relatório.");
            return;
        }

        const dateParts = selectedAgendaDate.split('-');
        const formattedDateReport = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : selectedAgendaDate;

        const totalActive = dailyDeliveries.filter(d => d.status !== 'CANCELADO').length;
        const totalArrived = dailyDeliveries.filter(d => d.arrivalTime && d.status !== 'CANCELADO').length;
        const totalExited = dailyDeliveries.filter(d => d.exitTime && d.status !== 'CANCELADO').length;
        const totalPending = totalActive - totalArrived;

        const rowsHtml = dailyDeliveries.map(item => {
            const itemsList = (item.items || []).map((it: any) => `${it.item || it.itemName || ''} (${it.kg}kg)`).join(', ');
            return `
                <tr>
                    <td class="text-center font-bold" style="font-size: 9px;">${item.time}</td>
                    <td style="font-size: 9px; font-weight: bold;">${item.supplierName.toUpperCase()}</td>
                    <td class="text-center font-mono" style="font-size: 8px;">${item.supplierCpf}</td>
                    <td class="text-center font-bold text-xs" style="font-size: 8px;">${item.type}</td>
                    <td class="text-center ${item.arrivalTime ? 'font-bold' : 'italic text-red'}" style="font-size: 9px;">${item.arrivalTime || 'Aguardando...'}</td>
                    <td class="text-center ${item.exitTime ? 'font-bold' : 'italic text-red'}" style="font-size: 9px;">${item.exitTime || 'Aguardando...'}</td>
                    <td class="text-center font-bold text-xs" style="font-size: 8px;">${item.status}</td>
                    <td style="font-size: 8px;">${itemsList || 'N/A'}</td>
                    <td style="font-size: 8px; font-style: italic;">${item.observations || ''}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <html>
            <head>
                <title>Relatório de Portaria (Controle de Entrada e Saída) - ${formattedDateReport}</title>
                <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: Arial, sans-serif; font-size: 8.5pt; line-height: 1.3; color: #000; margin: 0; padding: 0; }
                    .header-title { text-align: center; font-weight: bold; font-size: 14pt; text-transform: uppercase; margin-bottom: 5px; }
                    .header-subtitle { text-align: center; font-weight: bold; font-size: 9pt; text-transform: uppercase; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 5px; color: #333; }
                    
                    .summary-boxes { display: flex; gap: 10px; margin-bottom: 15px; }
                    .summary-box { flex: 1; border: 1.5px solid #000; padding: 8px; border-radius: 4px; text-align: center; }
                    .summary-val { font-size: 14pt; font-weight: bold; margin-top: 3px; }
                    .label { font-weight: bold; text-transform: uppercase; font-size: 7.5pt; color: #555; }
                    
                    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-transform: uppercase; }
                    th, td { border: 1px solid #000; padding: 5px; text-align: left; vertical-align: middle; }
                    th { font-weight: bold; text-transform: uppercase; background-color: #f2f2f2; text-align: center; font-size: 8pt; }
                    
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .font-bold { font-weight: bold; }
                    .text-red { color: #b91c1c; font-style: italic; font-weight: normal; }
                    
                    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding: 0 50px; }
                    .signature-box { text-align: center; width: 250px; }
                    .signature-line { border-top: 1px solid #000; margin-bottom: 5px; }
                    .signature-title { font-weight: bold; text-transform: uppercase; font-size: 7.5pt; }
                </style>
            </head>
            <body>
                <div class="header-title">PENITENCIÁRIA DE TAÍUVA</div>
                <div class="header-subtitle">Relatório de Controle de Portaria (Entradas e Saídas) - Data: ${formattedDateReport}</div>
                
                <div class="summary-boxes">
                    <div class="summary-box">
                        <div class="label">Total Agendado</div>
                        <div class="summary-val">${totalActive}</div>
                    </div>
                    <div class="summary-box" style="border-color: #16a34a; background-color: #f0fdf4;">
                        <div class="label" style="color: #16a34a;">Registraram Entrada</div>
                        <div class="summary-val" style="color: #16a34a;">${totalArrived}</div>
                    </div>
                    <div class="summary-box" style="border-color: #dc2626; background-color: #fef2f2;">
                        <div class="label" style="color: #dc2626;">Registraram Saída</div>
                        <div class="summary-val" style="color: #dc2626;">${totalExited}</div>
                    </div>
                    <div class="summary-box" style="border-color: #ea580c; background-color: #fff7ed;">
                        <div class="label" style="color: #ea580c;">Pendentes (Sem Entrada)</div>
                        <div class="summary-val" style="color: #ea580c;">${totalPending}</div>
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 7%;">Hora Agendada</th>
                            <th style="width: 22%;">Fornecedor / Empresa</th>
                            <th style="width: 12%;">CPF / CNPJ</th>
                            <th style="width: 8%;">Tipo</th>
                            <th style="width: 10%;">Horário Entrada</th>
                            <th style="width: 10%;">Horário Saída</th>
                            <th style="width: 8%;">Status</th>
                            <th style="width: 13%;">Itens / Peso</th>
                            <th style="width: 10%;">Observações</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="9" class="text-center italic font-bold">Nenhuma entrega agendada ou registrada para este dia.</td></tr>'}
                    </tbody>
                </table>
                
                <div class="signatures">
                    <div class="signature-box">
                        <div class="signature-line" style="margin-top: 30px;"></div>
                        <div class="signature-title">Responsável pela Portaria</div>
                        <div style="font-size: 7pt; color: #666; margin-top: 2px;">Assinatura e Carimbo</div>
                    </div>
                    <div class="signature-box">
                        <div class="signature-line" style="margin-top: 30px;"></div>
                        <div class="signature-title">Responsável pelo Almoxarifado / Estoque</div>
                        <div style="font-size: 7pt; color: #666; margin-top: 2px;">Assinatura e Carimbo</div>
                    </div>
                </div>

                <script>
                    window.onload = function() {
                        window.print();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handleSaveInvoiceWithItems = async (invoiceNumber: string, invoiceUrl: string, deliveries: Delivery[], invoiceDate?: string) => {
        if (!onSaveInvoice || !invoiceInfo) return;
        try {
            // We use the deliveries passed back from the modal, which may have updated weights/values
            await onSaveInvoice(invoiceInfo.supplierCpf, selectedItem.allIds, invoiceNumber, invoiceUrl, deliveries, invoiceDate);
            toast.success("Nota fiscal cadastrada com sucesso!");
            setIsInvoiceModalOpen(false);
        } catch (_e) {
            toast.error("Erro ao salvar nota fiscal.");
        }
    };

    const handleThirdPartyArrival = async (item: any) => {
        const log = (thirdPartyEntries || []).find(l => l.id === item.id);
        if (log && onUpdateThirdPartyEntry) {
            const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const res = await onUpdateThirdPartyEntry({
                ...log,
                arrivalTime: nowTime,
                status: 'concluido'
            });
            if (res.success) {
                toast.success(`Check-In Realizado! Entrada de ${log.companyName} confirmada às ${nowTime}`);
            } else {
                toast.error("Erro ao registrar entrada.");
            }
        }
    };

    const handleThirdPartyExit = async (item: any) => {
        const log = (thirdPartyEntries || []).find(l => l.id === item.id);
        if (log && onUpdateThirdPartyEntry) {
            const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const res = await onUpdateThirdPartyEntry({
                ...log,
                exitTime: nowTime,
                status: 'concluido'
            });
            if (res.success) {
                toast.success(`Check-Out Realizado! Saída de ${log.companyName} confirmada às ${nowTime}`);
            } else {
                toast.error("Erro ao registrar saída.");
            }
        }
    };

    const currentSupplierItems = useMemo(() => {
        if (!invoiceInfo) return [];
        const mainSup = ensureArray(suppliers).find(s => s.cpf === invoiceInfo.supplierCpf);
        if (mainSup) return ensureArray(mainSup.contractItems);
        
        if (perCapitaConfig) {
            const allPC = [
                ...ensureArray(perCapitaConfig.ppaisProducers),
                ...ensureArray(perCapitaConfig.pereciveisSuppliers),
                ...ensureArray(perCapitaConfig.estocaveisSuppliers)
            ];
            const pcSup = allPC.find((p: any) => (p.cpfCnpj || p.cpf) === invoiceInfo.supplierCpf);
            if (pcSup) return ensureArray(pcSup.contractItems);
        }
        return [];
    }, [invoiceInfo, suppliers, perCapitaConfig]);

    return (
        <>
            {isInvoiceModalOpen && invoiceInfo && (
                <SendInvoiceModal
                    invoiceInfo={invoiceInfo}
                    contractItems={currentSupplierItems}
                    onClose={() => setIsInvoiceModalOpen(false)}
                    onSave={handleSaveInvoiceWithItems}
                />
            )}
            {/* Scanner Modal */}
            {isScannerOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 animate-scale-in">
                        <div className={`p-6 md:p-8 border-b flex justify-between items-center ${scanAction === 'entrada' ? 'bg-emerald-50 border-b-emerald-100' : 'bg-rose-50 border-b-rose-100'}`}>
                            <div>
                                <h3 className={`text-xl font-black uppercase italic tracking-tighter ${scanAction === 'entrada' ? 'text-emerald-950' : 'text-rose-950'}`}>
                                    Leitor Portaria (${scanAction === 'entrada' ? 'Entrada' : 'Saída'})
                                </h3>
                                <p className={`font-bold text-[10px] uppercase tracking-widest ${scanAction === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                    Escanear ou Digitar para registrar {scanAction === 'entrada' ? 'Entrada (Check-In)' : 'Saída (Check-Out)'}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsScannerOpen(false)} 
                                className="text-gray-400 hover:text-gray-800 text-3xl font-light leading-none"
                            >
                                &times;
                            </button>
                        </div>
                        <div className="p-6 md:p-8 space-y-6">
                            {/* Mode Toggle */}
                            <div className="flex gap-1 bg-slate-100 p-1 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setScannerMode('camera')}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                        scannerMode === 'camera' 
                                            ? `bg-white ${scanAction === 'entrada' ? 'text-emerald-600' : 'text-rose-600'} shadow-sm` 
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Câmera Integrada
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setScannerMode('manual')}
                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${
                                        scannerMode === 'manual' 
                                            ? `bg-white ${scanAction === 'entrada' ? 'text-emerald-600' : 'text-rose-600'} shadow-sm` 
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Leitor de Mão / Código
                                </button>
                            </div>

                            {scannerMode === 'camera' ? (
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-2 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden relative">
                                        <div id="qr-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-inner bg-slate-950 min-h-[280px] flex flex-col items-center justify-center p-6 text-center text-slate-400">
                                             <div className={`w-8 h-8 border-4 ${scanAction === 'entrada' ? 'border-emerald-500' : 'border-rose-500'} border-t-transparent rounded-full animate-spin mb-4`}></div>
                                             <span className="text-xs font-black uppercase tracking-widest text-slate-300">Ativando Câmera...</span>
                                             <span className="text-[10px] text-slate-500 mt-1">Por favor, conceda permissão de câmera ao navegador</span>
                                         </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center max-w-sm mx-auto leading-relaxed">
                                        Posicione o QR Code impresso ou na tela do celular em frente à câmera para leitura.
                                    </p>
                                </div>
                            ) : (
                                <form onSubmit={handleManualSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                            Leitor de Código ou CPF
                                        </label>
                                        <input
                                            ref={manualInputRef}
                                            type="text"
                                            value={manualInputValue}
                                            onChange={(e) => setManualInputValue(e.target.value)}
                                            placeholder="Escaneie com leitor de mão ou digite o CPF..."
                                            className={`w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-700 outline-none focus:ring-4 ${scanAction === 'entrada' ? 'focus:ring-emerald-100' : 'focus:ring-rose-100'} transition-all placeholder:text-gray-300`}
                                            autoFocus
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider text-center max-w-sm mx-auto leading-relaxed">
                                        Aponte o leitor de mão para o QR Code para preencher e validar a {scanAction === 'entrada' ? 'entrada' : 'saída'} automaticamente.
                                    </p>
                                    <div className="flex gap-4 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setManualInputValue('')}
                                            className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all"
                                        >
                                            Limpar
                                        </button>
                                        <button
                                            type="submit"
                                            className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-white transition-all shadow-xl ${
                                                scanAction === 'entrada' 
                                                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100' 
                                                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'
                                            }`}
                                        >
                                            Confirmar {scanAction === 'entrada' ? 'Entrada' : 'Saída'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Exit Modal */}
            {isExitModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-rose-100 animate-scale-in">
                        <div className="p-8 border-b bg-rose-50">
                            <h3 className="text-xl font-black text-rose-950 uppercase italic tracking-tighter">Registrar Saída</h3>
                            <p className="text-rose-400 font-bold text-[10px] uppercase tracking-widest">{selectedItem?.supplierName}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Horário Real de Saída</label>
                                <input 
                                    type="time" 
                                    value={exitTimeInput}
                                    onChange={e => setExitTimeInput(e.target.value)}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-rose-900 outline-none focus:ring-4 focus:ring-rose-100 transition-all text-xl"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsExitModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                                <button onClick={saveExit} className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-100">Salvar Saída</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Arrival Modal */}
            {isArrivalModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-indigo-100 animate-scale-in">
                        <div className="p-8 border-b bg-indigo-50">
                            <h3 className="text-xl font-black text-indigo-950 uppercase italic tracking-tighter">Registrar Chegada</h3>
                            <p className="text-indigo-400 font-bold text-[10px] uppercase tracking-widest">{selectedItem?.supplierName}</p>
                        </div>
                        <div className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Horário Real de Chegada</label>
                                <input 
                                    type="time" 
                                    value={arrivalData.arrivalTime}
                                    onChange={e => setArrivalData(prev => ({ ...prev, arrivalTime: e.target.value }))}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-black text-indigo-900 outline-none focus:ring-4 focus:ring-indigo-100 transition-all text-xl"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Número da NF (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: 000123"
                                    value={arrivalData.invoiceNumber}
                                    onChange={e => setArrivalData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl font-bold text-gray-600 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                                />
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsArrivalModalOpen(false)} className="flex-1 py-4 rounded-2xl bg-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all">Cancelar</button>
                                <button onClick={saveArrival} className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Salvar Chegada</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`space-y-6 animate-fade-in ${embedded ? '' : 'p-4 md:p-8 max-w-6xl mx-auto'}`}>
                {/* Header / Selector */}
                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">Agenda de Chegadas</h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Visualização de Entregas Programadas</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Pesquisar fornecedor..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-sm transition-all"
                            />
                        </div>
                        <div className="bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
                            <span className="text-xs font-black text-indigo-600 uppercase">{dailyDeliveries.length} Veículos</span>
                        </div>
                        <input 
                            type="date" 
                            value={selectedAgendaDate} 
                            onChange={e => setSelectedAgendaDate(e.target.value)}
                            className="p-3 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-black text-indigo-900 transition-all text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                setScanAction('entrada');
                                setScannerMode('camera');
                                setIsScannerOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-emerald-100 transition-all active:scale-95 cursor-pointer"
                        >
                            <QrCode className="h-4 w-4" />
                            Escanear Entrada
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setScanAction('saida');
                                setScannerMode('camera');
                                setIsScannerOpen(true);
                            }}
                            className="bg-rose-600 hover:bg-rose-700 text-white font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-rose-100 transition-all active:scale-95 cursor-pointer"
                        >
                            <QrCode className="h-4 w-4" />
                            Escanear Saída
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerateReport}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-4 rounded-2xl text-xs uppercase tracking-widest flex items-center gap-2 shadow-lg hover:shadow-indigo-100 transition-all active:scale-95 cursor-pointer"
                        >
                            <FileText className="h-4 w-4" />
                            Relatório Portaria
                        </button>
                    </div>
                </div>
            </div>

            {/* Daily Summary Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-3xl shadow-md border border-indigo-50 flex items-center gap-4">
                    <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600">
                        <Truck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Ativo</p>
                        <p className="text-xl font-black text-indigo-900">{dailyDeliveries.filter(d => d.status !== 'CANCELADO').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-md border border-green-50 flex items-center gap-4">
                    <div className="bg-green-100 p-3 rounded-2xl text-green-600">
                        <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">Entradas Confirmadas</p>
                        <p className="text-xl font-black text-green-700">{dailyDeliveries.filter(d => d.arrivalTime && d.status !== 'CANCELADO').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-md border border-rose-50 flex items-center gap-4">
                    <div className="bg-rose-100 p-3 rounded-2xl text-rose-600">
                        <UserCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Saídas Confirmadas</p>
                        <p className="text-xl font-black text-rose-700">{dailyDeliveries.filter(d => d.exitTime && d.status !== 'CANCELADO').length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-md border border-red-50 flex items-center gap-4">
                    <div className="bg-red-100 p-3 rounded-2xl text-red-600">
                        <AlertCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-sans">Pendentes Chegada</p>
                        <p className="text-xl font-black text-red-700">{dailyDeliveries.filter(d => !d.arrivalTime && d.status !== 'CANCELADO').length}</p>
                    </div>
                </div>
            </div>

            {/* List of Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dailyDeliveries.length > 0 ? dailyDeliveries.map(item => (
                    <div 
                        key={item.id} 
                        className={`relative overflow-hidden bg-white rounded-[2rem] shadow-md border-2 transition-all ${
                            item.status === 'CONCLUÍDO' 
                                ? 'border-indigo-100 opacity-80' 
                                : item.status === 'CANCELADO'
                                    ? 'border-red-100 opacity-50 grayscale'
                                    : item.status === 'AGENDADO' && !item.arrivalTime
                                        ? 'border-red-500 bg-red-50'
                                        : item.status === 'AGENDADO' && item.arrivalTime
                                            ? 'border-orange-500 bg-orange-50/30'
                                            : 'border-green-200 bg-green-50/30' 
                        }`}
                    >
                        <div className={`absolute top-0 left-0 w-2 h-full ${
                            item.status === 'CONCLUÍDO' ? 'bg-indigo-900' : 
                            item.status === 'CANCELADO' ? 'bg-gray-400' :
                            item.arrivalTime ? 'bg-green-500' : 'bg-red-600'
                        }`} />

                        <div className="p-5 pl-7">
                            <div className="flex justify-between items-start mb-4">
                                <div className={`px-4 py-2 rounded-xl text-lg font-black font-mono shadow-sm ${
                                    item.status === 'CONCLUÍDO' 
                                        ? 'bg-indigo-900 text-white' 
                                        : item.status === 'CANCELADO'
                                            ? 'bg-gray-400 text-white'
                                            : item.arrivalTime 
                                                ? 'bg-green-600 text-white' 
                                                : 'bg-red-600 text-white shadow-red-100'
                                }`}>
                                    {item.time}
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${
                                        item.status === 'CONCLUÍDO' ? 'bg-indigo-100 text-indigo-700' : 
                                        item.status === 'CANCELADO' ? 'bg-red-100 text-red-700' :
                                        item.status === 'TERCEIRO' ? 'bg-amber-100 text-amber-700' : 
                                        item.status === 'AGENDADO' && item.arrivalTime ? 'bg-green-100 text-green-700' :
                                        'bg-gray-100 text-gray-600'
                                    }`}>
                                        {item.status}
                                    </span>
                                    {item.type === 'FORNECEDOR' && (
                                        <button 
                                            onClick={() => handleDelete(item)}
                                            className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-all"
                                            title="Excluir Agendamento"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter leading-tight line-clamp-1">
                                    {item.supplierName}
                                </h3>
                                <p className="text-[10px] font-mono text-slate-400 mt-1">{item.supplierCpf}</p>
                                {item.observations && (
                                    <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/50 rounded-xl text-[10px] text-amber-950 font-medium">
                                        <span className="font-black uppercase text-[8px] text-amber-800 tracking-wider block mb-0.5">Observações da Carga / Preparação:</span>
                                        {item.observations}
                                    </div>
                                )}
                            </div>

                                {item.items && item.items.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2 mb-2">
                                        {item.items.map((it: any, idx: number) => (
                                            <span key={idx} className="text-[8px] font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                                {it.item || it.itemName || ''} ({it.kg}kg)
                                            </span>
                                        ))}
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-dashed border-slate-100 flex justify-between items-center">
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-slate-300" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">
                                            {item.type === 'TERCEIRO' ? 'Entrada:' : 'Chegada:'}
                                        </span>
                                        <span className={`text-[11px] font-black ${item.arrivalTime ? 'text-green-600' : 'text-red-600 italic'}`}>
                                            {item.arrivalTime || 'Aguardando...'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-3 w-3 text-slate-300" />
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Saída:</span>
                                        <span className={`text-[11px] font-black ${item.exitTime ? 'text-rose-600' : 'text-red-600 italic'}`}>
                                            {item.exitTime || 'Aguardando...'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {item.type === 'TERCEIRO' && onUpdateThirdPartyEntry && (
                                        <>
                                            {!item.arrivalTime ? (
                                                <button 
                                                    onClick={() => handleThirdPartyArrival(item)}
                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Confirmar Entrada
                                                </button>
                                            ) : !item.exitTime ? (
                                                <button 
                                                    onClick={() => handleThirdPartyExit(item)}
                                                    className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-md shadow-rose-100"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Confirmar Saída
                                                </button>
                                            ) : (
                                                <div className="bg-slate-100 text-slate-500 p-1.5 rounded-lg flex items-center gap-1 text-[9px] font-black uppercase">
                                                    <UserCheck className="h-4 w-4" />
                                                    Concluído
                                                </div>
                                            )}
                                        </>
                                    )}
                                    {item.type === 'FORNECEDOR' && (
                                        <div className="flex gap-1.5">
                                            {!item.arrivalTime ? (
                                                <button 
                                                    onClick={() => handleRegisterArrival(item)}
                                                    className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-1.5 shadow-md shadow-indigo-100"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Confirmar Chegada
                                                </button>
                                            ) : !item.exitTime ? (
                                                <button 
                                                    onClick={() => handleRegisterExit(item)}
                                                    className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-1.5 shadow-md shadow-rose-100"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Confirmar Saída
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        handleRegisterArrival(item);
                                                    }}
                                                    className="bg-slate-100 text-slate-500 hover:bg-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-[9px] font-black uppercase"
                                                >
                                                    <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                                                    Registrado
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    {item.type === 'FORNECEDOR' && item.arrivalTime && (
                                        <button 
                                            onClick={() => handleOpenInvoiceModal(item)}
                                            className={`${item.status === 'CONCLUÍDO' ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center gap-1.5 shadow-md`}
                                            title={item.status === 'CONCLUÍDO' ? "Ver/Editar Nota Fiscal" : "Cadastrar Nota Fiscal"}
                                        >
                                            <FilePlus className="h-3 w-3" />
                                            {item.status === 'CONCLUÍDO' ? 'Ver Nota' : 'Faturar'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-gray-100 flex flex-col items-center justify-center gap-4">
                        <Calendar className="h-16 w-16 text-gray-200" />
                        <p className="text-xl font-black text-gray-300 uppercase tracking-[0.3em] italic">Nenhuma entrega agendada para este dia</p>
                    </div>
                )}
            </div>
        </div>
        </>
    );
};

export default AgendaChegadas;
