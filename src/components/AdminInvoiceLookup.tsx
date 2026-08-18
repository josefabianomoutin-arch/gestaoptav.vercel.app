import React, { useState, useMemo } from 'react';
import { WarehouseMovement, Supplier, PerCapitaConfig } from '../types';
import { ensureArray, superNormalize } from '../lib/utils';
import { Search, FileText, Package, Scale, DollarSign, Building2, AlertCircle } from 'lucide-react';
import { getCombinedSuppliers } from '../lib/supplierUtils';

interface AdminInvoiceLookupProps {
    warehouseLog: WarehouseMovement[];
    suppliers: Supplier[];
    perCapitaConfig?: PerCapitaConfig;
}

const formatCurrency = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatNumber = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const normalizeItemText = (text: string | null | undefined): string => {
    if (!text) return '';
    return String(text)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const getProductHead = (name: string | null | undefined): string => {
    if (!name) return '';
    const rawHead = String(name).split(/[;:(\n]/)[0].trim();
    return normalizeItemText(rawHead);
};

const findBestMatchingContractItem = (deliveryItemName: string, contractItems: any[]) => {
    if (!deliveryItemName || !Array.isArray(contractItems) || contractItems.length === 0) return null;
    const delFullNorm = normalizeItemText(deliveryItemName);
    const delHead = getProductHead(deliveryItemName);

    const exactFull = contractItems.find(ci => ci && normalizeItemText(ci.name) === delFullNorm);
    if (exactFull) return exactFull;

    if (delHead) {
        const exactHead = contractItems.find(ci => ci && getProductHead(ci.name) === delHead);
        if (exactHead) return exactHead;
        
        const prefixHead = contractItems.find(ci => {
            if (!ci || !ci.name) return false;
            const ciHead = getProductHead(ci.name);
            if (!ciHead) return false;
            if (ciHead === delHead) return true;
            if (delHead.startsWith(ciHead + ' ') || ciHead.startsWith(delHead + ' ')) return true;
            return false;
        });
        if (prefixHead) return prefixHead;
        
        const delFirstWord = delHead.split(/\s+/)[0];
        if (delFirstWord && delFirstWord.length >= 4) {
            const firstWordMatch = contractItems.find(ci => {
                if (!ci || !ci.name) return false;
                const ciHead = getProductHead(ci.name);
                const ciFirstWord = ciHead.split(/\s+/)[0];
                return ciFirstWord === delFirstWord;
            });
            if (firstWordMatch) return firstWordMatch;
        }
    }
    return null;
};

const AdminInvoiceLookup: React.FC<AdminInvoiceLookupProps> = ({ warehouseLog, suppliers, perCapitaConfig }) => {
    const [invoiceSearch, setInvoiceSearch] = useState('');

    const allSuppliers = useMemo(() => {
        return getCombinedSuppliers(suppliers || [], perCapitaConfig);
    }, [suppliers, perCapitaConfig]);

    const results = useMemo(() => {
        const query = (invoiceSearch || '').trim().toUpperCase();
        if (!query) return [];

        // Encontrar todas as entradas com essa NF
        const entries = (warehouseLog || []).filter(log => 
            log.type === 'entrada' && 
            (String(log.inboundInvoice || '').toUpperCase() === query || String(log.invoiceNumber || '').toUpperCase() === query)
        );

        if (entries.length === 0) return [];

        // Agrupar por fornecedor
        const supplierGroups: Record<string, any> = {};

        entries.forEach(entry => {
            const supplierName = (entry.supplierName || '').toUpperCase();
            
            if (!supplierGroups[supplierName]) {
                // Find supplier contract
                const supplierRecord = allSuppliers.find(s => 
                    s && s.name && s.name.toUpperCase().includes(supplierName) || 
                    supplierName.includes(s.name?.toUpperCase() || '')
                );
                
                supplierGroups[supplierName] = {
                    supplierName: supplierName,
                    supplierCpf: supplierRecord?.cpf || entry.supplierCpf || '',
                    contractItems: supplierRecord ? ensureArray(supplierRecord.contractItems) : [],
                    items: {}
                };
            }

            const itemName = (entry.itemName || entry.item || '').toUpperCase();
            if (!supplierGroups[supplierName].items[itemName]) {
                supplierGroups[supplierName].items[itemName] = {
                    name: itemName,
                    nfWeight: 0,
                    nfValue: 0,
                    totalDeliveredWeight: 0, // Acumulado de todas as entradas do ano
                    totalDeliveredValue: 0
                };
            }
            
            // Adicionar peso e valor DESTA nota fiscal (priorizando valor salvo na log)
            // IMPORTANTE: Aqui usamos o valor registrado na nota
            supplierGroups[supplierName].items[itemName].nfWeight += (Number(entry.kg) || 0);
            supplierGroups[supplierName].items[itemName].nfValue += (Number(entry.totalValue) || 0);
        });

        // Preencher o total entregue do ano (para dedução) e informações do contrato
        Object.values(supplierGroups).forEach((group: any) => {
            Object.values(group.items).forEach((item: any) => {
                const contractItem = findBestMatchingContractItem(item.name, group.contractItems);
                item.contractWeight = contractItem ? Number(contractItem.totalKg) || 0 : 0;
                item.contractValuePerKg = contractItem ? Number(contractItem.valuePerKg) || 0 : 0;
                item.contractValueTotal = item.contractWeight * item.contractValuePerKg;
                
                // Buscar todas as entradas do ano para esse item deste fornecedor
                const allDeliveries = (warehouseLog || []).filter(log => 
                    log.type === 'entrada' && 
                    (log.supplierName || '').toUpperCase() === group.supplierName &&
                    (log.itemName || log.item || '').toUpperCase() === item.name
                );
                
                item.totalDeliveredWeight = allDeliveries.reduce((sum, d) => sum + (Number(d.kg) || 0), 0);
                item.totalDeliveredValue = allDeliveries.reduce((sum, d) => sum + (Number(d.totalValue) || 0), 0);
                
                item.remainingWeight = Math.max(0, item.contractWeight - item.totalDeliveredWeight);
                item.remainingValue = Math.max(0, item.contractValueTotal - item.totalDeliveredValue);
            });
        });

        return Object.values(supplierGroups);
    }, [invoiceSearch, warehouseLog, allSuppliers]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-indigo-100 flex flex-col md:flex-row gap-4 items-center">
                <div className="bg-indigo-50 p-4 rounded-2xl">
                    <Search className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1 w-full">
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Pesquisa e Dedução por Nota Fiscal</h2>
                    <p className="text-xs text-slate-500 font-medium">Digite o número da Nota Fiscal para verificar os itens, valores lançados e saldos remanescentes dos contratos.</p>
                </div>
                <div className="w-full md:w-80 relative">
                    <input 
                        type="text" 
                        value={invoiceSearch}
                        onChange={(e) => setInvoiceSearch(e.target.value)}
                        placeholder="Número da Nota Fiscal..."
                        className="w-full h-14 pl-4 pr-12 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 text-slate-900 font-black tracking-widest uppercase transition-all"
                    />
                    {invoiceSearch && (
                        <button onClick={() => setInvoiceSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {invoiceSearch && results.length === 0 && (
                <div className="bg-slate-50 p-12 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <FileText className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-black text-slate-500 uppercase tracking-widest">Nenhuma Nota Encontrada</h3>
                    <p className="text-sm text-slate-400 max-w-md mt-2">Não foram encontradas entradas no almoxarifado registradas com o número de nota fiscal <strong>{invoiceSearch}</strong>.</p>
                </div>
            )}

            {results.map((group: any, idx: number) => (
                <div key={idx} className="bg-white rounded-3xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="bg-slate-800 p-5 flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-indigo-400" />
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter">{group.supplierName}</h3>
                            <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5">{group.supplierCpf || 'Sem CPF/CNPJ Cadastrado'}</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto p-4 md:p-6">
                        <table className="w-full text-xs">
                            <thead>
                                <tr>
                                    <th className="text-left py-3 px-4 bg-slate-50 font-black text-slate-600 uppercase tracking-widest rounded-tl-xl border-b border-slate-200 text-[10px]">Item da Nota</th>
                                    <th className="text-right py-3 px-4 bg-indigo-50/50 font-black text-indigo-700 uppercase tracking-widest border-b border-indigo-100 text-[10px]">Lançado nesta NF (Peso)</th>
                                    <th className="text-right py-3 px-4 bg-indigo-50/50 font-black text-indigo-700 uppercase tracking-widest border-b border-indigo-100 text-[10px]">Lançado nesta NF (R$)</th>
                                    <th className="text-right py-3 px-4 bg-slate-50 font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 text-[10px]">Contrato (Peso)</th>
                                    <th className="text-right py-3 px-4 bg-slate-50 font-black text-slate-600 uppercase tracking-widest border-b border-slate-200 text-[10px]">Contrato (R$)</th>
                                    <th className="text-right py-3 px-4 bg-emerald-50/50 font-black text-emerald-700 uppercase tracking-widest rounded-tr-xl border-b border-emerald-100 text-[10px]">Saldo Restante (R$)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {Object.values(group.items).map((item: any, iIdx: number) => {
                                    const isExceeding = item.remainingWeight === 0 && item.nfWeight > 0;
                                    const valueWarning = item.contractValueTotal > 0 && item.totalDeliveredValue > item.contractValueTotal;

                                    return (
                                        <tr key={iIdx} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <Package className="h-4 w-4 text-slate-400" />
                                                    <span className="font-black text-slate-800 uppercase text-xs">{item.name}</span>
                                                </div>
                                                {item.contractWeight === 0 && (
                                                    <div className="flex items-center gap-1 text-[9px] text-amber-600 font-bold mt-1 uppercase">
                                                        <AlertCircle className="h-3 w-3" /> Não localizado no contrato
                                                    </div>
                                                )}
                                                {valueWarning && (
                                                    <div className="flex items-center gap-1 text-[9px] text-red-600 font-bold mt-1 uppercase">
                                                        <AlertCircle className="h-3 w-3" /> Ultrapassou valor do contrato!
                                                    </div>
                                                )}
                                            </td>
                                            
                                            <td className="py-4 px-4 text-right">
                                                <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-black text-[11px]">
                                                    {formatNumber(item.nfWeight)} kg
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-mono font-black text-[11px]">
                                                    {formatCurrency(item.nfValue)}
                                                </div>
                                            </td>

                                            <td className="py-4 px-4 text-right font-mono text-slate-600 text-[11px] font-medium">
                                                {formatNumber(item.contractWeight)} kg
                                            </td>
                                            <td className="py-4 px-4 text-right font-mono text-slate-600 text-[11px] font-medium">
                                                {formatCurrency(item.contractValueTotal)}
                                            </td>

                                            <td className="py-4 px-4 text-right">
                                                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-mono font-black text-[11px] ${
                                                    isExceeding || valueWarning ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
                                                }`}>
                                                    {formatCurrency(item.remainingValue)}
                                                </div>
                                                {item.contractWeight > 0 && (
                                                    <div className="text-[9px] text-slate-400 font-bold mt-1 text-right">
                                                        Restam {formatNumber(item.remainingWeight)} kg
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default AdminInvoiceLookup;
