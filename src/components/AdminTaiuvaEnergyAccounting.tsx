import React, { useState, useMemo, useCallback } from 'react';
import { 
  Zap, 
  Calendar, 
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
  RotateCcw,
  Sliders,
  Layers
} from 'lucide-react';
import { toast } from 'sonner';
import { EnergyAccountingRecord, EnergyBillItem, EnergySubmeterCompany } from '../types';
import { DEFAULT_ENERGY_RECORD_AGO_26, DEFAULT_ENERGY_RECORD_JUL_26, recalculateEnergyRecord } from '../data/energyAccountingDefaults';

interface AdminTaiuvaEnergyAccountingProps {
  records?: Record<string, EnergyAccountingRecord>;
  onSaveRecord?: (record: EnergyAccountingRecord) => Promise<{ success: boolean; message: string }>;
  onDeleteRecord?: (id: string) => Promise<{ success: boolean; message: string }>;
  userRole?: string;
  onNavigateToDeductionMap?: () => void;
  onNavigateToEstoque?: () => void;
}

const DEFAULT_RECORDS: Record<string, EnergyAccountingRecord> = {};

export const AdminTaiuvaEnergyAccounting: React.FC<AdminTaiuvaEnergyAccountingProps> = ({
  records = DEFAULT_RECORDS,
  onSaveRecord,
  onDeleteRecord,
  userRole: _userRole = 'infraestrutura',
  onNavigateToDeductionMap,
  onNavigateToEstoque: _onNavigateToEstoque
}) => {
  // Local persistence fallback
  const [localRecords, setLocalRecords] = useState<Record<string, EnergyAccountingRecord>>(() => {
    try {
      const saved = localStorage.getItem('energy_accounting_taiuva_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading local energy records:', e);
    }
    const initial: Record<string, EnergyAccountingRecord> = { 
      'jul-26': DEFAULT_ENERGY_RECORD_JUL_26,
      'ago-26': DEFAULT_ENERGY_RECORD_AGO_26 
    };
    try {
      const saved = localStorage.getItem('energy_accounting_taiuva_records');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
          let modified = false;
          if (!parsed['jul-26']) {
            parsed['jul-26'] = DEFAULT_ENERGY_RECORD_JUL_26;
            modified = true;
          }
          if (!parsed['ago-26']) {
            parsed['ago-26'] = DEFAULT_ENERGY_RECORD_AGO_26;
            modified = true;
          }
          if (modified) {
            localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(parsed));
          }
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error loading local energy records:', e);
    }
    try {
      localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(initial));
    } catch (e) {
      console.error(e);
    }
    return initial;
  });

  // Merge server records if present with timestamp comparison
  const allRecords = useMemo(() => {
    const merged: Record<string, EnergyAccountingRecord> = { ...localRecords };

    if (records && typeof records === 'object') {
      Object.entries(records).forEach(([id, rec]) => {
        if (!rec) return;
        const local = merged[id];
        if (!local) {
          merged[id] = rec;
        } else {
          const serverTime = new Date(rec.updatedAt || 0).getTime();
          const localTime = new Date(local.updatedAt || 0).getTime();
          if (serverTime > localTime) {
            merged[id] = rec;
          }
        }
      });
    }

    if (!merged['jul-26']) {
      merged['jul-26'] = DEFAULT_ENERGY_RECORD_JUL_26;
    }
    if (!merged['ago-26']) {
      merged['ago-26'] = DEFAULT_ENERGY_RECORD_AGO_26;
    }
    return merged;
  }, [localRecords, records]);

  // Chronologically sorted records for selector (jul/26 before ago/26, etc.)
  const sortedRecords = useMemo(() => {
    return Object.values(allRecords).sort((a, b) => {
      if ((a.year || 2026) !== (b.year || 2026)) {
        return (a.year || 2026) - (b.year || 2026);
      }
      return (a.month || 0) - (b.month || 0);
    });
  }, [allRecords]);

  // Active month selection (defaults to jul-26 as recently added or ago-26)
  const [selectedMonthId, setSelectedMonthId] = useState<string>('jul-26');

  // Active record
  const currentRecord = useMemo(() => {
    return allRecords[selectedMonthId] || allRecords['jul-26'] || allRecords['ago-26'] || Object.values(allRecords)[0] || DEFAULT_ENERGY_RECORD_JUL_26;
  }, [allRecords, selectedMonthId]);

  // Working copy for live editing
  const [workingRecord, setWorkingRecord] = useState<EnergyAccountingRecord>(currentRecord);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync working record when month changes or when genuinely newer server record arrives
  const [prevSelectedMonth, setPrevSelectedMonth] = useState<string>(selectedMonthId);
  const [prevRecordTimestamp, setPrevRecordTimestamp] = useState<string | undefined>(currentRecord?.updatedAt);

  if (prevSelectedMonth !== selectedMonthId) {
    setPrevSelectedMonth(selectedMonthId);
    const targetRecord = allRecords[selectedMonthId];
    if (targetRecord) {
      setWorkingRecord(targetRecord);
      setPrevRecordTimestamp(targetRecord.updatedAt);
      setHasUnsavedChanges(false);
    }
  } else if (!hasUnsavedChanges && currentRecord?.updatedAt && currentRecord.updatedAt !== prevRecordTimestamp) {
    // Only update workingRecord from server if there are NO unsaved changes locally
    setPrevRecordTimestamp(currentRecord.updatedAt);
    setWorkingRecord(currentRecord);
  }

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
    registeredQuantity: undefined,
    billedQuantity: undefined,
    unit: 'kWh',
    tariffAneel: undefined,
    tariffWithTaxes: undefined,
    totalOperationValue: 0,
    isForaPontaEnergy: false
  });

  // Retention and bill header parameters modal
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);
  const [retentionForm, setRetentionForm] = useState({
    contractNumber: '916202097384',
    irrfConsumo: 403.62,
    irrfDemanda: 448.89,
    pisPercentage: 1.03,
    cofinsPercentage: 4.83
  });

  // Helpers for formatting
  const formatBRL = (val: number | undefined | null) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatNumber = (val: number | undefined | null, decimals = 2) => {
    return (val || 0).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const formatNumberOrEmpty = (val: number | undefined | null, decimals = 2) => {
    if (val === undefined || val === null || isNaN(Number(val))) return '';
    return Number(val).toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
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

  // Save and persist record immediately to both local state, localStorage, and Firebase
  const persistRecordImmediately = useCallback(async (recordToPersist: EnergyAccountingRecord) => {
    const recalculated = recalculateEnergyRecord({
      ...recordToPersist,
      updatedAt: new Date().toISOString()
    });

    setWorkingRecord(recalculated);
    setHasUnsavedChanges(false);

    setLocalRecords(prev => {
      const next = { ...prev, [recalculated.id]: recalculated };
      try {
        localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(next));
      } catch (e) {
        console.error('Erro ao gravar no localStorage:', e);
      }
      return next;
    });

    if (onSaveRecord) {
      try {
        const res = await onSaveRecord(recalculated);
        if (!res.success) {
          console.warn('Aviso ao sincronizar com servidor:', res.message);
        }
      } catch (err) {
        console.error('Erro ao sincronizar com servidor:', err);
      }
    }
    return recalculated;
  }, [onSaveRecord]);

  // Save changes to Firebase and localStorage
  const handleSave = async () => {
    try {
      await persistRecordImmediately(workingRecord);
      toast.success('Demonstrativo de consumo salvo com sucesso!');
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

  const handleSaveCompanyForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.companyName?.trim()) {
      toast.error('Informe a Razão Social da empresa.');
      return;
    }

    const prevReading = Number(companyForm.previousReading) || 0;
    const currReading = Number(companyForm.currentReading) || 0;
    const monthlyConsumption = Math.max(0, currReading - prevReading);

    let updatedCompanies: EnergySubmeterCompany[];

    if (editingCompany) {
      // Edit existing
      updatedCompanies = (workingRecord.companies || []).map(c => c.id === editingCompany.id ? {
        ...c,
        ...companyForm,
        previousReading: prevReading,
        currentReading: currReading,
        monthlyConsumption,
        companyName: (companyForm.companyName || c.companyName).toUpperCase(),
        cnpj: companyForm.cnpj || c.cnpj,
        address: companyForm.address || c.address
      } as EnergySubmeterCompany : c);
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

      updatedCompanies = [...(workingRecord.companies || []), newCompany];
      toast.success('Empresa cadastrada no rateio!');
    }

    await persistRecordImmediately({
      ...workingRecord,
      companies: updatedCompanies
    });

    setIsCompanyModalOpen(false);
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!window.confirm(`Deseja realmente remover a empresa "${name}" deste mês de rateio?`)) {
      return;
    }

    try {
      const remainingCompanies = (workingRecord.companies || []).filter(c => c.id !== id);
      await persistRecordImmediately({
        ...workingRecord,
        companies: remainingCompanies
      });
      toast.success(`Empresa "${name}" removida com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir empresa:', err);
      toast.error('Erro ao remover empresa: ' + (err?.message || err));
    }
  };

  const handleTogglePaymentStatus = async (companyId: string) => {
    const updatedCompanies = (workingRecord.companies || []).map(c => {
      if (c.id === companyId) {
        const nextStatus = c.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
        return {
          ...c,
          status: nextStatus,
          paidAt: nextStatus === 'PAGO' ? new Date().toISOString() : undefined
        };
      }
      return c;
    });

    await persistRecordImmediately({
      ...workingRecord,
      companies: updatedCompanies
    });
  };

  // Bill items management
  const handleOpenNewItemModal = () => {
    setEditingItem(null);
    setItemForm({
      code: '',
      description: '',
      registeredQuantity: undefined,
      billedQuantity: undefined,
      unit: 'kWh',
      tariffAneel: undefined,
      tariffWithTaxes: undefined,
      totalOperationValue: 0,
      baseIcms: undefined,
      aliqIcms: undefined,
      icms: undefined,
      basePisCofins: undefined,
      pis: undefined,
      cofins: undefined,
      isForaPontaEnergy: false
    });
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: EnergyBillItem) => {
    setEditingItem(item);
    setItemForm({
      ...item
    });
    setIsItemModalOpen(true);
  };

  const handleSaveItemForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.description?.trim()) {
      toast.error('Informe a descrição da operação.');
      return;
    }

    const billedQty = itemForm.billedQuantity !== undefined && itemForm.billedQuantity !== null && !isNaN(Number(itemForm.billedQuantity)) 
      ? Number(itemForm.billedQuantity) 
      : undefined;
    const tariffAneel = itemForm.tariffAneel !== undefined && itemForm.tariffAneel !== null && !isNaN(Number(itemForm.tariffAneel)) 
      ? Number(itemForm.tariffAneel) 
      : undefined;
    const tariffWithTaxes = itemForm.tariffWithTaxes !== undefined && itemForm.tariffWithTaxes !== null && !isNaN(Number(itemForm.tariffWithTaxes)) 
      ? Number(itemForm.tariffWithTaxes) 
      : undefined;

    let totalVal = Number(itemForm.totalOperationValue) || 0;
    if (!totalVal && billedQty !== undefined && tariffWithTaxes !== undefined) {
      totalVal = Number((billedQty * tariffWithTaxes).toFixed(2));
    }

    const basePis = itemForm.basePisCofins !== undefined ? Number(itemForm.basePisCofins) : totalVal;
    const calculatedPis = itemForm.pis !== undefined ? Number(itemForm.pis) : Number((basePis * (workingRecord.pisPercentage / 100)).toFixed(2));
    const calculatedCofins = itemForm.cofins !== undefined ? Number(itemForm.cofins) : Number((basePis * (workingRecord.cofinsPercentage / 100)).toFixed(2));

    const itemData: EnergyBillItem = {
      id: editingItem ? editingItem.id : `item-${Date.now()}`,
      code: itemForm.code || '',
      description: itemForm.description,
      registeredQuantity: itemForm.registeredQuantity ? Number(itemForm.registeredQuantity) : undefined,
      billedQuantity: billedQty,
      unit: itemForm.unit || 'kWh',
      tariffAneel,
      tariffWithTaxes,
      totalOperationValue: totalVal,
      baseIcms: itemForm.baseIcms ? Number(itemForm.baseIcms) : undefined,
      aliqIcms: itemForm.aliqIcms ? Number(itemForm.aliqIcms) : undefined,
      icms: itemForm.icms ? Number(itemForm.icms) : undefined,
      basePisCofins: basePis,
      pis: calculatedPis,
      cofins: calculatedCofins,
      isForaPontaEnergy: !!itemForm.isForaPontaEnergy
    };

    const updatedItems = editingItem
      ? workingRecord.items.map(it => it.id === editingItem.id ? itemData : it)
      : [...workingRecord.items, itemData];

    await persistRecordImmediately({
      ...workingRecord,
      items: updatedItems
    });

    if (editingItem) {
      toast.success('Item da fatura atualizado!');
    } else {
      toast.success('Item adicionado à fatura!');
    }
    setIsItemModalOpen(false);
  };

  const handleOpenRetentionModal = () => {
    setRetentionForm({
      contractNumber: workingRecord.contractNumber || '916202097384',
      irrfConsumo: workingRecord.irrfConsumo || 403.62,
      irrfDemanda: workingRecord.irrfDemanda || 448.89,
      pisPercentage: workingRecord.pisPercentage || 1.03,
      cofinsPercentage: workingRecord.cofinsPercentage || 4.83
    });
    setIsRetentionModalOpen(true);
  };

  const handleSaveRetentionForm = async (e: React.FormEvent) => {
    e.preventDefault();
    await persistRecordImmediately({
      ...workingRecord,
      contractNumber: retentionForm.contractNumber,
      irrfConsumo: Math.abs(Number(retentionForm.irrfConsumo) || 0),
      irrfDemanda: Math.abs(Number(retentionForm.irrfDemanda) || 0),
      pisPercentage: Number(retentionForm.pisPercentage) || 1.03,
      cofinsPercentage: Number(retentionForm.cofinsPercentage) || 4.83
    });
    setIsRetentionModalOpen(false);
    toast.success('Retenções e parâmetros da fatura atualizados!');
  };

  const handleResetToImageDefault = () => {
    const isJul = selectedMonthId === 'jul-26' || workingRecord.referenceMonth.toLowerCase().includes('jul');
    const defaultTemplate = isJul ? DEFAULT_ENERGY_RECORD_JUL_26 : DEFAULT_ENERGY_RECORD_AGO_26;
    const defaultRecord = JSON.parse(JSON.stringify(defaultTemplate));
    const targetId = selectedMonthId;
    const refMonth = workingRecord.referenceMonth || defaultRecord.referenceMonth;
    const updated = {
      ...defaultRecord,
      id: targetId,
      referenceMonth: refMonth
    };
    persistRecordImmediately(updated);
    toast.success(`Fatura restaurada com as informações exatas da imagem de ${isJul ? 'Julho' : 'Agosto'}!`);
  };

  const handleDeleteItem = async (id: string) => {
    if (confirm('Deseja excluir esta linha de operação da fatura?')) {
      const remainingItems = workingRecord.items.filter(it => it.id !== id);
      await persistRecordImmediately({
        ...workingRecord,
        items: remainingItems
      });
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

  const handleDeleteMonth = async (monthId: string) => {
    if (Object.keys(allRecords).length <= 1) {
      toast.error('Não é possível excluir o único mês cadastrado.');
      return;
    }
    const rec = allRecords[monthId];
    const monthName = rec?.referenceMonth || monthId;
    if (!window.confirm(`Deseja realmente excluir todo o demonstrativo do mês "${monthName}"?`)) {
      return;
    }

    try {
      const nextLocal = { ...localRecords };
      delete nextLocal[monthId];
      setLocalRecords(nextLocal);
      try {
        localStorage.setItem('energy_accounting_taiuva_records', JSON.stringify(nextLocal));
      } catch (e) {
        console.error('Erro ao gravar localStorage:', e);
      }

      if (onDeleteRecord) {
        await onDeleteRecord(monthId);
      }

      const remainingKeys = Object.keys(nextLocal);
      const fallbackMonth = remainingKeys[0] || 'ago-26';
      setSelectedMonthId(fallbackMonth);
      toast.success(`Mês "${monthName}" excluído com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir mês:', err);
      toast.error('Erro ao excluir mês: ' + (err?.message || err));
    }
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
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Month selector */}
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 px-3 py-1.5">
              <Calendar className="h-4 w-4 text-amber-300 mr-2" />
              <select
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="bg-transparent text-white font-black text-sm uppercase tracking-wider focus:outline-none cursor-pointer pr-2"
              >
                {sortedRecords.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900 text-white font-bold">
                    Mês: {r.referenceMonth}
                  </option>
                ))}
              </select>
              {Object.keys(allRecords).length > 1 && (
                <button
                  onClick={() => handleDeleteMonth(selectedMonthId)}
                  className="ml-1 p-1 hover:bg-red-500/20 text-red-300 hover:text-red-200 rounded-lg transition-all"
                  title="Excluir este mês"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={() => setIsNewMonthModalOpen(true)}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Abrir novo mês de contabilização"
            >
              <Plus className="h-4 w-4 text-amber-300" />
              Novo Mês
            </button>

            <button
              onClick={handleResetToImageDefault}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 hover:text-white text-xs font-black uppercase rounded-2xl border border-amber-400/30 transition-all flex items-center gap-1.5 active:scale-95"
              title="Restaurar dados exatamente como estão na imagem da fatura"
            >
              <RotateCcw className="h-4 w-4 text-amber-400" />
              Restaurar Imagem
            </button>

            <button
              onClick={handleOpenRetentionModal}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Ajustar parâmetros de tributos e retenções da fatura"
            >
              <Edit3 className="h-4 w-4 text-indigo-300" />
              Parâmetros
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Exportar dados para planilha Excel / CSV"
            >
              <Download className="h-4 w-4 text-indigo-300" />
              CSV
            </button>

            {onNavigateToDeductionMap && (
              <button
                onClick={onNavigateToDeductionMap}
                className="px-3 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-black uppercase rounded-2xl border border-amber-300 transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                title="Acessar Módulo de Estoque e Mapa de NFs & Dedução Contratual"
              >
                <Layers className="h-4 w-4 fill-current text-slate-950" />
                Mapa de NFs & Dedução
              </button>
            )}

            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase rounded-2xl border border-white/20 transition-all flex items-center gap-1.5 active:scale-95"
              title="Imprimir relatório completo timbrado"
            >
              <Printer className="h-4 w-4 text-indigo-300" />
              Imprimir
            </button>

            <button
              onClick={handleSave}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black uppercase rounded-2xl shadow-lg shadow-emerald-900/40 transition-all flex items-center gap-2 active:scale-95"
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

        {/* SECTION 1: Top Table - Discriminação da Operação (Exact Excel / Invoice layout from image) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-300 overflow-hidden">
          {/* Blue title bar matching Excel */}
          <div className="bg-[#1e40af] text-white px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <FileText className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider">
                  Discriminação da operação (Fatura da Distribuidora)
                </h2>
                <p className="text-[11px] text-blue-100 font-medium">
                  Instalação: Nº <span className="font-mono font-bold text-amber-300">{workingRecord.contractNumber || '916202097384'}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 text-xs font-black">
              <button
                onClick={handleOpenRetentionModal}
                className="no-print bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Editar parâmetros de tributos e retenções da fatura"
              >
                <Edit3 className="h-3.5 w-3.5" /> Parâmetros & Retenções
              </button>
              <button
                onClick={handleOpenNewItemModal}
                className="no-print bg-white text-blue-900 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar Linha
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#e2e8f0] text-slate-800 border-b border-slate-300 font-bold text-[10.5px]">
                  <th className="py-2.5 px-3 border-r border-slate-300 min-w-[260px]">
                    <div className="font-bold text-slate-900">Descrição da operação</div>
                    <div className="font-bold text-slate-900 text-[11px]">Nº {workingRecord.contractNumber || '916202097384'}</div>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-center w-14">
                    <div>Unid.</div>
                    <div>Med.</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-24">
                    <div>Quant.</div>
                    <div>Faturada</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-24">
                    <div>Tarifa</div>
                    <div>ANEEL</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-28">
                    <div>Tarifa com</div>
                    <div>tributos R$</div>
                  </th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-right w-32 font-black text-slate-950">
                    <div>Valor total da</div>
                    <div>operação R$</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-24">
                    <div>Base Cálc.</div>
                    <div>ICMS</div>
                  </th>
                  <th className="py-2.5 px-2 border-r border-slate-300 text-right w-16">
                    <div>Alíq.</div>
                    <div>ICMS %</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-20">
                    <div>ICMS</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-20">
                    <div>PIS</div>
                    <div>{formatNumber(workingRecord.pisPercentage, 2)} %</div>
                  </th>
                  <th className="py-2.5 px-2.5 border-r border-slate-300 text-right w-24">
                    <div>COFINS</div>
                    <div>{formatNumber(workingRecord.cofinsPercentage, 2)} %</div>
                  </th>
                  <th className="py-2.5 px-2 text-center no-print w-16">Ações</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[11px] text-slate-800">
                {workingRecord.items.map((item, idx) => {
                  const isForaPonta = item.isForaPontaEnergy;
                  return (
                    <tr 
                      key={item.id || idx} 
                      className={`border-b border-slate-200 hover:bg-blue-50/30 transition-colors ${isForaPonta ? 'bg-amber-50/15' : ''}`}
                    >
                      <td className="py-1.5 px-3 border-r border-slate-200 font-sans text-slate-900 font-normal">
                        <div className="flex items-center justify-between gap-1.5">
                          <span>{item.description}</span>
                          {isForaPonta && (
                            <span className="no-print text-[8px] bg-amber-100 text-amber-900 font-bold px-1 rounded uppercase">
                              Rateio
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                        {item.unit || ''}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right font-medium">
                        {formatNumberOrEmpty(item.billedQuantity, 4)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.tariffAneel, 8)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.tariffWithTaxes, 8)}
                      </td>
                      <td className="py-1.5 px-3 border-r border-slate-200 text-right font-medium text-slate-950">
                        {formatNumberOrEmpty(item.totalOperationValue, 2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.baseIcms, 2)}
                      </td>
                      <td className="py-1.5 px-2 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.aliqIcms, 2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.icms, 2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.pis, 2)}
                      </td>
                      <td className="py-1.5 px-2.5 border-r border-slate-200 text-right">
                        {formatNumberOrEmpty(item.cofins, 2)}
                      </td>
                      <td className="py-1.5 px-2 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEditItem(item)}
                            className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                            title="Editar item"
                          >
                            <Edit3 className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-red-500 hover:text-red-700 rounded hover:bg-red-50"
                            title="Excluir item"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {/* 1. Subtotal */}
                <tr className="border-b border-slate-200 bg-white">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                    Subtotal
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-950">
                    {formatNumber(workingRecord.subtotal, 2)}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print"></td>
                </tr>

                {/* 2. Total Distribuidora */}
                <tr className="border-b border-slate-200 bg-white">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                    Total Distribuidora
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-950">
                    {formatNumber(workingRecord.totalDistribuidora, 2)}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print"></td>
                </tr>

                {/* 3. Retencao Consumo IRRF-1,2% */}
                <tr className="border-b border-slate-200 bg-white hover:bg-rose-50/20">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans text-slate-800">
                    Retencao Consumo IRRF-1,2%
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                    {formatNumber(workingRecord.irrfConsumo, 2)}-
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print">
                    <button
                      onClick={handleOpenRetentionModal}
                      className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                      title="Editar Retenção IRRF"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>

                {/* 4. Retencao Demanda IRRF-4,8% */}
                <tr className="border-b border-slate-200 bg-white hover:bg-rose-50/20">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans text-slate-800">
                    Retencao Demanda IRRF-4,8%
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-900">
                    {formatNumber(workingRecord.irrfDemanda, 2)}-
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print">
                    <button
                      onClick={handleOpenRetentionModal}
                      className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                      title="Editar Retenção IRRF"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>

                {/* 5. Total Retenções */}
                <tr className="border-b border-slate-200 bg-white">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                    Total Retenções
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-950">
                    {formatNumber(workingRecord.totalRetencoes, 2)}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print"></td>
                </tr>

                {/* 6. Total a Pagar */}
                <tr className="border-b border-slate-300 bg-white">
                  <td className="py-1.5 px-3 border-r border-slate-200 font-sans font-bold text-slate-900">
                    Total a Pagar
                  </td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200 text-right font-bold text-slate-950">
                    {formatNumber(workingRecord.totalAPagar, 2)}
                  </td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print"></td>
                </tr>

                {/* 7. Blank Row */}
                <tr className="h-6 border-b border-slate-200 bg-white">
                  <td className="py-1.5 px-3 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-3 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2.5 border-r border-slate-200"></td>
                  <td className="py-1.5 px-2 text-center no-print"></td>
                </tr>

                {/* 8. Bottom summary repetition of Total a Pagar in operation column */}
                <tr className="bg-slate-50">
                  <td className="py-2 px-3 border-r border-slate-200"></td>
                  <td className="py-2 px-2 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-3 border-r border-slate-200 text-right font-black text-slate-950 text-xs">
                    {formatNumber(workingRecord.totalAPagar, 2)}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2.5 border-r border-slate-200"></td>
                  <td className="py-2 px-2 text-center no-print"></td>
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
            placeholder=""
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

      {/* MODAL: Parâmetros e Retenções da Fatura (IRRF, PIS, COFINS, Instalação) */}
      {isRetentionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-100 text-blue-800 rounded-xl">
                  <Sliders className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-base uppercase">
                    Parâmetros & Retenções
                  </h3>
                  <p className="text-xs text-gray-500">Ajuste tributos, retenções e instalação</p>
                </div>
              </div>
              <button 
                onClick={() => setIsRetentionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-black"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRetentionForm} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                  Nº da Instalação / Contrato
                </label>
                <input
                  type="text"
                  value={retentionForm.contractNumber || ''}
                  onChange={(e) => setRetentionForm(prev => ({ ...prev, contractNumber: e.target.value }))}
                  placeholder="Ex: 916202097384"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Retenção Consumo IRRF-1,2% (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={retentionForm.irrfConsumo ?? 0}
                    onChange={(e) => setRetentionForm(prev => ({ ...prev, irrfConsumo: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-rose-300 bg-rose-50/40 text-xs font-mono font-black text-rose-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Padrão fatura: 49,42</span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Retenção Demanda IRRF-4,8% (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={retentionForm.irrfDemanda ?? 0}
                    onChange={(e) => setRetentionForm(prev => ({ ...prev, irrfDemanda: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-rose-300 bg-rose-50/40 text-xs font-mono font-black text-rose-900 focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-gray-400">Padrão fatura: 167,07</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Alíquota PIS (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={retentionForm.pisPercentage ?? 1.03}
                    onChange={(e) => setRetentionForm(prev => ({ ...prev, pisPercentage: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-wider block mb-1">
                    Alíquota COFINS (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={retentionForm.cofinsPercentage ?? 4.83}
                    onChange={(e) => setRetentionForm(prev => ({ ...prev, cofinsPercentage: parseFloat(e.target.value) || 0 }))}
                    className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-mono font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsRetentionModalOpen(false)}
                  className="px-4 py-2 text-gray-600 font-black text-xs uppercase hover:bg-gray-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase rounded-xl shadow-md transition-all active:scale-95"
                >
                  Salvar Parâmetros
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
