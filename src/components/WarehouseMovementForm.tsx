
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, X, Package, Calendar, FileText, Barcode } from 'lucide-react';
import type { Supplier, WarehouseMovement } from '../types';

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
    
    // Lista de itens a serem processados
    const [items, setItems] = useState<{ id: string; itemName: string; quantity: number; lot: string; exp: string; barcode: string; inboundInvoice?: string }[]>([]);
    
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
                    itemsList.push({ name: ci.name, supplierName: s.name, supplierCpf: s.cpf });
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
        } else if (manualType === 'saída') {
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
            lot: manualLot,
            exp: manualExp,
            barcode: manualBarcode,
            inboundInvoice: manualInboundNf
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

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
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
                        barcode: item.barcode
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
                        barcode: item.barcode
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

                <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner w-full md:w-auto">
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
                        <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-0.5">
                                <label className="text-[8px] font-black text-indigo-600 uppercase ml-1">Produto do Contrato</label>
                                <select 
                                    value={selectedItemName} 
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (manualType === 'saída' && !selectedSupplierCpf) {
                                            const [itemName, supplierCpf] = val.split('|');
                                            setSelectedSupplierCpf(supplierCpf);
                                            setSelectedItemName(itemName);
                                        } else {
                                            setSelectedItemName(val);
                                        }
                                    }} 
                                    className="w-full h-9 px-3 border border-indigo-50 rounded-lg bg-white font-black outline-none focus:ring-2 focus:ring-indigo-100 transition-all text-[10px] disabled:opacity-50 shadow-xs uppercase" 
                                    disabled={manualType === 'entrada' && !selectedSupplierCpf}>
                                    <option value="">-- PRODUTO --</option>
                                    {manualType === 'saída' && !selectedSupplierCpf ? (
                                        (availableItems as any[]).map((it, idx) => (
                                            <option key={`${it.name}-${idx}`} value={`${it.name}|${it.supplierCpf}`}>
                                                {it.name} ({it.supplierName})
                                            </option>
                                        ))
                                    ) : (
                                        (availableItems as any[]).map(ci => <option key={ci.name} value={ci.name}>{ci.name}</option>)
                                    )}
                                </select>
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
                                    <div key={item.id} className="bg-slate-50 px-3 py-1.5 rounded-xl border border-gray-100 flex items-center gap-3 shadow-xs animate-in slide-in-from-left-2 transition-all">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-gray-900 leading-none">{item.itemName}</span>
                                            <span className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">{item.quantity} kg • {item.lot || '-'}</span>
                                        </div>
                                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-600 transition-colors">
                                            <X className="h-3 w-3" />
                                        </button>
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
