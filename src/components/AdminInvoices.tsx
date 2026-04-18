
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Supplier, Delivery, WarehouseMovement } from '../types';
import { Download, Search, Calendar, ChevronRight, Filter, FileCheck, AlertCircle, Trash2, Edit2, RotateCcw, Eye } from 'lucide-react';
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
  mode = 'admin'
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState<number>(2026);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'opened'>('all');
    const [activeMonthTab, setActiveMonthTab] = useState<number>(new Date().getMonth());
  
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
          if (!acc[d.invoiceNumber]) {
            acc[d.invoiceNumber] = {
              supplierName: supplier.name,
              supplierCpf: supplier.cpf,
              invoiceNumber: d.invoiceNumber,
              invoiceUrl: d.invoiceUrl,
              date: d.invoiceDate || d.date, // Use internal date if available
              originalDate: d.date,
              items: [],
              isOpened: d.isOpened || false,
              receiptTermNumber: d.receiptTermNumber,
              nl: d.nl,
              pd: d.pd
            };
          }
          acc[d.invoiceNumber].items.push(d);
          
          // Use the oldest date as the invoice date if multiple deliveries are attached
          if (new Date(d.date) < new Date(acc[d.invoiceNumber].date)) {
            acc[d.invoiceNumber].date = d.date;
          }
        }
        return acc;
      }, {} as Record<string, any>);
      
      Object.values(grouped).forEach(inv => invoices.push(inv));
    });

    // Sort by date (Newest first)
    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [suppliers]);

    const filteredInvoices = useMemo(() => {
        return allInvoices.filter(inv => {
            const invoiceDate = new Date(inv.date + 'T00:00:00');
            const matchesMonth = invoiceDate.getMonth() === activeMonthTab && invoiceDate.getFullYear() === selectedYear;
            const matchesStatus = statusFilter === 'all' || 
                              (statusFilter === 'pending' && !inv.isOpened) ||
                              (statusFilter === 'opened' && inv.isOpened);
            const matchesSearch = 
              inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
              inv.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
              inv.items.some((it: any) => it.item.toLowerCase().includes(searchTerm.toLowerCase()));
            
            return matchesMonth && matchesStatus && matchesSearch;
        });
    }, [allInvoices, activeMonthTab, selectedYear, statusFilter, searchTerm]);

  const handleOpenPdf = async (url: string) => {
    let finalUrl = url;
    if (url.startsWith('rtdb://')) {
      const path = url.substring(7);
      const db = getDatabase(app);
      const refPath = ref(db, path);
      try {
        const snapshot = await get(refPath);
        if (snapshot.exists()) {
          finalUrl = snapshot.val();
        } else {
          toast.error("PDF não encontrado.");
          return;
        }
      } catch (e) {
        toast.error("Erro ao carregar PDF.");
        return;
      }
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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header com Abas de Meses */}
      <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
        <div className="p-6 md:p-8 border-b border-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">Consulta de Notas Fiscais</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Gerenciamento centralizado de faturamentos</p>
          </div>
          <div className="relative w-full md:w-80">
            <input 
              type="text" 
              placeholder="Pesquisar NF ou Fornecedor..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border-2 border-gray-100 h-12 px-10 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all"
            />
            <Search className="h-4 w-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          </div>
        </div>

        {/* Seletor de Mês (Scroll Horizontal) */}
        <div className="bg-gray-50 px-4 py-3 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2 border-b border-gray-100">
          {MONTHS.map((month, idx) => (
            <button
              key={month}
              onClick={() => setActiveMonthTab(idx)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeMonthTab === idx 
                  ? 'bg-indigo-600 text-white shadow-lg' 
                  : 'text-gray-400 hover:bg-white hover:text-indigo-600'
              }`}
            >
              {month}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-8">
          {filteredInvoices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInvoices.map((inv, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={`${inv.supplierCpf}-${inv.invoiceNumber}`}
                  className="bg-white rounded-[2rem] border-2 border-gray-50 p-6 hover:border-indigo-100 hover:shadow-xl transition-all group flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="bg-indigo-50 p-3 rounded-2xl">
                        <FileCheck className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Nota Fiscal</p>
                        <p className="text-lg font-black text-indigo-900 tracking-tighter">#{inv.invoiceNumber}</p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-gray-800 uppercase leading-snug break-words">{inv.supplierName}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          {new Date(inv.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Itens Faturados</p>
                      <div className="flex flex-wrap gap-1">
                        {inv.items.map((it: any, i: number) => (
                          <span key={i} className="bg-slate-50 border border-slate-100 text-[#475569] text-[9px] font-black px-2 py-1 rounded-lg uppercase">
                            {it.item} ({(it.kg || 0).toFixed(2).replace('.', ',')} Kg)
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex justify-between items-center">
                      <div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Valor Total</p>
                        <p className="text-base font-black text-green-700">
                          {formatCurrency(inv.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0))}
                        </p>
                      </div>
                      {inv.isOpened ? (
                        <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <Eye className="h-3 w-3" /> Visualizada
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-600 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Pendente
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => handleOpenPdf(inv.invoiceUrl)}
                      className="flex items-center justify-center gap-2 bg-indigo-600 text-white h-10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-indigo-700 shadow-sm active:scale-95 transition-all"
                    >
                      <Download className="h-3 w-3" /> Ver PDF
                    </button>
                    <button 
                      onClick={() => {
                        setConfirmConfig({
                          isOpen: true,
                          title: 'Excluir Nota Fiscal',
                          message: `Deseja realmente excluir a NF #${inv.invoiceNumber}? Esta ação retornará os itens ao estado pendente.`,
                          variant: 'danger',
                          onConfirm: async () => {
                            await onDeleteInvoice(inv.supplierCpf, inv.invoiceNumber);
                            setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                          }
                        });
                      }}
                      className="flex items-center justify-center gap-2 bg-rose-50 text-rose-600 h-10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-100 active:scale-95 transition-all"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                    <button 
                      onClick={async () => {
                        await onReopenInvoice(inv.supplierCpf, inv.invoiceNumber);
                        toast.success('Nota reaberta para edição!');
                      }}
                      className="col-span-2 flex items-center justify-center gap-2 bg-zinc-800 text-white h-10 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-black active:scale-95 transition-all"
                    >
                      <RotateCcw className="h-3 w-3" /> Reabrir NF
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-black text-gray-400 uppercase tracking-tighter italic">Nenhuma nota encontrada em {MONTHS[selectedMonth]}</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Experimente mudar o filtro ou pesquisar por outro termo</p>
            </div>
          )}
        </div>
      </div>

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
