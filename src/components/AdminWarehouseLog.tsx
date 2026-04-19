
import React, { useState, useMemo } from 'react';
import { 
    Plus, 
    Printer, 
    FileIcon, 
    Search, 
    Edit2, 
    Trash2, 
    Clock
} from 'lucide-react';
import type { WarehouseMovement, Supplier } from '../types';
import ConfirmModal from './ConfirmModal';

const monthNamesInOrder = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface AdminWarehouseLogProps {
    warehouseLog: WarehouseMovement[];
    suppliers: Supplier[];
    onDeleteEntry: (logEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onUpdateWarehouseEntry: (updatedEntry: WarehouseMovement) => Promise<{ success: boolean; message: string }>;
    onRegisterEntry: (payload: any) => Promise<{ success: boolean; message: string }>;
    onRegisterWithdrawal: (payload: any) => Promise<{ success: boolean; message: string }>;
}

const superNormalize = (text: string) => {
    return (text || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") 
        .replace(/[^a-z0-9]/g, "") 
        .trim();
};

const AdminWarehouseLog: React.FC<AdminWarehouseLogProps> = ({ warehouseLog, suppliers, onDeleteEntry, onUpdateWarehouseEntry, onRegisterEntry, onRegisterWithdrawal }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saída'>('all');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [editingLog, setEditingLog] = useState<WarehouseMovement | null>(null);

    const availableMonths = useMemo(() => {
        const months = new Set<string>();
        warehouseLog.forEach(log => {
            const dateStr = log.date || log.timestamp?.split('T')[0];
            if (dateStr) {
                const d = new Date(dateStr + 'T00:00:00');
                if (!isNaN(d.getTime())) {
                    months.add(`${d.getFullYear()}-${d.getMonth()}`);
                }
            }
        });
        return Array.from(months).sort((a, b) => {
            const [yA, mA] = a.split('-').map(Number);
            const [yB, mB] = b.split('-').map(Number);
            return (yB * 12 + mB) - (yA * 12 + mA);
        });
    }, [warehouseLog]);

    const [activeMonthTab, setActiveMonthTab] = useState<string>(() => {
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
        return availableMonths.includes(currentMonthKey) ? currentMonthKey : (availableMonths[0] || currentMonthKey);
    });

    const [prevAvailableMonths, setPrevAvailableMonths] = useState(availableMonths);
    if (availableMonths !== prevAvailableMonths) {
        setPrevAvailableMonths(availableMonths);
        if (availableMonths.length > 0 && !availableMonths.includes(activeMonthTab)) {
            setActiveMonthTab(availableMonths[0]);
        }
    }

    // Confirmation Modal State
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

    const topScrollRef = React.useRef<HTMLDivElement>(null);
    const bottomScrollRef = React.useRef<HTMLDivElement>(null);
    const tableRef = React.useRef<HTMLTableElement>(null);

    React.useEffect(() => {
        const topScroll = topScrollRef.current;
        const bottomScroll = bottomScrollRef.current;

        if (!topScroll || !bottomScroll) return;

        const handleTopScroll = () => {
            bottomScroll.scrollLeft = topScroll.scrollLeft;
        };

        const handleBottomScroll = () => {
            topScroll.scrollLeft = bottomScroll.scrollLeft;
        };

        topScroll.addEventListener('scroll', handleTopScroll);
        bottomScroll.addEventListener('scroll', handleBottomScroll);

        return () => {
            topScroll.removeEventListener('scroll', handleTopScroll);
            bottomScroll.removeEventListener('scroll', handleBottomScroll);
        };
    }, []);

    const filteredLog = useMemo(() => {
        return warehouseLog
            .filter(log => {
                const dateStr = log.date || log.timestamp?.split('T')[0];
                const logDate = new Date(dateStr + 'T00:00:00');
                const monthKey = `${logDate.getFullYear()}-${logDate.getMonth()}`;
                const matchesMonth = monthKey === activeMonthTab;

                const typeMatch = filterType === 'all' || log.type === filterType;
                const searchMatch = searchTerm === '' ||
                    log.itemName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.lotNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.barcode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.nlNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.pdNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.inboundInvoice || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    (log.outboundInvoice || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                    log.supplierName.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesMonth && typeMatch && searchMatch;
            })
            .sort((a, b) => {
                const dateA = new Date(a.date || a.timestamp).getTime();
                const dateB = new Date(b.date || b.timestamp).getTime();
                return dateB - dateA;
            });
    }, [warehouseLog, filterType, searchTerm, activeMonthTab]);

    React.useEffect(() => {
        const table = tableRef.current;
        const topScroll = topScrollRef.current;

        if (!table || !topScroll) return;

        const observer = new ResizeObserver(() => {
            const dummyDiv = topScroll.firstChild as HTMLDivElement;
            if (dummyDiv) {
                dummyDiv.style.width = `${table.offsetWidth}px`;
            }
        });

        observer.observe(table);

        return () => observer.disconnect();
    }, [filteredLog]);

    const handlePrintPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Relatório de Movimentações de Estoque</title>
                <style>
                    body { font-family: sans-serif; padding: 20px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { color: #333; font-size: 18px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .font-bold { font-weight: bold; }
                    .text-gray-500 { color: #6b7280; }
                    .text-xs { font-size: 10px; }
                    @media print {
                        @page { size: A4 landscape; margin: 10mm; }
                    }
                </style>
            </head>
            <body>
                <h1>Relatório de Movimentações de Estoque</h1>
                <p>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Data Doc.</th>
                            <th>Produto</th>
                            <th>Barras</th>
                            <th>Lote</th>
                            <th class="text-right">Quantidade</th>
                            <th>NF/Doc</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filteredLog.map(log => `
                            <tr>
                                <td>${log.type.toUpperCase()}</td>
                                <td>${(log.date || '').split('-').reverse().join('/')}</td>
                                <td>
                                    <div class="font-bold">${log.itemName}</div>
                                    <div class="text-xs text-gray-500">${log.supplierName}</div>
                                </td>
                                <td>${log.barcode || '-'}</td>
                                <td>${log.lotNumber}</td>
                                <td class="text-right font-bold">${(log.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg</td>
                                <td>${log.inboundInvoice || log.outboundInvoice || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                <script>
                    window.onload = () => {
                        window.print();
                        window.close();
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    // Lógica para o novo Painel de Validade (Shelf-Life)
    const validityAnalysis = useMemo(() => {
        return warehouseLog
            .filter(log => log.type === 'entrada' && log.date && log.expirationDate)
            .map(log => {
                const start = new Date(log.date + 'T00:00:00');
                const end = new Date(log.expirationDate + 'T00:00:00');
                const diffTime = end.getTime() - start.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                return {
                    ...log,
                    shelfLifeDays: diffDays
                };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 20); // Mostra os 20 mais recentes para análise
    }, [warehouseLog]);

    const handlePrintLabels = (logs: WarehouseMovement[]) => {
        const printWindow = window.open('', '_blank', 'width=800,height=800');
        if (!printWindow) return;

        const htmlContent = `
            <html>
            <head>
                <title>Etiquetas de Estoque</title>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <style>
                    @page { 
                        size: 100mm 50mm; 
                        margin: 0; 
                    }
                    @media print {
                        header, footer, .no-print { display: none !important; }
                        body { margin: 0; padding: 0; width: 100mm; height: 50mm; }
                        .label-card { border: none !important; box-shadow: none !important; page-break-after: always; }
                    }
                    body { 
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                        margin: 0; 
                        padding: 0; 
                        background: #f0f0f0; 
                    }
                    .no-print {
                        background: #1e1b4b;
                        color: white;
                        padding: 10px 20px;
                        text-align: center;
                        position: sticky;
                        top: 0;
                        z-index: 100;
                        display: flex;
                        justify-content: center;
                        gap: 10px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .no-print button {
                        background: #fbbf24;
                        color: #1e1b4b;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-weight: bold;
                        cursor: pointer;
                        text-transform: uppercase;
                        font-size: 12px;
                    }
                    .page-container { 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        padding: 20px;
                        gap: 20px;
                    }
                    @media print {
                        .page-container { padding: 0; gap: 0; display: block; }
                        body { background: white; }
                    }
                    .label-card {
                        width: 100mm; 
                        height: 50mm; 
                        padding: 4mm;
                        box-sizing: border-box; 
                        background: white;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        position: relative; 
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                    }
                    h1 { 
                        font-size: 9pt; 
                        font-weight: 800; 
                        margin: 0 0 1mm 0; 
                        text-transform: uppercase; 
                        line-height: 1.1;
                        color: #000;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                    }
                    h2 { 
                        font-size: 7.5pt; 
                        margin: 0 0 1.5mm 0; 
                        color: #333; 
                        border-bottom: 1px solid #000; 
                        padding-bottom: 1mm; 
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        font-weight: 600;
                    }
                    .info { 
                        text-align: left; 
                        font-size: 7.5pt; 
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-start;
                    }
                    .info p { 
                        margin: 0.5mm 0; 
                        display: flex; 
                        justify-content: space-between; 
                        border-bottom: 0.5px dashed #ccc; 
                        line-height: 1.1;
                    }
                    .info strong { 
                        font-size: 6.5pt; 
                        color: #555; 
                        text-transform: uppercase;
                    }
                    .info span {
                        font-weight: 700;
                        color: #000;
                    }
                    .barcode-container { 
                        margin-top: auto; 
                        display: flex; 
                        flex-direction: column; 
                        align-items: center; 
                        justify-content: center;
                    }
                    .barcode-svg { 
                        max-width: 90%; 
                        height: 14mm !important; 
                    }
                </style>
            </head>
            <body>
                <div class="no-print">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-weight: bold; font-size: 14px;">Configuração de Impressão (100x50mm)</span>
                        <button onclick="window.print()">Imprimir Etiquetas</button>
                        <button onclick="window.close()" style="background: #ef4444; color: white;">Fechar</button>
                    </div>
                </div>
                <div class="page-container">
                    ${logs.map((log, index) => `
                        <div class="label-card">
                            <h1>${log.itemName}</h1>
                            <h2>${log.supplierName || 'FORNECEDOR NÃO INFORMADO'}</h2>
                            <div class="info">
                                <p><strong>LOTE:</strong> <span>${log.lotNumber}</span></p>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
                                    <p><strong>VAL:</strong> <span>${log.expirationDate ? log.expirationDate.split('-').reverse().join('/') : 'N/A'}</span></p>
                                    <p><strong>ENT:</strong> <span>${log.date ? log.date.split('-').reverse().join('/') : 'N/A'}</span></p>
                                </div>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4mm;">
                                    <p><strong>QTD:</strong> <span>${Number(log.quantity).toFixed(2).replace('.', ',')} kg</span></p>
                                    <p><strong>NF:</strong> <span>${log.inboundInvoice || log.outboundInvoice || 'N/A'}</span></p>
                                </div>
                            </div>
                            <div class="barcode-container">
                                ${log.barcode ? `<svg id="barcode-${index}" class="barcode-svg"></svg>` : '<p style="font-size: 7pt; color: #999; margin: 0;">SEM CÓDIGO DE BARRAS</p>'}
                            </div>
                        </div>
                    `).join('')}
                </div>

                <script>
                    window.onload = function() {
                        ${logs.map((log, index) => log.barcode ? `
                            try {
                                JsBarcode("#barcode-${index}", "${log.barcode}", {
                                    format: "CODE128", 
                                    width: 1.2, 
                                    height: 40, 
                                    displayValue: false, 
                                    margin: 0,
                                    background: "transparent"
                                });
                            } catch (e) { console.error(e); }
                        ` : '').join('')}
                        setTimeout(() => { window.print(); }, 1000);
                    }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrintLabel = (log: WarehouseMovement) => {
        handlePrintLabels([log]);
    };

    const handleDelete = async (log: WarehouseMovement) => {
        const msg = log.type === 'entrada' 
            ? 'Excluir esta entrada? O lote será removido e o saldo voltará ao contrato.' 
            : 'Excluir esta saída? A quantidade voltará ao saldo do lote atual.';
            
        setConfirmConfig({
            isOpen: true,
            title: 'Confirmar Exclusão',
            message: msg,
            variant: 'danger',
            onConfirm: async () => {
                setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                setIsDeleting(log.id);
                const result = await onDeleteEntry(log);
                setIsDeleting(null);
                if (!result.success) {
                    alert(`Erro ao excluir: ${result.message}`);
                }
            }
        });
    };

    return (
        <div className="bg-white p-3 md:p-5 rounded-[2rem] shadow-sm max-w-full mx-auto animate-fade-in space-y-6">
            
            {/* CABEÇALHO E FILTROS */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-4 border-b border-gray-50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Histórico de Estoque</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic leading-none mt-1">Gerenciamento de movimentações e lançamentos</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button 
                            onClick={() => setIsManualModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-1.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-tighter text-[9px] flex items-center gap-1.5 italic"
                        >
                            <Plus className="h-3 w-3" />
                            Novo Lançamento
                        </button>
                        <button 
                            onClick={() => handlePrintLabels(filteredLog)}
                            disabled={filteredLog.length === 0}
                            className="bg-amber-500 hover:bg-amber-600 text-white font-black py-1.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-tighter text-[9px] flex items-center gap-1.5 italic disabled:bg-gray-200"
                        >
                            <Printer className="h-3 w-3" />
                            Imprimir Etiquetas
                        </button>
                        <button 
                            onClick={handlePrintPDF}
                            className="bg-zinc-800 hover:bg-black text-white font-black py-1.5 px-4 rounded-xl transition-all shadow-sm active:scale-95 uppercase tracking-tighter text-[9px] flex items-center gap-1.5 italic"
                        >
                            <FileIcon className="h-3 w-3" />
                            Exportar PDF
                        </button>
                    </div>
                </div>

                {/* Sub-abas de meses */}
                {availableMonths.length > 0 && (
                    <div className="flex overflow-x-auto pb-1 gap-1 custom-scrollbar scrollbar-hide">
                        {availableMonths.map(monthKey => {
                            const [year, month] = monthKey.split('-').map(Number);
                            const label = `${monthNamesInOrder[month]} / ${year}`;
                            const isActive = activeMonthTab === monthKey;
                            return (
                                <button
                                    key={monthKey}
                                    onClick={() => setActiveMonthTab(monthKey)}
                                    className={`whitespace-nowrap px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all italic border-2 ${
                                        isActive 
                                        ? 'bg-zinc-900 text-white border-zinc-900 shadow-md scale-105 z-10' 
                                        : 'bg-white text-zinc-400 border-zinc-50 hover:bg-zinc-50 hover:text-zinc-600'
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div className="relative w-full sm:w-80 group">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-indigo-500 transition-colors">
                            <Search className="h-3 w-3" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Pesquisar (Nome, Lote, Código de Barras)..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            className="w-full bg-gray-50/50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-[10px] outline-none focus:ring-4 focus:ring-indigo-50/50 transition-all font-bold placeholder:text-gray-300 italic" 
                        />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                        <button 
                            onClick={() => setFilterType('all')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'all' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
                        >
                            Tudo
                        </button>
                        <button 
                            onClick={() => setFilterType('entrada')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-zinc-400 hover:text-green-500'}`}
                        >
                            Entradas
                        </button>
                        <button 
                            onClick={() => setFilterType('saída')} 
                            className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all italic ${filterType === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-zinc-400 hover:text-red-500'}`}
                        >
                            Saídas
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div 
                        ref={topScrollRef} 
                        className="overflow-x-auto overflow-y-hidden custom-scrollbar border-b border-gray-50" 
                        style={{ height: '8px' }}
                    >
                        <div style={{ height: '1px' }}></div>
                    </div>
                    <div ref={bottomScrollRef} className="overflow-x-auto max-h-[50vh] custom-scrollbar scrollbar-thin scrollbar-thumb-gray-200">
                        <table ref={tableRef} className="w-full text-[10px] border-separate border-spacing-0">
                            <thead className="bg-gray-50/80 backdrop-blur-md sticky top-0 z-10">
                            <tr className="italic">
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Tipo</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100 whitespace-nowrap">Data Doc.</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Produto / Origem</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Cód. Barras</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Lote</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Validade</th>
                                <th className="p-3 text-right font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Quantidade</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">NF / REQ</th>
                                <th className="p-3 text-left font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">NL / PD</th>
                                <th className="p-3 text-center font-black uppercase text-gray-400 tracking-tighter border-b border-gray-100">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredLog.map(log => (
                                <tr key={log.id} className={`hover:bg-indigo-50/30 transition-colors group ${(!log.nlNumber || !log.pdNumber) ? 'bg-red-50/40' : ''}`}>
                                    <td className="p-2 pl-3">
                                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase italic ${log.type === 'entrada' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{log.type}</span>
                                    </td>
                                    <td className="p-2 font-mono text-indigo-700 text-[10px] font-black">{(log.date || '').split('-').reverse().join('/')}</td>
                                    <td className="p-2">
                                        <p className="font-black text-gray-900 uppercase leading-none">{log.itemName}</p>
                                        <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{log.supplierName}</p>
                                    </td>
                                    <td className="p-2 font-mono text-[10px] text-blue-600 font-black tracking-tighter">{log.barcode || '-'}</td>
                                    <td className="p-2 font-mono text-[10px] uppercase font-bold text-gray-500">{log.lotNumber || '-'}</td>
                                    <td className="p-2 font-mono text-[10px] uppercase font-bold text-gray-400">
                                        {log.expirationDate ? log.expirationDate.split('-').reverse().join('/') : '-'}
                                    </td>
                                    <td className="p-2 text-right font-mono font-black text-gray-900 bg-gray-50/30 group-hover:bg-transparent">
                                        {(log.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
                                    </td>
                                    <td className="p-2 font-mono text-[10px] text-gray-400 font-bold italic">{log.inboundInvoice || log.outboundInvoice || '-'}</td>
                                    <td className={`p-2 font-mono text-[10px] font-black italic ${(!log.nlNumber || !log.pdNumber) ? 'text-red-600 bg-red-50' : 'text-gray-400'}`}>
                                        {log.nlNumber || 'S/ NL'} / {log.pdNumber || 'S/ PD'}
                                    </td>
                                    <td className="p-2 text-center">
                                        <div className="flex justify-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handlePrintLabel(log)}
                                                className="text-gray-400 hover:text-amber-500 hover:bg-amber-50 p-1.5 rounded-lg transition-all"
                                                title="Imprimir Etiqueta"
                                            >
                                                <Printer className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => setEditingLog(log)}
                                                className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-all"
                                                title="Editar Registro"
                                            >
                                                <Edit2 className="h-3.5 w-3.5" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(log)} 
                                                disabled={isDeleting === log.id}
                                                className="text-gray-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-lg transition-all disabled:opacity-50"
                                                title="Excluir Registro"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredLog.length === 0 && (
                                <tr><td colSpan={8} className="p-16 text-center text-gray-200 italic font-black uppercase tracking-[0.2em] text-[10px]">Sem registros para este filtro</td></tr>
                            )}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>

            {/* MONITORAMENTO DE PRAZO DE VALIDADE */}
            <div className="pt-8 border-t border-gray-50">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-amber-50 text-amber-500 p-2 rounded-[1.2rem]">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic leading-none">Análise de Shelf-Life</h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Monitoramento de Validade das Entradas</p>
                    </div>
                </div>

                <div className="flex overflow-x-auto pb-4 gap-3 scrollbar-hide">
                    {validityAnalysis.length > 0 ? validityAnalysis.map(item => (
                        <div key={`shelf-${item.id}`} className="min-w-[200px] bg-white p-4 rounded-[1.5rem] border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-all group shrink-0 italic">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-[8px] font-black bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg uppercase italic">Entrada</span>
                                    <div className={`px-2 py-0.5 rounded-lg text-white font-black text-[8px] uppercase tracking-tighter italic ${
                                        item.shelfLifeDays > 180 ? 'bg-green-900 border border-green-700' : 
                                        item.shelfLifeDays > 30 ? 'bg-green-600' : 
                                        item.shelfLifeDays > 15 ? 'bg-amber-500' : 
                                        'bg-rose-600'
                                    }`}>
                                        Prazo: {item.shelfLifeDays} dias
                                    </div>
                                </div>
                                <div>
                                    <p className="font-black text-xs text-gray-900 leading-none truncate uppercase">{item.itemName}</p>
                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-widest mt-1 truncate">{item.supplierName}</p>
                                </div>
                            </div>
                            <div className="mt-4 pt-2 border-t border-gray-50 flex justify-between items-end">
                                <div>
                                    <p className="text-[7px] text-gray-400 font-black uppercase">Validade</p>
                                    <p className="font-black text-[9px] text-gray-700">{(item.expirationDate || '').split('-').reverse().join('/')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[7px] text-gray-400 font-black uppercase">Qtd</p>
                                    <p className="font-black text-[9px] text-zinc-900">{(item.quantity || 0).toFixed(2)} kg</p>
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="w-full text-center py-8 text-gray-300 font-black uppercase text-[10px] italic tracking-widest">Aguardando dados de análise...</div>
                    )}
                </div>
            </div>

            {isManualModalOpen && (
                <ManualWarehouseMovementModal 
                    suppliers={suppliers} 
                    onClose={() => setIsManualModalOpen(false)} 
                    onSave={async (type, payload) => {
                        const res = type === 'entrada' ? await onRegisterEntry(payload) : await onRegisterWithdrawal(payload);
                        if (res.success) setIsManualModalOpen(false);
                        else alert(res.message);
                    }}
                />
            )}

            {editingLog && (
                <EditWarehouseMovementModal 
                    suppliers={suppliers} 
                    logEntry={editingLog}
                    onClose={() => setEditingLog(null)}
                    onPrint={handlePrintLabel}
                    onSave={async (updated) => {
                        const res = await onUpdateWarehouseEntry(updated);
                        if (res.success) setEditingLog(null);
                        else alert(res.message);
                    }}
                />
            )}

            <ConfirmModal
                isOpen={confirmConfig.isOpen}
                title={confirmConfig.title}
                message={confirmConfig.message}
                onConfirm={confirmConfig.onConfirm}
                onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
                variant={confirmConfig.variant}
            />

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 6px; }`}</style>
        </div>
    );
};

// --- Modal de Edição de Registro ---
interface EditWarehouseMovementModalProps {
    suppliers: Supplier[];
    logEntry: WarehouseMovement;
    onClose: () => void;
    onPrint: (log: WarehouseMovement) => void;
    onSave: (updated: WarehouseMovement) => Promise<void>;
}

const EditWarehouseMovementModal: React.FC<EditWarehouseMovementModalProps> = ({ suppliers, logEntry, onClose, onPrint, onSave }) => {
    const [type, setType] = useState<'entrada' | 'saída'>((logEntry.type === 'saida' || logEntry.type === 'saída') ? 'saída' : 'entrada');
    const [selectedCpf, setSelectedCpf] = useState(() => {
        const found = suppliers.find(s => superNormalize(s.name) === superNormalize(logEntry.supplierName));
        return found ? found.cpf : '';
    });
    const [itemName, setItemName] = useState(logEntry.itemName);
    const [lotNumber, setLotNumber] = useState(logEntry.lotNumber);
    const [barcode, setBarcode] = useState(logEntry.barcode || '');
    const [quantity, setQuantity] = useState(String(logEntry.quantity || 0).replace('.', ','));
    const [documentNumber, setDocumentNumber] = useState(logEntry.inboundInvoice || logEntry.outboundInvoice || '');
    const [date, setDate] = useState(logEntry.date || '');
    const [expirationDate, setExpirationDate] = useState(logEntry.expirationDate || '');
    const [nlNumber, setNlNumber] = useState(logEntry.nlNumber || '');
    const [pdNumber, setPdNumber] = useState(logEntry.pdNumber || '');
    const [value, setValue] = useState(String(logEntry.value || 0).replace('.', ','));
    const [weight, setWeight] = useState(String(logEntry.weight || 0).replace('.', ','));
    const [isSaving, setIsSaving] = useState(false);

    const selectedSupplier = useMemo(() => suppliers.find(s => s.cpf === selectedCpf), [suppliers, selectedCpf]);
    const availableItems = useMemo(() => selectedSupplier ? (Object.values(selectedSupplier.contractItems || {}) as any[]).sort((a,b) => a.name.localeCompare(b.name)) : [], [selectedSupplier]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qtyVal = parseFloat(quantity.replace(',', '.'));
        if (!selectedCpf || !itemName || isNaN(qtyVal) || qtyVal <= 0) {
            alert('Preencha todos os campos obrigatórios corretamente.');
            return;
        }

        setIsSaving(true);
        const updated: WarehouseMovement = {
            ...logEntry,
            type,
            date,
            lotNumber,
            itemName,
            barcode,
            supplierName: selectedSupplier?.name || logEntry.supplierName,
            quantity: qtyVal,
            inboundInvoice: type === 'entrada' ? documentNumber : '',
            outboundInvoice: type === 'saída' ? documentNumber : '',
            expirationDate,
            nlNumber,
            pdNumber,
            value: parseFloat(value.replace(',', '.')) || 0,
            weight: parseFloat(weight.replace(',', '.')) || qtyVal
        };

        await onSave(updated);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[200] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-blue-800 uppercase tracking-tighter">Editar Registro de Estoque</h2>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">ID do Registro: {logEntry.id}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl font-light">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button type="button" onClick={() => setType('entrada')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}>Entrada</button>
                        <button type="button" onClick={() => setType('saída')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}>Saída</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fornecedor</label>
                            <select value={selectedCpf} onChange={e => { setSelectedCpf(e.target.value); setItemName(''); }} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white" required>
                                <option value="">-- SELECIONE --</option>
                                {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Item do Contrato</label>
                            <select value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400 bg-white" required disabled={!selectedCpf}>
                                <option value="">-- SELECIONE --</option>
                                {availableItems.map(ci => <option key={ci.name} value={ci.name}>{ci.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Código de Barras</label>
                            <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} className="w-full p-2 border-2 border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-600 uppercase ml-1">Data do Documento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border-2 border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 bg-indigo-50/30" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">NF/Documento</label>
                            <input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Lote</label>
                            <input type="text" value={lotNumber} onChange={e => setLotNumber(e.target.value.toUpperCase())} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-mono" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quantidade (kg)</label>
                            <input type="text" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-mono" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data de Validade</label>
                            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-400" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-rose-600 uppercase ml-1">NL (Nota Lançamento)</label>
                            <input type="text" value={nlNumber} onChange={e => setNlNumber(e.target.value.toUpperCase())} className="w-full p-2 border-2 border-rose-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-rose-600 uppercase ml-1">PD (Parecer Despesa)</label>
                            <input type="text" value={pdNumber} onChange={e => setPdNumber(e.target.value.toUpperCase())} className="w-full p-2 border-2 border-rose-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase ml-1">Valor Unitário / Total</label>
                            <input type="text" value={value} onChange={e => setValue(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full p-2 border-2 border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400 font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-amber-600 uppercase ml-1">Peso Bruto</label>
                            <input type="text" value={weight} onChange={e => setWeight(e.target.value.replace(/[^0-9,]/g, ''))} className="w-full p-2 border-2 border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 font-mono" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Cancelar</button>
                        <button 
                            type="button"
                            onClick={() => onPrint(logEntry)}
                            className="bg-indigo-100 text-indigo-700 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all hover:bg-indigo-200 flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            Imprimir Etiqueta
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving || !selectedCpf || !itemName} 
                            className="px-10 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-300"
                        >
                            {isSaving ? 'Salvando...' : 'Atualizar Registro'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Modal de Movimentação Manual ---
interface ManualWarehouseMovementModalProps {
    suppliers: Supplier[];
    onClose: () => void;
    onSave: (type: 'entrada' | 'saída', payload: any) => Promise<void>;
}

const ManualWarehouseMovementModal: React.FC<ManualWarehouseMovementModalProps> = ({ suppliers, onClose, onSave }) => {
    const [type, setType] = useState<'entrada' | 'saída'>('entrada');
    const [selectedCpf, setSelectedCpf] = useState('');
    const [itemName, setItemName] = useState('');
    const [lotNumber, setLotNumber] = useState('');
    const [barcode, setBarcode] = useState('');
    const [quantity, setQuantity] = useState('');
    const [documentNumber, setDocumentNumber] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [expirationDate, setExpirationDate] = useState('');
    const [nlNumber, setNlNumber] = useState('');
    const [pdNumber, setPdNumber] = useState('');
    const [value, setValue] = useState('');
    const [weight, setWeight] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const selectedSupplier = useMemo(() => suppliers.find(s => s.cpf === selectedCpf), [suppliers, selectedCpf]);
    const availableItems = useMemo(() => {
        if (selectedSupplier) {
            return (Object.values(selectedSupplier.contractItems || {}) as any[]).sort((a,b) => a.name.localeCompare(b.name));
        }
        // If no supplier selected, show all items from all suppliers
        const allItems: any[] = [];
        const seen = new Set<string>();
        suppliers.forEach(s => {
            (Object.values(s.contractItems || {}) as any[]).forEach(ci => {
                if (!seen.has(ci.name)) {
                    allItems.push(ci);
                    seen.add(ci.name);
                }
            });
        });
        return allItems.sort((a,b) => a.name.localeCompare(b.name));
    }, [selectedSupplier, suppliers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const qtyVal = parseFloat(quantity.replace(',', '.'));
        if (!selectedCpf || !itemName || isNaN(qtyVal) || qtyVal <= 0) {
            alert('Por favor, preencha todos os campos obrigatórios corretamente.');
            return;
        }

        setIsSaving(true);
        const val = parseFloat(value.replace(',', '.')) || 0;
        const wgt = parseFloat(weight.replace(',', '.')) || qtyVal;

        const payload = type === 'entrada' ? {
            supplierCpf: selectedCpf,
            itemName: itemName,
            invoiceNumber: documentNumber,
            invoiceDate: date,
            lotNumber: lotNumber || 'MANUAL',
            barcode: barcode,
            quantity: qtyVal,
            expirationDate: expirationDate,
            nlNumber,
            pdNumber,
            value: val,
            weight: wgt
        } : {
            supplierCpf: selectedCpf,
            itemName: itemName,
            lotNumber: lotNumber || 'MANUAL',
            barcode: barcode,
            quantity: qtyVal,
            outboundInvoice: documentNumber,
            expirationDate: expirationDate,
            date: date,
            nlNumber,
            pdNumber,
            value: val,
            weight: wgt
        };

        await onSave(type, payload);
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fade-in-up">
                <div className="flex justify-between items-center mb-6 border-b pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Movimentação Manual de Estoque</h2>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Registrar entrada ou saída retroativa</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-3xl font-light">&times;</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button 
                            type="button" 
                            onClick={() => setType('entrada')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'entrada' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            Entrada de Estoque
                        </button>
                        <button 
                            type="button" 
                            onClick={() => setType('saída')}
                            className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${type === 'saída' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-400'}`}
                        >
                            Saída de Estoque
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Fornecedor</label>
                            <select value={selectedCpf} onChange={e => { setSelectedCpf(e.target.value); setItemName(''); }} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 bg-white" required>
                                <option value="">-- SELECIONE O FORNECEDOR --</option>
                                {suppliers.map(s => <option key={s.cpf} value={s.cpf}>{s.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Item do Contrato</label>
                            <select value={itemName} onChange={e => setItemName(e.target.value)} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 bg-white" required disabled={!selectedCpf}>
                                <option value="">-- SELECIONE O ITEM --</option>
                                {availableItems.map(ci => <option key={ci.name} value={ci.name}>{ci.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Código de Barras (Bipar)</label>
                            <input type="text" value={barcode} onChange={e => setBarcode(e.target.value)} placeholder="Bipar Código" className="w-full p-2 border-2 border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-400 font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-indigo-600 uppercase ml-1">Data do Documento</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-2 border-2 border-indigo-100 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-bold bg-indigo-50/50" required />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Nº NF ou Documento</label>
                            <input type="text" value={documentNumber} onChange={e => setDocumentNumber(e.target.value)} placeholder="000123" className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Número do Lote</label>
                            <input type="text" value={lotNumber} onChange={e => setLotNumber(e.target.value.toUpperCase())} placeholder="LOTE123" className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-mono" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quantidade (kg)</label>
                            <input type="text" value={quantity} onChange={e => setQuantity(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00" className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 font-mono" required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Data de Validade</label>
                            <input type="date" value={expirationDate} onChange={e => setExpirationDate(e.target.value)} className="w-full p-2 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
                        </div>

                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-rose-600 uppercase ml-1">Nota de Lançamento (NL)</label>
                            <input type="text" value={nlNumber} onChange={e => setNlNumber(e.target.value.toUpperCase())} placeholder="NL 000" className="w-full p-2 border-2 border-rose-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-rose-600 uppercase ml-1">Parecer de Despesa (PD)</label>
                            <input type="text" value={pdNumber} onChange={e => setPdNumber(e.target.value.toUpperCase())} placeholder="PD 000" className="w-full p-2 border-2 border-rose-100 rounded-xl outline-none focus:ring-2 focus:ring-rose-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase ml-1">Valor Unitário / Total</label>
                            <input type="text" value={value} onChange={e => setValue(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="R$ 0,00" className="w-full p-2 border-2 border-emerald-100 rounded-xl outline-none focus:ring-2 focus:ring-emerald-400" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-amber-600 uppercase ml-1">Peso Bruto</label>
                            <input type="text" value={weight} onChange={e => setWeight(e.target.value.replace(/[^0-9,.]/g, ''))} placeholder="0,00 kg" className="w-full p-2 border-2 border-amber-100 rounded-xl outline-none focus:ring-2 focus:ring-amber-400" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-700 px-8 py-3 rounded-xl font-bold uppercase tracking-widest text-xs transition-colors">Cancelar</button>
                        <button 
                            type="submit" 
                            disabled={isSaving || !selectedCpf || !itemName} 
                            className={`px-10 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95 disabled:bg-gray-300 text-white ${type === 'entrada' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {isSaving ? 'Processando...' : `Confirmar ${type}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminWarehouseLog;
