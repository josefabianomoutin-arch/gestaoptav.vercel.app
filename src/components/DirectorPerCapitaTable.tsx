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
  Trash
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

  const showChefeDep = isReadOnly || isDouglas || currentUser?.role === 'admin';
  const showChefeSeg = isReadOnly || isAlfredo || currentUser?.role === 'admin';

  // Top level tabs: 'chefeDep' (Douglas Galdino) and 'chefeSeg' (Alfredo Lopes)
  const [activeSubTab, setActiveSubTab] = useState<'chefeDep' | 'chefeSeg'>(() => {
    if (isAlfredo && !isDouglas && showChefeSeg) return 'chefeSeg';
    if (!showChefeDep && showChefeSeg) return 'chefeSeg';
    return 'chefeDep';
  });

  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Category sub-tab of the active manager: 'alimentacao' or 'limpeza'
  const [categoryTab, setCategoryTab] = useState<'alimentacao' | 'limpeza'>('alimentacao');

  // Currently focused row input index for suggestions
  const [focusedRowIndex, setFocusedRowIndex] = useState<number | null>(null);

  // Current view mode inside active tab: 'form' or 'history'
  const [viewMode, setViewMode] = useState<'form' | 'history'>('form');
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

  // Get all unique items in perCapitaConfig (PPAIS, Estocáveis, and Perecíveis)
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

    return list.sort((a, b) => a.localeCompare(b)).map(item => ({
      original: item,
      normalized: item.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase()
    }));
  }, [perCapitaConfig]);



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
                              (currentUser?.role === 'financeiro' && !isReadOnly);

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
                              (currentUser?.role === 'financeiro' && !isReadOnly);

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
                              (currentUser?.role === 'financeiro' && !isReadOnly);

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

    const timestamp = new Date().toLocaleString('pt-BR');
    const signerName = subTab === 'chefeDep' ? 'DOUGLAS FERNANDO SEMENZIN GALDINO' : 'ALFREDO GUILHERME LOPES';

    const currentSubTabData = safeData[subTab] || {};
    const currentActiveOrderData = currentSubTabData[orderKey] || {};

    const updatedData = {
      ...safeData,
      [subTab]: {
        ...currentSubTabData,
        [orderKey]: {
          ...currentActiveOrderData,
          signed: true,
          signedAt: timestamp,
          signerName: signerName
        }
      }
    };

    const res = await onUpdate(updatedData);
    if (res.success) {
      setSignatureSuccess('Assinatura digital autenticada com sucesso!');
      setPasswordInput('');
    } else {
      setSignatureError(res.message || 'Erro ao registrar assinatura.');
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
      return `
        <tr style="${isBold ? 'background-color: #f8fafc;' : ''}">
          <td style="text-align: center; height: 32px;">${item?.index || ''}</td>
          <td style="text-align: left; font-weight: ${isBold ? 'bold' : 'normal'};">${itemName.toUpperCase()}</td>
          <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${item?.quantity || ''}</td>
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
            <button
              onClick={() => { setViewMode('form'); setViewingPastOrder(null); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${viewMode === 'form' && !viewingPastOrder ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <FileText className="h-3.5 w-3.5" /> Pedido Ativo
            </button>
            <button
              onClick={() => { setViewMode('history'); setViewingPastOrder(null); }}
              className={`flex-1 md:flex-none px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${viewMode === 'history' || viewingPastOrder ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
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
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-600" />
              <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                Pedidos Finalizados ({categoryTab === 'alimentacao' ? 'Alimentação' : 'Limpeza'}) de {activeSubTab === 'chefeDep' ? 'Chefe de Departamento' : 'Segurança Interna'}
              </h4>
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
              <button
                onClick={() => handlePrintOrder(viewingPastOrder)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-black py-2.5 px-4 rounded-xl text-[10px] uppercase tracking-wider flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
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
              <div className="min-w-[650px]">
                <div className="grid grid-cols-[60px_1fr_120px_2fr] gap-2 md:gap-3 mb-2 bg-slate-100 p-3 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div>Item</div>
                  <div className="text-left">Nome do Item</div>
                  <div>Quantidade</div>
                  <div className="text-left">Observações / Destinar</div>
                </div>

                <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                  {(viewingPastOrder.items || []).map((item) => (
                    <div
                      key={item.index}
                      className={`grid grid-cols-[60px_1fr_120px_2fr] gap-2 md:gap-3 items-center p-2 rounded-2xl border ${
                        item.itemName.trim() !== '' ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-white border-slate-100'
                      }`}
                    >
                      <div className="flex justify-center">
                        <span className="h-7 w-7 rounded-lg bg-slate-100 text-slate-400 font-black text-xs flex items-center justify-center border border-slate-200">
                          {item.index}
                        </span>
                      </div>
                      <div className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100/40 rounded-xl">
                        {item.itemName || <span className="text-slate-300">-</span>}
                      </div>
                      <div className="px-3 py-2 text-center text-xs font-black text-indigo-600 bg-slate-100/40 rounded-xl">
                        {item.quantity || <span className="text-slate-300">-</span>}
                      </div>
                      <div className="px-3 py-2 text-xs text-slate-500 bg-slate-100/40 rounded-xl">
                        {item.observation || <span className="text-slate-300">-</span>}
                      </div>
                    </div>
                  ))}
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
              <div className="min-w-[650px]">
                <div className="grid grid-cols-[60px_1fr_120px_2fr_40px] gap-2 md:gap-3 mb-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                  <div>Ref</div>
                  <div className="text-left">Nome do Item</div>
                  <div>Quantidade</div>
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

                    return (
                      <div
                        key={item.index}
                        className={`grid grid-cols-[60px_1fr_120px_2fr_40px] gap-2 md:gap-3 items-center p-2 rounded-2xl border transition-all ${
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
                          <input
                            type="text"
                            disabled={!isEditable}
                            placeholder={isEditable ? (categoryTab === 'alimentacao' ? "Escreva para buscar..." : "Nome do produto...") : "(Vazio)"}
                            value={item.itemName}
                            onFocus={() => {
                              if (categoryTab === 'alimentacao') {
                                setFocusedRowIndex(item.index);
                              }
                            }}
                            onBlur={() => {
                              // Brief delay to allow clicking on the dropdown candidates list
                              setTimeout(() => {
                                setFocusedRowIndex(prev => prev === item.index ? null : prev);
                              }, 250);
                            }}
                            onChange={(e) => handleFieldChange(item.index, 'itemName', e.target.value)}
                            className="w-full bg-transparent px-3 py-2 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                          />
                          {categoryTab === 'alimentacao' && focusedRowIndex === item.index && isEditable && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto font-sans" style={{ minWidth: '220px' }}>
                              {(() => {
                                const normalizeText = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                                const q = normalizeText(item.itemName.trim());
                                if (q === '') {
                                  return (
                                    <div className="p-2.5 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider text-center col-span-1">
                                      Digite para buscar...
                                    </div>
                                  );
                                }
                                const suggestions = percapitaSearchItems.filter(p => p.normalized.includes(q)).map(p => p.original);
                                if (suggestions.length === 0) {
                                  return (
                                    <div className="p-2.5 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider text-center col-span-1">
                                      Nenhum item cadastrado
                                    </div>
                                  );
                                }
                                return suggestions.slice(0, 30).map((sugg, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onMouseDown={() => {
                                      const words = sugg.trim().split(/\s+/);
                                      const formatted = words.length > 3 ? words.slice(0, 3).join(' ') : sugg;
                                      handleFieldChange(item.index, 'itemName', formatted);
                                      setFocusedRowIndex(null);
                                    }}
                                    className="w-full text-left px-3.5 py-2 text-[10.5px] uppercase font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors border-b border-slate-100 last:border-b-0"
                                  >
                                    {sugg}
                                  </button>
                                ));
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Quantity Column */}
                        <div>
                          <input
                            type="text"
                            disabled={!isEditable}
                            placeholder={isEditable ? "Ex: 10 Sacos" : "-"}
                            value={item.quantity}
                            onChange={(e) => handleFieldChange(item.index, 'quantity', e.target.value)}
                            className="w-full bg-transparent px-3 py-2 text-center rounded-xl text-xs font-extrabold text-indigo-700 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
                          />
                        </div>

                        {/* Observation Column */}
                        <div>
                          <input
                            type="text"
                            disabled={!isEditable}
                            placeholder={isEditable ? "Observação do destino..." : "-"}
                            value={item.observation}
                            onChange={(e) => handleFieldChange(item.index, 'observation', e.target.value)}
                            className="w-full bg-transparent px-3 py-2 rounded-xl text-xs text-slate-600 placeholder-slate-300 border border-transparent focus:border-indigo-500 focus:bg-white focus:outline-none transition-all"
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
                      Digite seu CPF de acesso abaixo. Sua senha eletrônica atesta a veracidade do preenchimento e autoriza a separação da cota per capita.
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
                        Gravar Minha Assinatura Digital
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
                        <td className="p-2.5 pl-4 uppercase font-bold text-slate-800 text-[10.5px]">
                          {item.itemName}
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
