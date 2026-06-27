
import React, { useState } from 'react';
import type { Delivery } from '../types';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebaseConfig';
import { QRCodeSVG } from 'qrcode.react';

interface ViewDeliveryModalProps {
  date: Date;
  deliveries: Delivery[];
  onClose: () => void;
  onAddNew: () => void;
  onCancel: (deliveryIds: string[]) => void;
  onFulfill: (invoiceInfo: { date: string; deliveries: Delivery[] }) => void;
  simulatedToday: Date;
  supplierCpf?: string;
  supplierName?: string;
}

const ViewDeliveryModal: React.FC<ViewDeliveryModalProps> = ({ 
  date, 
  deliveries, 
  onClose, 
  onAddNew, 
  onCancel, 
  onFulfill: _onFulfill, 
  simulatedToday,
  supplierCpf,
  supplierName
}) => {
  const [showQrCode, setShowQrCode] = useState(true);
  
  const dateString = date.toISOString().split('T')[0];
  const formattedDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  const invoiceNumber = deliveries.find(d => d.invoiceNumber)?.invoiceNumber;
  const deliveryTime = deliveries.find(d => d.time)?.time || deliveries.find(d => d.arrivalTime)?.arrivalTime;
  
  const isPastStrict = date < simulatedToday;
  const isToday = date.toISOString().split('T')[0] === simulatedToday.toISOString().split('T')[0];


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const totalValue = deliveries.reduce((sum, d) => sum + (d.value || 0), 0);

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-[2rem] shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in-up overflow-hidden">
        
        {/* Header Fixo */}
        <div className="p-6 md:p-8 border-b border-gray-50 flex-shrink-0">
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Detalhes do Dia</h2>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl font-light">&times;</button>
            </div>
            {supplierName && (
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
                    Fornecedor: <span className="text-indigo-600">{supplierName}</span>
                </p>
            )}
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                Data: <span className="text-green-700">{formattedDate}</span>
            </p>
            {invoiceNumber && (
                <div className="mt-2 flex items-center gap-2">
                  <p className="text-[10px] font-black text-indigo-400 uppercase">
                      Nota Fiscal vinculada: <span className="text-indigo-700 font-mono">{invoiceNumber}</span>
                  </p>
                  {deliveries.find(d => d.invoiceUrl)?.invoiceUrl && (
                    <button 
                      onClick={() => handleOpenPdf(deliveries.find(d => d.invoiceUrl)!.invoiceUrl!)}
                      className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Ver PDF
                    </button>
                  )}
                </div>
            )}
        </div>
        
        {/* Conteúdo com Rolagem */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
            <div className="space-y-4">
                {/* QR Code Section */}
                {supplierCpf && deliveries.length > 0 && (
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/80 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => setShowQrCode(!showQrCode)}
                      className="flex items-center justify-between w-full font-black text-indigo-950 uppercase tracking-tighter text-xs"
                    >
                      <span className="flex items-center gap-2">
                        <span className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                          </svg>
                        </span>
                        QR Code de Entrada (Portaria)
                      </span>
                      <span className="text-indigo-600 font-black uppercase text-[10px] tracking-widest hover:text-indigo-800 transition-colors">
                        {showQrCode ? 'Ocultar' : 'Visualizar'}
                      </span>
                    </button>

                    {showQrCode && (
                      <div className="mt-4 flex flex-col items-center justify-center p-6 bg-emerald-50/70 rounded-3xl border-2 border-emerald-500/80 shadow-xl shadow-emerald-500/5 animate-scale-in w-full text-center">
                        <span className="mb-3 px-3 py-1 bg-emerald-500 text-white font-black text-[9px] uppercase tracking-widest rounded-full shadow-sm animate-pulse">
                          ● CONFERÊNCIA DE ENTRADA (PORTARIA)
                        </span>
                        
                        <div className="bg-white p-4 rounded-3xl border-4 border-emerald-500 shadow-xl inline-block transform hover:scale-105 transition-transform duration-200">
                          <QRCodeSVG 
                            value={`CHECKIN_DELIVERY:${supplierCpf}:${dateString}`} 
                            size={240}
                            level={"H"}
                            includeMargin={true}
                          />
                        </div>
                        
                        {/* Detalhes do Fornecedor e Entrega logo abaixo da imagem */}
                        <div className="w-full mt-4 bg-white border border-emerald-100 p-4 rounded-2xl text-left space-y-2 shadow-sm">
                          <div className="border-b border-gray-100 pb-1.5 mb-1.5 flex justify-between items-center">
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Dados do Agendamento</span>
                            <span className="text-[8px] font-mono text-gray-400">CPF: {supplierCpf}</span>
                          </div>
                          
                          <div>
                            <span className="text-[8px] font-bold text-gray-400 block uppercase">Fornecedor</span>
                            <p className="text-[12px] font-black text-slate-900 uppercase tracking-tight">
                              {supplierName || 'Não Informado'}
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-50">
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 block uppercase">Data de Entrega</span>
                              <p className="text-[11px] font-extrabold text-emerald-800 uppercase">
                                {formattedDate}
                              </p>
                            </div>
                            <div>
                              <span className="text-[8px] font-bold text-gray-400 block uppercase">Hora da Entrega</span>
                              <p className="text-[11px] font-extrabold text-orange-600 uppercase">
                                {deliveryTime ? `${deliveryTime}h` : 'Não definida'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <p className="text-[10px] text-emerald-950 font-bold uppercase tracking-wider mt-4 max-w-xs leading-relaxed">
                          Apresente este QR Code na portaria externa para liberação imediata e registro de chegada!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {deliveries.length > 0 ? (
                    deliveries.map(delivery => {
                        const hasInvoice = delivery.invoiceNumber;
                        if (delivery.item === 'AGENDAMENTO PENDENTE') {
                            return (
                                <div key={delivery.id} className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <p className="font-black text-blue-900 text-sm uppercase">Agendado p/ {delivery.time}</p>
                                            <p className="text-[10px] text-blue-600 font-bold uppercase mt-1">{!hasInvoice ? 'Aguardando Lançamento NF' : 'Faturado'}</p>
                                            {delivery.observations && (
                                                <p className="text-[10px] text-slate-700 bg-white/70 p-2 rounded-lg mt-2 font-medium italic border border-blue-50 max-w-sm">
                                                    Obs: {delivery.observations}
                                                </p>
                                            )}
                                        </div>
                                        {!hasInvoice && (
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => onCancel([delivery.id])}
                                                    className="bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-black uppercase px-3 py-2 rounded-xl border border-red-100 transition-all active:scale-95"
                                                >
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        }
                        return (
                                <div key={delivery.id} className="p-4 bg-gray-50 rounded-2xl flex flex-col gap-2 border border-gray-100 shadow-sm relative overflow-hidden">
                                    {!hasInvoice && (
                                        <div className="absolute top-0 right-0 p-1 flex gap-1">
                                            <button 
                                                onClick={() => onCancel([delivery.id])}
                                                className="bg-red-50 hover:bg-red-100 text-red-600 text-[8px] font-black uppercase px-2 py-1 rounded-lg border border-red-100 shadow-sm transition-all"
                                            >
                                                Excluir
                                            </button>
                                        </div>
                                    )}
                                <div className="flex justify-between items-start text-sm">
                                    <div>
                                        <p className="font-black text-gray-800 uppercase text-xs">{delivery.item || delivery.itemName || ''}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">{(delivery.kg || 0).toFixed(2).replace('.', ',')} Kg</p>
                                    </div>
                                    <span className="font-black text-green-700 whitespace-nowrap pl-4">{formatCurrency(delivery.value || 0)}</span>
                                </div>
                                {delivery.observations && (
                                    <p className="text-[10px] text-gray-600 bg-white p-2 rounded-lg border border-gray-100 font-medium italic mt-1">
                                        Obs: {delivery.observations}
                                    </p>
                                )}
                                {hasInvoice && (
                                    <div className="flex items-center gap-2 mt-1">
                                         <span className="text-[8px] font-black text-indigo-400 uppercase">NF: {delivery.invoiceNumber}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <p className="text-center text-gray-500 py-10 italic">Nenhuma entrega para esta data.</p>
                )}
            </div>

            {totalValue > 0 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t font-black text-lg">
                    <span className="text-gray-400 uppercase text-xs">Total do Período</span>
                    <span className="text-indigo-700">{formatCurrency(totalValue)}</span>
                </div>
            )}

        </div>

        {/* Footer Fixo */}
        <div className="p-6 md:p-8 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                    {(!isPastStrict || isToday) && (
                        <button type="button" onClick={onAddNew} className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest shadow-md col-span-1">Novo Horário</button>
                    )}
                    <button type="button" onClick={onClose} className={`bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-3 rounded-2xl text-[10px] uppercase tracking-widest ${(!isPastStrict || isToday) ? 'col-span-1' : 'col-span-2'}`}>Fechar</button>
                </div>
            </div>
        </div>
      </div>
       <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 4px; }
      `}</style>
    </div>
  );
};

export default ViewDeliveryModal;
