
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Supplier, Delivery, WarehouseMovement } from '../types';
import { Download, Search, FileCheck, AlertCircle, Trash2, RotateCcw, Eye, Plus, X, Edit2, Printer, Barcode as BarcodeIcon } from 'lucide-react';
import { getDatabase, ref, get } from 'firebase/database';
import { app } from '../firebaseConfig';
import { toast } from 'sonner';
import ConfirmModal from './ConfirmModal';

interface AdminInvoicesProps {
  suppliers: Supplier[];
  warehouseLog: WarehouseMovement[];
  onReopenInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
  onDeleteInvoice: (supplierCpf: string, invoiceNumber: string) => Promise<void>;
  onUpdateInvoiceItems: (
    supplierCpf: string, 
    invoiceNumber: string, 
    items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], 
    barcode?: string, 
    newInvoiceNumber?: string, 
    newDate?: string, 
    receiptTermNumber?: string, 
    invoiceDate?: string, 
    nl?: string, 
    pd?: string
  ) => Promise<{ success: boolean; message?: string }>;
  onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
  onManualInvoiceEntry: (
    supplierCpf: string, 
    date: string, 
    invoiceNumber: string, 
    items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], 
    barcode?: string, 
    receiptTermNumber?: string, 
    invoiceDate?: string, 
    nl?: string, 
    pd?: string,
    type?: 'entrada' | 'saída'
  ) => Promise<{ success: boolean; message?: string }>;
  onMarkInvoiceAsOpened: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
  mode?: 'admin' | 'warehouse_entry' | 'warehouse_exit';
  onRegisterExit?: (payload: any) => Promise<{ success: boolean; message: string }>;
  perCapitaConfig?: any;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const AdminInvoices: React.FC<AdminInvoicesProps> = ({
  suppliers,
  warehouseLog,
  onReopenInvoice,
  onDeleteInvoice,
  onUpdateInvoiceItems,
  onManualInvoiceEntry,
  mode = 'admin',
  perCapitaConfig
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter] = useState<'all' | 'pending' | 'opened'>('all');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({ 
    supplierCpf: '', 
    date: '', 
    invoiceNumber: '', 
    nl: '', 
    pd: '', 
    type: mode === 'warehouse_exit' ? 'saída' : 'entrada',
    items: [] as { name: string; kg: number; value: number; lotNumber?: string }[]
  });
  
  const [newItem, setNewItem] = useState({ name: '', kg: 0, value: 0 });
    const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

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

  const allInvoices = useMemo(() => {
    const invoices: any[] = [];
    suppliers.forEach(supplier => {
      const deliveries = Object.values(supplier.deliveries || {}) as Delivery[];
      const grouped = deliveries.reduce((acc, d) => {
        if (d.invoiceNumber) {
          const movement = warehouseLog.find(log => 
            log.inboundInvoice === d.invoiceNumber || 
            log.outboundInvoice === d.invoiceNumber
          );
          const isExit = (d as any).type === 'saída' || (movement && movement.type === 'saída');
          
          if (mode === 'warehouse_entry' && isExit) return acc;
          if (mode === 'warehouse_exit' && !isExit) return acc;

          if (!acc[d.invoiceNumber]) {
            acc[d.invoiceNumber] = {
              supplierName: supplier.name,
              supplierCpf: supplier.cpf,
              invoiceNumber: d.invoiceNumber,
              invoiceUrl: d.invoiceUrl,
              date: d.invoiceDate || d.date, 
              originalDate: d.date,
              items: [],
              isOpened: d.isOpened || false,
              receiptTermNumber: d.receiptTermNumber,
              nl: d.nl,
              pd: d.pd
            };
          }
          acc[d.invoiceNumber].items.push(d);
          
          if (new Date(d.date) < new Date(acc[d.invoiceNumber].date)) {
            acc[d.invoiceNumber].date = d.date;
          }
        }
        return acc;
      }, {} as Record<string, any>);
      
      Object.values(grouped).forEach(inv => invoices.push(inv));
    });
    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [suppliers, warehouseLog, mode]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    allInvoices.forEach(inv => {
      const d = new Date(inv.date + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        months.add(`${d.getFullYear()}-${d.getMonth()}`);
      }
    });
    return Array.from(months).sort((a, b) => {
        const [yA, mA] = a.split('-').map(Number);
        const [yB, mB] = b.split('-').map(Number);
        return (yB * 12 + mB) - (yA * 12 + mA);
    });
  }, [allInvoices]);

  const [activeMonthTab, setActiveMonthTab] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });

  const [prevAvailableMonths, setPrevAvailableMonths] = useState(availableMonths);
  if (availableMonths !== prevAvailableMonths) {
    setPrevAvailableMonths(availableMonths);
    if (availableMonths.length > 0 && !availableMonths.includes(activeMonthTab)) {
        setActiveMonthTab(availableMonths[0]);
    }
  }

    const filteredInvoices = useMemo(() => {
        return allInvoices.filter(inv => {
            const invoiceDate = new Date(inv.date + 'T00:00:00');
            const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
            const matchesMonth = monthKey === activeMonthTab;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' && !inv.isOpened) || (statusFilter === 'opened' && inv.isOpened);
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 inv.items.some((it: any) => it.item.toLowerCase().includes(searchTerm.toLowerCase()) || (it.barcode && it.barcode.toLowerCase().includes(searchTerm.toLowerCase())));
            return matchesMonth && matchesStatus && matchesSearch;
        });
    }, [allInvoices, activeMonthTab, statusFilter, searchTerm]);

  const handleOpenPdf = async (url: string) => {
    if (!url) return;
    let finalUrl = url;
    if (url.startsWith('rtdb://')) {
      const path = url.substring(7);
      const db = getDatabase(app);
      const refPath = ref(db, path);
      try {
        const snapshot = await get(refPath);
        if (snapshot.exists()) finalUrl = snapshot.val();
        else { toast.error("PDF não encontrado."); return; }
      } catch { toast.error("Erro ao carregar PDF."); return; }
    }
    if (finalUrl.startsWith('data:')) {
      const arr = finalUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
    } else {
      window.open(finalUrl, '_blank');
    }
  };

   const availableItems = useMemo(() => {
    const items = new Set<string>();
    
    // Search in main suppliers
    const selectedSupplier = suppliers.find(s => s.cpf === manualEntryData.supplierCpf);
    if (selectedSupplier) {
        Object.values(selectedSupplier.contractItems || {}).forEach((ci: any) => {
            if (ci.name) items.add(ci.name);
        });
    }

    // Search in perCapitaConfig for other quadrimesters
    if (perCapitaConfig && manualEntryData.supplierCpf) {
        const pEntry = perCapitaConfig.ppaisProducers?.find((p: any) => p.cpfCnpj === manualEntryData.supplierCpf);
        const fEntry = perCapitaConfig.pereciveisSuppliers?.find((f: any) => f.cpfCnpj === manualEntryData.supplierCpf);
        const pcEntry = pEntry || fEntry;
        
        if (pcEntry && pcEntry.contractItems) {
            pcEntry.contractItems.forEach((ci: any) => {
                if (ci.name) items.add(ci.name);
            });
        }
    }

    return Array.from(items).sort();
  }, [suppliers, perCapitaConfig, manualEntryData.supplierCpf]);

  const handleManualSave = async () => {
    if (!manualEntryData.supplierCpf || !manualEntryData.invoiceNumber || !manualEntryData.date) {
        toast.error("Preencha fornecedor, data e número da NF.");
        return;
    }
    if (manualEntryData.items.length === 0) {
        toast.error("Adicione pelo menos um item à nota.");
        return;
    }
    const res = await onManualInvoiceEntry(
        manualEntryData.supplierCpf, 
        manualEntryData.date, 
        manualEntryData.invoiceNumber, 
        manualEntryData.items.map(it => ({
            name: it.name,
            kg: it.kg,
            value: it.value * it.kg,
            lotNumber: it.lotNumber || 'MANUAL'
        })), 
        '', '', '', 
        manualEntryData.nl, 
        manualEntryData.pd,
        manualEntryData.type as any
    );
    if (res.success) {
        toast.success("NF registrada com sucesso!");
        setIsManualModalOpen(false);
        setManualEntryData({ 
            supplierCpf: '', 
            date: '', 
            invoiceNumber: '', 
            nl: '', 
            pd: '', 
            type: mode === 'warehouse_exit' ? 'saída' : 'entrada',
            items: []
        });
    } else {
        toast.error(res.message || "Erro ao registrar NF.");
    }
  };

  const handleEditItems = async (invoice: any) => {
    setEditingInvoice(invoice);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 italic">
        <div className="p-4 md:p-6 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl text-white">
                <FileCheck className="h-6 w-6" />
            </div>
            <div>
                <h2 className="text-lg font-black text-indigo-900 uppercase tracking-tighter italic leading-none">
                    {mode === 'warehouse_exit' ? 'Gestão de Saídas' : mode === 'warehouse_entry' ? 'Gestão de Entradas' : 'Gestão de NFs'}
                </h2>
                <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5 italic">Consulta e Controle de Documentos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-40">
                <input 
                type="text" 
                placeholder="NF, Fornecedor..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 h-8 px-8 rounded-lg text-[9px] font-bold outline-none focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-all"
                />
                <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            <button 
                onClick={() => setIsManualModalOpen(true)}
                className="h-8 px-3 bg-indigo-600 text-white rounded-lg font-black text-[9px] uppercase tracking-wider shadow-sm hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
            >
                <Plus className="h-3 w-3" /> 
                {mode === 'warehouse_exit' ? 'Manual (Saída)' : 'Manual (Entrada)'}
            </button>
          </div>
        </div>

        <div className="bg-slate-50 px-2 py-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-1 border-b border-gray-100">
          {availableMonths.length > 0 ? availableMonths.map((key) => {
            const [y, m] = key.split('-').map(Number);
            return (
              <button
                key={key}
                onClick={() => setActiveMonthTab(key)}
                className={`px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all ${
                  activeMonthTab === key 
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-gray-400 hover:bg-white hover:text-indigo-600'
                }`}
              >
                {MONTHS[m].substring(0,3)}/{y}
              </button>
            );
          }) : (
            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest px-2 py-1">Sem NFs</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="w-[10%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">NF # / Data</th>
                <th className="w-[18%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</th>
                <th className="w-[30%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Itens / Etiquetas</th>
                <th className="w-[12%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">NL / PD</th>
                <th className="w-[10%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Valor Total</th>
                <th className="w-[10%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="w-[10%] px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? filteredInvoices.map((inv, idx) => {
                const hasMissingInfo = !inv.nl || !inv.pd;
                return (
                <tr key={`${inv.supplierCpf}-${inv.invoiceNumber}`} className={`border-b border-gray-50 transition-colors group ${hasMissingInfo ? 'bg-red-50/70 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-1.5">
                    <div className={`font-black tracking-tighter text-[11px] ${hasMissingInfo ? 'text-red-700' : 'text-indigo-900'}`}>#{inv.invoiceNumber}</div>
                    <div className="text-[8px] text-gray-400 font-bold uppercase tracking-tight">{new Date(inv.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="text-[10px] font-black text-gray-800 uppercase line-clamp-1 leading-tight">{inv.supplierName}</div>
                    <div className="text-[7px] text-gray-400 font-bold tracking-widest leading-none mt-0.5">{inv.supplierCpf}</div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex flex-col gap-1.5">
                      {inv.items.map((it: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 group/item">
                            <div className="flex flex-col border-l-2 border-indigo-100 pl-2">
                                <span className="text-[9px] font-black text-indigo-900 leading-none uppercase">
                                    {it.item} ({(it.kg || 0).toLocaleString('pt-BR')} Kg)
                                </span>
                                {it.barcode && (
                                    <span className="text-[7px] font-mono text-blue-600 font-black tracking-tight mt-0.5 flex items-center gap-1">
                                        <BarcodeIcon className="h-2 w-2" /> {it.barcode}
                                    </span>
                                )}
                            </div>
                            <button 
                                onClick={() => {
                                    const printWindow = window.open('', '_blank');
                                    if (!printWindow) return;
                                    const htmlContent = `
                                        <html>
                                        <head>
                                            <title>Etiqueta - ${it.item}</title>
                                            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                                            <style>
                                                @page { size: 100mm 50mm; margin: 0; }
                                                body { margin: 0; padding: 0; font-family: sans-serif; }
                                                .label { width: 100mm; height: 50mm; padding: 5mm; box-sizing: border-box; display: flex; flex-direction: column; }
                                                h1 { font-size: 14pt; margin: 0; }
                                                p { font-size: 10pt; margin: 2pt 0; }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="label">
                                                <h1>${it.item}</h1>
                                                <p>Fornecedor: ${inv.supplierName}</p>
                                                <p>NF: ${inv.invoiceNumber} | Data: ${new Date(inv.date).toLocaleDateString()}</p>
                                                <p>Qtd: ${it.kg}kg | Lote: ${it.lotNumber || 'MANUAL'}</p>
                                                <svg id="barcode"></svg>
                                            </div>
                                            <script>
                                                JsBarcode("#barcode", "${it.barcode || 'N/A'}", { height: 40, displayValue: true, fontSize: 14 });
                                                setTimeout(() => { window.print(); window.close(); }, 500);
                                            </script>
                                        </body>
                                        </html>
                                    `;
                                    printWindow.document.write(htmlContent);
                                    printWindow.document.close();
                                }}
                                className="opacity-0 group-hover/item:opacity-100 p-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-600 hover:text-white transition-all ml-auto"
                                title="Imprimir Etiqueta"
                            >
                                <Printer className="h-2.5 w-2.5" />
                            </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <div className="flex flex-col gap-0.5 items-center">
                      <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${inv.nl ? 'bg-green-100 text-green-700' : 'bg-red-500 text-white animate-pulse'}`}>
                        NL: {inv.nl || 'PENDENTE'}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded ${inv.pd ? 'bg-blue-100 text-blue-700' : 'bg-red-500 text-white animate-pulse'}`}>
                        PD: {inv.pd || 'PENDENTE'}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className={`text-[10px] font-black ${hasMissingInfo ? 'text-red-600' : 'text-green-700'}`}>
                        {formatCurrency(inv.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0))}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    {inv.isOpened ? (
                      <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border border-blue-100 flex items-center justify-center gap-1 w-fit">
                        <Eye className="h-2 w-2" /> OK
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-widest border border-amber-100 flex items-center justify-center gap-1 w-fit">
                        <AlertCircle className="h-2 w-2" /> PEND
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleOpenPdf(inv.invoiceUrl)} className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all" title="Ver PDF"><Download className="h-3 w-3" /></button>
                      <button onClick={() => handleEditItems(inv)} className="p-1 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-all" title="Editar Itens"><Edit2 className="h-3 w-3" /></button>
                      <button onClick={() => setConfirmConfig({
                          isOpen: true,
                          title: 'Excluir NF',
                          message: `Excluir NF #${inv.invoiceNumber}?`,
                          variant: 'danger',
                          onConfirm: async () => { await onDeleteInvoice(inv.supplierCpf, inv.invoiceNumber); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }
                      })} className="p-1 bg-rose-50 text-rose-600 rounded-md hover:bg-rose-600 hover:text-white transition-all" title="Excluir"><Trash2 className="h-3 w-3" /></button>
                      <button onClick={async () => { await onReopenInvoice(inv.supplierCpf, inv.invoiceNumber); toast.success('Reaberta!'); }} className="p-1 bg-zinc-100 text-zinc-900 rounded-md hover:bg-black hover:text-white transition-all" title="Reabrir"><RotateCcw className="h-3 w-3" /></button>
                    </div>
                  </td>
                </tr>
                );
              }) : (
                <tr>
                    <td colSpan={7} className="px-8 py-20 text-center text-gray-300 font-black uppercase italic tracking-widest text-xs">Nenhuma nota encontrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {isManualModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 italic">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-zinc-900 text-white font-black uppercase tracking-tighter italic">
                      <div>
                        <h3 className="text-lg">
                            {mode === 'warehouse_exit' ? 'Nova Saída de NF' : 'Novo Cadastro de NF'}
                        </h3>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Lançamento manual no banco de dados</p>
                      </div>
                      <button onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div className="space-y-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Fornecedor</label>
                            <select value={manualEntryData.supplierCpf} onChange={e => setManualEntryData({...manualEntryData, supplierCpf: e.target.value, items: []})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px] uppercase">
                                <option value="">Selecione...</option>
                                {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Data</label>
                              <input type="date" value={manualEntryData.date} onChange={e => setManualEntryData({...manualEntryData, date: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Número NF</label>
                              <input type="text" value={manualEntryData.invoiceNumber} onChange={e => setManualEntryData({...manualEntryData, invoiceNumber: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">NL (Opcional)</label>
                              <input type="text" value={manualEntryData.nl} onChange={e => setManualEntryData({...manualEntryData, nl: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">PD (Opcional)</label>
                              <input type="text" value={manualEntryData.pd} onChange={e => setManualEntryData({...manualEntryData, pd: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Adicionar Itens</h4>
                            <span className="text-[8px] text-gray-400 font-bold uppercase">{manualEntryData.items.length} itens adicionados</span>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Item (Q1, Q2, Q3)</label>
                                <select 
                                    value={newItem.name} 
                                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                                    disabled={!manualEntryData.supplierCpf}
                                    className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px] uppercase"
                                >
                                    <option value="">Selecione o Item...</option>
                                    {availableItems.map(it => <option key={it} value={it}>{it}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Peso/Qtd (Kg)</label>
                                    <input 
                                        type="number" 
                                        value={newItem.kg || ''} 
                                        onChange={e => setNewItem({...newItem, kg: Number(e.target.value)})}
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px]" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Valor Unit (R$)</label>
                                    <input 
                                        type="number" 
                                        value={newItem.value || ''} 
                                        onChange={e => setNewItem({...newItem, value: Number(e.target.value)})}
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px]" 
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    if (!newItem.name || !newItem.kg) {
                                        toast.error("Preencha o nome e a quantidade do item.");
                                        return;
                                    }
                                    setManualEntryData({
                                        ...manualEntryData,
                                        items: [...manualEntryData.items, { ...newItem, lotNumber: 'MANUAL' }]
                                    });
                                    setNewItem({ name: '', kg: 0, value: 0 });
                                }}
                                className="w-full h-9 bg-zinc-800 text-white rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-3 w-3" /> Adicionar Item à Nota
                            </button>
                        </div>

                        {manualEntryData.items.length > 0 && (
                            <div className="space-y-1.5">
                                {manualEntryData.items.map((it, i) => (
                                    <div key={i} className="flex items-center justify-between bg-white border border-gray-100 p-2 rounded-lg group hover:border-indigo-200 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-indigo-900 uppercase leading-none">{it.name}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                                                {it.kg.toLocaleString('pt-BR')} Kg • {formatCurrency(it.value * it.kg)}
                                            </span>
                                        </div>
                                        <button 
                                            onClick={() => {
                                                const newItems = [...manualEntryData.items];
                                                newItems.splice(i, 1);
                                                setManualEntryData({ ...manualEntryData, items: newItems });
                                            }}
                                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>
                  </div>
                  <div className="p-6 bg-zinc-50 border-t border-gray-100 flex gap-2.5">
                      <button onClick={() => setIsManualModalOpen(false)} className="flex-1 bg-white border border-gray-200 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 active:scale-95 transition-all">Cancelar</button>
                      <button onClick={handleManualSave} className="flex-1 bg-indigo-600 text-white h-12 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Confirmar Registro</button>
                  </div>
              </motion.div>
          </div>
      )}

      {/* Edit Items Modal */}
      {editingInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 italic">
                  <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-indigo-600 text-white font-black uppercase tracking-tighter italic">
                      <div>
                        <h3 className="text-xl leading-none">Ajuste de Itens - NF #{editingInvoice.invoiceNumber}</h3>
                        <p className="text-[9px] text-indigo-100 font-bold uppercase tracking-widest mt-1">Modificar pesos e valores</p>
                      </div>
                      <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-5 w-5" /></button>
                  </div>
                  <div className="p-6 space-y-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                      <div className="grid grid-cols-2 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-2">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-0.5">Nota de Lançamento (NL)</label>
                            <input type="text" value={editingInvoice.nl || ''} onChange={e => setEditingInvoice({...editingInvoice, nl: e.target.value.toUpperCase()})} className="w-full h-10 px-3 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[11px] uppercase" />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-0.5">Parecer de Despesa (PD)</label>
                            <input type="text" value={editingInvoice.pd || ''} onChange={e => setEditingInvoice({...editingInvoice, pd: e.target.value.toUpperCase()})} className="w-full h-10 px-3 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[11px] uppercase" />
                        </div>
                      </div>

                      {editingInvoice.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl space-y-3 border border-gray-100 shadow-sm">
                              <div className="font-black text-[10px] text-indigo-900 uppercase tracking-tight">Produto: {item.item}</div>
                              <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Peso/Qtd (Kg)</label>
                                      <input 
                                          type="number" 
                                          value={item.kg} 
                                          onChange={e => {
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, kg: Number(e.target.value) };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-[10px]" 
                                      />
                                  </div>
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Valor Unit (R$)</label>
                                      <input 
                                          type="number" 
                                          value={item.value / item.kg || 0} 
                                          onChange={e => {
                                              const newPrice = Number(e.target.value);
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, value: newPrice * item.kg };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-[10px]" 
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-6 bg-zinc-50 border-t border-gray-100 flex gap-2.5">
                      <button onClick={() => setEditingInvoice(null)} className="flex-1 bg-white border border-gray-200 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 transition-all">Sair</button>
                      <button 
                        onClick={async () => {
                            const res = await onUpdateInvoiceItems(
                                editingInvoice.supplierCpf, 
                                editingInvoice.invoiceNumber, 
                                editingInvoice.items.map((it: any) => ({
                                    name: it.item,
                                    kg: it.kg,
                                    value: it.value
                                })),
                                undefined, undefined, undefined, undefined, undefined,
                                editingInvoice.nl,
                                editingInvoice.pd
                            );
                            if (res.success) {
                                toast.success("Alterações salvas!");
                                setEditingInvoice(null);
                            } else {
                                toast.error(res.message || "Erro.");
                            }
                        }}
                        className="flex-1 bg-indigo-600 text-white h-12 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
                      >
                        Salvar Ajustes
                      </button>
                  </div>
              </motion.div>
          </div>
      )}

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

export default AdminInvoices;
