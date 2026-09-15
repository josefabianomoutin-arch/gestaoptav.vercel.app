import React, { useState, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Calendar, 
  DollarSign, 
  Building2, 
  Printer, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Download, 
  CheckCircle, 
  Clock, 
  FileText, 
  HelpCircle,
  Copy,
  ChevronDown
} from 'lucide-react';
import { toast } from 'sonner';
import { EnergyAccountingRecord, EnergyBillItem, EnergySubmeterCompany } from '../types';
import { DEFAULT_ENERGY_RECORD_AGO_26, recalculateEnergyRecord } from '../data/energyAccountingDefaults';

interface AdminTaiuvaEnergyAccountingProps {
  records?: Record<string, EnergyAccountingRecord>;
  onSaveRecord?: (record: EnergyAccountingRecord) => Promise<{ success: boolean; message: string }>;
  onDeleteRecord?: (id: string) => Promise<{ success: boolean; message: string }>;
  userRole?: string;
}

const DEFAULT_RECORDS: Record<string, EnergyAccountingRecord> = {};

export const AdminTaiuvaEnergyAccounting: React.FC<AdminTaiuvaEnergyAccountingProps> = ({
  records = DEFAULT_RECORDS,
  onSaveRecord,
  userRole = 'infraestrutura'
}) => {
  // Local persistence fallback
  const [localRecords, setLocalRecords] = useState<Record<string, EnergyAccountingRecord>>(() => {
    try {
      const saved = localStorage.getItem('energy_accounting_taiuva_records');
      const migrated = localStorage.getItem('energy_accounting_taiuva_records_migrated_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Object.keys(parsed).length > 0) {
          if (!migrated && parsed['ago-26']) {
            parsed['ago-26'] = DEFAULT_ENERGY_RECORD_AGO_26;
            localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(parsed));
            localStorage.setItem('energy_accounting_taiuva_records_migrated_v2', 'true');
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading local energy records:', e);
    }
    return { 'ago-26': DEFAULT_ENERGY_RECORD_AGO_26 };
  });

  // Merge server records if present
  const allRecords = useMemo(() => {
    const merged = { ...localRecords, ...records };
    if (Object.keys(merged).length === 0) {
      merged['ago-26'] = DEFAULT_ENERGY_RECORD_AGO_26;
    }
    return merged;
  }, [localRecords, records]);

  // Active month selection
  const [selectedMonthId, setSelectedMonthId] = useState<string>('ago-26');

  // Active record
  const currentRecord = useMemo(() => {
    return allRecords[selectedMonthId] || Object.values(allRecords)[0] || DEFAULT_ENERGY_RECORD_AGO_26;
  }, [allRecords, selectedMonthId]);

  // Working copy for live editing
  const [workingRecord, setWorkingRecord] = useState<EnergyAccountingRecord>(currentRecord);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync working record when month changes
  React.useEffect(() => {
    if (allRecords[selectedMonthId]) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWorkingRecord(allRecords[selectedMonthId]);
      setHasUnsavedChanges(false);
    }
  }, [selectedMonthId, allRecords]);

  // Modals state
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [newMonthName, setNewMonthName] = useState('set/26');
  const [newMonthYear, setNewMonthYear] = useState(2026);
  const [newMonthNum, setNewMonthNum] = useState(9);

  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<EnergySubmeterCompany | null>(null);
  const [companyForm, setCompanyForm] = useState<Partial<EnergySubmeterCompany>>({
    cnpj: '',
    companyName: '',
    address: '',
    meterId: '',
    previousReading: 0,
    currentReading: 0,
    unit: 'kWh',
    status: 'PENDENTE',
    readingDate: new Date().toISOString().split('T')[0],
    nextReadingDate: '',
    notes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva.'
  });

  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptCompany, setReceiptCompany] = useState<EnergySubmeterCompany | null>(null);

  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EnergyBillItem | null>(null);
  const [itemForm, setItemForm] = useState<Partial<EnergyBillItem>>({
    code: '',
    description: '',
    registeredQuantity: 0,
    billedQuantity: 0,
    unit: 'KWh',
    tariffWithTaxes: 0,
    totalOperationValue: 0,
    isForaPontaEnergy: false
  });

  // Helpers for formatting
  const formatBRL = (val: number | undefined | null) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val: number | undefined | null, decimals = 2) => {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  // Update working record with automatic recalculation
  const updateRecord = useCallback((updater: (prev: EnergyAccountingRecord) => EnergyAccountingRecord) => {
    setWorkingRecord(prev => {
      const updated = updater(prev);
      const recalculated = recalculateEnergyRecord(updated);
      setHasUnsavedChanges(true);
      return recalculated;
    });
  }, []);

  // Save changes to Firebase and localStorage
  const handleSave = async () => {
    try {
      const calculated = recalculateEnergyRecord(workingRecord);
      
      // Update local state
      setLocalRecords(prev => {
        const next = { ...prev, [calculated.id]: calculated };
        try {
          localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(next));
        } catch (e) {
          console.error(e);
        }
        return next;
      });

      if (onSaveRecord) {
        const res = await onSaveRecord(calculated);
        if (res.success) {
          toast.success('Demonstrativo de consumo salvo com sucesso!');
        } else {
          toast.error(res.message || 'Falha ao sincronizar com o banco de dados.');
        }
      } else {
        toast.success('Demonstrativo de consumo salvo localmente!');
      }

      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err?.message || err));
    }
  };

  // Company management
  const handleOpenNewCompanyModal = () => {
    setEditingCompany(null);
    setCompanyForm({
      cnpj: '',
      companyName: '',
      address: '',
      meterId: `Pavilhão 0${(workingRecord.companies?.length || 0) + 1}`,
      previousReading: 0,
      currentReading: 0,
      unit: 'kWh',
      status: 'PENDENTE',
      readingDate: new Date().toISOString().split('T')[0],
      nextReadingDate: '',
      notes: workingRecord.generalNotes || 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva.'
    });
    setIsCompanyModalOpen(true);
  };

  const handleEditCompany = (company: EnergySubmeterCompany) => {
    setEditingCompany(company);
    setCompanyForm(company);
    setIsCompanyModalOpen(true);
  };

  const handleSaveCompanyForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName?.trim()) {
      toast.error('Informe a Razão Social da empresa.');
      return;
    }

    const prevReading = Number(companyForm.previousReading) || 0;
    const currReading = Number(companyForm.currentReading) || 0;
    const monthlyConsumption = Math.max(0, currReading - prevReading);

    if (editingCompany) {
      // Edit existing
      updateRecord(prev => ({
        ...prev,
        companies: prev.companies.map(c => c.id === editingCompany.id ? {
          ...c,
          ...companyForm,
          previousReading: prevReading,
          currentReading: currReading,
          monthlyConsumption,
          companyName: companyForm.companyName || c.companyName,
          cnpj: companyForm.cnpj || c.cnpj,
          address: companyForm.address || c.address
        } as EnergySubmeterCompany : c)
      }));
      toast.success('Empresa atualizada com sucesso!');
    } else {
      // Add new
      const newCompany: EnergySubmeterCompany = {
        id: `comp-${Date.now()}`,
        cnpj: companyForm.cnpj || '',
        companyName: companyForm.companyName.toUpperCase(),
        address: companyForm.address || '',
        meterId: companyForm.meterId || `Pavilhão 0${(workingRecord.companies?.length || 0) + 1}`,
        referenceMonth: workingRecord.referenceMonth,
        previousReading: prevReading,
        currentReading: currReading,
        unit: 'kWh',
        monthlyConsumption,
        baseTotalKWh: workingRecord.somaKWhForaPonta,
        amountToPay: 0, // will be recalculated
        status: (companyForm.status as any) || 'PENDENTE',
        readingDate: companyForm.readingDate || new Date().toISOString().split('T')[0],
        nextReadingDate: companyForm.nextReadingDate || '',
        notes: companyForm.notes || workingRecord.generalNotes
      };

      updateRecord(prev => ({
        ...prev,
        companies: [...(prev.companies || []), newCompany]
      }));
      toast.success('Empresa cadastrada no rateio!');
    }

    setIsCompanyModalOpen(false);
  };

  const handleDeleteCompany = (id: string, name: string) => {
    if (confirm(`Deseja remover a empresa "${name}" deste mês?`)) {
      updateRecord(prev => ({
        ...prev,
        companies: prev.companies.filter(c => c.id !== id)
      }));
      toast.info('Empresa removida.');
    }
  };

  const handleTogglePaymentStatus = (companyId: string) => {
    updateRecord(prev => ({
      ...prev,
      companies: prev.companies.map(c => {
        if (c.id === companyId) {
          const nextStatus = c.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
          return {
            ...c,
            status: nextStatus,
            paidAt: nextStatus === 'PAGO' ? new Date().toISOString() : undefined
          };
        }
        return c;
      })
    }));
  };

  // Bill items management
  const handleOpenNewItemModal = () => {
    setEditingItem(null);
    setItemForm({
      code: '',
      description: '',
      registeredQuantity: 0,
      billedQuantity: 0,
      unit: 'KWh',
      tariffWithTaxes: 0,
      totalOperationValue: 0,
      isForaPontaEnergy: false
    });
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: EnergyBillItem) => {
    setEditingItem(item);
    setItemForm(item);
    setIsItemModalOpen(true);
  };

  const handleSaveItemForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.description?.trim()) {
      toast.error('Informe a descrição da operação.');
      return;
    }

    const billedQty = Number(itemForm.billedQuantity) || 0;
    const tariff = Number(itemForm.tariffWithTaxes) || 0;
    const totalVal = itemForm.totalOperationValue ? Number(itemForm.totalOperationValue) : (billedQty * tariff);

    if (editingItem) {
      updateRecord(prev => ({
        ...prev,
        items: prev.items.map(it => it.id === editingItem.id ? {
          ...it,
          ...itemForm,
          billedQuantity: billedQty,
          tariffWithTaxes: tariff,
          totalOperationValue: Number(totalVal.toFixed(2)),
          basePisCofins: Number(totalVal.toFixed(2)),
          isForaPontaEnergy: !!itemForm.isForaPontaEnergy
        } as EnergyBillItem : it)
      }));
      toast.success('Item da fatura atualizado!');
    } else {
      const newItem: EnergyBillItem = {
        id: `item-${Date.now()}`,
        code: itemForm.code || '',
        description: itemForm.description,
        registeredQuantity: Number(itemForm.registeredQuantity) || 0,
        billedQuantity: billedQty,
        unit: itemForm.unit || 'KWh',
        tariffWithTaxes: tariff,
        totalOperationValue: Number(totalVal.toFixed(2)),
        baseIcms: Number(totalVal.toFixed(2)),
        basePisCofins: Number(totalVal.toFixed(2)),
        isForaPontaEnergy: !!itemForm.isForaPontaEnergy
      };
      updateRecord(prev => ({
        ...prev,
        items: [...prev.items, newItem]
      }));
      toast.success('Item adicionado à fatura!');
    }
    setIsItemModalOpen(false);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Deseja excluir esta linha de operação da fatura?')) {
      updateRecord(prev => ({
        ...prev,
        items: prev.items.filter(it => it.id !== id)
      }));
      toast.info('Item excluído da fatura.');
    }
  };

  // Create new month
  const handleCreateNewMonth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMonthName.trim()) {
      toast.error('Digite o nome do mês (ex: set/26).');
      return;
    }

    const monthId = newMonthName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    if (allRecords[monthId]) {
      toast.error('Este mês de referência já existe!');
      return;
    }

    // Carry over companies from current record: currentReading becomes the new previousReading!
    const carriedCompanies: EnergySubmeterCompany[] = (workingRecord.companies || []).map(comp => ({
      ...comp,
      id: `comp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      referenceMonth: newMonthName,
      previousReading: comp.currentReading, // last month's current reading is now the previous
      currentReading: comp.currentReading, // starts with zero consumption until read
      monthlyConsumption: 0,
      amountToPay: 0,
      status: 'PENDENTE',
      readingDate: new Date().toISOString().split('T')[0],
      nextReadingDate: ''
    }));

    const newRecord: EnergyAccountingRecord = {
      ...workingRecord,
      id: monthId,
      referenceMonth: newMonthName,
      year: newMonthYear,
      month: newMonthNum,
      companies: carriedCompanies,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const calculated = recalculateEnergyRecord(newRecord);

    setLocalRecords(prev => {
      const next = { ...prev, [monthId]: calculated };
      try {
        localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });

    if (onSaveRecord) {
      onSaveRecord(calculated);
    }

    setSelectedMonthId(monthId);
    setWorkingRecord(calculated);
    setIsNewMonthModalOpen(false);
    toast.success(`Mês "${newMonthName}" criado com sucesso! As leituras anteriores foram atualizadas com base no mês anterior.`);
  };

  // KPIs
  const totalPavilhoesKWh = useMemo(() => {
    return (workingRecord.companies || []).reduce((sum, c) => sum + (c.monthlyConsumption || 0), 0);
  }, [workingRecord.companies]);

  const totalCobrarEmpresas = useMemo(() => {
    return (workingRecord.companies || []).reduce((sum, c) => sum + (c.amountToPay || 0), 0);
  }, [workingRecord.companies]);

  const totalPagoEmpresas = useMemo(() => {
    return (workingRecord.companies || [])
      .filter(c => c.status === 'PAGO')
      .reduce((sum, c) => sum + (c.amountToPay || 0), 0);
  }, [workingRecord.companies]);

  const totalPendenteEmpresas = useMemo(() => {
    return (workingRecord.companies || [])
      .filter(c => c.status === 'PENDENTE')
      .reduce((sum, c) => sum + (c.amountToPay || 0), 0);
  }, [workingRecord.companies]);

  // CSV Export
  const handleExportCSV = () => {
    let csv = `CONTABILIZACAO DO CONSUMO DE ENERGIA - UNIDADE DE TAIUVA\n`;
    csv += `Mes de Referencia: ${workingRecord.referenceMonth}\n`;
    csv += `Total a Pagar Distribuidora: R$ ${workingRecord.totalAPagar.toFixed(2)}\n`;
    csv += `Soma KWh Base Rateio: ${workingRecord.somaKWhForaPonta}\n`;
    csv += `Tarifa Rateio (R$/kWh): ${workingRecord.custoMedioPorKWh.toFixed(6)}\n\n`;

    csv += `DISCRIMINACAO DA OPERACAO\n`;
    csv += `COD;Descricao da Operacao;Mes Ref;Quant. Registrada;Quant. Faturada;Unid Med;Tarifa Com Tributos;Valor Total Operacao;Base ICMS;Base PIS/COFINS;PIS;COFINS\n`;
    workingRecord.items.forEach(it => {
      csv += `"${it.code}";"${it.description}";"${workingRecord.referenceMonth}";"${it.registeredQuantity || ''}";"${it.billedQuantity}";"${it.unit}";"${it.tariffWithTaxes.toFixed(8)}";"${it.totalOperationValue.toFixed(2)}";"${it.baseIcms || ''}";"${it.basePisCofins || ''}";"${it.pis || ''}";"${it.cofins || ''}"\n`;
    });

    csv += `\nRATEIO POR EMPRESA / PAVILHAO DE TRABALHO\n`;
    csv += `CNPJ;Razao Social;Mes Ref;Leitura Anterior;Leitura Atual;Unid Med;Consumo do Mes;Soma KWh;Valor a Pagar;Status;Data Leitura;Data Proxima Leitura;Endereco\n`;
    workingRecord.companies.forEach(comp => {
      csv += `"${comp.cnpj}";"${comp.companyName}";"${comp.referenceMonth}";"${comp.previousReading}";"${comp.currentReading}";"${comp.unit}";"${comp.monthlyConsumption}";"${comp.baseTotalKWh}";"${comp.amountToPay.toFixed(2)}";"${comp.status}";"${comp.readingDate}";"${comp.nextReadingDate}";"${comp.address}"\n`;
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consumo_energia_taiuva_${workingRecord.id}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório CSV baixado!');
  };

  // Print view
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Print-only CSS style */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Main Header Card */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 rounded-3xl shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-amber-400 text-black uppercase flex items-center gap-1.5 shadow-sm">
                <Zap className="h-3.5 w-3.5 fill-current" />
                Infraestrutura & Gestão Elétrica
              </span>
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 uppercase">
                Unidade de Taiúva
              </span>
              {hasUnsavedChanges && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase animate-pulse">
                  Alterações Não Salvas
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
              Contabilização do Consumo de Energia
            </h1>
            <p className="text-sm text-indigo-200/80 font-medium max-w-2xl mt-1">
              Demonstrativo de faturamento da concessionária, apuração tarifária e rateio proporcional de consumo dos pavilhões de trabalho e empresas terceirizadas.
            </p>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Month selector */}
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-amber-300 mr-2" />
              <select
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="bg-transparent text-white font-black text-sm uppercase tracking-wider focus:outline-none cursor-pointer pr-2"
              >
                {Object.values(allRecords).map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white font-bold">
                    Mês: {r.referenceMonth}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsNewMonthModalOpen(true)}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Abrir novo mês de contabilização"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Novo Mês
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Exportar dados para planilha Excel / CSV"
            >
              <Download className="h-4 w-4 text-indigo-300" />
              CSV
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Imprimir relatório completo timbrado"
            >
              <Printer className="h-4 w-4 text-indigo-300" />
              Imprimir
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 active:scale-95"
            >
              <Save className="h-4 w-4" />
              Salvar Dados
            </button>
          </div>
        </div>

        {/* KPI Cards Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80 block mb-1">
              Fatura Concessionária
            </span>
            <div className="text-xl md:text-2xl font-black text-white">
              {formatBRL(workingRecord.totalAPagar)}
            </div>
            <span className="text-[10px] text-emerald-400 font-bold mt-0.5 block">
              Subtotal: {formatBRL(workingRecord.subtotal)}
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80 block mb-1">
              Tarifa Efetiva de Rateio
            </span>
            <div className="text-xl md:text-2xl font-black text-amber-300">
              R$ {formatNumber(workingRecord.custoMedioPorKWh, 6)} <span className="text-xs text-white/60 font-medium">/ kWh</span>
            </div>
            <span className="text-[10px] text-indigo-200/70 font-mono mt-0.5 block">
              Base: {formatNumber(workingRecord.somaKWhForaPonta, 2)} kWh
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80 block mb-1">
              Consumo Submedidores
            </span>
            <div className="text-xl md:text-2xl font-black text-white">
              {formatNumber(totalPavilhoesKWh, 1)} <span className="text-xs text-indigo-300 font-medium">kWh</span>
            </div>
            <span className="text-[10px] text-indigo-200/70 font-bold mt-0.5 block">
              {workingRecord.companies?.length || 0} Empresas / Pavilhões
            </span>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10">
            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/80 block mb-1">
              Total a Ressarcir
            </span>
            <div className="text-xl md:text-2xl font-black text-emerald-400">
              {formatBRL(totalCobrarEmpresas)}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px]">
              <span className="text-emerald-300 font-bold">Pago: {formatBRL(totalPagoEmpresas)}</span>
              <span className="text-rose-300 font-bold">Pend: {formatBRL(totalPendenteEmpresas)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Area Wrapper */}
      <div id="print-area" className="space-y-8">
        
        {/* Header strictly for print */}
        <div className="hidden print:block border-b-2 border-black pb-4 mb-6">
          <div className="text-center">
            <h1 className="text-lg font-black uppercase">GOVERNO DO ESTADO DE SÃO PAULO</h1>
            <h2 className="text-sm font-bold uppercase">SECRETARIA DA ADMINISTRAÇÃO PENITENCIÁRIA - SAP</h2>
            <h3 className="text-xs font-bold uppercase">CENTRO DE PROGRESSÃO PENITENCIÁRIA DE GUARIBA / UNIDADE DE TAIÚVA</h3>
            <p className="text-[11px] font-black mt-1">SEÇÃO DE INFRAESTRUTURA E MANUTENÇÃO - RATEIO DE ENERGIA ELÉTRICA</p>
            <p className="text-[10px] font-semibold text-gray-700">MÊS DE REFERÊNCIA: {workingRecord.referenceMonth.toUpperCase()}</p>
          </div>
        </div>

        {/* SECTION 1: Top Table - Discriminação da Operação (Exact Excel layout) */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Blue title bar matching Excel */}
          <div className="bg-blue-600 text-white px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <FileText className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-black uppercase tracking-wider">
                Discriminação da operação (Fatura da Distribuidora)
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-black">
              <div className="bg-blue-700/80 px-3 py-1 rounded-lg border border-blue-400/30">
                PIS: <span className="text-amber-300">{workingRecord.pisPercentage}%</span>
              </div>
              <div className="bg-blue-700/80 px-3 py-1 rounded-lg border border-blue-400/30">
                COFINS: <span className="text-amber-300">{workingRecord.cofinsPercentage}%</span>
              </div>
              <button
                onClick={handleOpenNewItemModal}
                className="no-print bg-white text-blue-900 hover:bg-blue-50 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Linha
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-blue-50/50 text-gray-700 border-b border-gray-200 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2.5 px-3 border-r border-gray-200 min-w-[220px]">Descrição da operação</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-center">Unid. Med.</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Quant. Faturada</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Tarifa ANEEL</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right">Tarifa com tributos R$</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right font-black">Valor total da operação R$</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right text-gray-500">Base Cálc. ICMS</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right text-gray-500">Alíq. ICMS %</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right text-gray-500">ICMS</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right text-gray-500 font-black">PIS 1,03 %</th>
                  <th className="py-2.5 px-3 border-r border-gray-200 text-right text-gray-500 font-black">COFINS 4,83 %</th>
                  <th className="py-2.5 px-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-mono text-[11px]">
                {workingRecord.items.map((item, idx) => {
                  const isForaPonta = item.isForaPontaEnergy;
                  return (
                    <tr 
                      key={item.id || idx} 
                      className={`hover:bg-blue-50/40 transition-colors ${isForaPonta ? 'bg-amber-50/20' : ''}`}
                    >
                      <td className="py-2 px-3 border-r border-gray-200 font-sans font-bold text-gray-900 flex items-center justify-between gap-2">
                        <span>{item.description}</span>
                        {isForaPonta && (
                          <span className="no-print text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded uppercase" title="Item considerado na soma Fora Ponta para rateio">
                            Rateio
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-center font-bold text-gray-700">
                        {item.unit}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right font-black text-gray-900">
                        {item.billedQuantity ? formatNumber(item.billedQuantity, 4) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-700">
                        {item.tariffAneel ? formatNumber(item.tariffAneel, 8) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-700">
                        {item.tariffWithTaxes ? formatNumber(item.tariffWithTaxes, 8) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right font-black text-gray-900 bg-gray-50/50">
                        {item.totalOperationValue ? formatNumber(item.totalOperationValue, 2) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-500">
                        {item.baseIcms ? formatNumber(item.baseIcms, 2) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-500">
                        {item.aliqIcms ? formatNumber(item.aliqIcms, 2) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-500">
                        {item.icms ? formatNumber(item.icms, 2) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-900 font-bold">
                        {item.pis ? formatNumber(item.pis, 2) : ''}
                      </td>
                      <td className="py-2 px-3 border-r border-gray-200 text-right text-gray-900 font-bold">
                        {item.cofins ? formatNumber(item.cofins, 2) : ''}
                      </td>
                      <td className="py-2 px-3 text-center no-print">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                            title="Editar item"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            title="Excluir item"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* Subtotals & Taxes Block */}
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td colSpan={7} className="py-2 px-3 text-right uppercase tracking-wider text-[10px] text-gray-600">
                    Subtotal Operações
                  </td>
                  <td className="py-2 px-3 text-right font-black text-gray-900 border-r border-gray-200">
                    R$ {formatNumber(workingRecord.subtotal, 2)}
                  </td>
                  <td colSpan={4} className="bg-gray-100"></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="bg-gray-50 font-bold">
                  <td colSpan={7} className="py-1.5 px-3 text-right uppercase tracking-wider text-[10px] text-gray-600">
                    Total Distribuidora
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-gray-900 border-r border-gray-200">
                    R$ {formatNumber(workingRecord.totalDistribuidora, 2)}
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="hover:bg-emerald-50/30">
                  <td className="py-1.5 px-3 text-gray-500 font-bold border-r border-gray-200">807</td>
                  <td colSpan={6} className="py-1.5 px-3 font-sans font-bold text-gray-800 border-r border-gray-200">
                    Contri. Custeio IP-CIP Municipal
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-emerald-800 bg-emerald-50/50 border-r border-gray-200">
                    <input
                      type="number"
                      step="0.01"
                      value={workingRecord.cipMunicipal || 0}
                      onChange={(e) => updateRecord(prev => ({ ...prev, cipMunicipal: parseFloat(e.target.value) || 0 }))}
                      className="w-24 text-right bg-transparent border-b border-emerald-400 font-mono font-black focus:outline-none"
                    />
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="bg-gray-50 font-bold">
                  <td colSpan={7} className="py-1.5 px-3 text-right uppercase tracking-wider text-[10px] text-gray-600">
                    Total devoluções/ajustes
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-gray-900 border-r border-gray-200">
                    R$ {formatNumber(workingRecord.totalDevolucoesAjustes, 2)}
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="hover:bg-rose-50/30">
                  <td className="py-1.5 px-3 text-gray-500 font-bold border-r border-gray-200">903</td>
                  <td colSpan={6} className="py-1.5 px-3 font-sans font-bold text-gray-800 border-r border-gray-200">
                    Retenção Consumo IRRF
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-rose-700 bg-rose-50/50 border-r border-gray-200">
                    <input
                      type="number"
                      step="0.01"
                      value={workingRecord.irrfConsumo || 0}
                      onChange={(e) => updateRecord(prev => ({ ...prev, irrfConsumo: parseFloat(e.target.value) || 0 }))}
                      className="w-24 text-right bg-transparent border-b border-rose-400 font-mono font-black focus:outline-none"
                    />
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="hover:bg-rose-50/30">
                  <td className="py-1.5 px-3 text-gray-500 font-bold border-r border-gray-200">903</td>
                  <td colSpan={6} className="py-1.5 px-3 font-sans font-bold text-gray-800 border-r border-gray-200">
                    Retenção Demanda IRRF
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-rose-700 bg-rose-50/50 border-r border-gray-200">
                    <input
                      type="number"
                      step="0.01"
                      value={workingRecord.irrfDemanda || 0}
                      onChange={(e) => updateRecord(prev => ({ ...prev, irrfDemanda: parseFloat(e.target.value) || 0 }))}
                      className="w-24 text-right bg-transparent border-b border-rose-400 font-mono font-black focus:outline-none"
                    />
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                <tr className="bg-gray-50 font-bold">
                  <td colSpan={7} className="py-1.5 px-3 text-right uppercase tracking-wider text-[10px] text-gray-600">
                    Total Retenções
                  </td>
                  <td className="py-1.5 px-3 text-right font-black text-rose-700 border-r border-gray-200">
                    -R$ {formatNumber(Math.abs(workingRecord.totalRetencoes), 2)}
                  </td>
                  <td colSpan={4}></td>
                  <td className="no-print"></td>
                </tr>

                {/* Final Total a Pagar Row */}
                <tr className="bg-indigo-50 font-black border-t-2 border-b-2 border-indigo-200">
                  <td colSpan={7} className="py-3 px-3 text-right uppercase tracking-widest text-xs text-indigo-950 font-black">
                    TOTAL A PAGAR (CONCESSIONÁRIA)
                  </td>
                  <td className="py-3 px-3 text-right font-black text-sm text-indigo-900 border-r border-indigo-200">
                    {formatBRL(workingRecord.totalAPagar)}
                  </td>
                  <td colSpan={4} className="bg-indigo-50"></td>
                  <td className="no-print"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: Valor Consolidado Orange Bar (Exact layout as Excel) */}
        <div className="bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-sm border border-amber-600/30 flex flex-wrap items-center justify-between gap-4 font-black">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase tracking-widest bg-black/10 px-3 py-1 rounded-lg">
              Valor Consolidado
            </span>
            <span className="text-xl md:text-2xl font-black">
              {formatBRL(workingRecord.valorConsolidado)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div className="bg-white/40 px-3 py-1 rounded-lg">
              Base PIS/COFINS: <span className="font-mono">{formatBRL(workingRecord.basePisCofins)}</span>
            </div>
            <div className="bg-white/40 px-3 py-1 rounded-lg">
              PIS (1,03%): <span className="font-mono">{formatBRL(workingRecord.pisTotal)}</span>
            </div>
            <div className="bg-white/40 px-3 py-1 rounded-lg">
              COFINS (4,83%): <span className="font-mono">{formatBRL(workingRecord.cofinsTotal)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 3: Bottom Table - Rateio Pavilhões / Empresas Terceirizadas */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-amber-400" />
                <h3 className="text-base font-black uppercase tracking-tight">
                  Rateio de Energia por Pavilhão de Trabalho e Terceiros
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cálculo: <span className="text-amber-300 font-mono font-bold">Consumo (kWh) × [Total Distribuidora ÷ Soma KWh ({formatNumber(workingRecord.somaKWhForaPonta, 2)})]</span>
              </p>
            </div>

            <div className="flex items-center gap-3 no-print">
              <button
                onClick={handleOpenNewCompanyModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
              >
                <Plus className="h-4 w-4" /> Nova Empresa / Pavilhão
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-700 border-b border-gray-200 font-black text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-3 border-r border-gray-200 min-w-[200px]">Empresa / CNPJ</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center">Mês Ref.</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-right bg-emerald-50 text-emerald-900">Leitura Anterior</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-right bg-emerald-50 text-emerald-900">Leitura Atual</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center">Unid Med</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-right font-black">Consumo Mês</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-right text-gray-500">Soma KWh Base</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center bg-red-800 text-white font-black tracking-wider">
                    VALOR A PAGAR
                  </th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center">Status</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center">Data Leitura</th>
                  <th className="py-3 px-3 border-r border-gray-200 text-center">Próxima Leitura</th>
                  <th className="py-3 px-3 border-r border-gray-200 min-w-[180px]">Endereço</th>
                  <th className="py-3 px-3 text-center no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 font-sans text-xs">
                {workingRecord.companies?.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="py-8 text-center text-gray-400 font-bold uppercase tracking-wider italic">
                      Nenhuma empresa ou pavilhão cadastrado para este mês de referência.
                    </td>
                  </tr>
                ) : (
                  workingRecord.companies.map((company) => {
                    const isPaid = company.status === 'PAGO';
                    return (
                      <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 border-r border-gray-200">
                          <div className="font-black text-gray-900 uppercase leading-tight">
                            {company.companyName}
                          </div>
                          <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                            {company.cnpj || 'CNPJ NÃO INFORMADO'}
                          </div>
                          {company.meterId && (
                            <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                              {company.meterId}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold text-gray-600">
                          {company.referenceMonth}
                        </td>

                        {/* Editable Previous Reading */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right bg-emerald-50/30">
                          <input
                            type="number"
                            step="0.1"
                            value={company.previousReading}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateRecord(prev => ({
                                ...prev,
                                companies: prev.companies.map(c => c.id === company.id ? { ...c, previousReading: val } : c)
                              }));
                            }}
                            className="w-20 text-right bg-white border border-emerald-300 rounded px-1.5 py-1 font-mono font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        {/* Editable Current Reading */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-right bg-emerald-50/30">
                          <input
                            type="number"
                            step="0.1"
                            value={company.currentReading}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              updateRecord(prev => ({
                                ...prev,
                                companies: prev.companies.map(c => c.id === company.id ? { ...c, currentReading: val } : c)
                              }));
                            }}
                            className="w-20 text-right bg-white border border-emerald-300 rounded px-1.5 py-1 font-mono font-black text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-bold text-gray-500">
                          {company.unit || 'kWh'}
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono font-black text-gray-900 bg-gray-50">
                          {formatNumber(company.monthlyConsumption, 2)}
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-right font-mono text-gray-500 text-[11px]">
                          {formatNumber(company.baseTotalKWh, 4)}
                        </td>

                        {/* Red block with bold white text matching Excel exactly */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center bg-red-600 text-white font-mono font-black text-sm tracking-tight shadow-inner">
                          {formatBRL(company.amountToPay)}
                        </td>

                        {/* Payment Status Toggle Badge */}
                        <td className="py-2.5 px-3 border-r border-gray-200 text-center">
                          <button
                            onClick={() => handleTogglePaymentStatus(company.id)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 mx-auto ${
                              isPaid 
                                ? 'bg-emerald-600 text-white shadow-xs hover:bg-emerald-700' 
                                : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            }`}
                            title="Clique para alternar o status do pagamento"
                          >
                            {isPaid ? (
                              <>
                                <CheckCircle className="h-3 w-3" /> PAGO
                              </>
                            ) : (
                              <>
                                <Clock className="h-3 w-3" /> PENDENTE
                              </>
                            )}
                          </button>
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-[11px] text-gray-600">
                          {company.readingDate ? new Date(company.readingDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-center font-mono text-[11px] text-gray-600">
                          {company.nextReadingDate ? new Date(company.nextReadingDate + 'T12:00:00').toLocaleDateString('pt-BR') : '---'}
                        </td>

                        <td className="py-2.5 px-3 border-r border-gray-200 text-[11px] text-gray-600 truncate max-w-[200px]" title={company.address}>
                          {company.address || '---'}
                        </td>

                        {/* Action buttons */}
                        <td className="py-2.5 px-3 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setReceiptCompany(company);
                                setIsReceiptModalOpen(true);
                              }}
                              className="p-1.5 text-blue-600 hover:text-blue-900 rounded-lg hover:bg-blue-50"
                              title="Emitir Notificação de Cobrança / Recibo"
                            >
                              <FileText className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditCompany(company)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-900 rounded-lg hover:bg-indigo-50"
                              title="Editar Dados da Empresa"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompany(company.id, company.companyName)}
                              className="p-1.5 text-red-500 hover:text-red-700 rounded-lg hover:bg-red-50"
                              title="Remover Empresa"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Totalizers for companies */}
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
                  <td colSpan={5} className="py-3 px-3 text-right uppercase tracking-wider text-xs text-gray-700 font-black">
                    TOTAIS DOS PAVILHÕES:
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-sm text-gray-900 border-r border-gray-200">
                    {formatNumber(totalPavilhoesKWh, 2)} kWh
                  </td>
                  <td className="border-r border-gray-200"></td>
                  <td className="py-3 px-3 text-center font-mono font-black text-base text-red-700 bg-red-100 border-r border-gray-200">
                    {formatBRL(totalCobrarEmpresas)}
                  </td>
                  <td colSpan={4} className="py-3 px-3 text-xs text-gray-500 font-semibold">
                    Pago: <span className="text-emerald-700 font-bold">{formatBRL(totalPagoEmpresas)}</span> | Pendente: <span className="text-rose-700 font-bold">{formatBRL(totalPendenteEmpresas)}</span>
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* SECTION 4: Observações e Justificativas */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
          <label className="text-xs font-black uppercase tracking-wider text-gray-500 block mb-2">
            Observações Gerais e Embasamento do Rateio (Aparece no Rodapé dos Relatórios)
          </label>
          <textarea
            rows={3}
            value={workingRecord.generalNotes || ''}
            onChange={(e) => updateRecord(prev => ({ ...prev, generalNotes: e.target.value }))}
            placeholder="Ex: Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva..."
            className="w-full p-3.5 text-xs text-gray-800 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all leading-relaxed"
          />
        </div>

        {/* Print Signatures Block (Only visible on print) */}
        <div className="hidden print:grid grid-cols-2 gap-12 pt-16 mt-12 border-t border-gray-300">
          <div className="text-center">
            <div className="border-t border-black w-64 mx-auto mb-1"></div>
            <p className="text-xs font-bold uppercase">RESPONSÁVEL PELA INFRAESTRUTURA</p>
            <p className="text-[10px] text-gray-600">Centro de Progressão Penitenciária de Guariba / Taiúva</p>
          </div>
          <div className="text-center">
            <div className="border-t border-black w-64 mx-auto mb-1"></div>
            <p className="text-xs font-bold uppercase">DIRETORIA DO CENTRO DE TRABALHO / FUNAP</p>
            <p className="text-[10px] text-gray-600">Visto e Conferência</p>
          </div>
        </div>

      </div>

      {/* MODAL: Criar Novo Mês de Referência */}
      {isNewMonthModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-xl">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base uppercase">Novo Mês de Contabilização</h3>
                  <p className="text-xs text-gray-500">Duplica os submedidores atualizando as leituras anteriores</p>
                </div>
              </div>
              <button 
                onClick={() => setIsNewMonthModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewMonth} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                  Nome do Mês de Referência (ex: set/26)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: set/26"
                  value={newMonthName}
                  onChange={(e) => setNewMonthName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-200 text-sm font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={newMonthYear}
                    onChange={(e) => setNewMonthYear(parseInt(e.target.value) || 2026)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Número do Mês (1-12)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={newMonthNum}
                    onChange={(e) => setNewMonthNum(parseInt(e.target.value) || 1)}
                    className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200/60 text-xs text-amber-900 flex items-start gap-2">
                <HelpCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-700" />
                <p>
                  As <strong>{workingRecord.companies?.length || 0} empresas</strong> cadastradas no mês anterior serão importadas automaticamente, e a <strong>leitura atual</strong> anterior será transferida para a nova <strong>leitura anterior</strong>.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewMonthModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 font-black text-xs uppercase hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95"
                >
                  Criar e Abrir Mês
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cadastrar / Editar Empresa / Submedidor */}
      {isCompanyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base uppercase">
                    {editingCompany ? 'Editar Empresa / Pavilhão' : 'Nova Empresa / Pavilhão'}
                  </h3>
                  <p className="text-xs text-gray-500">Submedidor de energia da Unidade de Taiúva</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCompanyModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCompanyForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                  Razão Social / Nome da Empresa *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ONETECH SERVICE LTDA"
                  value={companyForm.companyName || ''}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, companyName: e.target.value.toUpperCase() }))}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-black text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={companyForm.cnpj || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, cnpj: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Pavilhão / Identificação
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Pavilhão 01"
                    value={companyForm.meterId || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, meterId: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro, cidade, CEP"
                  value={companyForm.address || ''}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, address: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <div>
                  <label className="text-[10px] font-black uppercase text-emerald-950 tracking-wider block mb-1">
                    Leitura Anterior (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={companyForm.previousReading ?? 0}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, previousReading: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-mono font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-emerald-950 tracking-wider block mb-1">
                    Leitura Atual (kWh)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={companyForm.currentReading ?? 0}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, currentReading: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-white text-xs font-mono font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Data da Leitura
                  </label>
                  <input
                    type="date"
                    value={companyForm.readingDate || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, readingDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Data da Próxima Leitura
                  </label>
                  <input
                    type="date"
                    value={companyForm.nextReadingDate || ''}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, nextReadingDate: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                  Status de Pagamento
                </label>
                <select
                  value={companyForm.status || 'PENDENTE'}
                  onChange={(e) => setCompanyForm(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full p-3 rounded-xl border border-gray-200 text-xs font-black uppercase tracking-wider text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="PENDENTE">PENDENTE</option>
                  <option value="PAGO">PAGO</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsCompanyModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 font-black text-xs uppercase hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95"
                >
                  {editingCompany ? 'Salvar Alterações' : 'Cadastrar Empresa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Linha de Operação da Fatura (Adicionar / Editar) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base uppercase">
                    {editingItem ? 'Editar Operação da Fatura' : 'Nova Operação da Fatura'}
                  </h3>
                  <p className="text-xs text-gray-500">Itens tarifários e demanda da concessionária</p>
                </div>
              </div>
              <button 
                onClick={() => setIsItemModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItemForm} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Descrição da Operação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Consumo Fora Ponta [KWh]-TUSD"
                    value={itemForm.description || ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={itemForm.unit || 'kWh'}
                    onChange={(e) => setItemForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="kWh">kWh</option>
                    <option value="kW">kW</option>
                    <option value="UN">UN</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Quant. Faturada *
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={itemForm.billedQuantity ?? 0}
                    onChange={(e) => setItemForm(prev => ({ ...prev, billedQuantity: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs font-mono font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Tarifa ANEEL
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={itemForm.tariffAneel ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, tariffAneel: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Tarifa Com Tributos (R$)
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={itemForm.tariffWithTaxes ?? 0}
                    onChange={(e) => setItemForm(prev => ({ ...prev, tariffWithTaxes: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/40 text-xs font-mono font-black text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Valor Total da Operação (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.totalOperationValue ?? 0}
                    onChange={(e) => setItemForm(prev => ({ ...prev, totalOperationValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono font-black text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Base Cálc. ICMS (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.baseIcms ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, baseIcms: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Alíq. ICMS %
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.aliqIcms ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, aliqIcms: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    ICMS
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.icms ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, icms: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    PIS (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.pis ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, pis: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    COFINS (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.cofins ?? ''}
                    onChange={(e) => setItemForm(prev => ({ ...prev, cofins: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Fora Ponta Checkbox */}
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isForaPontaEnergyCheck"
                  checked={!!itemForm.isForaPontaEnergy}
                  onChange={(e) => setItemForm(prev => ({ ...prev, isForaPontaEnergy: e.target.checked }))}
                  className="h-4 w-4 text-indigo-600 rounded focus:ring-indigo-500"
                />
                <label htmlFor="isForaPontaEnergyCheck" className="text-xs font-black text-amber-950 cursor-pointer">
                  Compor na "Soma KWh Fora Ponta" (Base de cálculo do rateio das empresas)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2.5 text-gray-600 font-black text-xs uppercase hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95"
                >
                  Salvar Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Recibo / Notificação Individual de Cobrança Timbrada */}
      {isReceiptModalOpen && receiptCompany && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-2xl w-full p-6 md:p-8 space-y-6 max-h-[95vh] overflow-y-auto">
            {/* Modal Controls */}
            <div className="flex items-center justify-between no-print border-b pb-4">
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Demonstrativo Individual de Cobrança
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-4 w-4" /> Imprimir Notificação
                </button>
                <button
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Timbrada Official Layout */}
            <div className="border-2 border-black p-6 space-y-6 text-gray-900 bg-white">
              <div className="text-center border-b-2 border-black pb-4">
                <h2 className="text-sm font-black uppercase tracking-wide">GOVERNO DO ESTADO DE SÃO PAULO</h2>
                <h3 className="text-xs font-bold uppercase">SECRETARIA DA ADMINISTRAÇÃO PENITENCIÁRIA</h3>
                <h4 className="text-xs font-bold uppercase">CENTRO DE PROGRESSÃO PENITENCIÁRIA DE GUARIBA / UNIDADE DE TAIÚVA</h4>
                <p className="text-[11px] font-black uppercase text-indigo-950 mt-1">
                  NOTIFICAÇÃO DE COBRANÇA E RESSARCIMENTO DE ENERGIA ELÉTRICA
                </p>
                <p className="text-[10px] font-semibold text-gray-600">
                  MÊS DE REFERÊNCIA: {receiptCompany.referenceMonth.toUpperCase()}
                </p>
              </div>

              {/* Company Info Box */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-300 space-y-2 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase block">EMPRESA / CONTRATANTE:</span>
                    <strong className="text-sm uppercase text-gray-900">{receiptCompany.companyName}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase block">CNPJ:</span>
                    <span className="font-mono font-bold text-gray-800">{receiptCompany.cnpj || '---'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase block">LOCAL / PAVILHÃO:</span>
                    <span className="font-bold text-gray-800">{receiptCompany.meterId || 'Pavilhão de Trabalho'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-gray-500 uppercase block">ENDEREÇO:</span>
                    <span className="text-gray-700">{receiptCompany.address || '---'}</span>
                  </div>
                </div>
              </div>

              {/* Detailed Calculation Box */}
              <div className="border border-gray-300 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 border-b border-gray-300 text-gray-800 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5 text-center">Leitura Anterior</th>
                      <th className="p-2.5 text-center">Leitura Atual</th>
                      <th className="p-2.5 text-center">Consumo Apurado</th>
                      <th className="p-2.5 text-right">Tarifa Rateada (R$/kWh)</th>
                      <th className="p-2.5 text-right bg-gray-200 text-black">TOTAL A RECOLHER</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 font-mono text-xs">
                    <tr>
                      <td className="p-3 text-center">{formatNumber(receiptCompany.previousReading, 1)} kWh</td>
                      <td className="p-3 text-center font-bold">{formatNumber(receiptCompany.currentReading, 1)} kWh</td>
                      <td className="p-3 text-center font-black text-blue-900">{formatNumber(receiptCompany.monthlyConsumption, 1)} kWh</td>
                      <td className="p-3 text-right">R$ {formatNumber(workingRecord.custoMedioPorKWh, 6)}</td>
                      <td className="p-3 text-right font-black text-base text-red-700 bg-red-50">
                        {formatBRL(receiptCompany.amountToPay)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Memo Note */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-[11px] text-gray-700 leading-relaxed italic">
                {receiptCompany.notes || workingRecord.generalNotes}
              </div>

              {/* Datas e Instruções */}
              <div className="grid grid-cols-2 gap-4 text-xs font-bold text-gray-700 border-t border-gray-200 pt-3">
                <div>
                  Data da Leitura: <span className="font-mono font-normal">{receiptCompany.readingDate || '---'}</span>
                </div>
                <div className="text-right">
                  Previsão Próxima Leitura: <span className="font-mono font-normal">{receiptCompany.nextReadingDate || '---'}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-12 mt-6 border-t border-black">
                <div className="text-center">
                  <div className="border-t border-black w-48 mx-auto mb-1"></div>
                  <p className="text-[10px] font-black uppercase">DIRETORIA DE INFRAESTRUTURA</p>
                  <p className="text-[9px] text-gray-600">Unidade de Taiúva / CPP Guariba</p>
                </div>
                <div className="text-center">
                  <div className="border-t border-black w-48 mx-auto mb-1"></div>
                  <p className="text-[10px] font-black uppercase">{receiptCompany.companyName}</p>
                  <p className="text-[9px] text-gray-600">Representante Legal (Ciente e De Acordo)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTaiuvaEnergyAccounting;
