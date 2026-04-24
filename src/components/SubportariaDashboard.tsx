
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GoogleGenAI } from "@google/genai";
import InfobarTicker from './InfobarTicker';
import type { Supplier, Delivery, ThirdPartyEntryLog, VehicleExitOrder, VehicleAsset, DriverAsset, ValidationRole, MaintenanceSchedule, ServiceOrder, PublicInfo } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import { Camera, CheckCircle, XCircle, RefreshCw, UserCheck, AlertTriangle, Play, CheckCircle2, LogIn, LogOut, ClipboardList, Clock, Wrench, Calendar, FileText, ExternalLink, User, Users } from 'lucide-react';

interface SubportariaDashboardProps {
  suppliers: Supplier[];
  thirdPartyEntries: ThirdPartyEntryLog[];
  maintenanceSchedules: MaintenanceSchedule[];
  serviceOrders: ServiceOrder[];
  publicInfoList: PublicInfo[];
  onUpdateMaintenanceSchedule: (id: string, updates: Partial<MaintenanceSchedule>) => Promise<{ success: boolean; message: string }>;
  onUpdateThirdPartyEntry: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message: string }>;
  onDeleteThirdPartyEntry: (id: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  vehicleExitOrders: VehicleExitOrder[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  validationRoles: ValidationRole[];
  onUpdateVehicleExitOrder: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });
};

