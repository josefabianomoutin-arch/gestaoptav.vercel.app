
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
}

const WarehouseMovementForm: React.FC<WarehouseMovementFormProps> = ({ 
    suppliers, 
    warehouseLog, 
    onRegisterEntry, 
    onRegisterWithdrawal,
    initialMode = 'entrada',
    perCapitaConfig
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
    const [manualInboundNf, setManualInboundNf] = useState('');
    const [manualLot, setManualLot] = useState('');
    const [manualExp, setManualExp] = useState('');
    const [manualNl, setManualNl] = useState('');
    const [manualPd, setManualPd] = useState('');
    const [manualValue, setManualValue] = useState('');
    const [manualWeight, setManualWeight] = useState('');
    
    // Lista de itens a serem processados
    const [items, setItems] = useState<{ 
        id: string; 
        itemName: string; 
        quantity: number; 
        lot: string; 
        exp: string; 
        barcode: string; 
        inboundInvoice?: string;
        nlNumber?: string;
        pdNumber?: string;
        value?: number;
        weight?: number;
    }[]>([]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, [manualType]);

    const selectedSupplier = useMemo(() => 
        suppliers.find(s => s.cpf === selectedSupplierCpf), 
    [suppliers, selectedSupplierCpf]);

    const manualSupplierInvoices = useMemo(() => {
        if (!selectedSupplier) return [];
        const invoices = new Set<string>();
        Object.values(selectedSupplier.deliveries || {}).forEach((d: any) => {
            if (d.invoiceNumber) invoices.add(d.invoiceNumber);
        });
        return Array.from(invoices).sort();
    }, [selectedSupplier]);

    const availableItems = useMemo(() => {
        const itemsList: any[] = [];
        const seen = new Set<string>();

        const addItemsFromSupplier = (s: any) => {
            if (!s) return;
            (Object.values(s.contractItems || {}) as any[]).forEach((ci: any) => {
                const key = `${s.cpf}-${ci.name}`;
                if (!seen.has(key)) {
                    // Tenta buscar o nickname do mapeamento de itens de aquisição
                    // Nota: Precisa garantir que o nickname esteja disponível, caso contrário usa o nome
                    const displayName = ci.nickname ? `${ci.nickname} (${ci.name})` : ci.name;
                    itemsList.push({ name: ci.name, displayName, supplierName: s.name, supplierCpf: s.cpf });
                    seen.add(key);
                }
            });
        };

        if (selectedSupplier) {
            addItemsFromSupplier(selectedSupplier);
            
            // Also check this supplier in perCapitaConfig
            if (perCapitaConfig) {
                const pEntry = perCapitaConfig.ppaisProducers?.find((p: any) => p.cpfCnpj === selectedSupplier.cpf);
                const fEntry = perCapitaConfig.pereciveisSuppliers?.find((f: any) => f.cpfCnpj === selectedSupplier.cpf);
                addItemsFromSupplier(pEntry);
                addItemsFromSupplier(fEntry);
            }
        } else {
            // Se nenhum fornecedor selecionado, mostra TUDO (conforme pedido: busca em todos os itens)
            suppliers.forEach(addItemsFromSupplier);
            if (perCapitaConfig) {
                perCapitaConfig.ppaisProducers?.forEach(addItemsFromSupplier);
                perCapitaConfig.pereciveisSuppliers?.forEach(addItemsFromSupplier);
            }
        }

        return itemsList.sort((a, b) => a.name.localeCompare(b.name));
    }, [selectedSupplier, manualType, suppliers, perCapitaConfig]);

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
                            if (invNum) setManualInboundNf(invNum);
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
                        if (manualType === 'saída' && !manualInboundNf) setManualInboundNf(entryLog.inboundInvoice || '');
                        setManualLot(entryLog.lotNumber || '');
                        setManualExp(entryLog.expirationDate || '');
                    }
                }
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [manualBarcode, suppliers, warehouseLog, manualType, selectedSupplierCpf, manualInboundNf]);

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

        setItems(prev => [...prev, {
            id: `item-${Date.now()}`,
            itemName: selectedItemName,
            quantity: qtyVal,
            lot: manualLot || 'UNICO',
            exp: manualExp,
            barcode: manualBarcode || Math.random().toString(36).substr(2, 9).toUpperCase(),
            inboundInvoice: manualInboundNf,
            nlNumber: manualNl,
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
                </style>
            </head>
            <body>
                <div class="label-card">
                    <h1>${item.itemName}</h1>
                    <h2>${selectedSupplier?.name || 'FORNECEDOR'}</h2>
                    <div class="info">
                        <p><strong>LOTE:</strong> <span>${item.lot}</span></p>
                        <p><strong>VAL:</strong> <span>${item.exp ? item.exp.split('-').reverse().join('/') : 'N/A'}</span> / <strong>ENT:</strong> <span>${manualDate.split('-').reverse().join('/')}</span></p>
                        <p><strong>QTD:</strong> <span>${item.quantity.toFixed(2)} kg</span> / <strong>NF:</strong> <span>${manualNf || 'N/A'}</span></p>
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
        setManualInboundNf(item.inboundInvoice || '');
        setManualNl(item.nlNumber || '');
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
                nlNumber: item.nlNumber,
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
                        nlNumber: item.nlNumber,
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
                        nlNumber: item.nlNumber,
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
                setManualInboundNf('');
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
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in mb-8">
            <div className="p-3 md:p-4 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${manualType === 'entrada' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'} transition-colors duration-500`}>
                        <Package className="h-5 w-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-tighter leading-none italic">
                            {manualType === 'entrada' ? 'Entrada de Estoque' : 'Saída de Estoque'}
                        </h2>
                        <p className="text-gray-400 font-bold text-[8px] uppercase tracking-widest mt-0.5">
                            {manualType === 'entrada' ? 'Registro de Recebimento' : 'Registro de Requisição (SAN)'}
                        </p>
                    </div>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full md:w-auto opacity-0 pointer-events-none invisible">
                    <button 
                        type="button" 
                        onClick={() => { setManualType('entrada'); setItems([]); setManualInboundNf(''); }} 
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-2 ${manualType === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Entrada
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setManualType('saída'); setItems([]); setManualInboundNf(''); }} 
                        className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all duration-300 flex items-center justify-center gap-2 ${manualType === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                        Saída
                    </button>
                </div>
            </div>

            <div className="p-4 md:p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div className="md:col-span-2 space-y-0.5">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                            <FileText className="h-2 w-2" /> Fornecedor / Origem
                        </label>
                        <select 
                            value={selectedSupplierCpf} 
                            onChange={e => { setSelectedSupplierCpf(e.target.value); setSelectedItemName(''); setItems([]); }} 
                            className="w-full h-9 px-3 border border-gray-100 rounded-lg bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] uppercase">
                            <option value="">-- SELECIONE --</option>
                            {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-0.5">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                            <Calendar className="h-2 w-2" /> Data
                        </label>
                        <input 
                            type="date" 
                            value={manualDate} 
                            onChange={e => setManualDate(e.target.value)} 
                            className="w-full h-9 px-3 border border-gray-100 rounded-lg bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px]" />
                    </div>
                    <div className="space-y-0.5">
                        <label className="text-[8px] font-black text-gray-400 uppercase ml-1 flex items-center gap-1">
                            <Barcode className="h-2 w-2" /> Nº Documento / REQ
                        </label>
                        <input 
                            type="text" 
                            value={manualNf} 
                            onChange={e => setManualNf(e.target.value)} 
                            placeholder={manualType === 'entrada' ? "000.000" : "REQ-2026-X"} 
                            className="w-full h-9 px-3 border border-gray-100 rounded-lg bg-white shadow-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] placeholder:text-gray-300" />
                    </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm italic">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                         <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2 space-y-0.5">
                                <label className="text-[8px] font-black text-indigo-600 uppercase ml-1 italic">Produto do Contrato</label>
                                <select 
                                    value={selectedItemName} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (!selectedSupplierCpf) {
                                            const [itemName, supplierCpf] = val.split('|');
                                            setSelectedSupplierCpf(supplierCpf);
                                            setSelectedItemName(itemName);
                                        } else {
                                            setSelectedItemName(val);
                                        }
                                    }} 
                                    className="w-full h-9 px-3 border border-indigo-50 rounded-lg bg-white font-black outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] disabled:opacity-50 shadow-xs uppercase italic" 
                                    disabled={false}>
                                    <option value="">-- BUSCAR PRODUTO (GERAL) --</option>
                                    {!selectedSupplierCpf ? (
                                        (availableItems as any[]).map((it, idx) => (
                                            <option key={`${it.name}-${it.supplierCpf}-${idx}`} value={`${it.name}|${it.supplierCpf}`}>
                                                {it.displayName || it.name} ({it.supplierName})
                                            </option>
                                        ))
                                    ) : (
                                        (availableItems as any[]).map(ci => <option key={ci.name} value={ci.name}>{ci.displayName || ci.name}</option>)
                                    )}
                                </select>
                            </div>
                            
                            <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-rose-600 uppercase ml-1 italic">Nota de Lançamento (NL)</label>
                                <input type="text" value={manualNl} onChange={e => setManualNl(e.target.value.toUpperCase())} placeholder="NL..." className="w-full h-9 px-3 border border-rose-50 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-rose-100 transition-all text-[10px] shadow-xs uppercase italic" />
                            </div>

                            <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-rose-600 uppercase ml-1 italic">Parecer de Despesa (PD)</label>
                                <input type="text" value={manualPd} onChange={e => setManualPd(e.target.value.toUpperCase())} placeholder="PD..." className="w-full h-9 px-3 border border-rose-50 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-rose-100 transition-all text-[10px] shadow-xs uppercase italic" />
                            </div>

                            <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-emerald-600 uppercase ml-1 italic">Valor Total/Unit.</label>
                                <input type="text" value={manualValue} onChange={e => setManualValue(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="R$ 0,00" className="w-full h-9 px-3 border border-emerald-50 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-emerald-100 transition-all text-[10px] shadow-xs font-mono" />
                            </div>

                            <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-amber-600 uppercase ml-1 italic">Peso Bruto</label>
                                <input type="text" value={manualWeight} onChange={e => setManualWeight(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00 kg" className="w-full h-9 px-3 border border-amber-50 rounded-lg bg-white font-bold outline-none focus:ring-2 focus:ring-amber-100 transition-all text-[10px] shadow-xs font-mono" />
                            </div>
                            
                            {manualType === 'saída' && (
                                <div className="space-y-0.5 animate-fade-in">
                                    <label className="text-[8px] font-black text-gray-400 uppercase ml-1">NF Origem (Entrada)</label>
                                    <select 
                                        value={manualInboundNf} 
                                        onChange={e => setManualInboundNf(e.target.value)} 
                                        className="w-full h-9 px-3 border border-gray-100 rounded-lg bg-white shadow-xs font-bold outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] disabled:opacity-50 uppercase"
                                        disabled={!selectedSupplierCpf}>
                                        <option value="">-- SELECIONE NF ENTRADA --</option>
                                        {manualSupplierInvoices.map(nf => <option key={nf} value={nf}>NF {nf}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-4 space-y-0.5">
                            <label className="text-[8px] font-black text-blue-600 uppercase ml-1">Cód. Barras</label>
                            <input 
                                ref={barcodeInputRef} 
                                type="text" 
                                value={manualBarcode} 
                                onChange={e => setManualBarcode(e.target.value)} 
                                placeholder="Bipar..." 
                                className="w-full h-9 px-3 border border-blue-100 rounded-lg bg-white font-mono font-bold focus:ring-2 focus:ring-blue-50 outline-none text-[10px] placeholder:text-blue-200 transition-all shadow-xs" />
                        </div>

                        <div className="md:col-span-2 space-y-0.5">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Quantidade</label>
                            <input 
                                type="text" 
                                value={manualQuantity} 
                                onChange={e => setManualQuantity(e.target.value.replace(/[^0-9,.]/g, ''))} 
                                placeholder="0,00" 
                                className="w-full h-9 px-3 border border-gray-900 rounded-lg bg-gray-900 text-white font-black text-center text-sm outline-none shadow-sm font-mono" 
                            />
                        </div>

                        <div className="md:col-span-3 space-y-0.5">
                            <label className="text-[8px] font-black text-gray-400 uppercase ml-1">Lote / Validade</label>
                            <div className="grid grid-cols-2 gap-1">
                                <input type="text" value={manualLot} onChange={e => setManualLot(e.target.value.toUpperCase())} placeholder="LOTE" className="w-full h-9 px-2 border border-gray-100 rounded-lg bg-white font-mono font-bold outline-none text-[9px]" />
                                <input type="date" value={manualExp} onChange={e => setManualExp(e.target.value)} className="w-full h-9 px-1 border border-gray-100 rounded-lg bg-white font-bold outline-none text-[9px]" />
                            </div>
                        </div>

                        <div className="md:col-span-3">
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                disabled={!selectedItemName || !manualQuantity}
                                className="w-full h-9 rounded-lg font-black uppercase text-[9px] tracking-tight shadow-sm transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-1.5">
                                <Plus className="h-3 w-3" /> Adicionar Item
                            </button>
                        </div>
                    </div>

                    {items.length > 0 && (
                        <div className="pt-2 border-t border-gray-50">
                            <div className="flex flex-wrap gap-2 mb-4">
                                {items.map((item) => (
                                    <div key={item.id} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-3 shadow-xs animate-in slide-in-from-left-2 transition-all group">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-900 leading-none">{item.itemName}</span>
                                            <div className="flex flex-col mt-0.5">
                                                <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">
                                                    {item.quantity} kg • LOTE: {item.lot || '-'}
                                                </span>
                                                <span className="text-[7px] text-indigo-400 font-black uppercase">
                                                    VAL: {item.exp ? item.exp.split('-').reverse().join('/') : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                type="button"
                                                onClick={() => handleDuplicateItem(item)}
                                                className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Duplicar / Copiar dados"
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                type="button"
                                                onClick={() => handlePrintItemLabel(item)}
                                                className="flex items-center gap-1 py-1 px-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all shadow-sm border border-amber-100"
                                                title="Imprimir Etiqueta"
                                            >
                                                <Barcode className="h-3 w-3" />
                                                <span className="text-[8px] font-black uppercase">Etiqueta</span>
                                            </button>
                                            <button 
                                                onClick={() => handleRemoveItem(item.id)} 
                                                className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                title="Remover"
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            <button 
                                type="button" 
                                onClick={handleRegisterAll}
                                disabled={isSubmitting || items.length === 0} 
                                className={`w-full h-11 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all active:scale-95 disabled:bg-gray-100 disabled:text-gray-300 text-white flex items-center justify-center gap-2 ${manualType === 'entrada' ? 'bg-green-600 hover:bg-green-700 shadow-green-100' : 'bg-red-600 hover:bg-red-700 shadow-red-100'}`}>
                                {isSubmitting ? (
                                    <>
                                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        Processando...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="h-4 w-4" /> Confirmar Lançamento Total ({items.length} itens)
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WarehouseMovementForm;
