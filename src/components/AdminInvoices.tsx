
import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ensureArray } from '../lib/utils';
import type { Supplier, Delivery, WarehouseMovement, AcquisitionItem } from '../types';
import { Download, Search, FileCheck, Trash2, RotateCcw, Plus, X, Edit2, Printer, Barcode as BarcodeIcon, Upload, Calendar, FileText, Package } from 'lucide-react';
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
    items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string; pd?: string; ne?: string }[], 
    barcode?: string, 
    newInvoiceNumber?: string, 
    newDate?: string, 
    receiptTermNumber?: string, 
    invoiceDate?: string, 
    pd?: string,
    supplierNameHint?: string,
    ne?: string
  ) => Promise<{ success: boolean; message?: string }>;
  onUpdateInvoiceUrl: (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => Promise<{ success: boolean; message?: string }>;
  onManualInvoiceEntry: (
    supplierCpf: string, 
    date: string, 
    invoiceNumber: string, 
    items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], 
    barcode?: string, 
    receiptTermNumber?: string, 
    invoiceDate?: string, 
    pd?: string,
    type?: 'entrada' | 'saída',
    invoiceUrl?: string,
    ne?: string
  ) => Promise<{ success: boolean; message?: string }>;
  mode?: 'admin' | 'warehouse_entry' | 'warehouse_exit';
  onRegisterExit?: (payload: any) => Promise<{ success: boolean; message: string }>;
  perCapitaConfig?: any;
  acquisitionItems?: AcquisitionItem[];
  onMarkInvoiceAsOpened?: (supplierCpf: string, invoiceNumber: string) => Promise<{ success: boolean }>;
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
  mode = 'admin',
  perCapitaConfig,
  acquisitionItems: _acquisitionItems = [],
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter] = useState<'all' | 'pending' | 'opened'>('all');
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({ 
    supplierCpf: '', 
    date: '', 
    invoiceNumber: '', 
    pd: '', 
    ne: '',
    type: mode === 'warehouse_exit' ? 'saída' : 'entrada',
    items: [] as { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[]
  });
  
  const [newItem, setNewItem] = useState({ name: '', kg: 0, value: 0, lotNumber: '', expirationDate: '', barcode: '' });
    const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
    const [originalInvoiceNumber, setOriginalInvoiceNumber] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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
    const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();

    const processedCpfs = new Set<string>();

    ensureArray(suppliers).forEach(supplier => {
      if (!supplier) return;
      processedCpfs.add(cleanStr(supplier.cpf));
      const deliveries = ensureArray(supplier.deliveries) as Delivery[];
          const grouped = deliveries.reduce((acc, d) => {
            if (!d || d.item === 'AGENDAMENTO PENDENTE') return acc;
            const invoiceNum = String(d.invoiceNumber || 'S/N').trim();
            const cleanDInvoice = cleanStr(invoiceNum);
            const movement = warehouseLog.find(log => {
                const cleanLogInv = cleanStr(log.invoiceNumber || log.inboundInvoice || log.outboundInvoice);
                const cleanLogItem = cleanStr(log.item || log.itemName);
                const cleanDItem = cleanStr(d.item);
                const cleanLogId = cleanStr(log.id);
                const cleanDId = cleanStr(d.id);
                return cleanLogInv === cleanDInvoice &&
                       (cleanLogItem === cleanDItem || (cleanLogId && cleanLogId === cleanDId)) &&
                       (cleanStr(log.supplierCpf) === cleanStr(supplier.cpf) || cleanStr(log.supplierName) === cleanStr(supplier.name));
            });
          const isExit = (d as any).type === 'saída' || (movement && movement.type === 'saída');
          
          if (mode === 'warehouse_entry' && isExit) return acc;
          if (mode === 'warehouse_exit' && !isExit) return acc;

          const invKey = invoiceNum;
          if (!acc[invKey]) {
            acc[invKey] = {
              supplierName: supplier.name,
              supplierCpf: supplier.cpf,
              invoiceNumber: invoiceNum,
              invoiceUrl: d.invoiceUrl,
              date: d.invoiceDate || d.date, 
              originalDate: d.date,
              items: [],
              isOpened: d.isOpened || false,
              receiptTermNumber: d.receiptTermNumber,
              nl: d.nl,
              pd: d.pd || movement?.pdNumber || '',
              ne: d.ne || movement?.neNumber || ''
            };
          }
          
          // Tentar buscar o valor registrado no warehouseLog para este item específico desta nota
          const itemMovement = warehouseLog.find(log => {
            const cleanLogInv = cleanStr(log.invoiceNumber || log.inboundInvoice || log.outboundInvoice);
            const cleanLogItem = cleanStr(log.item || log.itemName);
            const cleanDItem = cleanStr(d.item);
            const cleanDId = cleanStr(d.id);
            const cleanLogId = cleanStr(log.id);
            
            return cleanLogInv === cleanDInvoice &&
                   (cleanLogItem === cleanDItem || (cleanLogId && cleanLogId === cleanDId)) &&
                   (cleanStr(log.supplierCpf) === cleanStr(supplier.cpf) || cleanStr(log.supplierName) === cleanStr(supplier.name));
          });

          const itemValue = itemMovement?.value || d.value || 0;
          const barcode = itemMovement?.barcode || d.barcode || '';
          acc[invKey].items.push({ 
            ...d, 
            value: itemValue, 
            barcode,
            lotNumber: itemMovement?.lotNumber || d.lotNumber,
            expirationDate: itemMovement?.expirationDate || d.expirationDate,
            pd: itemMovement?.pdNumber || d.pd
          });
          
          if (new Date(d.date) < new Date(acc[invKey].date)) {
            acc[invKey].date = d.date;
          }
        return acc;
      }, {} as Record<string, any>);
      
      Object.values(grouped).forEach(inv => invoices.push(inv));
    });

    // --- FIX: Include perCapitaConfig deliveries ---
    if (perCapitaConfig) {
      const pcLists = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      pcLists.forEach(listKey => {
        ensureArray(perCapitaConfig[listKey]).forEach((pcSupplier: any) => {
          if (!pcSupplier) return;
          const pcCpf = cleanStr(pcSupplier.cpfCnpj || pcSupplier.cpf);
          if (processedCpfs.has(pcCpf)) return;
          processedCpfs.add(pcCpf);

          const deliveries = ensureArray(pcSupplier.deliveries) as any[];
          const grouped = deliveries.reduce((acc, d) => {
            if (!d || d.item === 'AGENDAMENTO PENDENTE') return acc;
            const invoiceNum = String(d.invoiceNumber || 'S/N').trim();

            const isExit = d.type === 'saída' || d.type === 'saida';
            if (mode === 'warehouse_entry' && isExit) return acc;
            if (mode === 'warehouse_exit' && !isExit) return acc;

            const invKey = invoiceNum;
            if (!acc[invKey]) {
              acc[invKey] = {
                supplierName: pcSupplier.name,
                supplierCpf: pcSupplier.cpfCnpj || pcSupplier.cpf,
                invoiceNumber: invoiceNum,
                invoiceUrl: d.invoiceUrl,
                date: d.invoiceDate || d.date,
                originalDate: d.date,
                items: [],
                isOpened: d.isOpened || d.opened || false,
                receiptTermNumber: d.receiptTermNumber,
                pd: d.pd || '',
                ne: d.ne || ''
              };
            }
            
            acc[invKey].items.push({ ...d });

            if (new Date(d.date) < new Date(acc[invKey].date)) {
              acc[invKey].date = d.date;
            }

            return acc;
          }, {} as Record<string, any>);
          
          Object.values(grouped).forEach(inv => invoices.push(inv));
        });
      });
    }

    // Mirror entries from warehouseLog that might not be in supplier deliveries
    (warehouseLog || []).forEach(log => {
      if (!log || (log.item || log.itemName) === 'AGENDAMENTO PENDENTE') return;
      const anyLog = log as any;
      const invNum = String(anyLog.invoiceNumber || anyLog.inboundInvoice || anyLog.outboundInvoice || 'S/N').trim();

      const isExit = anyLog.type === 'saída' || anyLog.type === 'saida';
      if (mode === 'warehouse_entry' && isExit) return;
      if (mode === 'warehouse_exit' && !isExit) return;

      const cleanLogInv = cleanStr(invNum);

      // Check if this invoice is already in our list
      const existingInv = invoices.find(inv => 
        cleanStr(inv.invoiceNumber) === cleanLogInv &&
        (cleanStr(inv.supplierName) === cleanStr(anyLog.supplierName) || cleanStr(inv.supplierCpf) === cleanStr(anyLog.supplierCpf))
      );

      if (existingInv) {
        if (!existingInv.invoiceUrl && anyLog.invoiceUrl) {
          existingInv.invoiceUrl = anyLog.invoiceUrl;
        }
        if (!existingInv.ne && (anyLog.neNumber || anyLog.ne)) {
          existingInv.ne = anyLog.neNumber || anyLog.ne;
        }
        // Check if item is already in existing invoice
        const hasItem = existingInv.items.some((it: any) => 
          cleanStr(it.item) === cleanStr(anyLog.item || anyLog.itemName) && 
          Number(it.kg || 0) === Number(anyLog.kg || anyLog.quantity || 0) &&
          cleanStr(it.barcode) === cleanStr(anyLog.barcode)
        );
        if (!hasItem) {
          existingInv.items.push({
            id: anyLog.id,
            item: anyLog.item || anyLog.itemName,
            kg: anyLog.kg || anyLog.quantity || 0,
            value: anyLog.value || 0,
            date: anyLog.date,
            barcode: anyLog.barcode,
            lotNumber: anyLog.lotNumber,
            expirationDate: anyLog.expirationDate,
            pd: anyLog.pdNumber,
            isManual: true
          });
          if (anyLog.pdNumber && !existingInv.pd) existingInv.pd = anyLog.pdNumber;
        }
      } else {
        // Create new invoice entry from log
        invoices.push({
          supplierName: anyLog.supplierName,
          supplierCpf: anyLog.supplierCpf,
          invoiceNumber: invNum,
          invoiceUrl: anyLog.invoiceUrl || '',
          date: anyLog.date,
          items: [{
            id: anyLog.id,
            item: anyLog.item || anyLog.itemName,
            kg: anyLog.kg || anyLog.quantity || 0,
            value: anyLog.value || 0,
            date: anyLog.date,
            barcode: anyLog.barcode,
            lotNumber: anyLog.lotNumber,
            expirationDate: anyLog.expirationDate,
            pd: anyLog.pdNumber,
            isManual: true
          }],
          pd: anyLog.pdNumber,
          ne: anyLog.neNumber || anyLog.ne || '',
          isOpened: true, // Manual logs are considered "handled"
          isManualEntry: true
        });
      }
    });

    return invoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [suppliers, warehouseLog, mode, perCapitaConfig]);

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    (allInvoices || []).forEach(inv => {
      if (!inv || !inv.date) return;
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
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    return currentMonthKey;
  });

  useEffect(() => {
    try {
      if (availableMonths.length > 0) {
        if (!activeMonthTab || !availableMonths.includes(activeMonthTab)) {
          setTimeout(() => {
            setActiveMonthTab((prev) => {
              if (!prev || !availableMonths.includes(prev)) return availableMonths[0];
              return prev;
            });
          }, 0);
        }
      }
    } catch (e) {
      console.error("Error updating active month tab:", e);
    }
  }, [availableMonths, activeMonthTab]);

    const filteredInvoices = useMemo(() => {
        const searchLower = String(searchTerm || '').toLowerCase();
        return (allInvoices || []).filter(inv => {
            if (!inv) return false;
            const invoiceDate = new Date(inv.date + 'T00:00:00');
            const monthKey = `${invoiceDate.getFullYear()}-${invoiceDate.getMonth()}`;
            const matchesMonth = monthKey === activeMonthTab;
            const matchesStatus = statusFilter === 'all' || (statusFilter === 'pending' && !inv.isOpened) || (statusFilter === 'opened' && inv.isOpened);
            
            const invoiceNumber = String(inv.invoiceNumber || '').toLowerCase();
            const supplierName = String(inv.supplierName || '').toLowerCase();
            const hasItemMatch = (inv.items || []).some((it: any) => {
                if (!it) return false;
                const itemMatch = String(it.item || '').toLowerCase().includes(searchLower);
                const barcodeMatch = it.barcode ? String(it.barcode).toLowerCase().includes(searchLower) : false;
                return itemMatch || barcodeMatch;
            });

            const matchesSearch = searchLower === '' || 
                                 invoiceNumber.includes(searchLower) || 
                                 supplierName.includes(searchLower) || 
                                 hasItemMatch;

            return matchesMonth && matchesStatus && matchesSearch;
        });
    }, [allInvoices, activeMonthTab, statusFilter, searchTerm]);

    const globalTotal = useMemo(() => {
        return filteredInvoices.reduce((total, inv) => {
            const invTotal = inv.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0);
            return total + invTotal;
        }, 0);
    }, [filteredInvoices]);

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
      window.open(finalUrl, '_blank'); } };
   const availableItems = useMemo(() => {
    const items = new Set<string>();
    const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
    
    const activeSupplierCpf = manualEntryData.supplierCpf || editingInvoice?.supplierCpf;
    const cleanActiveCpf = cleanStr(activeSupplierCpf);
    
    // Search in main suppliers
    const selectedSupplier = ensureArray(suppliers).find(s => cleanStr(s.cpf) === cleanActiveCpf);
    if (selectedSupplier) {
        ensureArray(selectedSupplier.contractItems).forEach((ci: any) => {
            if (ci.name) items.add(ci.name);
            if (ci.itemName) items.add(ci.itemName);
        });
    }

    // Search in perCapitaConfig
    if (perCapitaConfig && cleanActiveCpf) {
        const pEntry = ensureArray<any>(perCapitaConfig.ppaisProducers).find((p: any) => cleanStr(p.cpfCnpj || p.cpf) === cleanActiveCpf);
        const fEntry = ensureArray<any>(perCapitaConfig.pereciveisSuppliers).find((f: any) => cleanStr(f.cpfCnpj || f.cpf) === cleanActiveCpf);
        const eEntry = ensureArray<any>(perCapitaConfig.estocaveisSuppliers).find((e: any) => cleanStr(e.cpfCnpj || e.cpf) === cleanActiveCpf);
        const pcEntry = pEntry || fEntry || eEntry;
        
        if (pcEntry) {
            ensureArray<any>(pcEntry.contractItems).forEach((ci: any) => {
                if (ci.name) items.add(ci.name);
                if (ci.itemName) items.add(ci.itemName);
            });
        }
    }

    return Array.from(items).sort((a, b) => a.localeCompare(b));
  }, [suppliers, perCapitaConfig, manualEntryData.supplierCpf, editingInvoice?.supplierCpf]);

  const handleManualSave = async () => {
    if (!manualEntryData.supplierCpf || !manualEntryData.invoiceNumber || !manualEntryData.date) {
        toast.error("Preencha fornecedor, data e número da NF.");
        return;
    }
    if (manualEntryData.items.length === 0) {
        toast.error("Adicione pelo menos um item à nota.");
        return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
        const res = await onManualInvoiceEntry(
            manualEntryData.supplierCpf, 
            manualEntryData.date, 
            manualEntryData.invoiceNumber, 
            manualEntryData.items.map(it => ({
                name: it.name,
                kg: it.kg,
                value: it.value,
                lotNumber: it.lotNumber || 'MANUAL',
                expirationDate: it.expirationDate,
                barcode: it.barcode
            })), 
            '', '', 
            manualEntryData.date, 
            manualEntryData.pd,
            manualEntryData.type as any,
            undefined,
            manualEntryData.ne
        );
        if (res.success) {
            toast.success("NF registrada com sucesso!");
            setIsManualModalOpen(false);
            setManualEntryData({ 
                supplierCpf: '', 
                date: '', 
                invoiceNumber: '', 
                pd: '', 
                ne: '',
                type: mode === 'warehouse_exit' ? 'saída' : 'entrada',
                items: []
            });
        } else {
            toast.error(res.message || "Erro ao registrar NF.");
        }
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEditItems = async (invoice: any) => {
    setEditingInvoice(invoice);
    setOriginalInvoiceNumber(invoice.invoiceNumber);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const updateNewItemValue = (name: string, kg: number) => {
    setNewItem(prev => ({ ...prev, name, kg }));
  };

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
            {/* Manual entry button removed per request */}

          </div>
        </div>

        <div className="bg-slate-50 px-2 py-1.5 overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-1 border-b border-gray-100 items-center justify-between">
          <div className="flex gap-1">
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
          
          <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-lg border border-gray-100 shadow-xs">
              <div className="flex flex-col items-end">
                  <span className="text-[6px] font-black text-gray-400 uppercase leading-none mb-0.5">Total do Mês</span>
                  <span className="text-[11px] font-black text-indigo-700 leading-none">{formatCurrency(globalTotal)}</span>
              </div>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] custom-scrollbar">
          <table className="w-full text-left border-collapse table-fixed min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-zinc-900 border-b border-zinc-800">
                <th className="w-[8%] px-3 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center italic">Status PD</th>
                <th className="w-[12%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">NF / Data / NL</th>
                <th className="w-[18%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">Fornecedor</th>
                <th className="w-[32%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">Itens, Lotes e Códigos</th>
                <th className="w-[10%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] italic">Financeiro</th>
                <th className="w-[10%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center italic">Processo</th>
                <th className="w-[10%] px-4 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center italic">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredInvoices.length > 0 ? filteredInvoices.map((inv) => {
                const hasPd = !!inv.pd && inv.pd !== '0' && inv.pd !== 0;
                return (
                <tr key={`${inv.supplierCpf}-${inv.invoiceNumber}`} className={`transition-all group ${!hasPd ? 'bg-rose-50/30 hover:bg-rose-50/60' : 'hover:bg-slate-50'}`}>
                  <td className="px-3 py-3 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2.5 py-1 rounded-lg border-2 shadow-sm min-w-[65px] text-center ${hasPd ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-rose-600 border-rose-500 text-white animate-pulse'}`}>
                        {hasPd ? inv.pd : 'S/PD'}
                        </span>
                        {!hasPd && <span className="text-[6px] font-black text-rose-500 uppercase">Aguardando PD</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                        <div className={`font-black tracking-tighter text-[12px] ${!hasPd ? 'text-rose-700' : 'text-zinc-900'} leading-none`}>#{inv.invoiceNumber}</div>
                        <div className="text-[8px] text-zinc-400 font-bold uppercase tracking-tight mt-1.5 flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            {new Date(inv.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {inv.nl && (
                            <div className="mt-1.5 flex items-center gap-1 text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-sm w-fit">
                                <FileText className="h-2.5 w-2.5" /> NL {inv.nl}
                            </div>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[11px] font-black text-zinc-900 uppercase line-clamp-1 leading-tight mb-1">{inv.supplierName}</div>
                    <div className="flex flex-col gap-1.5">
                        <div className="text-[7.5px] text-zinc-400 font-bold tracking-widest leading-none flex items-center gap-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-zinc-200"></div>
                            {inv.supplierCpf}
                        </div>
                        {inv.ne && (
                            <div className="flex items-center gap-1.5 text-[9.5px]/none font-black bg-emerald-50 text-emerald-950 border-2 border-emerald-800 px-2.5 py-1 rounded w-fit uppercase tracking-wider font-mono shadow-xs">
                                NE {inv.ne}
                            </div>
                        )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="grid grid-cols-1 gap-2">
                      {inv.items.map((it: any, i: number) => (
                        <div key={i} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-white border border-gray-100 group/item hover:border-indigo-200 hover:shadow-sm transition-all">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-[9.5px] font-black text-indigo-950 uppercase truncate leading-none">
                                        {it.item || it.itemName || ''}
                                    </span>
                                    <span className="text-[8px] font-bold text-indigo-500 italic shrink-0">
                                        {(it.kg || 0).toLocaleString('pt-BR')} Kg
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-x-3 gap-y-1 items-center">
                                    <span className="text-[7px] text-zinc-400 font-black uppercase tracking-tight flex items-center gap-1">
                                        <Package className="h-2 w-2" /> LOTE: {it.lotNumber || 'UNICO'}
                                    </span>
                                    <span className="text-[7px] text-amber-500 font-black uppercase tracking-tight flex items-center gap-1">
                                        <Calendar className="h-2 w-2" /> VAL: {it.expirationDate ? it.expirationDate.split('-').reverse().join('/') : 'N/A'}
                                    </span>
                                    {it.barcode && (
                                        <span className="text-[8px] font-mono font-black text-emerald-600 bg-emerald-50 px-1 border border-emerald-100 rounded flex items-center gap-1">
                                            <BarcodeIcon className="h-2 w-2" /> {it.barcode}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    const printWindow = window.open('', '_blank', 'width=800,height=800');
                                    if (!printWindow) return;
                                    printWindow.document.write(`
                                        <html>
                                        <head>
                                            <title>Etiqueta - ${inv.invoiceNumber}</title>
                                            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                                            <style>
                                                @page { size: 100mm 50mm; margin: 0; }
                                                body { font-family: sans-serif; margin: 0; padding: 5mm; }
                                                .label { width: 90mm; height: 40mm; border: 1px solid #000; padding: 2mm; display: flex; flex-direction: column; justify-content: space-between; }
                                                h1 { font-size: 14pt; margin: 0; font-weight: 800; text-transform: uppercase; }
                                                h2 { font-size: 10pt; margin: 0; color: #333; }
                                                p { font-size: 8pt; margin: 1pt 0; font-weight: 600; }
                                                .barcode-container { text-align: center; margin-top: 2mm; }
                                                .barcode { width: 100%; height: 12mm; }
                                            </style>
                                        </head>
                                        <body>
                                            <div class="label">
                                                <div>
                                                    <h1>${String(it.item || it.itemName || '').split(';')[0].split(' ').slice(0, 2).join(' ')}</h1>
                                                    <h2>Fornecedor: ${inv.supplierName}</h2>
                                                    <p>NF: ${inv.invoiceNumber} | Data: ${new Date(inv.date).toLocaleDateString()}</p>
                                                    <p>Lote: ${it.lotNumber || 'N/A'} | Validade: ${it.expirationDate ? it.expirationDate.split('-').reverse().join('/') : 'N/A'}</p>
                                                </div>
                                                <div class="barcode-container">
                                                    <svg id="barcode" class="barcode"></svg>
                                                </div>
                                            </div>
                                            <script>
                                                JsBarcode("#barcode", "${it.barcode || 'N/A'}", { 
                                                    height: 35, 
                                                    width: 1.8, 
                                                    fontSize: 14, 
                                                    displayValue: true,
                                                    fontOptions: "bold"
                                                });
                                                setTimeout(() => { window.print(); window.close(); }, 700);
                                            </script>
                                        </body>
                                        </html>
                                    `);
                                    printWindow.document.close();
                                }}
                                className="p-2 bg-zinc-100 text-zinc-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-90"
                                title="Imprimir Etiqueta"
                            >
                                <Printer className="h-3 w-3" />
                            </button>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col">
                        <div className={`text-[12px] font-black ${!hasPd ? 'text-rose-700' : 'text-emerald-700'} leading-none`}>
                            {formatCurrency(inv.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0))}
                        </div>
                        <div className="text-[7.5px] text-zinc-400 font-bold uppercase mt-1 flex items-center gap-1">
                            <div className={`w-1 h-1 rounded-full ${inv.isOpened ? 'bg-blue-500' : 'bg-amber-500 animate-pulse'}`}></div>
                            {inv.isOpened ? 'Conciliado' : 'Aguardando'}
                        </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center gap-1.5">
                        {inv.isOpened ? (
                        <div className="flex flex-col items-center">
                            <span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm">
                                CONCLUÍDO
                            </span>
                            <span className="text-[6px] text-zinc-400 font-bold mt-0.5">NOTADO E CONFERIDO</span>
                        </div>
                        ) : (
                        <div className="flex flex-col items-center">
                            <span className="bg-amber-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest shadow-sm animate-pulse">
                                PROCESSANDO
                            </span>
                            <span className="text-[6px] text-amber-600 font-black mt-0.5 uppercase tracking-tighter">Falta Autorização</span>
                        </div>
                        )}
                    </div>
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => handleOpenPdf(inv.invoiceUrl)} className="p-1 bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white transition-all" title="Ver PDF"><Download className="h-3 w-3" /></button>
                      
                      {/* Upload Button */}
                      <input 
                        type="file" 
                        id={`file-upload-${inv.supplierCpf}-${inv.invoiceNumber}`} 
                        className="hidden" 
                        accept="application/pdf,image/*"
                        onChange={async (e) => {
                            if (e.target.files && e.target.files[0]) {
                                const toastId = toast.loading('Iniciando envio...', { description: 'Aguarde um momento...' });
                                try {
                                    const file = e.target.files[0];
                                    
                                    // Validation
                                    if (file.size > 5 * 1024 * 1024) {
                                        toast.error('Arquivo muito grande (máx 5MB)', { id: toastId });
                                        return;
                                    }

                                    // Local metadata for path identification
                                    const cleanCpf = String(inv.supplierCpf || 'S-CPF').replace(/[^\w-]/g, '_');
                                    const cleanInvoice = String(inv.invoiceNumber || 'S-N').replace(/[^\w-]/g, '_');
                                    const cleanFileName = file.name.replace(/[^\w.-]/g, '_');
                                    
                                    toast.loading('Enviando nota...', { id: toastId, description: 'Transferindo arquivo para o servidor...' });
                                    
                                    const uploadPromise = async () => {
                                        const reader = new FileReader();
                                        const base64Promise = new Promise<string>((resolve, reject) => {
                                            reader.onload = () => resolve(reader.result as string);
                                            reader.onerror = reject;
                                            reader.readAsDataURL(file);
                                        });
                                        const base64 = await base64Promise;
                                        
                                        const bucket = 'gestao-ppais.firebasestorage.app';
                                        const path = `invoices/${cleanCpf}/${cleanInvoice}/${cleanFileName}`;
                                        
                                        const res = await fetch('/api/proxy-storage-upload', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ bucket, path, base64, contentType: file.type })
                                        });
                                        
                                        const text = await res.text();
                                        let data;
                                        try {
                                            data = JSON.parse(text);
                                        } catch (e: any) {
                                            throw new Error(`Erro no servidor (${res.status}): Resposta inválida. O arquivo pode ser muito grande ou a internet oscilou.`, { cause: e });
                                        }
                                        
                                        if (!data.success) {
                                            throw new Error(data.error || 'Erro no servidor ao enviar arquivo');
                                        }
                                        return data.url;
                                    };

                                    const timeoutPromise = new Promise<never>((_, reject) => 
                                        setTimeout(() => {
                                            reject(new Error("O envio demorou para ser concluído. Verifique sua conexão ou tente um arquivo menor."));
                                        }, 180000) // 3 minutes
                                    );

                                    const url = await Promise.race([uploadPromise(), timeoutPromise]);
                                    
                                    toast.loading('Relacionando nota aos lançamentos...', { 
                                        id: toastId, 
                                        description: 'Atualizando base de dados em tempo real...' 
                                    });

                                    // Update database with more generous timeout
                                    const dbPromise = onUpdateInvoiceUrl(inv.supplierCpf, inv.invoiceNumber, url);
                                    const dbTimeoutPromise = new Promise((_, reject) => 
                                        setTimeout(() => reject(new Error("Tempo limite excedido ao sincronizar Banco de Dados. A nota foi enviada, mas o vínculo falhou.")), 60000)
                                    );

                                    const result: any = await Promise.race([dbPromise, dbTimeoutPromise]);
                                    
                                    if (result && result.success === false) {
                                        throw new Error(result.message || 'Falha ao vincular nota ao fornecedor');
                                    }

                                    toast.success('Nota enviada e vinculada com sucesso!', { id: toastId, description: 'O processo foi concluído.' });
                                } catch (error: any) {
                                    console.error('Final upload handler error:', error);
                                    let errorMsg = error?.message || 'Falha no processamento';
                                    if (error?.code === 'storage/retry-limit-exceeded') errorMsg = "Muitas tentativas falhas. Verifique sua internet.";
                                    if (error?.code === 'storage/quota-exceeded') errorMsg = "Cota do servidor excedida. Contate o administrador.";
                                    
                                    toast.error(`Erro: ${errorMsg}`, { id: toastId });
                                } finally {
                                    e.target.value = '';
                                }
                            }
                        }} 
                      />
                      <button 
                        onClick={() => document.getElementById(`file-upload-${inv.supplierCpf}-${inv.invoiceNumber}`)?.click()} 
                        className="p-1 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-600 hover:text-white transition-all" 
                        title="Upload Nota"
                      >
                        <Upload className="h-3 w-3" />
                      </button>

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
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">PD (Opcional)</label>
                              <input type="text" value={manualEntryData.pd} onChange={e => setManualEntryData({...manualEntryData, pd: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-0.5">NE (Opcional)</label>
                              <input type="text" value={manualEntryData.ne} onChange={e => setManualEntryData({...manualEntryData, ne: e.target.value.toUpperCase()})} className="w-full bg-slate-50 border-2 border-gray-100 rounded-xl h-10 px-3 shadow-inner outline-none focus:ring-4 focus:ring-indigo-50 font-bold text-[10px]" />
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-gray-800 uppercase tracking-widest">Adicionar Itens</h4>
                            <span className="text-[8px] text-gray-400 font-bold uppercase">{manualEntryData.items.length} itens adicionados</span>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Item (Contrato)</label>
                                    <select 
                                        value={newItem.name} 
                                        onChange={e => updateNewItemValue(e.target.value, newItem.kg)}
                                        disabled={!manualEntryData.supplierCpf}
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px] uppercase"
                                    >
                                        <option value="">Selecione...</option>
                                        {availableItems.map(it => <option key={it} value={it}>{it}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-0.5">Código de Barras</label>
                                    <input 
                                        type="text" 
                                        value={newItem.barcode} 
                                        onChange={e => setNewItem({...newItem, barcode: e.target.value})}
                                        placeholder="Bipar..."
                                        className="w-full bg-white border border-blue-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-400 font-mono text-[10px]" 
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Lote</label>
                                    <input 
                                        type="text" 
                                        value={newItem.lotNumber} 
                                        onChange={e => setNewItem({...newItem, lotNumber: e.target.value.toUpperCase()})}
                                        placeholder="LOTE..."
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px]" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Validade</label>
                                    <input 
                                        type="date" 
                                        value={newItem.expirationDate} 
                                        onChange={e => setNewItem({...newItem, expirationDate: e.target.value})}
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px]" 
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Quantidade (Kg)</label>
                                    <input 
                                        type="text" 
                                        value={(newItem as any)._editKg ?? (newItem.kg === 0 ? '' : newItem.kg)} 
                                        onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                const newKg = val === '' ? 0 : Number(val);
                                                setNewItem({ ...newItem, kg: newKg, _editKg: val } as any);
                                                updateNewItemValue(newItem.name, newKg);
                                            }
                                        }}
                                        onBlur={() => {
                                            const resetItem = { ...newItem };
                                            delete (resetItem as any)._editKg;
                                            setNewItem(resetItem);
                                        }}
                                        className="w-full bg-white border border-gray-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-[10px]" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-emerald-600 uppercase tracking-widest ml-0.5">Valor Total Item na NF (R$)</label>
                                    <input 
                                        type="text" 
                                        value={(newItem as any)._editValue ?? (newItem.value === 0 ? '' : newItem.value)} 
                                        onChange={e => {
                                            const val = e.target.value.replace(',', '.');
                                            if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                setNewItem({...newItem, value: val === '' ? 0 : Number(val), _editValue: val} as any);
                                            }
                                        }}
                                        onBlur={() => {
                                            const resetItem = { ...newItem };
                                            delete (resetItem as any)._editValue;
                                            setNewItem(resetItem);
                                        }}
                                        className="w-full bg-white border border-emerald-100 rounded-lg h-9 px-3 shadow-sm outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-[10px]" 
                                    />
                                </div>
                            </div>

                            {newItem.kg > 0 && newItem.value > 0 && (
                                <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100 flex justify-between items-center px-4">
                                    <span className="text-[8px] font-black text-emerald-900 uppercase">Total do Item</span>
                                    <span className="text-[11px] font-black text-emerald-700 font-mono tracking-tighter">
                                        {formatCurrency(newItem.value)}
                                    </span>
                                </div>
                            )}

                            <button 
                                onClick={() => {
                                    if (!newItem.name || !newItem.kg) {
                                        toast.error("Preencha o nome e a quantidade do item.");
                                        return;
                                    }
                                    setManualEntryData({
                                        ...manualEntryData,
                                        items: [...manualEntryData.items, { ...newItem, lotNumber: newItem.lotNumber || 'MANUAL' }]
                                    });
                                    setNewItem({ name: '', kg: 0, value: 0, lotNumber: '', expirationDate: '', barcode: '' });
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
                                                {it.kg.toLocaleString('pt-BR')} Kg • {formatCurrency(it.value)}
                                            </span>
                                            <div className="flex gap-2 mt-0.5">
                                                {it.lotNumber && <span className="text-[7px] font-black text-indigo-400 uppercase italic">Lote: {it.lotNumber}</span>}
                                                {it.expirationDate && <span className="text-[7px] font-black text-amber-500 uppercase italic">Val: {it.expirationDate.split('-').reverse().join('/')}</span>}
                                            </div>
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
                      <button onClick={handleManualSave} disabled={isSubmitting} className="flex-1 bg-indigo-600 text-white h-12 rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSubmitting ? 'Salvando...' : 'Confirmar Registro'}
                      </button>
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
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-2">
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-0.5">Parecer de Despesa (PD)</label>
                            <input type="text" value={editingInvoice.pd || ''} onChange={e => setEditingInvoice({...editingInvoice, pd: e.target.value.toUpperCase()})} className="w-full h-10 px-3 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[11px] uppercase" />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-0.5">Nota de Empenho (NE)</label>
                            <input type="text" value={editingInvoice.ne || ''} onChange={e => setEditingInvoice({...editingInvoice, ne: e.target.value.toUpperCase()})} className="w-full h-10 px-3 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[11px] uppercase bg-white" />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-0.5">Data da Nota</label>
                            <input type="date" value={editingInvoice.invoiceDate || editingInvoice.date || ''} onChange={e => setEditingInvoice({...editingInvoice, invoiceDate: e.target.value})} className="w-full h-10 px-3 rounded-xl border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[11px] uppercase bg-white" />
                        </div>
                        <div className="space-y-0.5">
                            <label className="text-[9px] font-black text-emerald-600 uppercase tracking-widest ml-0.5">Valor Total da Nota (R$)</label>
                            <div className="w-full h-10 px-3 rounded-xl border-2 border-emerald-200 bg-emerald-50 flex items-center font-black text-[11px] text-emerald-900">
                                {formatCurrency(editingInvoice.items.reduce((sum: number, it: any) => sum + (it.value || 0), 0))}
                            </div>
                        </div>
                      </div>

                      {editingInvoice.items.map((item: any, idx: number) => {
                          return (
                          <div key={idx} className="bg-slate-50 p-4 rounded-xl space-y-3 border border-gray-100 shadow-sm relative group">
                              <div className="font-black text-[10px] text-indigo-900 uppercase tracking-tight flex justify-between items-center">
                                  <div className="flex flex-col flex-1 gap-1">
                                    <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Produto</label>
                                    <select 
                                        value={item.item || item.itemName || item.name || ''} 
                                        onChange={e => {
                                            const newItems = [...editingInvoice.items];
                                            newItems[idx] = { ...item, item: e.target.value, itemName: e.target.value, name: e.target.value };
                                            setEditingInvoice({ ...editingInvoice, items: newItems });
                                        }}
                                        className="w-full h-9 px-3 rounded-lg border-2 border-indigo-100 outline-none focus:border-indigo-400 font-black text-[10px] uppercase"
                                    >
                                        <option value="">Selecione...</option>
                                        {availableItems.map(it => <option key={it} value={it}>{it}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="text-gray-400 font-bold">{idx + 1} de {editingInvoice.items.length}</span>
                                      <button 
                                          onClick={() => {
                                              if (editingInvoice.items.length <= 1) {
                                                  toast.error("A nota precisa ter ao menos um item. Exclua a nota completa se desejar remover tudo.");
                                                  return;
                                              }
                                              const newItems = [...editingInvoice.items];
                                              newItems.splice(idx, 1);
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                              toast.info("Item removido. Clique em 'Salvar Ajustes' para confirmar.");
                                          }}
                                          className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors group-hover:scale-110 active:scale-95"
                                          title="Excluir Item"
                                      >
                                          <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                  </div>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Peso/Qtd (Kg)</label>
                                      <input 
                                          type="text" 
                                          value={item._editKg ?? (item.kg === 0 ? '' : item.kg)} 
                                          onChange={e => {
                                              const val = e.target.value.replace(',', '.');
                                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                  const newKg = val === '' ? 0 : Number(val);
                                                  const newItems = [...editingInvoice.items];
                                                  newItems[idx] = { ...item, kg: newKg, _editKg: val };
                                                  setEditingInvoice({ ...editingInvoice, items: newItems });
                                              }
                                          }}
                                          onBlur={() => {
                                              const newItems = [...editingInvoice.items];
                                              delete newItems[idx]._editKg;
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-[10px]" 
                                      />
                                  </div>
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-blue-600 uppercase tracking-widest ml-0.5">Código de Barras</label>
                                      <input 
                                          type="text" 
                                          value={item.barcode || ''} 
                                          onChange={e => {
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, barcode: e.target.value };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-blue-100 outline-none focus:border-blue-400 font-mono text-[10px]" 
                                      />
                                  </div>
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-indigo-600 uppercase tracking-widest ml-0.5">Valor Total Item na NF (R$)</label>
                                      <input 
                                          type="text" 
                                          value={item._editValue ?? (item.value === 0 ? '' : item.value)} 
                                          onChange={e => {
                                              const val = e.target.value.replace(',', '.');
                                              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                                                  const newTotal = val === '' ? 0 : Number(val);
                                                  const newItems = [...editingInvoice.items];
                                                  newItems[idx] = { ...item, value: newTotal, _editValue: val };
                                                  setEditingInvoice({ ...editingInvoice, items: newItems });
                                              }
                                          }}
                                          onBlur={() => {
                                              const newItems = [...editingInvoice.items];
                                              delete newItems[idx]._editValue;
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-indigo-100 outline-none focus:border-indigo-400 font-bold text-[10px] bg-white" 
                                      />
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Lote</label>
                                      <input 
                                          type="text" 
                                          value={item.lotNumber || ''} 
                                          onChange={e => {
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, lotNumber: e.target.value.toUpperCase() };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          placeholder="LOTE..."
                                          className="w-full h-9 px-3 rounded-lg border-2 border-gray-100 outline-none focus:border-indigo-400 font-bold text-[10px]" 
                                      />
                                  </div>
                                  <div className="space-y-0.5">
                                      <label className="text-[8px] font-black text-amber-600 uppercase tracking-widest ml-0.5">Validade</label>
                                      <input 
                                          type="date" 
                                          value={item.expirationDate || ''} 
                                          onChange={e => {
                                              const newItems = [...editingInvoice.items];
                                              newItems[idx] = { ...item, expirationDate: e.target.value };
                                              setEditingInvoice({ ...editingInvoice, items: newItems });
                                          }}
                                          className="w-full h-9 px-3 rounded-lg border-2 border-amber-100 outline-none focus:border-amber-400 font-bold text-[10px]" 
                                      />
                                  </div>
                              </div>
                          </div>
                          );
                      })}
                      
                      <div className="pb-4">
                          <button
                              type="button"
                              onClick={() => {
                                  const newItems = [...editingInvoice.items, {
                                      id: `it-new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                                      item: '',
                                      itemName: '',
                                      name: '',
                                      kg: 0,
                                      value: 0,
                                      lotNumber: 'UNICO',
                                      expirationDate: '',
                                      barcode: '',
                                      isManual: true
                                  }];
                                  setEditingInvoice({ ...editingInvoice, items: newItems });
                                  toast.info("Novo item em branco adicionado à nota. Selecione o produto e informe o peso/valor.");
                              }}
                              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-lg border border-indigo-200 text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs"
                          >
                              <Plus className="h-3 w-3" /> Incluir Item na Edição (Catálogo do Fornecedor)
                          </button>
                      </div>
                  </div>
                  <div className="p-6 bg-zinc-50 border-t border-gray-100 flex gap-2.5">
                      <button onClick={() => setEditingInvoice(null)} className="flex-1 bg-white border border-gray-200 h-12 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-gray-50 transition-all">Sair</button>
                      <button 
                        onClick={async () => {
                            try {
                                const res = await onUpdateInvoiceItems(
                                    editingInvoice.supplierCpf, 
                                    originalInvoiceNumber, // Busca pelo número original
                                    editingInvoice.items.map((it: any) => ({
                                        id: it.id,
                                        name: it.item || it.itemName,
                                        kg: Number(it.kg || it.quantity || 0),
                                        value: Number(it.value || 0),
                                        lotNumber: it.lotNumber,
                                        expirationDate: it.expirationDate,
                                        barcode: it.barcode,
                                        pd: editingInvoice.pd,
                                        ne: editingInvoice.ne
                                    })),
                                    undefined, 
                                    editingInvoice.invoiceNumber, // Novo número (se mudou)
                                    editingInvoice.date, 
                                    editingInvoice.receiptTermNumber, 
                                    editingInvoice.invoiceDate || editingInvoice.date, 
                                    editingInvoice.pd,
                                    editingInvoice.supplierName,
                                    editingInvoice.ne
                                );
                                if (res.success) {
                                    toast.success("Alterações salvas!");
                                    setEditingInvoice(null);
                                } else {
                                    toast.error(res.message || "Erro.");
                                }
                            } catch (error) {
                                console.error("Error updating invoice:", error);
                                toast.error("Ocorreu um erro ao salvar.");
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
