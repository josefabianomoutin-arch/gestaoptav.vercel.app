import React, { useState, useEffect } from 'react';
import type { PerCapitaConfig } from '../types';
import { 
  CheckCircle2, 
  ShieldCheck, 
  Printer, 
  Trash2, 
  CheckCircle, 
  FileText, 
  History, 
  FileCheck, 
  ArrowLeft, 
  Trash,
  Barcode as BarcodeIcon,
  Search
} from 'lucide-react';

interface RowItem {
  index: number;
  itemName: string;
  quantity: string;
  observation: string;
}

interface OrderData {
  items: RowItem[];
  id: string;
  createdAt?: string;
  signed: boolean;
  signedAt?: string;
  signerName?: string;
  periodType?: 'mensal' | 'semanal';
}

interface SubTabData {
  activeOrder: OrderData;
  history?: Record<string, OrderData>;
}

interface DirectorPerCapitaData {
  chefeDep: SubTabData;
  chefeSeg: SubTabData;
}

interface DirectorPerCapitaTableProps {
  data: DirectorPerCapitaData | null;
  onUpdate: (updatedData: DirectorPerCapitaData) => Promise<{ success: boolean; message?: string }>;
  currentUser?: { name: string; cpf: string; role: string };
  isReadOnly?: boolean; // For Stock Module (Almoxarifado) viewing
  warehouseLog?: any[];
  suppliers?: any[];
  standardMenu?: any;
  perCapitaConfig?: PerCapitaConfig;
}

const generateFallbackDetails = (itemName: string, quantity: string) => {
  return {
    itemName: itemName,
    supplierName: 'ESTOQUE GERAL / DIRETORIA',
    lotNumber: 'GERAL',
    expirationDate: 'N/A',
    invoiceNumber: 'S/N',
    barcode: 'COTA' + String(Date.now()).slice(-8),
    unit: 'UN',
    quantity: parseFloat(String(quantity).replace(',', '.')) || 0,
    date: new Date().toISOString().split('T')[0]
  };
};