const SubportariaDashboard: React.FC<SubportariaDashboardProps> = ({ 
    suppliers, 
    thirdPartyEntries, 
    maintenanceSchedules,
    serviceOrders,
    publicInfoList = [],
    onUpdateMaintenanceSchedule,
    onUpdateThirdPartyEntry, 
    onDeleteThirdPartyEntry,
    onLogout,
    vehicleExitOrders,
    vehicleAssets,
    driverAssets,
    validationRoles,
    onUpdateVehicleExitOrder
}) => {
    const isAbrilVerde = new Date().getMonth() === 3;
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [activeTab, setActiveTab] = useState<'agenda' | 'vehicles' | 'seguranca' | 'rondas'>('agenda');
    const [activeSubTab, setActiveSubTab] = useState<'registro' | 'cadastro'>('registro');

    // Facial Recognition State
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyingLog, setVerifyingLog] = useState<ThirdPartyEntryLog | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
    const [verificationResult, setVerificationResult] = useState<{ match: boolean; confidence: number; reason: string } | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        setCapturedPhoto(null);
        setVerificationStatus('idle');
        setVerificationResult(null);
        setCameraError(null);
        try {
            let stream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            } catch (e) {
                console.log("User camera failed, trying default video");
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
            }

            setCameraStream(stream);
            setIsCameraActive(true);
        } catch (err) {
            console.error("Error accessing camera:", err);
            setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
            setIsCameraActive(false);
        }
    };

    useEffect(() => {
        if (isCameraActive && videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(err => console.error("Video play error:", err));
        }
    }, [isCameraActive, cameraStream]);

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const handleVerify = async () => {
        if (videoRef.current && canvasRef.current && verifyingLog?.photo) {
            const context = canvasRef.current.getContext('2d');
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
                const photoData = canvasRef.current.toDataURL('image/jpeg');
                setCapturedPhoto(photoData);
                stopCamera();
                
                setVerificationStatus('verifying');
                
                try {
                    // Cache bust: 2026-03-12T09:02:10
                    const refBase64 = verifyingLog.photo.split(',')[1];
                    const capBase64 = photoData.split(',')[1];

                    const response = await fetch('/api/gemini-compare', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image1: refBase64,
                            image2: capBase64,
                            prompt: "Compare estas duas fotos. Elas são da mesma pessoa? Responda com um objeto JSON: { \"match\": boolean, \"confidence\": number (0-100), \"reason\": string }. Responda em Português."
                        })
                    });

                    if (!response.ok) throw new Error("Falha na chamada da API");
                    const result = await response.json();
                    
                    setVerificationResult(result);
                    setVerificationStatus(result.match ? 'success' : 'failed');
                } catch (e) {
                    console.error("Error in facial recognition:", e);
                    setVerificationStatus('failed');
                    setVerificationResult({ match: false, confidence: 0, reason: "Erro ao processar biometria facial." });
                }
            }
        }
    };

    const confirmArrival = async () => {
        if (verifyingLog) {
            await handleMarkArrival(verifyingLog, capturedPhoto || undefined);
            setIsVerifying(false);
            setVerifyingLog(null);
            setCapturedPhoto(null);
            setVerificationStatus('idle');
            setVerificationResult(null);
        }
    };

    const dailyAgenda = useMemo(() => {
        const list: { 
            id: string; 
            type: 'FORNECEDOR' | 'TERCEIROS';
            name: string; 
            identifier: string; 
            time: string; 
            arrivalTime?: string; 
            status: string; 
            originalStatus: string;
            vehicle?: string;
            plate?: string;
            rawLog?: ThirdPartyEntryLog;
        }[] = [];
        
        suppliers.forEach(s => {
            (Object.values(s.deliveries || {}) as Delivery[]).forEach(d => {
                if (d.date === selectedDate) {
                    const isFaturado = d.item !== 'AGENDAMENTO PENDENTE';
                    const existing = list.find(l => l.type === 'FORNECEDOR' && l.name === s.name && l.time === d.time && l.originalStatus === (isFaturado ? 'FATURADO' : 'AGENDADO'));
                    
                    if (!existing) {
                        list.push({
                            id: d.id,
                            type: 'FORNECEDOR',
                            name: s.name,
                            identifier: s.cpf,
                            time: d.time,
                            arrivalTime: d.arrivalTime,
                            status: isFaturado ? '✓ Descarregado' : d.arrivalTime ? '● No Pátio' : '○ Aguardando',
                            originalStatus: isFaturado ? 'FATURADO' : 'AGENDADO'
                        });
                    }
                }
            });
        });

        (thirdPartyEntries || []).forEach(log => {
            if (log.date === selectedDate) {
                list.push({
                    id: log.id,
                    type: 'TERCEIROS',
                    name: log.companyName,
                    identifier: log.companyCnpj,
                    time: log.time || '00:00',
                    arrivalTime: log.arrivalTime,
                    status: log.status === 'concluido' ? '✓ Concluído' : log.arrivalTime ? '● Em Serviço' : '○ Aguardando',
                    originalStatus: log.status,
                    vehicle: log.vehicle,
                    plate: log.plate,
                    rawLog: log
                });
            }
        });

        return list.sort((a, b) => a.time.localeCompare(b.time));
    }, [suppliers, thirdPartyEntries, selectedDate]);

    const handleMarkArrival = async (log: ThirdPartyEntryLog, entryPhoto?: string) => {
        const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const updatedLog: any = { ...log, arrivalTime: now };
        if (entryPhoto) {
            updatedLog.entryPhoto = entryPhoto;
        }
        
        // Remove undefined properties before sending to Firebase
        Object.keys(updatedLog).forEach(key => {
            if (updatedLog[key] === undefined) {
                delete updatedLog[key];
            }
        });

        await onUpdateThirdPartyEntry(updatedLog);
    };

    const generatePDF = (schedule: MaintenanceSchedule, order: ServiceOrder) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Por favor, permita pop-ups para visualizar o documento.");
            return;
        }

        const pplsList = (schedule.ppls || []).filter(p => p.trim() !== '').map(p => `<li>${p}</li>`).join('');
        const validationDate = schedule.validatedByDirectorAt ? new Date(schedule.validatedByDirectorAt) : new Date();
        const dateOptions: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
        const dateInFull = validationDate.toLocaleDateString('pt-BR', dateOptions);

        const formatTimestamp = (ts?: string) => {
            if (!ts) return 'N/A';
            try {
                const date = new Date(ts);
                return isNaN(date.getTime()) ? ts : date.toLocaleString('pt-BR');
            } catch (e) {
                return ts;
            }
        };

        const scheduleDate = (() => {
            try {
                const date = new Date(schedule.date + 'T00:00:00');
                return isNaN(date.getTime()) ? schedule.date : date.toLocaleDateString('pt-BR');
            } catch (e) {
                return schedule.date;
            }
        })();

        const html = `
            <!DOCTYPE html>
            <html>
                <head>
                    <meta charset="UTF-8">
                    <title>Autorização de Saída - Manutenção Externa</title>
                    <style>
                        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                        
                        body { 
                            font-family: 'Inter', sans-serif; 
                            padding: 20px; 
                            line-height: 1.5; 
                            color: #1e293b;
                            background-color: #fff;
                        }
                        
                        .header { text-align: center; margin-bottom: 30px; }
                        .header h1 { font-size: 18px; font-weight: 900; text-transform: uppercase; margin: 0; color: #0f172a; }

                        .content { margin-bottom: 30px; font-size: 12px; }
                        .main-text { text-align: justify; margin-bottom: 20px; }

                        .ppl-header { font-weight: 900; font-size: 10px; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #000; }
                        .ppls { margin: 0; list-style: none; padding: 0; }
                        .ppls li { padding: 5px 0; border-bottom: 1px dashed #ccc; font-weight: 700; font-size: 12px; }

                        .signature-container { margin-top: 40px; display: flex; justify-content: center; }
                        .signature-block { text-align: center; width: 60%; }
                        .sig-line { border-top: 1px solid #000; padding-top: 5px; font-weight: 900; font-size: 11px; text-transform: uppercase; }

                        @media print {
                            body { padding: 0; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header"><h1>Autorização de Saída para Trabalho</h1></div>
                    
                    <div class="content">
                        <div class="main-text">
                            Ficam os PPL’s abaixo qualificados, <strong>AUTORIZADOS</strong> a trabalhar no setor de <strong>MANUTENÇÃO EXTERNA</strong> – horário das <strong>${schedule.time}</strong>, no dia <strong>${scheduleDate}</strong>, devidamente acompanhado por Policial Penal.
                        </div>
                        <div class="ppl-section">
                            <div class="ppl-header">NOME / MATRÍCULA</div>
                            <ul class="ppls">${pplsList || '<li>Nenhum PPL designado</li>'}</ul>
                        </div>
                    </div>

                    <div class="signature-container">
                        <div class="signature-block">
                            <div class="sig-line">ASSINATURA DO RESPONSÁVEL</div>
                        </div>
                    </div>

                    <script>window.onload = function() { window.print(); }</script>
                </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
    };

    return (
        <div className={`min-h-screen text-slate-900 font-sans pb-10 bg-slate-50 selection:bg-indigo-500/30 overflow-x-hidden`}>

            {/* Header Compacto para Mobile */}
            <header className={`p-4 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b bg-indigo-950 border-indigo-900 text-white print:hidden`}>
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shadow-inner bg-indigo-800`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    </div>
                    <div>
                        <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none">Segurança Externa</h1>
                        <p className={`text-[9px] font-bold uppercase tracking-widest text-indigo-400`}>
                            Painel Operacional
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                    {[
                        { id: 'agenda', label: 'Agenda' },
                        { id: 'vehicles', label: 'Veículos' },
                        { id: 'seguranca', label: 'Manutenção' },
                        { id: 'rondas', label: 'Rondas' }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-white/10'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                    <button onClick={onLogout} className="bg-red-900/50 hover:bg-red-700 text-red-300 hover:text-white font-black py-2 px-3 rounded-xl text-[9px] uppercase transition-all border border-red-800 ml-2">Sair</button>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-5xl mx-auto">
                {activeTab === 'agenda' ? (
                    <>
                        {/* Seletor de Data Estilizado */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-200">
                            {/* ... */}
                        </div>

                        {/* Lista de Cards */}
                        <div className="space-y-4">
                            {/* ... */}
                        </div>

                        {/* Resumo Rápido no Rodapé */}
                        <div className="grid grid-cols-2 gap-4 pt-4">
                            {/* ... */}
                        </div>
                    </>
                ) : activeTab === 'vehicles' ? (
                    <div className="animate-fade-in">
                        {/* ... */}
                    </div>
                ) : activeTab === 'rondas' ? (
                    <div className="animate-fade-in space-y-6">
                        {/* ... */}
                    </div>
                ) : (
                    <div className="animate-fade-in space-y-6">
                        {/* ... */}
                    </div>
                )}
            </main>

                        {activeSubTab === 'registro' ? (
                            <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-indigo-100">
                                 <div className="flex justify-between items-center mb-4 print:hidden">
                                     <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic">Registro de Rondas</h2>
                                     <button onClick={() => window.print()} className="bg-indigo-600 text-white font-black py-2 px-6 rounded-lg uppercase hover:bg-indigo-700 text-xs">Gerar PDF/Imprimir</button>
                                 </div>
                                 <div className="bg-white p-4 rounded-xl shadow-none print:shadow-none print:p-0">
                                     <div className="hidden print:block text-center font-bold text-xs uppercase border-b-2 border-black pb-2 mb-4">
                                         <p>SECRETARIA DA ADMINISTRAÇÃO PENITENCIÁRIA</p>
                                         <p>PENITENCIÁRIA DE TAIÚVA - RSA - SEGURANÇA EXTERNA - CANIL</p>
                                     </div>
                                     
                                     <div className="grid grid-cols-1 gap-y-6 print:grid-cols-1 print:gap-y-6">
                                     {[...Array(4)].map((_, tableIdx) => (
                                         <div key={tableIdx} className="mb-2 border border-black rounded-lg overflow-hidden last:mb-0 break-inside-avoid">
                                             <div className="grid grid-cols-3 bg-slate-100 p-1 border-b border-black font-black text-[9px] text-center uppercase">
                                                 <div className="flex items-center gap-1">Data: <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="bg-transparent border-b border-black focus:outline-none w-24" /></div>
                                                 <div className="flex items-center gap-1">Turno: <input type="text" className="bg-transparent border-b border-black focus:outline-none w-16" /></div>
                                                 <div className="flex items-center gap-1">RONDA: <input type="text" className="bg-transparent border-b border-black focus:outline-none w-16" /></div>
                                             </div>
                                             <div className="grid grid-cols-6 border-b border-black bg-slate-50 p-0.5 text-[8px] font-black uppercase text-center">
                                                 <div>POLICIAL PENAL</div>
                                                 <div>HORA INÍCIO</div>
                                                 <div>KM INICIAL</div>
                                                 <div>HORA FINAL</div>
                                                 <div>KM FINAL</div>
                                                 <div>OCORRÊNCIAS</div>
                                             </div>
                                             {[...Array(6)].map((_, rowIndex) => (
                                                 <div key={rowIndex} className="grid grid-cols-6 border-b border-slate-300 last:border-0 h-5">
                                                     <input type="text" className="border-r border-slate-300 w-full p-0.5 text-[9px]" />
                                                     <input type="text" className="border-r border-slate-300 w-full p-0.5 text-center text-[9px]" placeholder=":" />
                                                     <input type="text" className="border-r border-slate-300 w-full p-0.5 text-[9px]" />
                                                     <input type="text" className="border-r border-slate-300 w-full p-0.5 text-center text-[9px]" placeholder=":" />
                                                     <input type="text" className="border-r border-slate-300 w-full p-0.5 text-[9px]" />
                                                     <input type="text" className="w-full p-0.5 text-[9px]" />
                                                 </div>
                                             ))}
                                         </div>
                                     ))}
                                     </div>

                                     {/* Checklist Section */}
                                     <div className="mt-8 space-y-3 pt-4 border-t-2 border-black text-black print:mt-4 print:pt-2">
                                         <h4 className="font-black text-xs border-b border-black pb-1 uppercase">Checklist de Segurança</h4>
                                         
                                         <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px]">
                                             <div className="flex items-center justify-between border-b pb-0.5">
                                                 <span className="font-bold">Locais/Uniforme:</span>
                                                 <div className="flex gap-2 font-bold">
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="check1" /> OK</label>
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="check1" /> N OK</label>
                                                 </div>
                                             </div>
                                             <div className="flex gap-1 items-center border-b pb-0.5">
                                                 <span className="font-bold">Qtd PPLs:</span>
                                                 <input type="number" className="w-10 border-b border-black focus:outline-none" />
                                             </div>
                                             <div className="flex items-center justify-between border-b pb-0.5">
                                                 <span className="font-bold">PPLs Presentes:</span>
                                                 <div className="flex gap-2 font-bold">
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="ppl_pr" /> SIM</label>
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="ppl_pr" /> NÃO</label>
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="ppl_pr" /> AUS</label>
                                                 </div>
                                             </div>
                                             <div className="flex items-center justify-between border-b pb-0.5">
                                                 <span className="font-bold">Desobediência Abordagem:</span>
                                                 <div className="flex gap-2 font-bold">
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="desob" /> SIM</label>
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="desob" /> NÃO</label>
                                                 </div>
                                             </div>
                                             <div className="col-span-2 flex gap-1 items-center border-b pb-0.5">
                                                 <span className="font-bold">Conduta:</span>
                                                 <div className="flex gap-2 font-bold">
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="cond_ok" /> Adequada</label>
                                                     <label className="flex items-center gap-0.5"><input type="radio" name="cond_ok" /> Inadequada</label>
                                                 </div>
                                             </div>
                                             <div className="col-span-2 flex gap-1 items-center border-b pb-0.5">
                                                 <span className="font-bold">Descrever Conduta/Ausência/Pendências:</span>
                                                 <input type="text" className="flex-1 border-b border-black focus:outline-none" />
                                             </div>
                                         </div>
                                     </div>

                                     {/* Signature Section */}
                                     <div className="mt-12 flex justify-center print:mt-8">
                                         <div className="w-64 text-center pt-8 border-t border-black">
                                             <input type="text" placeholder="NOME DO RESPONSÁVEL" className="w-full font-black text-[9px] uppercase text-center border-none focus:outline-none"/>
                                             <input type="text" placeholder="CARGO" className="w-full font-bold text-[8px] text-center border-none focus:outline-none"/>
                                             <p className="font-black text-[9px] uppercase mt-2">ASSINATURA</p>
                                         </div>
                                     </div>
                            </div>
                        </div>
                    </div>
                </div>


            </main>

            {/* Modal de Verificação Facial */}
            {isVerifying && verifyingLog && (
                <div className="fixed inset-0 bg-indigo-950/90 backdrop-blur-xl z-[200] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-indigo-900 p-8 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic">Verificação Facial</h3>
                                <p className="text-indigo-300 font-bold text-[10px] uppercase tracking-widest mt-1">Comparação de Identidade Biométrica</p>
                            </div>
                            <button 
                                onClick={() => { stopCamera(); setIsVerifying(false); }}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <XCircle className="h-8 w-8" />
                            </button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* ... modal body ... */}
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                            {/* ... modal footer ... */}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Canvas oculto para captura de foto */}
            <canvas ref={canvasRef} className="hidden" />
            <style>{`
                @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                /* Remover ícone padrão do input date para mobile cleaner look */
                input[type="date"]::-webkit-inner-spin-button,
                input[type="date"]::-webkit-calendar-picker-indicator {
                    opacity: 0;
                    width: 100%;
                    height: 100%;
                    position: absolute;
                    left: 0;
                    top: 0;
                    cursor: pointer;
                }
            `}</style>
        </div>
    );
};

export default SubportariaDashboard;
