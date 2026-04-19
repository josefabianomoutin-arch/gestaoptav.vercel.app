
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import type { Supplier, Delivery, WarehouseMovement } from '../types';
import { Download, Search, Calendar, FileCheck, AlertCircle, Trash2, RotateCcw, Eye, Plus, X, Edit2 } from 'lucide-react';
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
    pd?: string
  ) => Promise<{ success: boolean; message?: string }>;
  onMarkInvoiceAsOpened: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
  mode?: 'admin' | 'warehouse_entry' | 'warehouse_exit';
  onRegisterExit?: (payload: any) => Promise<{ success: boolean; message: string }>;
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
  onUpdateInvoiceUrl,
  onManualInvoiceEntry,
  onMarkInvoiceAsOpened,
  mode = 'admin',
  onRegisterExit
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter] = useState<'all' | 'pending' | 'opened'>('all');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [manualEntryData, setManualEntryData] = useState({ supplierCpf: '', date: '', invoiceNumber: '', nl: '', pd: '' });
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
          const isExit = movement && movement.outboundInvoice === d.invoiceNumber;
          
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
            const matchesSearch = inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || inv.items.some((it: any) => it.item.toLowerCase().includes(searchTerm.toLowerCase()));
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

  const handleManualSave = async () => {
    if (!manualEntryData.supplierCpf || !manualEntryData.invoiceNumber || !manualEntryData.date) {
        toast.error("Preencha fornecedor, data e número da NF.");
        return;
    }
    const res = await onManualInvoiceEntry(manualEntryData.supplierCpf, manualEntryData.date, manualEntryData.invoiceNumber, [], '', '', '', manualEntryData.nl, manualEntryData.pd);
    if (res.success) {
        toast.success("NF registrada com sucesso!");
        setIsManualModalOpen(false);
    } else {
        toast.error(res.message || "Erro ao registrar NF.");
    }
  };

  const handleEditItems = async (invoice: any) => {
    setEditingInvoice(invoice);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100 italic">
        <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                <FileCheck className="h-8 w-8" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">Consulta de Notas Fiscais</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Gerenciamento centralizado de faturamentos</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
                <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-100 h-12 px-10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all shadow-inner"
                />
                <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
            </div>
            {mode !== 'warehouse_exit' && (
                <button 
                    onClick={() => setIsManualModalOpen(true)}
                    className="h-12 px-6 bg-zinc-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Entrada Manual
                </button>
            )}
          </div>
        </div>

        <div className="bg-slate-50 px-4 py-3 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-gray-100">
          {availableMonths.length > 0 ? availableMonths.map((key) => {
            const [y, m] = key.split('-').map(Number);
            return (
              <button
                key={key}
                onClick={() => setActiveMonthTab(key)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeMonthTab === key 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'text-gray-400 hover:bg-white hover:text-indigo-600'
                }`}
              >
                {MONTHS[m]} {y}
              </button>
            );
          }) : (
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 py-2">Nenhuma NF disponível</p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-100">
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">NF # / Data</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fornecedor</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Itens</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length > 0 ? filteredInvoices.map((inv, idx) => (
                <tr key={`${inv.supplierCpf}-${inv.invoiceNumber}`} className="border-b border-gray-50 hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-black text-indigo-900 tracking-tighter">#{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(inv.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-black text-gray-800 uppercase line-clamp-1">{inv.supplierName}</div>
                    <div className="text-[9px] text-gray-400 font-bold tracking-widest">{inv.supplierCpf}</div>
                  </td>
                  <td className="px-8 py-5 max-w-md">
                    <div className="flex flex-wrap gap-1">
                      {inv.items.map((it: any, i: number) => (
                        <span key={i} className="bg-white border border-gray-100 text-[#475569] text-[9px] font-bold px-2 py-0.5 rounded uppercase whitespace-nowrap">
                          {it.item} ({(it.kg || 0).toLocaleString('pt-BR')} Kg)
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-xs font-black text-green-700">
                        {formatCurrency(inv.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0))}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    {inv.isOpened ? (
                      <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-100 flex items-center justify-center gap-1 w-fit">
                        <Eye className="h-3 w-3" /> Visualizada
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100 flex items-center justify-center gap-1 w-fit">
                        <AlertCircle className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => handleOpenPdf(inv.invoiceUrl)} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Ver PDF"><Download className="h-4 w-4" /></button>
                      <button onClick={() => handleEditItems(inv)} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="Editar Itens"><Edit2 className="h-4 w-4" /></button>
                      <button onClick={() => setConfirmConfig({
                          isOpen: true,
                          title: 'Excluir NF',
                          message: `Excluir NF #${inv.invoiceNumber}?`,
                          variant: 'danger',
                          onConfirm: async () => { await onDeleteInvoice(inv.supplierCpf, inv.invoiceNumber); setConfirmConfig(prev => ({ ...prev, isOpen: false })); }
                      })} className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm" title="Excluir"><Trash2 className="h-4 w-4" /></button>
                      <button onClick={async () => { await onReopenInvoice(inv.supplierCpf, inv.invoiceNumber); toast.success('Nota reaberta para edição!'); }} className="p-2 bg-zinc-100 text-zinc-900 rounded-xl hover:bg-black hover:text-white transition-all shadow-sm" title="Reabrir"><RotateCcw className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={6} className="px-8 py-32 text-center text-gray-300 font-black uppercase italic tracking-widest">Nenhuma nota encontrada em {MONTHS[Number(activeMonthTab.split('-')[1])]}</td>
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
                  <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-zinc-900 text-white font-black uppercase tracking-tighter italic">
                      <div>
                        <h3 className="text-xl">Novo Cadastro de NF</h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Registro manual no sistema</p>
                      </div>
                      <button onClick={() => setIsManualModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
                  </div>
                  <div className="p-8 space-y-4">
                      <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fornecedor</label>
                          <select value={manualEntryData.supplierCpf} onChange={e => setManualEntryData({...manualEntryData, supplierCpf: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl h-12 px-4 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs uppercase">
                              <option value="">Selecione...</option>
                              {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
                            <input type="date" value={manualEntryData.date} onChange={e => setManualEntryData({...manualEntryData, date: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl h-12 px-4 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Número NF</label>
                            <input type="text" value={manualEntryData.invoiceNumber} onChange={e => setManualEntryData({...manualEntryData, invoiceNumber: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl h-12 px-4 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">NL (Opcional)</label>
                            <input type="text" value={manualEntryData.nl} onChange={e => setManualEntryData({...manualEntryData, nl: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl h-12 px-4 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PD (Opcional)</label>
                            <input type="text" value={manualEntryData.pd} onChange={e => setManualEntryData({...manualEntryData, pd: e.target.value})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-2xl h-12 px-4 shadow-inner outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-xs" />
                        </div>
                      </div>
                  </div>
                  <div className="p-8 bg-zinc-50 border-t border-gray-100 flex gap-3">
                      <button onClick={() => setIsManualModalOpen(false)} className="flex-1 bg-white border border-gray-200 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 active:scale-95 transition-all">Cancelar</button>
                      <button onClick={handleManualSave} className="flex-1 bg-indigo-600 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Cadastrar NF</button>
                  </div>
              </motion.div>
          </div>
      )}

      {/* Edit Items Modal */}
      {editingInvoice && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 italic">
                  <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-indigo-600 text-white font-black uppercase tracking-tighter italic">
                      <div>
                        <h3 className="text-xl">Editar Itens da NF #{editingInvoice.invoiceNumber}</h3>
                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest">Ajuste de quantidades e valores</p>
                      </div>
                      <button onClick={() => setEditingInvoice(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
                  </div>
                  <div className="p-8 space-y-4 max-h-[60vh] overflow-y-auto">
                      {editingInvoice.items.map((item: any, idx: number) => (
                          <div key={idx} className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-gray-100">
                              <div className="font-black text-xs text-indigo-900 uppercase">Item: {item.item}</div>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Peso/Qtd (Kg)</label>
                                      <input 
                                          type="number" 
                                          value={item.kg} 
                                          onChange={e => {
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, kg: Number(e.target.value) };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-xs" 
                                      />
                                  </div>
                                  <div className="space-y-1">
                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Unit. (R$)</label>
                                      <input 
                                          type="number" 
                                          value={item.value / item.kg || 0} 
                                          onChange={e => {
                                              const newPrice = Number(e.target.value);
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, value: newPrice * item.kg };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-12 px-4 rounded-xl border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-xs" 
                                      />
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
                  <div className="p-8 bg-zinc-50 border-t border-gray-100 flex gap-3">
                      <button onClick={() => setEditingInvoice(null)} className="flex-1 bg-white border border-gray-200 h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all">Cancelar</button>
                      <button 
                        onClick={async () => {
                            const res = await onUpdateInvoiceItems(
                                editingInvoice.supplierCpf, 
                                editingInvoice.invoiceNumber, 
                                editingInvoice.items.map((it: any) => ({
                                    name: it.item,
                                    kg: it.kg,
                                    value: it.value
                                }))
                            );
                            if (res.success) {
                                toast.success("NF atualizada!");
                                setEditingInvoice(null);
                            } else {
                                toast.error(res.message || "Erro ao atualizar.");
                            }
                        }}
                        className="flex-1 bg-indigo-600 text-white h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all"
                      >
                        Salvar Alterações
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