export const DirectorPerCapitaTable: React.FC<DirectorPerCapitaTableProps> = ({
  data,
  onUpdate,
  currentUser,
  isReadOnly = false,
  warehouseLog = [],
  suppliers = [],
  standardMenu: _standardMenu = {},
  perCapitaConfig,
}) => {
  // Identify who the current logged-in user is
  const isDouglas = currentUser?.cpf === '29099022859' || currentUser?.name?.toUpperCase().includes('DOUGLAS');
  const isAlfredo = currentUser?.cpf === '36554895876' || currentUser?.name?.toUpperCase().includes('ALFREDO');

  const showChefeDep = isReadOnly || isDouglas || currentUser?.role === 'admin' || currentUser?.role === 'almoxarifado';
  const showChefeSeg = isReadOnly || isAlfredo || currentUser?.role === 'admin' || currentUser?.role === 'almoxarifado';

  // Top level tabs: 'chefeDep' (Douglas Galdino) and 'chefeSeg' (Alfredo Lopes)
  const [activeSubTab, setActiveSubTab] = useState<'chefeDep' | 'chefeSeg'>(() => {
    if (isAlfredo && !isDouglas && showChefeSeg) return 'chefeSeg';
    if (!showChefeDep && showChefeSeg) return 'chefeSeg';
    return 'chefeDep';
  });

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Category sub-tab of the active manager: 'alimentacao' or 'limpeza'
  const [categoryTab, setCategoryTab] = useState<'alimentacao' | 'limpeza'>('alimentacao');

  // Selector Overlay or popup states
  const [activeSelectRowIndex, setActiveSelectRowIndex] = useState<number | null>(null);
  const [selectSearchTerm, setSelectSearchTerm] = useState('');

  // Current view mode inside active tab: 'form' or 'history'
  const [viewMode, setViewMode] = useState<'form' | 'history'>(isReadOnly ? 'history' : 'form');
  const [viewingPastOrder, setViewingPastOrder] = useState<OrderData | null>(null);

  // Local state for active items to support seamless typing
  const [localActiveItems, setLocalActiveItems] = useState<RowItem[]>([]);

  // Validation States
  const [passwordInput, setPasswordInput] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [signatureSuccess, setSignatureSuccess] = useState('');

  // Stock display states - replaced with dynamic request-based state
  // Keys representing active path in database for category
  const orderKey = categoryTab === 'alimentacao' ? 'activeOrder' : 'limpezaActiveOrder';
  const historyKey = categoryTab === 'alimentacao' ? 'history' : 'limpezaHistory';

  // Get all unique items in perCapitaConfig (PPAIS, Estocáveis, and Perecíveis) and suppliers
  const percapitaSearchItems = React.useMemo(() => {
    const list: string[] = [];
    
    // 1. From perCapitaConfig (ppaisProducers, pereciveisSuppliers, estocaveisSuppliers)
    if (perCapitaConfig) {
      [
        ...(perCapitaConfig.ppaisProducers || []),
        ...(perCapitaConfig.pereciveisSuppliers || []),
        ...(perCapitaConfig.estocaveisSuppliers || [])
      ].forEach(supplier => {
        (supplier.contractItems || []).forEach(item => {
          if (item.name && item.name.trim()) {
            const fullName = item.name.trim().toUpperCase();
            if (!list.includes(fullName)) {
              list.push(fullName);
            }
          }
        });
      });
    }

    // 2. Also from the regular suppliers list ONLY IF categoryTab is 'limpeza'
    if (categoryTab === 'limpeza' && suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(supplier => {
        // If supplier is not limpeza-focused we might still include them, or maybe filter?
        // Let's include for limpeza to avoid breaking it
        const cItems = supplier.contractItems || [];
        const itemsArray = Array.isArray(cItems) 
          ? cItems 
          : typeof cItems === 'object' 
            ? Object.values(cItems) 
            : [];
        itemsArray.forEach((item: any) => {
          if (item && item.name && item.name.trim()) {
            const fullName = item.name.trim().toUpperCase();
            if (!list.includes(fullName)) {
              list.push(fullName);
            }
          }
        });
      });
    }

    return list.sort((a, b) => a.localeCompare(b)).map(item => ({
      original: item,
      normalized: item.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }));
  }, [categoryTab, perCapitaConfig, suppliers]);

  const getShortName = (name: string) => {
    if (!name) return '';
    const parts = name.split(';');
    let shortened = parts[0];
    if (parts.length > 1 && shortened.split(' ').length < 4) {
        shortened += ';' + parts[1];
    }
    const words = shortened.split(' ');
    if (words.length > 6) {
        return words.slice(0, 6).join(' ') + '...';
    }
    return shortened.trim();
  };

  // Memoized map for item units
  const itemUnitsMap = React.useMemo(() => {
    const map: Record<string, string> = {};
    if (perCapitaConfig) {
      const suppliersList = [
        ...(perCapitaConfig.ppaisProducers || []),
        ...(perCapitaConfig.pereciveisSuppliers || []),
        ...(perCapitaConfig.estocaveisSuppliers || [])
      ];
      suppliersList.forEach(supplier => {
        const contractItems = supplier?.contractItems || [];
        contractItems.forEach(item => {
          if (item?.name && item?.name.trim()) {
            const nameKey = item.name.trim().toUpperCase();
            if (item.unit) {
              map[nameKey] = item.unit;
              const words = item.name.trim().split(/\s+/);
              const initials = words.slice(0, 2).join(' ').toUpperCase();
              if (initials && !map[initials]) {
                map[initials] = item.unit;
              }
              const threeWords = words.slice(0, 3).join(' ').toUpperCase();
              if (threeWords && !map[threeWords]) {
                map[threeWords] = item.unit;
              }
            }
          }
        });
      });
    }

    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(s => {
        if (s && s.contractItems) {
          const items = Array.isArray(s.contractItems) 
            ? s.contractItems 
            : typeof s.contractItems === 'object' 
              ? Object.values(s.contractItems) 
              : [];
          items.forEach((ci: any) => {
            if (ci && ci.name && ci.name.trim() && ci.unit) {
              const nameKey = ci.name.trim().toUpperCase();
              map[nameKey] = ci.unit;
              const words = ci.name.trim().split(/\s+/);
              const initials = words.slice(0, 2).join(' ').toUpperCase();
              if (initials && !map[initials]) {
                map[initials] = ci.unit;
              }
              const threeWords = words.slice(0, 3).join(' ').toUpperCase();
              if (threeWords && !map[threeWords]) {
                map[threeWords] = ci.unit;
              }
            }
          });
        }
      });
    }

    return map;
  }, [perCapitaConfig, suppliers]);

  const getItemUnit = React.useCallback((itemName: string) => {
    if (!itemName) return '';
    const nameKey = itemName.trim().toUpperCase();
    if (itemUnitsMap[nameKey]) return itemUnitsMap[nameKey];

    // Try starting match
    for (const key of Object.keys(itemUnitsMap)) {
      if (key.startsWith(nameKey) || nameKey.startsWith(key)) {
        return itemUnitsMap[key];
      }
    }

    // Try first two words match
    const words = itemName.trim().split(/\s+/);
    if (words.length >= 2) {
      const twoWordsKey = words.slice(0, 2).join(' ').toUpperCase();
      if (itemUnitsMap[twoWordsKey]) return itemUnitsMap[twoWordsKey];
      for (const key of Object.keys(itemUnitsMap)) {
        if (key.startsWith(twoWordsKey) || twoWordsKey.startsWith(key)) {
          return itemUnitsMap[key];
        }
      }
    }
    return '';
  }, [itemUnitsMap]);



  // computed stock balances per requested item, lot, and expiration
  const requestedItemsStockList = React.useMemo(() => {
    const requestedNames = new Set<string>();
    localActiveItems.forEach(item => {
      if (item.itemName && item.itemName.trim()) {
        const twoWords = item.itemName.trim().split(' ').slice(0, 2).join(' ').toUpperCase();
        requestedNames.add(twoWords);
      }
    });

    if (requestedNames.size === 0) return [];

    const stockMap: Record<string, { itemName: string; balance: number; unit: string; lot: string; expiration: string }> = {};

    (warehouseLog || []).forEach((log: any) => {
      if (!log) return;
      const name = log.itemName || log.item || '';
      if (!name) return;
      
      const twoWordsKey = name.trim().split(' ').slice(0, 2).join(' ').toUpperCase();
      if (!requestedNames.has(twoWordsKey)) return;
      
      const lot = log.lotNumber || log.lot || log.lote || 'UNICO';
      const expirationOrig = log.expirationDate || log.expiration || log.val || log.validade || '';
      const expiration = expirationOrig ? expirationOrig : 'N/A';

      const key = `${twoWordsKey}|${lot}|${expiration}`;

      if (!stockMap[key]) {
        let unit = 'Kg';
        if (suppliers) {
          for (const s of suppliers) {
            if (s.contractItems) {
              const matched = Object.values(s.contractItems).find((ci: any) => ci.name?.trim().split(' ').slice(0, 2).join(' ').toUpperCase() === twoWordsKey);
              if (matched && (matched as any).unit) {
                unit = (matched as any).unit;
                break;
              }
            }
          }
        }
        
        stockMap[key] = {
          itemName: twoWordsKey,
          balance: 0,
          unit,
          lot,
          expiration
        };
      }

      const qty = Number(log.quantity || log.kg || 0);
      // 'entrada' or similarly indicating a reception
      const isEntrada = log.type === 'entrada';
      
      if (isEntrada) {
        stockMap[key].balance += qty;
      } else {
        stockMap[key].balance -= qty;
      }
    });

    return Object.values(stockMap)
      .filter((item) => item.balance > 0.001)
      .sort((a, b) => a.itemName.localeCompare(b.itemName) || a.expiration.localeCompare(b.expiration) || a.lot.localeCompare(b.lot));
  }, [warehouseLog, localActiveItems, suppliers]);

  // Keep local items in sync with active subtab's activeOrder items
  useEffect(() => {
    const activeOrderItems = data?.[activeSubTab]?.[orderKey]?.items;
    const timerId = setTimeout(() => {
      if (activeOrderItems && activeOrderItems.length > 0) {
        const dbStr = JSON.stringify(activeOrderItems);
        const locStr = JSON.stringify(localActiveItems);
        if (dbStr !== locStr) {
          setLocalActiveItems(activeOrderItems);
        }
      } else {
        // Create empty 25 rows
        const emptyItems = Array.from({ length: 25 }, (_, i) => ({
          index: i + 1,
          itemName: '',
          quantity: '',
          observation: '',
        }));
        setLocalActiveItems(emptyItems);
      }
      // Clear validations when tab updates
      setPasswordInput('');
      setSignatureError('');
      setSignatureSuccess('');
    }, 0);

    return () => {
      clearTimeout(timerId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.[activeSubTab]?.[orderKey]?.items, activeSubTab, orderKey]);

  const handleTabChange = (tab: 'chefeDep' | 'chefeSeg') => {
    setActiveSubTab(tab);
    setViewMode('form');
    setViewingPastOrder(null);
  };

  const handleFieldChange = (index: number, field: keyof RowItem, value: string) => {
    if (isReadOnly || isCurrentOrderSigned) return;

    // Check if user is the designated chef of this subtab or admin or financeiro editing
    const hasEditPermission = (activeSubTab === 'chefeDep' && isDouglas) || 
                              (activeSubTab === 'chefeSeg' && isAlfredo) ||
                              currentUser?.role === 'admin' ||
                              (currentUser?.role === 'financeiro' && !isReadOnly) ||
                              (currentUser?.role === 'almoxarifado' && !isReadOnly);

    if (!hasEditPermission) return;

    const updated = localActiveItems.map((itm) => {
      if (itm.index === index) {
        return { ...itm, [field]: value };
      }
      return itm;
    });
    setLocalActiveItems(updated);

    // Auto save to database
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveActiveOrderToFirebase(updated);
    }, 800);
  };

  const handleClearRow = (index: number) => {
    if (isReadOnly || isCurrentOrderSigned) return;

    const hasEditPermission = (activeSubTab === 'chefeDep' && isDouglas) || 
                              (activeSubTab === 'chefeSeg' && isAlfredo) ||
                              currentUser?.role === 'admin' ||
                              (currentUser?.role === 'financeiro' && !isReadOnly) ||
                              (currentUser?.role === 'almoxarifado' && !isReadOnly);

    if (!hasEditPermission) return;

    const updated = localActiveItems.map((itm) => {
      if (itm.index === index) {
        return { index: itm.index, itemName: '', quantity: '', observation: '' };
      }
      return itm;
    });
    setLocalActiveItems(updated);
    saveActiveOrderToFirebase(updated);
  };

  const saveActiveOrderToFirebase = async (itemsList: RowItem[]) => {
    const safeData = data || { chefeDep: {}, chefeSeg: {} } as any;
    const subTab = activeSubTab;
    const currentSubTabData = safeData[subTab] || {};
    const currentActiveOrder = currentSubTabData[orderKey] || {};

    const updatedData = {
      ...safeData,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          ...currentActiveOrder,
          items: itemsList
        }
      }
    };
    await onUpdate(updatedData);
  };

  const handlePeriodTypeChange = async (newPeriod: 'mensal' | 'semanal') => {
    if (isReadOnly || isCurrentOrderSigned) return;

    const hasEditPermission = (activeSubTab === 'chefeDep' && isDouglas) || 
                              (activeSubTab === 'chefeSeg' && isAlfredo) ||
                              currentUser?.role === 'admin' ||
                              (currentUser?.role === 'financeiro' && !isReadOnly) ||
                              (currentUser?.role === 'almoxarifado' && !isReadOnly);

    if (!hasEditPermission) return;

    const safeData = data || { chefeDep: {}, chefeSeg: {} } as any;
    const subTab = activeSubTab;
    const currentSubTabData = safeData[subTab] || {};
    const currentActiveOrder = currentSubTabData[orderKey] || {};

    const updatedData = {
      ...safeData,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          ...currentActiveOrder,
          periodType: newPeriod
        }
      }
    };
    await onUpdate(updatedData);
  };

  // State checks for the current active subtab and category
  const currentActiveOrder = data?.[activeSubTab]?.[orderKey];
  const isCurrentOrderSigned = !!currentActiveOrder?.signed;

  const handleDigitalSign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setSignatureError('');
    setSignatureSuccess('');

    if (!currentUser) {
      setSignatureError('Usuário não identificado.');
      return;
    }
    const safeData = data || { chefeDep: {}, chefeSeg: {} } as any;

    const cleanedPassword = passwordInput.trim().replace(/\D/g, '');
    const userCpf = currentUser.cpf.trim().replace(/\D/g, '');

    // Signature must match their entrance password (their CPF)
    if (cleanedPassword !== userCpf) {
      setSignatureError('Senha inválida (A senha digital de validação deve ser igual ao seu CPF de acesso).');
      return;
    }

    const subTab = activeSubTab;
    const isOwner = (subTab === 'chefeDep' && isDouglas) || (subTab === 'chefeSeg' && isAlfredo);
    if (!isOwner && currentUser.role !== 'admin') {
      setSignatureError('Seu usuário não possui permissão para validar essa planilha.');
      return;
    }

    const currentSubTabData = safeData[subTab] || {};
    const currentActiveOrderData = currentSubTabData[orderKey] || {};

    const filledItems = (currentActiveOrderData.items || localActiveItems || []).filter(item => item.itemName.trim() !== '');
    if (filledItems.length === 0) {
      setSignatureError('Não é possível validar e enviar um pedido que não possui itens preenchidos.');
      return;
    }

    const timestamp = new Date().toLocaleString('pt-BR');
    const signerName = subTab === 'chefeDep' ? 'DOUGLAS FERNANDO SEMENZIN GALDINO' : 'ALFREDO GUILHERME LOPES';
    const timestampId = `pedido_${Date.now()}`;
    const formattedDate = new Date().toLocaleString('pt-BR');

    // Create a copy of active order items to be saved as signed
    const signedActiveOrderData: OrderData = {
      ...currentActiveOrderData,
      items: localActiveItems.length > 0 ? localActiveItems : (currentActiveOrderData.items || []),
      signed: true,
      signedAt: timestamp,
      signerName: signerName,
      periodType: currentActiveOrderData.periodType || 'semanal'
    };

    const currentHistory = currentSubTabData[historyKey] || {};
    const newHistoricalOrder: OrderData = {
      ...signedActiveOrderData,
      id: timestampId,
      createdAt: formattedDate,
    };

    const emptyItems = Array.from({ length: 25 }, (_, i) => ({
      index: i + 1,
      itemName: '',
      quantity: '',
      observation: '',
    }));

    const updatedData = {
      ...safeData,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          items: emptyItems,
          id: 'atual',
          signed: false,
          signedAt: null,
          signerName: null,
          periodType: currentActiveOrderData.periodType || 'semanal'
        },
        [historyKey]: {
          ...currentHistory,
          [timestampId]: newHistoricalOrder
        }
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      setLocalActiveItems(emptyItems);
      setSignatureSuccess('Solicitação validada, assinada e enviada para o Almoxarifado com sucesso!');
      setPasswordInput('');
      setViewMode('history');
    } else {
      setSignatureError(res.message || 'Erro ao registrar assinatura e enviar ao Almoxarifado.');
    }
  };

  const handleRevokeSignature = async () => {
    if (isReadOnly) return;
    if (!data) return;
    const subTab = activeSubTab;
    const isOwner = (subTab === 'chefeDep' && isDouglas) || (subTab === 'chefeSeg' && isAlfredo);
    if (!isOwner && currentUser?.role !== 'admin') {
      alert('Apenas o responsável correspondente ou o Administrador pode remover a assinatura.');
      return;
    }

    if (!window.confirm('Deseja realmente revogar a assinatura deste pedido? Ele voltará ao estado de rascunho.')) {
      return;
    }

    const currentSubTabData = data[subTab] || {};
    const currentActiveOrderData = currentSubTabData[orderKey] || {};

    const updatedData = {
      ...data,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          ...currentActiveOrderData,
          signed: false,
          signedAt: null,
          signerName: null
        }
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      setSignatureSuccess('Assinatura digital revogada de volta a rascunho.');
    } else {
      setSignatureError('Erro ao revogar assinatura.');
    }
  };

  const handleClearTable = async () => {
    if (isReadOnly) return;
    if (!window.confirm('Tem certeza de que deseja limpar totalmente a tabela de itens e a assinatura digital?')) {
      return;
    }

    const safeData = data || { chefeDep: {}, chefeSeg: {} } as any;

    const emptyItems = Array.from({ length: 25 }, (_, i) => ({
      index: i + 1,
      itemName: '',
      quantity: '',
      observation: '',
    }));

    const subTab = activeSubTab;
    const currentSubTabData = safeData[subTab] || {};
    const currentActiveOrderData = currentSubTabData[orderKey] || {};

    const updatedData = {
      ...safeData,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          ...currentActiveOrderData,
          items: emptyItems,
          id: 'atual',
          signed: false,
          signedAt: null,
          signerName: null
        }
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      setLocalActiveItems(emptyItems);
      setSignatureSuccess('Tabela limpa com sucesso!');
    } else {
      setSignatureError('Erro ao limpar a tabela.');
    }
  };

  const handleArchiveOrder = async () => {
    if (isReadOnly) return;
    if (!data) return;
    const subTab = activeSubTab;
    const currentSubTabData = data[subTab] || {};
    const currentActiveOrderData = currentSubTabData[orderKey] || {};

    if (!currentActiveOrderData.signed) {
      alert('Por favor, assine digitalmente o pedido antes de enviá-lo ao histórico para separação.');
      return;
    }

    const filledItems = (currentActiveOrderData.items || []).filter(item => item.itemName.trim() !== '');
    if (filledItems.length === 0) {
      alert('Não é possível arquivar um pedido que não possui itens preenchidos.');
      return;
    }

    if (!window.confirm('Deseja finalizar esta solicitação e registrá-la no Histórico Permanente? O rascunho atual será reposto para novos preenchimentos.')) {
      return;
    }

    const timestampId = `pedido_${Date.now()}`;
    const formattedDate = new Date().toLocaleString('pt-BR');

    const currentHistory = currentSubTabData[historyKey] || {};
    const newHistoricalOrder: OrderData = {
      ...currentActiveOrderData,
      id: timestampId,
      createdAt: formattedDate,
    };

    const emptyItems = Array.from({ length: 25 }, (_, i) => ({
      index: i + 1,
      itemName: '',
      quantity: '',
      observation: '',
    }));

    const updatedData = {
      ...data,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          items: emptyItems,
          id: 'atual',
          signed: false,
          signedAt: null,
          signerName: null
        },
        [historyKey]: {
          ...currentHistory,
          [timestampId]: newHistoricalOrder
        }
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      setLocalActiveItems(emptyItems);
      setSignatureSuccess('Solicitação enviada e adicionada ao histórico de pedidos!');
      setViewMode('history');
    } else {
      alert('Erro ao registrar histórico.');
    }
  };

  const handleDeletePastOrder = async (orderId: string) => {
    if (isReadOnly) return;
    if (!data) return;
    if (!window.confirm('Deseja excluir permanentemente esse pedido do histórico? Essa exclusão é irreversível.')) {
      return;
    }

    const subTab = activeSubTab;
    const currentSubTabData = data[subTab] || {};
    const currentHistory = { ...(currentSubTabData[historyKey] || {}) };
    
    delete currentHistory[orderId];

    const updatedData = {
      ...data,
      [subTab]: {
        ...currentSubTabData,
        [historyKey]: currentHistory
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      if (viewingPastOrder?.id === orderId) {
        setViewingPastOrder(null);
        setViewMode('history');
      }
      alert('Pedido excluído com sucesso.');
    } else {
      alert('Erro ao excluir pedido.');
    }
  };

  const handlePrintOrder = (order: OrderData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o relatório.');
      return;
    }

    const itemsToPrint = order.items || [];
    const allItemsHtml = itemsToPrint.map(item => {
      const itemName = item?.itemName || '';
      const isBold = itemName.trim() !== '';
      const unitVal = isBold ? (getItemUnit(itemName) || 'KG') : '';
      return `
        <tr style="${isBold ? 'background-color: #f8fafc;' : ''}">
          <td style="text-align: center; height: 32px;">${item?.index || ''}</td>
          <td style="text-align: left; font-weight: ${isBold ? 'bold' : 'normal'};">${itemName.toUpperCase()}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${item?.quantity || ''}</td>
          <td style="text-align: center; font-weight: bold; color: #475569;">${unitVal}</td>
          <td style="text-align: left; color: #475569;">${item?.observation || ''}</td>
        </tr>
      `;
    }).join('');

    const titleText = activeSubTab === 'chefeDep' 
      ? 'PEDIDO DE PER CAPITA - CHEFE DO DEPARTAMENTO' 
      : 'PEDIDO DE PER CAPITA - CHEFE DE SEGURANÇA INTERNA';
      
    const signerSection = activeSubTab === 'chefeDep' 
      ? 'Divisão de Chefia de Departamento (Administração)' 
      : 'Divisão de Chefia de Segurança Interna';

    const defaultSignerName = activeSubTab === 'chefeDep'
      ? 'DOUGLAS FERNANDO SEMENZIN GALDINO'
      : 'ALFREDO GUILHERME LOPES';

    const timestampText = order.signedAt || 'Não assinada';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Pedido Per Capita - Validação Digital</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 40px;
            color: #1e293b;
            background-color: #ffffff;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .logo {
            font-size: 18px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: -0.5px;
            color: #1e3a8a;
          }
          .logo span {
            color: #ef4444;
          }
          .document-title {
            text-align: right;
          }
          .document-title h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .document-title p {
            margin: 3px 0 0 0;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #64748b;
          }
          .meta-info {
            background-color: #f1f5f9;
            border-radius: 12px;
            padding: 12px;
            margin-bottom: 25px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .meta-item {
            margin: 0;
            font-size: 10px;
          }
          .meta-item strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th {
            background-color: #1e3a8a;
            color: #ffffff;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 9px;
            padding: 8px;
            border: 1px solid #1e3a8a;
            letter-spacing: 0.5px;
          }
          td {
            padding: 6px 8px;
            border: 1px solid #cbd5e1;
          }
          .signatures-container {
            margin-top: 40px;
            display: flex;
            justify-content: center;
          }
          .signature-box {
            border: 2px dashed #94a3b8;
            border-radius: 16px;
            padding: 20px;
            text-align: center;
            background-color: #f8fafc;
            width: 330px;
          }
          .signature-box.signed {
            border: 2px solid #10b981;
            background-color: #ecfdf5;
          }
          .signature-box h3 {
            margin: 0 0 8px 0;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #475569;
          }
          .signature-box.signed h3 {
            color: #065f46;
          }
          .signature-box .seal {
            background-color: #10b981;
            color: white;
            display: inline-block;
            padding: 3px 10px;
            border-radius: 9999px;
            font-weight: 700;
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
          }
          .signature-box .signer-name {
            font-size: 12px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 4px;
          }
          .signature-box .signer-meta {
            font-size: 9px;
            color: #64748b;
          }
          .signature-box .empty-seal {
            color: #94a3b8;
            font-size: 10px;
            font-weight: 500;
            padding: 10px 0;
          }
          .footer-note {
            margin-top: 45px;
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 15px;
          }
          @media print {
            body {
              margin: 20px;
            }
            .no-print {
              display: none;
            }
            .signature-box {
              background-color: #ffffff !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo">P. TAIÚVA<span>•</span>ESTOQUE</div>
          <div class="document-title">
            <h1>${titleText}</h1>
            <p>Módulo de Estoque - Gestão de Dados P Taiúva</p>
          </div>
        </div>

        <div class="meta-info">
          <div>
            <p class="meta-item"><strong>Nº Pedido:</strong> ${order?.id === 'atual' ? 'RASCUNHO CORRENTE' : (order?.id || '').toUpperCase()}</p>
            <p class="meta-item"><strong>Solicitante Oficial:</strong> ${signerSection}</p>
            <p class="meta-item"><strong>Preenchimento:</strong> ${order.createdAt || 'Documento em Elaboração'}</p>
            <p class="meta-item"><strong>Tipo de Per Capita:</strong> <span style="font-weight: bold; color: #1e3a8a;">${(order.periodType || 'semanal').toUpperCase()}</span></p>
          </div>
          <div style="text-align: right;">
            <p class="meta-item"><strong>Status:</strong> ${order.signed ? '<span style="color: #10b981; font-weight: bold;">AUTENTICADO DIGITALMENTE</span>' : '<span style="color: #f59e0b; font-weight: bold;">PENDENTE DE ASSINATURA</span>'}</p>
            <p class="meta-item"><strong>Data de Impressão:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 45px; text-align: center;">Item</th>
              <th style="text-align: left;">Descrição do Item Solicitado</th>
              <th style="width: 100px; text-align: center;">Quantidade</th>
              <th style="width: 80px; text-align: center;">Unid.</th>
              <th style="text-align: left;">Observações / Destinação</th>
            </tr>
          </thead>
          <tbody>
            ${allItemsHtml}
          </tbody>
        </table>

        <div class="signatures-container">
          <div class="signature-box ${order.signed ? 'signed' : ''}">
            <h3>Validação Eletrônica Autorizada</h3>
            ${order.signed ? `
              <div class="seal">Chave Digital Validada</div>
              <div class="signer-name">${order.signerName || defaultSignerName}</div>
              <div class="signer-meta">${activeSubTab === 'chefeDep' ? 'Chefe de Departamento' : 'Chefe de Segurança Interna'}</div>
              <div class="signer-meta">Validado em: ${timestampText}</div>
            ` : `
              <div class="empty-seal">Pendente de assinatura eletrônica do responsável</div>
            `}
          </div>
        </div>

        <div class="footer-note">
          Este documento foi processado digitalmente no sistema integrado da Penitenciária de Taiúva.<br/>
          A assinatura digital vinculada valida o pedido de separação de cota e instrui a equipe de Almoxarifado.
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

  const normalizeText = (text: string): string => {
    if (!text) return '';
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[;,\-."']/g, ' ')      // replace punctuation
      .replace(/\s+/g, ' ')            // single spaces
      .trim()
      .toUpperCase();
  };

  const getMatchScore = (requestedName: string, logName: string): number => {
    const reqNorm = normalizeText(requestedName);
    const logNorm = normalizeText(logName);
    if (!reqNorm || !logNorm) return 0;
    if (reqNorm === logNorm) return 100;

    const reqWords = reqNorm.split(' ').filter(Boolean);
    const logWords = logNorm.split(' ').filter(Boolean);

    if (reqWords.length === 0 || logWords.length === 0) return 0;

    const reqFirstTwo = reqWords.slice(0, 2).join(' ');
    const logFirstTwo = logWords.slice(0, 2).join(' ');
    if (reqFirstTwo && logFirstTwo && reqFirstTwo === logFirstTwo) return 90;

    if (logNorm.includes(reqNorm)) return 80;
    if (reqNorm.includes(logNorm)) return 70;

    if (reqWords[0] === logWords[0]) return 50;

    const reqFirstWordChars = reqWords[0].slice(0, 4);
    const logFirstWordChars = logWords[0].slice(0, 4);
    if (reqFirstWordChars && logFirstWordChars && reqFirstWordChars === logFirstWordChars) return 40;

    const sharedWords = reqWords.filter(w => logWords.includes(w));
    if (sharedWords.length > 0) {
      return 20 + sharedWords.length;
    }

    return 0;
  };

  const getPrintableLotDetails = (itemName: string) => {
    if (!itemName || !itemName.trim()) return null;

    const candidates: Array<{ log: any; score: number }> = [];

    (warehouseLog || []).forEach((log: any) => {
      if (!log) return;
      const logItemName = log.itemName || log.item || '';
      if (!logItemName) return;

      const score = getMatchScore(itemName, logItemName);
      if (score >= 35) { // broad matching threshold
        candidates.push({ log, score });
      }
    });

    if (candidates.length === 0) {
      return null;
    }

    // Filtrar apenas pelos registros de entrada (Nota Fiscal que deu entrada no sistema)
    const entradas = candidates.filter(c => c.log.type === 'entrada');

    if (entradas.length > 0) {
      // Ordena de forma a priorizar o score alto (melhor correspondência) e o timestamp decrescente (última nota a entrar)
      entradas.sort((a, b) => {
        const scoreDiff = b.score - a.score;
        // Se a diferença de score for sutil (p. ex., até 15 pontos), prioriza o que for mais recente (último que entrou)
        if (Math.abs(scoreDiff) > 15) {
          return scoreDiff;
        }
        return (b.log.timestamp || 0) - (a.log.timestamp || 0);
      });
      return entradas[0].log;
    }

    // Fallback: se não houver nenhum registro do tipo 'entrada', ordena todos os candidatos por score e data de registro decrescente
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.log.timestamp || 0) - (a.log.timestamp || 0);
    });

    return candidates[0].log;
  };

  const handlePrintAllItemLabels = (itemsList: RowItem[]) => {
    const validItems = (itemsList || []).filter(item => item && item.itemName && item.itemName.trim() !== '');
    if (validItems.length === 0) {
      alert('Aviso: Não há itens preenchidos nesta cota do diretor para imprimir etiquetas.');
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir.');
      return;
    }

    const cardsHtml = validItems.map((item, idx) => {
      let lotDetails = getPrintableLotDetails(item.itemName);
      if (!lotDetails) {
        lotDetails = generateFallbackDetails(item.itemName, item.quantity);
      }

      const itemNameFormatted = (lotDetails.itemName || lotDetails.item || item.itemName).split(' ').slice(0, 4).join(' ');
      const supplierNameFormatted = lotDetails.supplierName || 'SEM FORNECEDOR';
      const lotNumberFormatted = lotDetails.lotNumber || lotDetails.lot || 'UNICO';
      const expirationFormatted = lotDetails.expirationDate || lotDetails.expiration || '';
      const formattedExpiration = expirationFormatted && expirationFormatted !== 'N/A' && expirationFormatted.includes('-')
        ? expirationFormatted.split('-').reverse().join('/')
        : (expirationFormatted || 'N/A');
      
      const reqQty = parseFloat(String(item.quantity).replace(',', '.')) || 0;
      const qtyText = reqQty > 0 ? reqQty.toFixed(2) : parseFloat(String(lotDetails.quantity || 0)).toFixed(2);
      const unitFormatted = lotDetails.unit || 'UN';
      const invoiceNumberFormatted = lotDetails.invoiceNumber || lotDetails.inboundInvoice || 'S/N';
      const barcodeFormatted = lotDetails.barcode || 'N/A';
      const dateFormatted = lotDetails.date ? lotDetails.date.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

      return {
        html: `
            <div class="label-card">
                <h1 style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 1px 0;">
                   <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${itemNameFormatted}</span>
                   <span class="tag-cota">COTA DIRETOR</span>
                </h1>
                <h2>${supplierNameFormatted}</h2>
                <div class="info">
                    <p><strong>LOTE:</strong> <span>${lotNumberFormatted}</span></p>
                    <p><strong>VAL:</strong> <span>${formattedExpiration}</span></p>
                    <p><strong>QUANT:</strong> <span>${qtyText} ${unitFormatted}</span> / <strong>DOC:</strong> <span>${invoiceNumberFormatted}</span></p>
                    <p><strong>DATA:</strong> <span>${dateFormatted}</span></p>
                </div>
                <div class="barcode-container">
                    <svg id="barcode-item-${idx}" class="barcode-svg"></svg>
                </div>
            </div>
        `,
        barcodeId: `#barcode-item-${idx}`,
        barcodeValue: barcodeFormatted
      };
    });

    const isAlim = categoryTab === 'alimentacao';
    const subTabTitle = activeSubTab === 'chefeDep' ? 'Douglas' : 'Alfredo';
    const title = `Etiquetas Cota ${subTabTitle} - ${isAlim ? 'ALIMENTAÇÃO' : 'LIMPEZA'}`;

    const barcodesScripts = cardsHtml.map(card => `
        try {
            JsBarcode("${card.barcodeId}", "${card.barcodeValue}", {
                format: "CODE128", width: 1.2, height: 40, displayValue: true, margin: 0
            });
        } catch (e) {
            console.error("Erro ao gerar código de barras ${card.barcodeId}:", e);
        }
    `).join('\n');

    const combinedHtml = `
        <html>
        <head>
            <title>${title}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @page { size: 100mm 50mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
                .label-card {
                    width: 100mm; height: 50mm;
                    padding: 2mm 4mm; box-sizing: border-box;
                    display: flex; flex-direction: column;
                    border: 0.1mm solid #eee;
                    page-break-after: always;
                }
                .label-card:last-child {
                    page-break-after: avoid;
                }
                h1 { font-size: 11pt; margin: 0 0 1mm 0; font-weight: 950; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; }
                h2 { font-size: 7.5pt; margin: 0.5mm 0 1.5mm 0; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info { font-size: 7.5pt; line-height: 1.1; flex-grow: 1; }
                .info p { margin: 0.2mm 0; display: flex; justify-content: space-between; }
                .info strong { font-weight: 900; text-transform: uppercase; margin-right: 1mm; }
                .barcode-container { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .barcode-svg { max-width: 90%; height: 14mm !important; }
                .tag-cota { background-color: #000; color: #fff; padding: 0.2mm 1.2mm; font-size: 6.5pt; font-weight: 900; border-radius: 0.5mm; text-transform: uppercase; }
            </style>
        </head>
        <body>
            ${cardsHtml.map(c => c.html).join('\n')}
            <script>
                window.onload = function() {
                    ${barcodesScripts}
                    setTimeout(() => { window.print(); window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(combinedHtml);
    printWindow.document.close();
  };

  const handlePrintItemLabel = (item: RowItem) => {
    let lotDetails = getPrintableLotDetails(item.itemName);
    
    // Fallback descriptor if no item lot was logged in warehouseLog
    if (!lotDetails) {
      lotDetails = generateFallbackDetails(item.itemName, item.quantity);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita popups para imprimir.');
      return;
    }

    const itemNameFormatted = (lotDetails.itemName || lotDetails.item || item.itemName).split(' ').slice(0, 4).join(' ');
    const supplierNameFormatted = lotDetails.supplierName || 'SEM FORNECEDOR';
    const lotNumberFormatted = lotDetails.lotNumber || lotDetails.lot || 'UNICO';
    const expirationFormatted = lotDetails.expirationDate || lotDetails.expiration || '';
    const formattedExpiration = expirationFormatted && expirationFormatted !== 'N/A' && expirationFormatted.includes('-')
      ? expirationFormatted.split('-').reverse().join('/')
      : (expirationFormatted || 'N/A');
    
    const reqQty = parseFloat(String(item.quantity).replace(',', '.')) || 0;
    const qtyText = reqQty > 0 ? reqQty.toFixed(2) : parseFloat(String(lotDetails.quantity || 0)).toFixed(2);
    const unitFormatted = lotDetails.unit || 'UN';
    const invoiceNumberFormatted = lotDetails.invoiceNumber || lotDetails.inboundInvoice || 'S/N';
    const barcodeFormatted = lotDetails.barcode || 'N/A';
    const dateFormatted = lotDetails.date ? lotDetails.date.split('-').reverse().join('/') : new Date().toLocaleDateString('pt-BR');

    const htmlContent = `
        <html>
        <head>
            <title>Etiqueta de Cota - ${itemNameFormatted}</title>
            <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
            <style>
                @page { size: 100mm 50mm; margin: 0; }
                body { margin: 0; padding: 0; font-family: 'Courier New', Courier, monospace; background: white; }
                .label-card {
                    width: 100mm; height: 50mm;
                    padding: 2mm 4mm; box-sizing: border-box;
                    display: flex; flex-direction: column;
                    border: 0.1mm solid #eee;
                }
                h1 { font-size: 11pt; margin: 0 0 1mm 0; font-weight: 950; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; }
                h2 { font-size: 7.5pt; margin: 0.5mm 0 1.5mm 0; font-weight: bold; text-transform: uppercase; color: #333; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info { font-size: 7.5pt; line-height: 1.1; flex-grow: 1; }
                .info p { margin: 0.2mm 0; display: flex; justify-content: space-between; }
                .info strong { font-weight: 900; text-transform: uppercase; margin-right: 1mm; }
                .barcode-container { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .barcode-svg { max-width: 90%; height: 14mm !important; }
                .tag-cota { background-color: #000; color: #fff; padding: 0.2mm 1.2mm; font-size: 6.5pt; font-weight: 900; border-radius: 0.5mm; text-transform: uppercase; }
            </style>
        </head>
        <body>
            <div class="label-card">
                <h1 style="display: flex; justify-content: space-between; align-items: center; margin: 0 0 1px 0;">
                   <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 70%;">${itemNameFormatted}</span>
                   <span class="tag-cota">COTA DIRETOR</span>
                </h1>
                <h2>${supplierNameFormatted}</h2>
                <div class="info">
                    <p><strong>LOTE:</strong> <span>${lotNumberFormatted}</span></p>
                    <p><strong>VAL:</strong> <span>${formattedExpiration}</span></p>
                    <p><strong>QUANT:</strong> <span>${qtyText} ${unitFormatted}</span> / <strong>DOC:</strong> <span>${invoiceNumberFormatted}</span></p>
                    <p><strong>DATA:</strong> <span>${dateFormatted}</span></p>
                </div>
                <div class="barcode-container">
                    <svg id="barcode-item" class="barcode-svg"></svg>
                </div>
            </div>
            <script>
                window.onload = function() {
                    try {
                        JsBarcode("#barcode-item", "${barcodeFormatted}", {
                            format: "CODE128", width: 1.2, height: 40, displayValue: true, margin: 0
                         });
                    } catch (e) { console.error(e); }
                    setTimeout(() => { window.print(); window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintHistoryReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Por favor, permita pop-ups para imprimir o relatório.');
      return;
    }

    const orders = Object.values(data?.[activeSubTab]?.[historyKey] || {}) as OrderData[];
    const sortedOrders = orders.sort((a, b) => {
      const timeA = a.id.replace('pedido_', '');
      const timeB = b.id.replace('pedido_', '');
      return Number(timeB) - Number(timeA);
    });

    const isAlim = categoryTab === 'alimentacao';
    const chefName = activeSubTab === 'chefeDep' 
      ? 'DOUGLAS FERNANDO SEMENZIN GALDINO (DEPARTAMENTO)' 
      : 'ALFREDO GUILHERME LOPES (SEGURANÇA INTERNA)';

    const rowsHtml = sortedOrders.flatMap((order) => {
      const activeItems = (order.items || []).filter(item => item.itemName.trim() !== '');
      return activeItems.map((item, itemIdx) => `
        <tr>
          ${itemIdx === 0 ? `<td rowspan="${activeItems.length}" style="text-align: center; font-weight: bold; background-color: #fafafa; font-family: monospace;">${order.createdAt || order.signedAt || ''}</td>` : ''}
          ${itemIdx === 0 ? `<td rowspan="${activeItems.length}" style="text-align: center; text-transform: uppercase; font-weight: bold;">${order.periodType || 'semanal'}</td>` : ''}
          <td style="text-align: left; font-weight: bold;">${item.itemName.toUpperCase()}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${item.quantity}</td>
          <td style="text-align: center; font-weight: bold; color: #475569;">${getItemUnit(item.itemName) || 'KG'}</td>
          <td style="text-align: left; color: #64748b; font-size: 10px;">${item.observation || ''}</td>
        </tr>
      `);
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Histórico de Pedidos de Per Capita</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Inter', sans-serif;
            margin: 40px;
            color: #1e293b;
            font-size: 11px;
            line-height: 1.4;
          }
          .header-container {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 3px solid #1e3a8a;
            padding-bottom: 15px;
            margin-bottom: 25px;
          }
          .logo {
            font-size: 16px;
            font-weight: 800;
            color: #1e3a8a;
          }
          .document-title {
            text-align: right;
          }
          .document-title h1 {
            margin: 0;
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
          }
          .meta-info {
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 20px;
            font-size: 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background-color: #f8fafc;
            color: #475569;
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .footer {
            margin-top: 60px;
            display: flex;
            justify-content: space-around;
          }
          .signature-box {
            border-top: 1px solid #1e293b;
            width: 200px;
            text-align: center;
            padding-top: 5px;
            font-size: 10px;
            font-weight: 600;
            color: #475569;
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="logo">Polícia Penal - Penitenciária de Taiúva</div>
          <div class="document-title">
            <h1>Relatório Histórico de Pedidos</h1>
            <p style="margin:2px 0 0 0; font-size: 8px; color: #64748b;">Módulo: Per Capita Diretores</p>
          </div>
        </div>

        <div class="meta-info">
          <p style="margin: 0 0 4px 0;"><strong>Seção/Categoria:</strong> ${isAlim ? 'ALIMENTAÇÃO' : 'LIMPEZA'}</p>
          <p style="margin: 0;"><strong>Chefia de Referência:</strong> ${chefName}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 140px; text-align: center;">Data Registro</th>
              <th style="width: 80px; text-align: center;">Tipo</th>
              <th>Item Solicitado</th>
              <th style="width: 60px; text-align: center;">Quantidade</th>
              <th style="width: 65px; text-align: center;">Unid.</th>
              <th>Observação/Destinação</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">Nenhum item localizado no histórico permanente.</td></tr>`}
          </tbody>
        </table>

        <div class="footer">
          <div class="signature-box">Responsável (Almoxarifado)</div>
          <div class="signature-box">Fiscal Subscritor (Chefia)</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const currentActiveOrderToPrint = currentActiveOrder || { items: localActiveItems, id: 'atual', signed: false };

  if (!showChefeDep && !showChefeSeg) {
    return (
      <div id="director-per-capita-panel" className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 text-center animate-fade-in max-w-lg mx-auto">
        <div className="flex flex-col items-center gap-4">
          <span className="p-4 bg-amber-50 rounded-full text-amber-600">
            <ShieldCheck className="h-8 w-8 text-amber-600" />
          </span>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">
            Acesso Restrito
          </h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed">
            Este painel da Cota Per Capita é de acesso restrito aos diretores autorizados: 
            <strong className="block mt-1 text-slate-700">Douglas Fernando Semenzin Galdino</strong>
            ou <strong className="block text-slate-700">Alfredo Guilherme Lopes</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="director-per-capita-panel" className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in">
      
      {/* 1. Header with Dual Tab Switch of Chefs */}
      <div className="p-4 md:p-6 bg-slate-900 border-b border-slate-800">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest text-center mb-4">
          Cota Per Capita dos Diretores
        </h2>
        
        <div className="flex bg-slate-800 p-1.5 rounded-2xl max-w-lg mx-auto border border-slate-700">
          {showChefeDep && (
            <button
              onClick={() => handleTabChange('chefeDep')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeSubTab === 'chefeDep' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              📝 {isDouglas ? 'Seu Painel: Dep.' : 'Chefe Departamento'}
            </button>
          )}
          {showChefeSeg && (
            <button
              onClick={() => handleTabChange('chefeSeg')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${activeSubTab === 'chefeSeg' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
            >
              👮 {isAlfredo ? 'Seu Painel: Seg.' : 'Segurança Interna'}
            </button>
          )}
        </div>
      </div>

      {/* 2. Responsable Officer Metadata Info Block & Subtabs toggle */}
      <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Chefia Ativa Selecionada</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight">
                {activeSubTab === 'chefeDep' ? 'Douglas Fernando Semenzin Galdino' : 'Alfredo Guilherme Lopes'}
              </h3>
            </div>
          </div>
          
          <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-sm w-full md:w-auto">
            {!isReadOnly && (
              <button
                onClick={() => { setViewMode('form'); setViewingPastOrder(null); }}
                className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${viewMode === 'form' && !viewingPastOrder ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                <FileText className="h-3.5 w-3.5" /> Pedido Ativo
              </button>
            )}
            <button
              onClick={() => { setViewMode('history'); setViewingPastOrder(null); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${viewMode === 'history' || viewingPastOrder || isReadOnly ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <History className="h-3.5 w-3.5" /> Histórico ({Object.keys(data?.[activeSubTab]?.[historyKey] || {}).length})
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* Category Tabs: Alimentação vs Limpeza */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl max-w-md mb-6 border border-slate-200">
          <button
            onClick={() => {
              setCategoryTab('alimentacao');
              setViewingPastOrder(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              categoryTab === 'alimentacao'
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🍎 Alimentação
          </button>
          <button
            onClick={() => {
              setCategoryTab('limpeza');
              setViewingPastOrder(null);
            }}
            className={`flex-1 py-2 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
              categoryTab === 'limpeza'
                ? 'bg-white text-indigo-700 shadow-md'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            🧹 Limpeza
          </button>
        </div>
        
        {/* VIEW 1: HISTORY LIST */}
        {viewMode === 'history' && !viewingPastOrder && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 border border-slate-100 rounded-3xl p-4 gap-4">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-indigo-600" />
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Pedidos Finalizados ({categoryTab === 'alimentacao' ? 'Alimentação' : 'Limpeza'}) de {activeSubTab === 'chefeDep' ? 'Chefe de Departamento' : 'Segurança Interna'}
                </h4>
              </div>
              <button
                onClick={handlePrintHistoryReport}
                disabled={!data?.[activeSubTab]?.[historyKey] || Object.keys(data?.[activeSubTab]?.[historyKey]).length === 0}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-slate-900 border border-transparent hover:border-slate-800 text-white font-black py-2 px-3.5 rounded-xl text-[9px] uppercase tracking-wider shadow-sm transition-all active:scale-95 disabled:bg-slate-300 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir Histórico de Pedidos
              </button>
            </div>
            
            {(!data?.[activeSubTab]?.[historyKey] || Object.keys(data?.[activeSubTab]?.[historyKey]).length === 0) ? (
              <div className="p-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-3xl">
                <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">Nenhum pedido de {categoryTab === 'alimentacao' ? 'alimentação' : 'limpeza'} no histórico permanente.</p>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Preencha o formulário e valide-o digitalmente para poder arquivar pedidos.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100">
                      <th className="p-3">Data Envio / Arquivo</th>
                      <th className="p-3">Responsável</th>
                      <th className="p-3 text-center">Tipo</th>
                      <th className="p-3 text-center">Produtos do Pedido</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
                    {(Object.values(data?.[activeSubTab]?.[historyKey] || {}) as OrderData[])
                      .sort((a: OrderData, b: OrderData) => {
                        const timeA = a.id.replace('pedido_', '');
                        const timeB = b.id.replace('pedido_', '');
                        return Number(timeB) - Number(timeA);
                      })
                      .map((pastOrder: OrderData) => {
                        const filledCount = (pastOrder.items || []).filter(i => i.itemName.trim() !== '').length;
                        return (
                          <tr key={pastOrder.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="p-3 text-[11px] font-bold text-slate-900">{pastOrder.createdAt || pastOrder.signedAt || 'N/A'}</td>
                            <td className="p-3">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                {pastOrder.signerName || 'Chefia Validada'}
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className={`inline-block text-[9px] font-extrabold tracking-wider px-2.5 py-1 rounded-full uppercase ${pastOrder.periodType === 'mensal' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                                {pastOrder.periodType === 'mensal' ? '📅 Mensal' : '⏳ Semanal'}
                              </span>
                            </td>
                            <td className="p-3 text-center font-black text-indigo-600 text-[11px]">{filledCount} / 25 Itens</td>
                            <td className="p-3 text-center">
                              <div className="flex gap-2 justify-center">
                                <button
                                  onClick={() => setViewingPastOrder(pastOrder)}
                                  className="bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 font-black px-3 py-1.5 rounded-xl text-[9px] uppercase transition-all"
                                >
                                  👁️ Detalhes
                                </button>
                                <button
                                  onClick={() => handlePrintOrder(pastOrder)}
                                  className="bg-indigo-50 hover:bg-slate-900 hover:text-white text-indigo-700 font-black px-3 py-1.5 rounded-xl text-[9px] uppercase transition-all flex items-center gap-1"
                                >
                                  <Printer className="h-3 w-3" /> Imprimir
                                </button>
                                {(!isReadOnly && (isDouglas && activeSubTab === 'chefeDep' || isAlfredo && activeSubTab === 'chefeSeg' || currentUser?.role === 'admin')) && (
                                  <button
                                    onClick={() => handleDeletePastOrder(pastOrder.id)}
                                    className="bg-rose-50 hover:bg-rose-100 text-rose-600 font-black p-1.5 rounded-xl transition-all"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: DETAILS OF HISTORICAL ORDER */}
        {viewingPastOrder && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center bg-slate-900 text-white rounded-3xl p-4 gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setViewingPastOrder(null)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-2 rounded-xl transition-all"
                  title="Voltar ao Histórico"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <div>
                  <h4 className="text-[10px] uppercase font-black text-indigo-400 tracking-wider">Visualizando Pedido Arquivado</h4>
                  <p className="text-[12px] font-black flex items-center gap-2">
                    {viewingPastOrder.createdAt}
                    <span className="bg-indigo-700/55 text-indigo-150 text-[8px] font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider select-none border border-indigo-500/20">
                      {viewingPastOrder.periodType === 'mensal' ? '📅 Mensal' : '⏳ Semanal'}
                    </span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePrintAllItemLabels(viewingPastOrder.items)}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white font-black py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <BarcodeIcon className="h-3.5 w-3.5 text-indigo-400" /> Imprimir Etiquetas
                </button>
                <button
                  onClick={() => handlePrintOrder(viewingPastOrder)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir Pedido
                </button>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 px-5 py-3 rounded-2xl flex items-center gap-3.5">
              <div className="bg-emerald-500 text-white p-1 rounded-full">
                <CheckCircle className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] text-emerald-800 font-black uppercase">
                  PEDIDO AUTENTICADO DE FORMA ELETRÔNICA
                </p>
                <p className="text-[10px] font-bold text-slate-600 mt-0.5">
                  Assinado por: {viewingPastOrder.signerName} • Data: {viewingPastOrder.signedAt}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[950px]">
                <div className="grid grid-cols-[60px_minmax(180px,2fr)_80px_70px_100px_100px_minmax(180px,1.5fr)_130px] gap-2 md:gap-3 mb-2 bg-slate-100 p-3 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div>Item</div>
                  <div className="text-left">Nome do Item</div>
                  <div>Quantidade</div>
                  <div>Unid.</div>
                  <div>Lote</div>
                  <div>Validade</div>
                  <div className="text-left">Observações / Destinar</div>
                  <div>Ações</div>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {(viewingPastOrder.items || []).map((item) => {
                    const lotDetails = getPrintableLotDetails(item.itemName);
                    const lotNumberText = lotDetails ? (lotDetails.lotNumber || lotDetails.lot || 'UNICO') : '-';
                    const expRaw = lotDetails ? (lotDetails.expirationDate || lotDetails.expiration || '') : '';
                    const expirationText = expRaw && expRaw !== 'N/A'
                      ? (expRaw.includes('-') ? expRaw.split('-').reverse().join('/') : expRaw)
                      : (lotDetails ? 'N/A' : '-');

                    return (
                      <div
                        key={item.index}
                        className={`grid grid-cols-[60px_minmax(180px,2fr)_80px_70px_100px_100px_minmax(180px,1.5fr)_130px] gap-2 md:gap-3 items-center p-2 rounded-2xl border ${
                          item.itemName.trim() !== '' ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white border-slate-100'
                        }`}
                      >
                        <div className="flex justify-center">
                          <span className="h-7 w-7 rounded-lg bg-slate-100 text-slate-400 font-black text-xs flex items-center justify-center border border-slate-200">
                            {item.index}
                          </span>
                        </div>
                        <div className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100/40 rounded-xl truncate" title={item.itemName}>
                          {item.itemName ? getShortName(item.itemName) : <span className="text-slate-300">-</span>}
                        </div>
                        <div className="px-3 py-2 text-center text-xs font-black text-indigo-600 bg-slate-100/40 rounded-xl">
                          {item.quantity || <span className="text-slate-300">-</span>}
                        </div>
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white font-black text-[9px] uppercase tracking-wider select-none shadow-sm shadow-slate-900/10">
                              {getItemUnit(item.itemName) || 'KG'}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        {/* Lote (Lot) Badge */}
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider select-none shadow-sm truncate max-w-full">
                              {lotNumberText}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        {/* Validade (Expiration) Badge */}
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider select-none shadow-sm truncate max-w-full">
                              {expirationText}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        <div className="px-3 py-2 text-xs text-slate-500 bg-slate-100/40 rounded-xl truncate">
                          {item.observation || <span className="text-slate-300">-</span>}
                        </div>
                        <div className="flex justify-center">
                          {item.itemName && item.itemName.trim() !== '' ? (
                            <button
                              onClick={() => handlePrintItemLabel(item)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[9px] uppercase px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm active:scale-95 transition-all w-full justify-center"
                              title="Imprimir Etiqueta do Item"
                            >
                              <Printer className="h-3 w-3" /> Etiqueta
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="flex justify-start pt-2">
              <button
                onClick={() => setViewingPastOrder(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] uppercase py-2.5 px-5 rounded-xl transition-all"
              >
                Voltar ao Histórico
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: ACTIVE DRAFT FORM SUMMARY */}
        {viewMode === 'form' && !viewingPastOrder && (
          <div className="space-y-4 animate-fade-in">
            
            {/* Period selector: Mensal or Semanal */}
            <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-3xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
              <div>
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest block">Período de Referência da Per Capita</span>
                <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block sm:inline">Selecione se o consumo será semanal ou mensal para este rascunho de pedido de diretor.</span>
              </div>
              
              <div className="flex bg-slate-200/50 p-1 rounded-2xl w-full sm:w-auto">
                <button
                  type="button"
                  disabled={isReadOnly || isCurrentOrderSigned}
                  onClick={() => handlePeriodTypeChange('semanal')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    (currentActiveOrder?.periodType || 'semanal') === 'semanal' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
                  }`}
                >
                  ⏳ Semanal
                </button>
                <button
                  type="button"
                  disabled={isReadOnly || isCurrentOrderSigned}
                  onClick={() => handlePeriodTypeChange('mensal')}
                  className={`flex-1 sm:flex-none px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                    (currentActiveOrder?.periodType || 'semanal') === 'mensal' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
                  }`}
                >
                  📅 Mensal
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isCurrentOrderSigned ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-amber-500 animate-pulse bg-logo'}`}></span>
                  <h2 className="text-sm font-black text-white uppercase tracking-tighter flex items-center gap-1.5">
                    {activeSubTab === 'chefeDep' ? 'Rascunho Corrente: Dep.' : 'Rascunho Corrente: Seg.'}
                  </h2>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {isReadOnly ? "Visualização autorizada e impressão deste rascunho" : "Digite as cotações nas 25 linhas abaixo"}
                </p>
              </div>
              
              <div className="flex items-center gap-2 w-full md:w-auto">
                <button
                  onClick={() => handlePrintAllItemLabels(currentActiveOrderToPrint.items)}
                  className="flex-1 md:flex-none justify-center bg-zinc-800 hover:bg-zinc-700 text-white font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <BarcodeIcon className="h-4 w-4 text-indigo-400" />
                  Imprimir Etiquetas
                </button>
                <button
                  onClick={() => handlePrintOrder(currentActiveOrderToPrint)}
                  className="flex-1 md:flex-none justify-center bg-indigo-600 hover:bg-slate-800 text-white font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir Pedido
                </button>
                {!isReadOnly && !isCurrentOrderSigned && (
                  <button
                    onClick={handleClearTable}
                    className="md:flex-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-black p-2.5 rounded-xl transition-all"
                    title="Limpar Tabela Inteira"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Validation warning or success header */}
            {isCurrentOrderSigned && (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-600 text-white p-2 rounded-2xl shadow-lg shadow-emerald-600/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-emerald-900 font-black text-xs uppercase">SOLICITAÇÃO DE PER CAPITA TOTALMENTE ASSINADA</p>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase mt-0.5">
                      Validado por: {currentActiveOrder?.signerName} • {currentActiveOrder?.signedAt}
                    </p>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto">
                  {!isReadOnly && ((activeSubTab === 'chefeDep' && isDouglas) || (activeSubTab === 'chefeSeg' && isAlfredo) || currentUser?.role === 'admin') && (
                    <button
                      onClick={handleRevokeSignature}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold py-2 px-4 rounded-xl text-[10px] uppercase transition-all"
                    >
                      Editar Rascunho / Remover Assinatura
                    </button>
                  )}
                  
                  {!isReadOnly && (
                    <button
                      onClick={handleArchiveOrder}
                      className="flex-1 md:flex-none bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-5 rounded-xl text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/10 active:scale-95 transition-all"
                    >
                      <FileCheck className="h-4.5 w-4.5" /> Enviar & Finalizar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Main Interactive Table Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[950px]">
                <div className="grid grid-cols-[60px_minmax(180px,2fr)_80px_70px_100px_100px_minmax(180px,1.5fr)_40px] gap-2 md:gap-3 mb-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div>Ref</div>
                  <div className="text-left">Nome do Item</div>
                  <div>Quantidade</div>
                  <div>Unid.</div>
                  <div>Lote</div>
                  <div>Validade</div>
                  <div className="text-left">Observações / Destinação</div>
                  <div></div>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {localActiveItems.map((item) => {
                    // Check if edit is permitted
                    const isEditable = !isReadOnly && !isCurrentOrderSigned && (
                      (activeSubTab === 'chefeDep' && isDouglas) ||
                      (activeSubTab === 'chefeSeg' && isAlfredo) ||
                      currentUser?.role === 'admin' ||
                      (currentUser?.role === 'financeiro' && !isReadOnly)
                    );

                    const lotDetails = getPrintableLotDetails(item.itemName);
                    const lotNumberText = lotDetails ? (lotDetails.lotNumber || lotDetails.lot || 'UNICO') : '-';
                    const expRaw = lotDetails ? (lotDetails.expirationDate || lotDetails.expiration || '') : '';
                    const expirationText = expRaw && expRaw !== 'N/A'
                      ? (expRaw.includes('-') ? expRaw.split('-').reverse().join('/') : expRaw)
                      : (lotDetails ? 'N/A' : '-');

                    return (
                      <div
                        key={item.index}
                        className={`grid grid-cols-[60px_minmax(180px,2fr)_80px_70px_100px_100px_minmax(180px,1.5fr)_40px] gap-2 md:gap-3 items-center p-2 rounded-2xl border transition-all ${
                          item.itemName.trim() !== '' ? 'bg-slate-50 border-zinc-200' : 'bg-white border-slate-100'
                        } hover:border-slate-300`}
                      >
                        {/* Index Column */}
                        <div className="flex justify-center">
                          <span className="h-7 w-7 rounded-lg bg-slate-100 text-slate-500 font-black text-xs flex items-center justify-center border border-slate-200 shadow-sm">
                            {item.index}
                          </span>
                        </div>

                        {/* Name Column */}
                        <div className="relative">
                          <div 
                            className={`w-full text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                              isEditable
                                ? 'bg-white border border-slate-200 hover:border-slate-300 text-slate-800 shadow-sm'
                                : 'bg-transparent border-transparent text-slate-600 pointer-events-none'
                            }`}
                            onClick={() => {
                              if (isEditable) {
                                setActiveSelectRowIndex(item.index);
                                setSelectSearchTerm('');
                              }
                            }}
                          >
                            <span className={item.itemName ? "text-slate-800 font-bold truncate pr-2" : "text-slate-300 font-medium"} title={item.itemName}>
                              {item.itemName ? getShortName(item.itemName) : "Selecionar item..."}
                            </span>
                            {isEditable && (
                              <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            )}
                          </div>

                          {activeSelectRowIndex === item.index && isEditable && (
                            <>
                              <div 
                                className="fixed inset-0 z-40 bg-transparent" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveSelectRowIndex(null);
                                  setSelectSearchTerm('');
                                }} 
                              />
                              <div 
                                className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-3 max-h-72 overflow-y-auto font-sans flex flex-col gap-2" 
                                style={{ minWidth: '320px' }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="p-1 border-b border-slate-100 flex items-center gap-2">
                                  <Search className="h-4 w-4 text-indigo-500 shrink-0" />
                                  <input
                                    type="text"
                                    placeholder="Digite para filtrar o item cadastrado..."
                                    value={selectSearchTerm}
                                    onChange={(e) => setSelectSearchTerm(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-1.5 text-xs font-semibold focus:bg-white focus:outline-none focus:border-indigo-500"
                                    autoFocus
                                  />
                                </div>
                                <div className="space-y-0.5 overflow-y-auto max-h-48 pr-1">
                                  {(() => {
                                    const normalizeText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                                    const q = normalizeText(selectSearchTerm.trim());
                                    const suggestions = percapitaSearchItems.filter(p => {
                                      if (q === '') return true;
                                      return p.normalized.includes(q);
                                    }).map(p => p.original);

                                    if (suggestions.length === 0) {
                                      return (
                                        <div className="p-3 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider text-center">
                                          Nenhum cadastrado encontrado
                                        </div>
                                      );
                                    }

                                    return suggestions.slice(0, 100).map((sugg, idx) => (
                                      <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                          // Keep complete registered name so unit match and scoring is exact
                                          handleFieldChange(item.index, 'itemName', sugg);
                                          setActiveSelectRowIndex(null);
                                          setSelectSearchTerm('');
                                        }}
                                        title={sugg}
                                        className="w-full text-left px-3 py-1.5 text-[10.5px] uppercase font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg transition-colors border-b border-slate-50 last:border-b-0 flex items-center justify-between"
                                      >
                                        <span className="truncate max-w-[85%]">{getShortName(sugg)}</span>
                                        <span className="text-[8px] px-1.5 py-0.5 bg-indigo-100 rounded text-indigo-600 font-extrabold shrink-0 uppercase tracking-widest leading-none"> escolher </span>
                                      </button>
                                    ));
                                  })()}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Quantity Column */}
                        <div>
                          <input
                            type="text"
                            disabled={!isEditable}
                            placeholder={isEditable ? "Ex: 10" : "-"}
                            value={item.quantity || ''}
                            onChange={(e) => handleFieldChange(item.index, 'quantity', e.target.value)}
                            className={`w-full text-xs text-center transition-all focus:outline-none focus:ring-1 focus:ring-indigo-100 ${
                              isEditable
                                ? 'bg-white border border-slate-200 focus:border-indigo-500 px-3 py-2 rounded-xl font-extrabold text-indigo-700 placeholder-slate-400 shadow-sm'
                                : 'bg-transparent border-transparent font-extrabold text-indigo-700/80 px-3 py-2 rounded-xl'
                            }`}
                          />
                        </div>

                        {/* Unit Column */}
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-white font-black text-[9px] uppercase tracking-wider select-none shadow-sm shadow-slate-900/10">
                              {getItemUnit(item.itemName) || 'KG'}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        {/* Lote (Lot) Badge */}
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider select-none shadow-sm truncate max-w-full">
                              {lotNumberText}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        {/* Validade (Expiration) Badge */}
                        <div className="flex justify-center">
                          {item.itemName.trim() !== '' ? (
                            <span className="px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-extrabold text-[9px] uppercase tracking-wider select-none shadow-sm truncate max-w-full">
                              {expirationText}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-bold text-[10px]">-</span>
                          )}
                        </div>

                        {/* Observation Column */}
                        <div>
                          <input
                            type="text"
                            disabled={!isEditable}
                            placeholder={isEditable ? "Ex: em bife, em cubos..." : "-"}
                            value={item.observation || ''}
                            onChange={(e) => handleFieldChange(item.index, 'observation', e.target.value)}
                            className={`w-full text-xs transition-all focus:outline-none focus:ring-1 focus:ring-indigo-100 ${
                              isEditable
                                ? 'bg-white border border-slate-200 focus:border-indigo-500 px-3 py-2 rounded-xl text-slate-800 placeholder-slate-400 shadow-sm'
                                : 'bg-transparent border-transparent text-slate-500 px-3 py-2 rounded-xl'
                            }`}
                          />
                        </div>

                        {/* Actions Column */}
                        <div className="flex justify-center h-full items-center">
                          {isEditable && (
                            <button
                              onClick={() => handleClearRow(item.index)}
                              disabled={!(item.itemName || item.quantity || item.observation)}
                              className={`p-2 rounded-lg transition-colors ${
                                (item.itemName || item.quantity || item.observation)
                                  ? 'text-slate-400 hover:text-rose-500 hover:bg-rose-50 cursor-pointer'
                                  : 'text-slate-200 cursor-not-allowed opacity-50'
                              }`}
                              title="Limpar Linha"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Signature validation boxes */}
            {!isReadOnly && !isCurrentOrderSigned && (
              <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-100 rounded-3xl">
                {((activeSubTab === 'chefeDep' && isDouglas) || (activeSubTab === 'chefeSeg' && isAlfredo)) ? (
                  <form onSubmit={handleDigitalSign} className="mt-2 p-4 md:p-6 bg-white rounded-3xl border border-zinc-200 max-w-lg mx-auto shadow-md">
                    <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-1 bg-slate-100 px-3 py-1 rounded-full w-max">
                      <ShieldCheck className="h-3 w-3 text-indigo-600" /> Assinador Digital Oficial
                    </span>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">
                      Validar Registro com Seu CPF
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mb-4">
                      Digite seu CPF de acesso abaixo. Sua assinatura digital validará o registro e enviará o pedido automaticamente para o Histórico Permanente e Almoxarifado para a separação da cota.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <input
                          type="password"
                          placeholder="Digite seu CPF..."
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl text-sm font-bold text-center focus:bg-white focus:border-indigo-600 focus:outline-none transition-all"
                          required
                        />
                      </div>

                      {signatureError && (
                        <p className="text-rose-600 text-[11px] font-black text-center">{signatureError}</p>
                      )}
                      {signatureSuccess && (
                        <p className="text-emerald-600 text-[11px] font-black text-center">{signatureSuccess}</p>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-[11px] uppercase tracking-wider flex justify-center items-center gap-2 shadow-lg shadow-indigo-600/10 active:scale-95 transition-all"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Validar Registro e Enviar para Histórico / Almoxarifado
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="text-center text-xs font-bold uppercase tracking-wide text-amber-600 py-3 bg-amber-50 rounded-2xl border border-amber-100 max-w-xl mx-auto">
                    ⚠️ Painel de Assinatura Eletrônica disponível apenas sob o login próprio de {activeSubTab === 'chefeDep' ? 'Douglas' : 'Alfredo'}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Bottom Section: Items in Stock Table */}
      <div className="mx-4 md:mx-6 mb-6 mt-4 pt-6 border-t border-slate-100 space-y-8">
        
        {/* Unified Table: Requested Items Stock */}
        <div className="bg-slate-50/50 rounded-3xl p-4 md:p-6 border border-slate-100">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shadow-sm animate-pulse"></span>
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1">
                  📊 Saldo em Estoque - Itens Solicitados na Lista
                </h3>
              </div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                Visualização do inventário e validade apenas dos itens ativos solicitados no painel
              </p>
            </div>
          </div>

          {requestedItemsStockList.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                Lista de solicitações vazia no momento.
              </p>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">
                Preencha a Cota Per Capita acima para visualizar o estoque disponível, lote e validade dos itens requeridos.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
              <div className="max-h-[300px] overflow-y-auto pr-1">
                <table className="w-full text-left border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 text-[8px] uppercase font-black tracking-widest text-slate-400 border-b border-slate-100 sticky top-0 bg-opacity-95 backdrop-blur z-10">
                      <th className="p-3 pl-4">Nome do Item Solicitado</th>
                      <th className="p-3 text-center">Unidade</th>
                      <th className="p-3 text-center">Lote Em Estoque</th>
                      <th className="p-3 text-center">Validade do Lote</th>
                      <th className="p-3 text-right">Saldo Disponível no Lote</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-semibold text-slate-700 divide-y divide-slate-100">
                    {requestedItemsStockList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-2.5 pl-4 uppercase font-bold text-slate-800 text-[10.5px]" title={item.itemName}>
                          {item.itemName ? getShortName(item.itemName) : ''}
                        </td>
                        <td className="p-2.5 text-center text-slate-500 text-[10px] uppercase font-bold">
                          {item.unit}
                        </td>
                        <td className="p-2.5 text-center text-indigo-700 text-[10px] uppercase font-black">
                          {item.lot}
                        </td>
                        <td className="p-2.5 text-center text-slate-500 text-[10px] uppercase font-bold">
                          {item.expiration && item.expiration !== 'N/A' && item.expiration.includes('-')
                            ? item.expiration.split('-').reverse().join('/') 
                            : item.expiration}
                        </td>
                        <td className="p-2.5 text-right text-indigo-700 font-extrabold text-[11px]">
                          {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.balance)} {item.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
