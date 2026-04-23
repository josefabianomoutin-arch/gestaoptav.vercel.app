
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Package, Calendar, FileText, Barcode, Copy } from 'lucide-react';
import type { Supplier, WarehouseMovement } from '../types';
import { toast } from 'sonner';

interface WarehouseMovementFormProps {
    suppliers: Supplier[];
    warehouseLog: WarehouseMovement[];
    onRegisterEntry: (payload: any) => Promise<{ success: boolean; message: string }>;
    onRegisterWithdrawal: (payload: any) => Promise<{ success: boolean; message: string }>;
    initialMode?: 'entrada' | 'saída';
    perCapitaConfig?: any;
    acquisitionItems?: any[];
}

const WarehouseMovementForm: React.FC<WarehouseMovementFormProps> = ({ 
    suppliers, 
    warehouseLog, 
    onRegisterEntry, 
    onRegisterWithdrawal,
    initialMode = 'entrada',
    perCapitaConfig,
    acquisitionItems = []
}) => {
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    // Estados para o formulário manual/individual
    const [manualType, setManualType] = useState<'entrada' | 'saída'>(initialMode);
    const [selectedSupplierCpf, setSelectedSupplierCpf] = useState('');
    const [manualNf, setManualNf] = useState('');
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

    // Estados para o item sendo adicionado
    const [selectedItemName, setSelectedItemName] = useState('');
    const [manualBarcode, setManualBarcode] = useState('');
    const [manualQuantity, setManualQuantity] = useState('');
    const [manualInboundNf, setManualInboundNf] = useState<{ number: string, availableQuantity: number, lot: string, exp: string, timestamp?: number } | null>(null);

    const [manualLot, setManualLot] = useState('');
    const [manualExp, setManualExp] = useState('');
    const [manualPd, setManualPd] = useState('');
    const [manualValue, setManualValue] = useState('');
    const [manualWeight, setManualWeight] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<'1_QUAD' | '2_3_QUAD'>('1_QUAD');
    
    const currentTotalValue = useMemo(() => {
        const q = parseFloat(manualQuantity.replace(',', '.')) || 0;
        const v = parseFloat(manualValue.replace(',', '.')) || 0;
        return q * v;
    }, [manualQuantity, manualValue]);

    const updateManualValue = (itemName: string, period: '1_QUAD' | '2_3_QUAD') => {
        if (manualType === 'entrada' && itemName) {
            const acqItem = acquisitionItems.find(ai => 
                ai.name === itemName || ai.nickname === itemName
            );
            if (acqItem) {
                const val = period === '1_QUAD' ? acqItem.unitValue : (acqItem.unitValue23 || acqItem.unitValue);
                setManualValue(String(val || 0).replace('.', ','));
            }
        }
    };

    // Lista de itens a serem processados
    const [items, setItems] = useState<{ 
        id: string; 
        itemName: string; 
        quantity: number; 
        lot: string; 
        exp: string; 
        barcode: string; 
        inboundInvoice?: string;
        pdNumber?: string;
        value?: number;
        weight?: number;
    }[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [nfSearchTerm, setNfSearchTerm] = useState('');

    const registeredInvoicesWithStock = useMemo(() => {
        if (manualType !== 'saída') return [];
        
        // Entradas agrupadas por NF, Fornecedor e Item
        const stockMap: { [key: string]: { 
            nfNumber: string, 
            supplierName: string, 
            itemName: string, 
            totalIn: number, 
            totalOut: number,
            lot: string,
            exp: string,
            timestamp: number
        } } = {};

        warehouseLog.forEach(log => {
            const key = `${log.invoiceNumber || log.inboundInvoice}|${log.supplierName}|${log.itemName}`;
            if (!stockMap[key]) {
                const ts = log.timestamp || (log.date ? new Date(log.date + 'T12:00:00').getTime() : 0);
                stockMap[key] = { 
                    nfNumber: log.invoiceNumber || log.inboundInvoice || '', 
                    supplierName: log.supplierName, 
                    itemName: log.itemName, 
                    totalIn: 0, 
                    totalOut: 0,
                    lot: log.lotNumber || '',
                    exp: log.expirationDate || '',
                    timestamp: ts
                };
            }
            if (log.type === 'entrada') {
                stockMap[key].totalIn += (log.quantity || log.kg || 0);
                if (log.lotNumber) stockMap[key].lot = log.lotNumber;
                if (log.expirationDate) stockMap[key].exp = log.expirationDate;
                // Mantém o timestamp mais antigo para a NF se houver múltiplas entradas
                const currentTs = log.timestamp || (log.date ? new Date(log.date + 'T12:00:00').getTime() : 0);
                if (currentTs < stockMap[key].timestamp) stockMap[key].timestamp = currentTs;
            } else {
                stockMap[key].totalOut += (log.quantity || log.kg || 0);
            }
        });

        return Object.values(stockMap)
            .filter(s => (s.totalIn - s.totalOut) > 0.001)
            .map(s => ({
                ...s,
                balance: s.totalIn - s.totalOut
            }))
            .sort((a, b) => a.timestamp - b.timestamp || a.nfNumber.localeCompare(b.nfNumber));
    }, [warehouseLog, manualType]);

    const filteredNfSearch = useMemo(() => {
        if (!nfSearchTerm) return [];
        const term = nfSearchTerm.toLowerCase();
        return registeredInvoicesWithStock.filter(nf => 
            nf.nfNumber.toLowerCase().includes(term) || 
            nf.supplierName.toLowerCase().includes(term) ||
            nf.itemName.toLowerCase().includes(term)
        ).slice(0, 5); // Limita a 5 resultados para o dropdown
    }, [registeredInvoicesWithStock, nfSearchTerm]);

    const validateAndSelectNf = React.useCallback((nf: any) => {
        // Encontra se existe algum outro lote do MESMO ITEM e MESMO FORNECEDOR que seja mais antigo
        const olderLot = registeredInvoicesWithStock.find(item => 
            item.itemName === nf.itemName && 
            item.supplierName === nf.supplierName && 
            item.timestamp < nf.timestamp &&
            item.nfNumber !== nf.nfNumber
        );

        if (olderLot) {
            toast.error(`EXISTE LOTE MAIS ANTIGO - PEPS! (NF: ${olderLot.nfNumber})`, {
                duration: 5000,
                description: "Por favor, utilize o estoque mais antigo primeiro."
            });
            return false;
        }

        const supplier = suppliers.find(s => s.name === nf.supplierName);
        if (supplier) setSelectedSupplierCpf(supplier.cpf);
        setSelectedItemName(nf.itemName);
        setManualInboundNf({
            number: nf.nfNumber,
            availableQuantity: nf.balance,
            lot: nf.lot,
            exp: nf.exp,
            timestamp: nf.timestamp
        });
        setManualLot(nf.lot);
        setManualExp(nf.exp);
        setNfSearchTerm(''); // Limpa a busca
        return true;
    }, [registeredInvoicesWithStock, suppliers]);

    const handleSelectSearchedNf = (nf: any) => {
        if (validateAndSelectNf(nf)) {
            toast.success(`NF ${nf.nfNumber} selecionada: ${nf.itemName}`);
        }
    };

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [manualType]);

    const selectedSupplier = useMemo(() => 
        suppliers.find(s => s.cpf === selectedSupplierCpf), 
    [suppliers, selectedSupplierCpf]);

    const manualSupplierInvoices = useMemo(() => {
        if (!selectedSupplier || !selectedItemName) return [];
        // Filtra entradas do log que batem com o fornecedor e o item selecionado
        const entries = warehouseLog.filter(l => l.supplierName === selectedSupplier.name && l.itemName === selectedItemName && l.type === 'entrada');
        
        // Agrupa por NF para saber o saldo disponível
        const invoiceBalances: { [key: string]: { total: number, lot: string, exp: string, timestamp: number } } = {};
        
        entries.forEach(e => {
            const num = e.invoiceNumber || e.inboundInvoice || '';
            if (!invoiceBalances[num]) {
                const ts = e.timestamp || (e.date ? new Date(e.date + 'T12:00:00').getTime() : 0);
                invoiceBalances[num] = { 
                    total: 0, 
                    lot: e.lotNumber || 'UNICO', 
                    exp: e.expirationDate || '',
                    timestamp: ts
                };
            }
            invoiceBalances[num].total += (e.quantity || e.kg || 0);
            
            // Mantém o timestamp mais antigo para a NF se houver múltiplas entradas
            const currentTs = e.timestamp || (e.date ? new Date(e.date + 'T12:00:00').getTime() : 0);
            if (currentTs < invoiceBalances[num].timestamp) invoiceBalances[num].timestamp = currentTs;
        });

        // Subtrai as saídas dessa NF
        warehouseLog.filter(l => l.supplierName === selectedSupplier.name && l.inboundInvoice && l.type === 'saída').forEach(e => {
            if (invoiceBalances[e.inboundInvoice!]) {
                invoiceBalances[e.inboundInvoice!].total -= (e.quantity || e.kg || 0);
            }
        });

        return Object.entries(invoiceBalances)
            .filter(([_, data]) => data.total > 0)
            .map(([number, data]) => ({ number, availableQuantity: data.total, lot: data.lot, exp: data.exp, timestamp: data.timestamp }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }, [selectedSupplier, selectedItemName, warehouseLog]);

    const availableItems = useMemo(() => {
        const itemsList: { name: string; displayName: string }[] = [];
        const seen = new Set<string>();

        const processSupplier = (s: Supplier) => {
            if (!s.contractItems) return;
            const items = Array.isArray(s.contractItems) ? s.contractItems : Object.values(s.contractItems);
            items.forEach((ci: any) => {
                if (!ci.name) return;
                if (!seen.has(ci.name)) {
                    const displayName = ci.nickname ? `${ci.nickname} (${ci.name})` : ci.name;
                    itemsList.push({ name: ci.name, displayName });
                    seen.add(ci.name);
                }
            });
        };

        if (selectedSupplier) {
            processSupplier(selectedSupplier);
        } else {
            // Se nenhum fornecedor selecionado, busca em todos os fornecedores (PPAIS, Perecíveis, Estocáveis)
            suppliers.forEach(processSupplier);
        }

        // Em modo saída, garante que itens com estoque apareçam mesmo que não estejam no contrato explicitamente
        if (manualType === 'saída') {
            registeredInvoicesWithStock.forEach(s => {
                if (!seen.has(s.itemName)) {
                    itemsList.push({ name: s.itemName, displayName: `[EM ESTOQUE] ${s.itemName}` });
                    seen.add(s.itemName);
                }
            });
        }

        return itemsList.sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedSupplier, manualType, suppliers, registeredInvoicesWithStock]);

    useEffect(() => {
        const barcode = manualBarcode.trim();
        if (barcode.length >= 8) {
            const timer = setTimeout(() => {
                let foundMatch = false;
                for (const s of suppliers) {
                    const deliveries = (Object.values(s.deliveries || {}) as any[]).filter((d: any) => d.barcode === barcode);
                    if (deliveries.length > 0) {
                        if (!selectedSupplierCpf && s.cpf) {
                            setSelectedSupplierCpf(s.cpf);
                        }
                        if (manualType === 'saída' && !manualInboundNf) {
                            const invNum = deliveries[0].invoiceNumber || '';
                            const itName = deliveries[0].item || '';
                            const supplierName = s.name;
                            const foundInStock = registeredInvoicesWithStock.find(st => st.nfNumber === invNum && st.itemName === itName && st.supplierName === supplierName);
                            if (foundInStock) validateAndSelectNf(foundInStock);
                        }
                        if (deliveries.length === 1) {
                            const itName = deliveries[0].item || '';
                            setSelectedItemName(itName);
                            const entryLog = warehouseLog.find(l => l.barcode === barcode && l.type === 'entrada');
                            if (entryLog) {
                                setManualLot(entryLog.lotNumber || '');
                                setManualExp(entryLog.expirationDate || '');
                            }
                        }
                        foundMatch = true;
                        break;
                    }
                }
                
                if (!foundMatch) {
                    const entryLog = warehouseLog.find(l => l.barcode === barcode && l.type === 'entrada');
                    if (entryLog) {
                        const supplier = suppliers.find(s => s.name === entryLog.supplierName);
                        if (supplier && !selectedSupplierCpf) setSelectedSupplierCpf(supplier.cpf);
                        setSelectedItemName(entryLog.itemName);
                        if (manualType === 'saída' && !manualInboundNf) {
                             const foundInv = manualSupplierInvoices.find(nf => nf.number === entryLog.inboundInvoice);
                             if (foundInv) setManualInboundNf(foundInv);
                        }
                        setManualLot(entryLog.lotNumber || '');
                        setManualExp(entryLog.expirationDate || '');
                    }
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [manualBarcode, suppliers, warehouseLog, manualType, selectedSupplierCpf, manualInboundNf, manualSupplierInvoices, registeredInvoicesWithStock, validateAndSelectNf]);

    const handleAddItem = () => {
        const qtyVal = parseFloat(manualQuantity.replace(',', '.'));
        if (!selectedItemName || isNaN(qtyVal) || qtyVal <= 0) {
            alert('Preencha Item e Quantidade válida.');
            return;
        }

        if (manualType === 'saída' && !manualInboundNf) {
             alert('Selecione a Nota Fiscal de Origem (Entrada) para este item.');
             return;
        }

        if (manualType === 'saída' && manualInboundNf && qtyVal > manualInboundNf.availableQuantity) {
            alert(`Quantidade solicitada (${qtyVal}) maior que o saldo disponível na NF (${manualInboundNf.availableQuantity.toFixed(2)}).`);
            return;
        }

        if (manualType === 'saída' && manualInboundNf) {
             const olderLot = registeredInvoicesWithStock.find(item => 
                item.itemName === selectedItemName && 
                item.supplierName === selectedSupplier?.name && 
                item.timestamp < (manualInboundNf.timestamp || 0) &&
                item.nfNumber !== manualInboundNf.number
            );

            if (olderLot) {
                toast.error(`EXISTE LOTE MAIS ANTIGO - PEPS! (NF: ${olderLot.nfNumber})`, {
                    duration: 5000,
                    description: "Por favor, utilize o estoque mais antigo primeiro."
                });
                return;
            }
        }

        setItems(prev => [...prev, {
            id: `item-${Date.now()}`,
            itemName: selectedItemName,
            quantity: qtyVal,
            lot: manualLot || 'UNICO',
            exp: manualExp,
            barcode: manualBarcode || Math.random().toString(36).substr(2, 9).toUpperCase(),
            inboundInvoice: manualInboundNf?.number,
            availableBefore: manualInboundNf?.availableQuantity || 0,
            pdNumber: manualPd,
            value: parseFloat(manualValue.replace(',', '.')) || 0,
            weight: parseFloat(manualWeight.replace(',', '.')) || qtyVal
        }]);

        // Limpa campos do item para próxima inserção
        setSelectedItemName('');
        setManualQuantity('');
        setManualLot('');
        setManualExp('');
        setManualBarcode('');
        // Não limpamos manualInboundNf automaticamente pois pode ser a mesma para o próximo item? 
        // Melhor limpar para forçar atenção ou manter? Manter é mais prático.
        // Mas se o usuário mudar de item, talvez a NF mude.
        // Vamos manter por conveniência, mas o usuário pode mudar.
        barcodeInputRef.current?.focus();
    };

    const handlePrintItemLabel = (item: any) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const balanceAfter = item.availableBefore ? (item.availableBefore - item.quantity) : null;

        const htmlContent = `
            <html>
            <head>
                <title>Etiqueta - ${item.itemName}</title>
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
                    h1 { font-size: 11pt; margin: 0 0 1mm 0; font-weight: 900; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border-bottom: 0.3mm solid #000; padding-bottom: 0.5mm; }
                    h2 { font-size: 7.5pt; margin: 0.5mm 0 1.5mm 0; font-weight: bold; text-transform: uppercase; color: #333; }
                    .info { font-size: 7.5pt; line-height: 1.1; flex-grow: 1; }
                    .info p { margin: 0.2mm 0; display: flex; justify-content: space-between; }
                    .info strong { font-weight: 900; text-transform: uppercase; margin-right: 1mm; }
                    .barcode-container { margin-top: auto; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .barcode-svg { max-width: 90%; height: 14mm !important; }
                    .balance-box { border: 0.5mm solid #000; padding: 1mm; margin-top: 1mm; text-align: center; }
                </style>
            </head>
            <body>
                <div class="label-card">
                    <h1>${item.itemName}</h1>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <h2>${selectedSupplier?.name || 'FORNECEDOR'}</h2>
                        ${balanceAfter !== null ? `<div class="balance-box"><strong>SALDO RESTANTE:</strong> ${balanceAfter.toFixed(2)} kg</div>` : ''}
                    </div>
                    <div class="info">
                        <p><strong>LOTE:</strong> <span>${item.lot}</span></p>
                        <p><strong>VAL:</strong> <span>${item.exp ? item.exp.split('-').reverse().join('/') : 'N/A'}</span> / <strong>SAÍDA:</strong> <span>${manualDate.split('-').reverse().join('/')}</span></p>
                        <p><strong>RETIROU:</strong> <span>${item.quantity.toFixed(2)} kg</span> / <strong>ORIGEM NF:</strong> <span>${item.inboundInvoice || 'N/A'}</span></p>
                    </div>
                    <div class="barcode-container">
                        <svg id="barcode-item" class="barcode-svg"></svg>
                    </div>
                </div>
                <script>
                    window.onload = function() {
                        try {
                            JsBarcode("#barcode-item", "${item.barcode}", {
                                format: "CODE128", width: 1.2, height: 40, displayValue: false, margin: 0
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

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    };

    const handleDuplicateItem = (item: any) => {
        setSelectedItemName(item.itemName);
        setManualQuantity(item.quantity.toString());
        setManualLot(item.lot);
        setManualExp(item.exp);
        setManualBarcode(item.barcode);
        
        if (item.inboundInvoice) {
            const found = manualSupplierInvoices.find(nf => nf.number === item.inboundInvoice);
            if (found) {
                setManualInboundNf(found);
            } else {
                // Se não achou no memo filtered, busca no global se em modo saída
                const globalFound = registeredInvoicesWithStock.find(nf => nf.nfNumber === item.inboundInvoice && nf.itemName === item.itemName);
                if (globalFound) {
                    setManualInboundNf({
                        number: globalFound.nfNumber,
                        availableQuantity: globalFound.balance,
                        lot: globalFound.lot,
                        exp: globalFound.exp
                    });
                }
            }
        }
        
        setManualPd(item.pdNumber || '');
        setManualValue(item.value?.toString() || '');
        setManualWeight(item.weight?.toString() || '');
        
        // Foca no input de quantidade ou código de barras
        barcodeInputRef.current?.focus();
        toast.info(`Dados de "${item.itemName}" copiados para o formulário.`);
    };

    const handleRegisterAll = async () => {
        if (!selectedSupplierCpf) {
            alert('Selecione o Fornecedor.');
            return;
        }
        if (items.length === 0) {
            alert('Adicione pelo menos um item à lista.');
            return;
        }

        if (!navigator.onLine) {
            const offlineEntries = JSON.parse(localStorage.getItem('offline_warehouse_entries') || '[]');
            const newEntries = items.map(item => ({
                supplierCpf: selectedSupplierCpf,
                date: manualDate,
                invoiceNumber: manualNf,
                itemName: item.itemName,
                quantity: item.quantity,
                barcode: item.barcode,
                lotNumber: item.lot || 'UNICO',
                expirationDate: item.exp,
                inboundInvoice: item.inboundInvoice,
                pdNumber: item.pdNumber,
                value: item.value,
                weight: item.weight,
                type: manualType,
                timestamp: new Date().toISOString()
            }));
            offlineEntries.push(...newEntries);
            localStorage.setItem('offline_warehouse_entries', JSON.stringify(offlineEntries));
            alert("Sistema offline! Lançamentos salvos localmente para futura sincronização.");
            setItems([]);
            setManualNf('');
            return;
        }

        setIsSubmitting(true);
        try {
            let successCount = 0;
            let failCount = 0;

            for (const item of items) {
                const res = manualType === 'entrada' 
                    ? await onRegisterEntry({
                        supplierCpf: selectedSupplierCpf,
                        itemName: item.itemName,
                        invoiceNumber: manualNf,
                        invoiceDate: manualDate,
                        lotNumber: item.lot || 'UNICO',
                        quantity: item.quantity,
                        expirationDate: item.exp,
                        barcode: item.barcode,
                        pdNumber: item.pdNumber,
                        value: item.value,
                        weight: item.weight
                    })
                    : await onRegisterWithdrawal({
                        supplierCpf: selectedSupplierCpf,
                        itemName: item.itemName,
                        outboundInvoice: manualNf,
                        inboundInvoice: item.inboundInvoice,
                        lotNumber: item.lot || 'UNICO',
                        quantity: item.quantity,
                        expirationDate: item.exp,
                        date: manualDate,
                        barcode: item.barcode,
                        pdNumber: item.pdNumber,
                        value: item.value,
                        weight: item.weight
                    });
                
                if (res.success) successCount++;
                else failCount++;
            }

            if (failCount === 0) {
                alert('Todos os itens foram registrados com sucesso!');
                setItems([]);
                setManualNf('');
                setManualInboundNf(null);
                setManualBarcode('');
                setManualQuantity('');
                setManualLot('');
                setManualExp('');
                setSelectedItemName('');
            } else {
                alert(`${successCount} itens registrados. ${failCount} falharam. Verifique os logs.`);
                setItems([]); 
            }
        } catch (err) {
            alert('Erro de conexão ao processar lançamentos.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-fade-in mb-4">
            <div className="p-2 md:p-3 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${manualType === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} transition-colors duration-500 shadow-sm`}>
                        <Package className="h-4 w-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-gray-900 uppercase tracking-tighter leading-none italic">
                            {manualType === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
                        </h2>
                        <p className="text-gray-400 font-bold text-[7px] uppercase tracking-widest mt-0.5">
                            {manualType === 'entrada' ? 'Registro de Recebimento' : 'Registro de Requisição (SAN)'}
                        </p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-0.5 rounded-lg shadow-inner w-full md:w-auto">
                    <button 
                        type="button" 
                        onClick={() => { setManualType('entrada'); setItems([]); setManualInboundNf(null); }} 
                        className={`px-3 py-1 rounded-md text-[7px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${manualType === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Entrada
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setManualType('saída'); setItems([]); setManualInboundNf(null); }} 
                        className={`px-3 py-1 rounded-md text-[7px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-1.5 ${manualType === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Saída
                    </button>
                </div>
            </div>

            <div className="p-1.5 md:p-2 space-y-2">
                {manualType === 'entrada' ? (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 bg-gray-50/50 p-1.5 rounded-lg border border-gray-100">
                        <div className="md:col-span-5 space-y-0.5">
                            <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                                <FileText className="h-2 w-2" /> Fornecedor
                            </label>
                            <select 
                                value={selectedSupplierCpf} 
                                onChange={e => { setSelectedSupplierCpf(e.target.value); setSelectedItemName(''); setItems([]); }} 
                                className="w-full h-8 px-2 border border-gray-100 rounded-lg bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] uppercase appearance-none cursor-pointer">
                                <option value="">-- FORNECEDOR --</option>
                                {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3 space-y-0.5">
                            <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                                <Calendar className="h-2 w-2" /> Data
                            </label>
                            <input 
                                type="date" 
                                value={manualDate} 
                                onChange={e => setManualDate(e.target.value)} 
                                className="w-full h-8 px-2 border border-gray-100 rounded-lg bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px]" />
                        </div>
                        <div className="md:col-span-4 space-y-0.5">
                            <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                                <Barcode className="h-2 w-2" /> Nº NF
                            </label>
                            <input 
                                type="text" 
                                value={manualNf} 
                                onChange={e => setManualNf(e.target.value)} 
                                placeholder="Nº NOTA FISCAL" 
                                className="w-full h-8 px-2 border border-gray-100 rounded-lg bg-white shadow-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] placeholder:text-gray-300 uppercase" />
                        </div>
                    </div>
                ) : (
                    /* Saída layout remains similar but more compact if needed */
                    <div className="space-y-4">
                        {/* No changes needed to Saída for now as per user request focus is Invoice entry */}
                        <div className="bg-red-50/50 p-3 rounded-xl border border-red-100 space-y-2 relative animate-fade-in shadow-sm">
                            <div className="flex justify-between items-center">
                                <label className="text-[8px] font-black text-red-600 uppercase flex items-center gap-2 italic">
                                    <Barcode className="h-3 w-3" /> 1. BUSCAR PRODUTOR OU NOTA FISCAL
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex flex-col items-end">
                                        <label className="text-[6px] font-black text-gray-400 uppercase">Data da Saída</label>
                                        <input 
                                            type="date" 
                                            value={manualDate} 
                                            onChange={e => setManualDate(e.target.value)} 
                                            className="h-5 px-1 border-none bg-transparent font-black text-[9px] outline-none text-right text-red-600" />
                                    </div>
                                    <div className="flex flex-col items-end border-l pl-2 border-red-100">
                                        <label className="text-[6px] font-black text-gray-400 uppercase">Nº REQ / Pedido</label>
                                        <input 
                                            type="text" 
                                            value={manualNf} 
                                            onChange={e => setManualNf(e.target.value)} 
                                            placeholder="REQ..." 
                                            className="h-5 px-1 border-none bg-transparent font-black text-[9px] outline-none text-right text-gray-900 placeholder:text-gray-300 uppercase" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={nfSearchTerm}
                                    onChange={e => setNfSearchTerm(e.target.value)}
                                    placeholder="🔍 Digite Produtor ou Nº da Nota Fiscal para selecionar o saldo..."
                                    className="w-full h-8 px-3 pr-10 border-2 border-red-100 rounded-lg bg-white shadow-md font-black outline-none focus:ring-4 focus:ring-red-200 transition-all text-[10px] placeholder:text-gray-300 italic"
                                />
                                {nfSearchTerm && (
                                    <button 
                                        onClick={() => setNfSearchTerm('')}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>

                            {filteredNfSearch.length > 0 && (
                                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-[100] overflow-hidden divide-y divide-gray-100">
                                    {filteredNfSearch.map((nf, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleSelectSearchedNf(nf)}
                                            className="w-full p-2.5 hover:bg-red-50 text-left transition-all flex justify-between items-center group cursor-pointer"
                                        >
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-gray-900 leading-none group-hover:text-red-700 uppercase">NF {nf.nfNumber}</span>
                                                    <span className="text-[10px] font-black text-red-600 italic">• {nf.itemName}</span>
                                                </div>
                                                <span className="text-[8px] font-bold text-gray-400 mt-0.5 uppercase">{nf.supplierName}</span>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-emerald-600 italic leading-none">{nf.balance.toFixed(2)} KG DISP.</span>
                                                <span className="text-[7px] font-black text-gray-300 uppercase mt-0.5">Lote: {nf.lot || '-'}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white border border-gray-100 rounded-lg p-2 space-y-2 shadow-inner">
                    {manualType === 'saída' && manualInboundNf ? (
                        /* Saída logic remains compact */
                        <div className="bg-indigo-50/50 p-2 rounded-lg border border-indigo-100 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-indigo-100">
                                        <Package className="h-4 w-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-900 uppercase italic leading-none">{selectedItemName}</h3>
                                        <p className="text-[8px] text-gray-500 font-bold uppercase mt-0.5 tracking-tight">
                                            NF: {manualInboundNf.number} • FORN: {selectedSupplier?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-[6px] font-black text-gray-400 uppercase">SALDO</p>
                                        <p className="text-sm font-black text-emerald-600 italic leading-none">{manualInboundNf.availableQuantity.toFixed(2)} kg</p>
                                    </div>
                                    
                                    <div className="w-px h-6 bg-indigo-100 hidden md:block"></div>

                                    <div className="flex items-center gap-1.5">
                                        <div className="relative">
                                            <input 
                                                type="text" 
                                                autoFocus
                                                value={manualQuantity} 
                                                onChange={e => setManualQuantity(e.target.value.replace(/[^0-9,.]/g, ''))} 
                                                placeholder="0,00" 
                                                className="w-16 h-7 px-2 border-2 border-indigo-600 rounded-lg bg-gray-900 text-white font-black text-center text-[10px] outline-none shadow-sm font-mono" 
                                            />
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={handleAddItem}
                                            disabled={!manualQuantity || parseFloat(manualQuantity.replace(',', '.')) <= 0}
                                            className="h-7 px-3 rounded-lg font-black uppercase text-[8px] shadow-sm transition-all active:scale-95 disabled:bg-gray-200 disabled:text-gray-400 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-1"
                                        >
                                            <Plus className="h-3 w-3" /> BAIXAR
                                        </button>
                                    </div>
                                    
                                    <button 
                                        onClick={() => { setManualInboundNf(null); setSelectedItemName(''); setSelectedSupplierCpf(''); setNfSearchTerm(''); }}
                                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : manualType === 'saída' ? (
                        <div className="py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                             <Package className="h-6 w-6 text-gray-300 mx-auto mb-1 opacity-50" />
                             <p className="text-[8px] text-gray-400 font-black uppercase tracking-[0.15em]">Selecione o saldo acima para realizar a baixa</p>
                        </div>
                    ) : (
                        /* ENTRADA DE NOTA FISCAL - REDESIGN */
                        <div className="space-y-2 p-1">
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                {/* Row 1: Item Selection */}
                                <div className="md:col-span-12 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-indigo-600 uppercase ml-1 italic tracking-widest flex items-center justify-between gap-1.5">
                                        <span className="flex items-center gap-1.5"><Package className="h-2 w-2" /> 1. Produto / Item</span>
                                        <span className="text-[6px] text-gray-400 font-bold lowercase">Busca em todos os contratos cadastrados</span>
                                    </label>
                                    <input 
                                        list="items-datalist"
                                        value={selectedItemName} 
                                        onChange={e => {
                                            const val = e.target.value;
                                            setSelectedItemName(val);
                                            updateManualValue(val, selectedPeriod);
                                            
                                            // Tenta auto-selecionar fornecedor se o item for exclusivo de um
                                            if (!selectedSupplierCpf) {
                                                const suppliersWithItem = suppliers.filter(s => {
                                                    const items = Array.isArray(s.contractItems) ? s.contractItems : Object.values(s.contractItems || {});
                                                    return items.some((ci: any) => ci.name === val);
                                                });
                                                if (suppliersWithItem.length === 1) {
                                                    setSelectedSupplierCpf(suppliersWithItem[0].cpf);
                                                }
                                            }
                                        }} 
                                        placeholder="QUAL O PRODUTO? (DIGITE OU SELECIONE)"
                                        className="w-full h-8 px-3 border border-gray-200 rounded-lg bg-white font-black outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] uppercase italic placeholder:text-gray-300" 
                                    />
                                    <datalist id="items-datalist">
                                        {availableItems.map((it, idx) => (
                                            <option key={idx} value={it.name}>
                                                {it.displayName}
                                            </option>
                                        ))}
                                    </datalist>
                                </div>

                                {/* Row 2: Barcode and Lote */}
                                <div className="md:col-span-6 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1">Cód. Barras</label>
                                    <input 
                                        type="text" 
                                        ref={barcodeInputRef}
                                        value={manualBarcode} 
                                        onChange={e => setManualBarcode(e.target.value)} 
                                        placeholder="SCANEIE OU DIGITE"
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] placeholder:text-gray-300 uppercase" 
                                    />
                                </div>
                                <div className="md:col-span-6 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1">Lote</label>
                                    <input 
                                        type="text" 
                                        value={manualLot} 
                                        onChange={e => setManualLot(e.target.value)} 
                                        placeholder="LOTE"
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] uppercase" 
                                    />
                                </div>

                                {/* Row 3: Quantidade and Validade */}
                                <div className="md:col-span-4 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-emerald-600 uppercase ml-1 block">Quantidade (Kg/Un)</label>
                                    <input 
                                        type="text" 
                                        value={manualQuantity} 
                                        onChange={e => setManualQuantity(e.target.value.replace(/[^0-9,.]/g, ''))} 
                                        placeholder="0,00"
                                        className="w-full h-8 px-2 border-2 border-emerald-100 rounded-lg bg-white font-black outline-none focus:ring-2 focus:ring-emerald-200 transition-all text-[11px] text-center" 
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1">Validade</label>
                                    <input 
                                        type="date" 
                                        value={manualExp} 
                                        onChange={e => setManualExp(e.target.value)} 
                                        className="w-full h-8 px-1 border border-gray-200 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[9.5px]" 
                                    />
                                </div>
                                <div className="md:col-span-4 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1 italic tracking-widest">Nº PD</label>
                                    <input 
                                        type="text" 
                                        value={manualPd} 
                                        onChange={e => setManualPd(e.target.value)} 
                                        placeholder="Nº PD"
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white font-black outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] uppercase text-indigo-600" 
                                    />
                                </div>

                                {/* Row 4: Period and Values */}
                                <div className="md:col-span-7 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-indigo-600 uppercase ml-1">Período de Aquisição</label>
                                    <div className="flex gap-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200">
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedPeriod('1_QUAD'); updateManualValue(selectedItemName, '1_QUAD'); }}
                                            className={`flex-1 py-1 rounded-md text-[7px] font-black uppercase transition-all ${selectedPeriod === '1_QUAD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            1º Quadrim.
                                        </button>
                                        <button 
                                            type="button"
                                            onClick={() => { setSelectedPeriod('2_3_QUAD'); updateManualValue(selectedItemName, '2_3_QUAD'); }}
                                            className={`flex-1 py-1 rounded-md text-[7px] font-black uppercase transition-all ${selectedPeriod === '2_3_QUAD' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                                        >
                                            2º e 3º Quad.
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-5 space-y-0.5">
                                    <label className="text-[7.5px] font-black text-gray-400 uppercase ml-1">Valor Unit. (R$)</label>
                                    <input 
                                        type="text" 
                                        value={manualValue} 
                                        onChange={e => setManualValue(e.target.value)} 
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-gray-50 font-black outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] text-right" 
                                    />
                                </div>

                                {/* Row 5: Total Highlight and Add Button */}
                                <div className="md:col-span-12 flex items-center justify-between gap-3 bg-zinc-900 p-2 rounded-xl border border-zinc-800 shadow-2xl mt-1">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none">Total deste Item</span>
                                        <span className="text-xl font-black text-emerald-400 italic leading-none mt-1">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentTotalValue)}
                                        </span>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={handleAddItem}
                                        disabled={!selectedItemName || !manualQuantity || parseFloat(manualQuantity.replace(',', '.')) <= 0}
                                        className="h-10 px-6 rounded-xl font-black uppercase text-[10px] shadow-xl transition-all active:scale-95 disabled:bg-zinc-800 disabled:text-zinc-600 bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-2 shadow-emerald-500/20"
                                    >
                                        <Plus className="h-4 w-4" /> ADICIONAR ITEM NA NF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {items.length > 0 && (
                        <div className="pt-3 border-t border-gray-100 mt-2">
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-slate-50 px-2 py-1 rounded-xl border border-gray-100 flex items-center gap-2 shadow-xs animate-in slide-in-from-left-2 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-900 leading-none">{item.itemName}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[7px] text-gray-400 font-bold uppercase tracking-tighter">
                                                    {item.quantity} kg • R$ {String(item.value || 0).replace('.', ',')}
                                                </span>
                                                <div className="w-1 h-1 rounded-full bg-gray-200"></div>
                                                <span className="text-[7px] text-indigo-500 font-black uppercase">
                                                    Tot: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((item.quantity || 0) * (item.value || 0))}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                type="button"
                                                onClick={() => handleDuplicateItem(item)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-indigo-100"
                                            >
                                                <Copy className="h-3 w-3" />
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)} 
                                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-white rounded-lg transition-all shadow-sm border border-transparent hover:border-rose-100"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center bg-gray-900 p-3 rounded-2xl shadow-xl border-t-4 border-indigo-500 mb-2">
                                <div className="flex flex-col">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">Total da Nota Fiscal</span>
                                    <div className="text-xl font-black text-white font-mono tracking-tighter">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                            items.reduce((acc, item) => acc + ((item.quantity || 0) * (item.value || 0)), 0)
                                        )}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleRegisterAll}
                                    disabled={isSubmitting || items.length === 0} 
                                    className={`h-11 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-2xl transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 text-white flex items-center justify-center gap-2 ${manualType === 'entrada' ? 'bg-green-600 hover:bg-green-700 shadow-green-900/20' : 'bg-red-600 hover:bg-red-700 shadow-red-900/20'}`}>
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processando...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4" /> Confirmar NF ({items.length} itens)
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarehouseMovementForm;
