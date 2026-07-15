import React, { useState, useMemo } from 'react';
import { Plus, Search, Printer, X, Trash2, Pencil, Check, AlertTriangle, Calendar, Clock, ArrowRight, User, Info, CheckCircle2 } from 'lucide-react';
import type { SegregationLog } from '../types';

interface SegregationTabContentProps {
    logs: SegregationLog[];
    onRegister?: (log: Omit<SegregationLog, 'id'>) => Promise<{ success: boolean; message: string }>;
    onUpdate?: (log: SegregationLog) => Promise<{ success: boolean; message: string }>;
    onDelete?: (id: string) => Promise<any>;
    currentUser?: { name: string; cpf: string; role: string };
}

const UNITS = ['UN', 'KG', 'CX', 'PCT', 'L', 'GL', 'FD', 'MT', 'PC'];

export const SegregationTabContent: React.FC<SegregationTabContentProps> = ({
    logs = [],
    onRegister,
    onUpdate,
    onDelete,
    currentUser
}) => {
    // State management
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'SEGREGADO' | 'LIBERADO'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isExitModalOpen, setIsExitModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Selected log for edit / exit registration
    const [selectedLog, setSelectedLog] = useState<SegregationLog | null>(null);

    // Form states
    const [productName, setProductName] = useState('');
    const [quantity, setQuantity] = useState<number | ''>('');
    const [unit, setUnit] = useState('UN');
    const [reason, setReason] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
    const [entryTime, setEntryTime] = useState(new Date().toTimeString().slice(0, 5));
    const [responsibleName, setResponsibleName] = useState(currentUser?.name || '');
    const [observations, setObservations] = useState('');

    // Exit form states
    const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
    const [exitTime, setExitTime] = useState(new Date().toTimeString().slice(0, 5));
    const [exitObservations, setExitObservations] = useState('');

    // Filtered logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchesSearch = 
                log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (log.responsibleName && log.responsibleName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (log.observations && log.observations.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;

            let matchesDate = true;
            if (startDate) {
                matchesDate = matchesDate && log.entryDate >= startDate;
            }
            if (endDate) {
                matchesDate = matchesDate && log.entryDate <= endDate;
            }

            return matchesSearch && matchesStatus && matchesDate;
        }).sort((a, b) => {
            // Sort by entry date and time descending
            const dateA = `${a.entryDate}T${a.entryTime}`;
            const dateB = `${b.entryDate}T${b.entryTime}`;
            return dateB.localeCompare(dateA);
        });
    }, [logs, searchTerm, statusFilter, startDate, endDate]);

    // Handlers
    const resetForm = () => {
        setProductName('');
        setQuantity('');
        setUnit('UN');
        setReason('');
        setEntryDate(new Date().toISOString().split('T')[0]);
        setEntryTime(new Date().toTimeString().slice(0, 5));
        setResponsibleName(currentUser?.name || '');
        setObservations('');
        setSelectedLog(null);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!productName || !reason || !entryDate || !entryTime) {
            alert('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        const payload: Omit<SegregationLog, 'id'> = {
            productName,
            quantity: quantity !== '' ? Number(quantity) : undefined,
            unit,
            reason,
            entryDate,
            entryTime,
            status: 'SEGREGADO',
            responsibleName,
            observations
        };

        if (onRegister) {
            const res = await onRegister(payload);
            if (res.success) {
                setIsCreateModalOpen(false);
                resetForm();
            } else {
                alert(res.message || 'Erro ao registrar item segregado.');
            }
        }
    };

    const handleOpenExitModal = (log: SegregationLog) => {
        setSelectedLog(log);
        setExitDate(new Date().toISOString().split('T')[0]);
        setExitTime(new Date().toTimeString().slice(0, 5));
        setExitObservations('');
        setIsExitModalOpen(true);
    };

    const handleExitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLog) return;
        if (!exitDate || !exitTime) {
            alert('Por favor, informe a data e hora de saída.');
            return;
        }

        const updated: SegregationLog = {
            ...selectedLog,
            status: 'LIBERADO',
            exitDate,
            exitTime,
            observations: exitObservations 
                ? `${selectedLog.observations || ''}\n[SAÍDA: ${exitObservations}]`.trim()
                : selectedLog.observations
        };

        if (onUpdate) {
            const res = await onUpdate(updated);
            if (res.success) {
                setIsExitModalOpen(false);
                setSelectedLog(null);
            } else {
                alert(res.message || 'Erro ao registrar saída do item.');
            }
        }
    };

    const handleOpenEditModal = (log: SegregationLog) => {
        setSelectedLog(log);
        setProductName(log.productName);
        setQuantity(log.quantity !== undefined ? log.quantity : '');
        setUnit(log.unit || 'UN');
        setReason(log.reason);
        setEntryDate(log.entryDate);
        setEntryTime(log.entryTime);
        setResponsibleName(log.responsibleName || '');
        setObservations(log.observations || '');
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLog) return;
        if (!productName || !reason) {
            alert('Por favor, preencha os campos obrigatórios.');
            return;
        }

        const updated: SegregationLog = {
            ...selectedLog,
            productName,
            quantity: quantity !== '' ? Number(quantity) : undefined,
            unit,
            reason,
            entryDate,
            entryTime,
            responsibleName,
            observations
        };

        if (onUpdate) {
            const res = await onUpdate(updated);
            if (res.success) {
                setIsEditModalOpen(false);
                resetForm();
            } else {
                alert(res.message || 'Erro ao atualizar item.');
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir permanentemente este registro de segregação?')) {
            return;
        }

        if (onDelete) {
            await onDelete(id);
        }
    };

    // Print / PDF generator
    const handlePrintReport = () => {
        try {
            const printContent = `
                <html>
                    <head>
                        <title>Relatório de Itens Segregados - Almoxarifado</title>
                        <style>
                            @page { 
                                size: A4 landscape; 
                                margin: 12mm; 
                            }
                            body { 
                                font-family: 'Inter', Arial, sans-serif; 
                                padding: 10px; 
                                color: #0f172a; 
                                line-height: 1.4; 
                                margin: 0;
                            }
                            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 11px; }
                            th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 10px; }
                            .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; }
                            .header-sap { font-size: 13px; margin-bottom: 3px; text-transform: uppercase; color: #475569; font-weight: bold; }
                            .header-unit { font-size: 16px; font-weight: bold; margin-bottom: 4px; color: #1e3a8a; }
                            .header-address { font-size: 9px; color: #64748b; }
                            .report-title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #0f172a; }
                            .badge {
                                display: inline-block;
                                padding: 3px 6px;
                                border-radius: 4px;
                                font-size: 9px;
                                font-weight: bold;
                                text-transform: uppercase;
                            }
                            .badge-seg { background-color: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
                            .badge-lib { background-color: #d1fae5; color: #065f46; border: 1px solid #6ee7b7; }
                            .footer { margin-top: 80px; display: flex; justify-content: space-around; }
                            .sig { border-top: 1px solid #0f172a; width: 250px; text-align: center; padding-top: 6px; font-size: 11px; font-weight: bold; color: #334155; }
                            .summary {
                                display: flex;
                                justify-content: space-between;
                                margin-top: 20px;
                                background-color: #f8fafc;
                                padding: 12px;
                                border-radius: 8px;
                                border: 1px solid #e2e8f0;
                                font-size: 11px;
                                font-weight: bold;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="header-sap">Secretaria da Administração Penitenciária</div>
                            <div class="header-unit">Polícia Penal - Penitenciária de Taiúva</div>
                            <div class="header-address">Rodovia Brigadeiro Faria Lima, SP 326, KM 359,6 Taiúva/SP - CEP: 14.720-000</div>
                        </div>

                        <div class="report-title">Relatório de Itens Segregados - Almoxarifado</div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 20%">Produto</th>
                                    <th style="width: 10%">Qtd/Unid</th>
                                    <th style="width: 12%">Data/Hora Entrada</th>
                                    <th style="width: 12%">Data/Hora Saída</th>
                                    <th style="width: 25%">Motivo da Segregação</th>
                                    <th style="width: 11%">Status</th>
                                    <th style="width: 10%">Responsável</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredLogs.map(log => `
                                    <tr>
                                        <td style="font-weight: bold;">${log.productName}</td>
                                        <td>${log.quantity !== undefined ? `${log.quantity} ${log.unit || 'UN'}` : '-'}</td>
                                        <td>${new Date(log.entryDate + 'T12:00:00').toLocaleDateString('pt-BR')} ${log.entryTime}</td>
                                        <td>${log.exitDate ? `${new Date(log.exitDate + 'T12:00:00').toLocaleDateString('pt-BR')} ${log.exitTime || ''}` : '<span style="color: #94a3b8; font-style: italic;">Não retirado</span>'}</td>
                                        <td>
                                            <strong>Motivo:</strong> ${log.reason}
                                            ${log.observations ? `<br><small style="color: #64748b;">Obs: ${log.observations.replace(/\n/g, '<br>')}</small>` : ''}
                                        </td>
                                        <td style="text-align: center;">
                                            <span class="badge ${log.status === 'SEGREGADO' ? 'badge-seg' : 'badge-lib'}">
                                                ${log.status}
                                            </span>
                                        </td>
                                        <td>${log.responsibleName || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>

                        <div class="summary">
                            <span>Total de Registros: ${filteredLogs.length}</span>
                            <span>Segregados: ${filteredLogs.filter(l => l.status === 'SEGREGADO').length}</span>
                            <span>Liberados/Retirados: ${filteredLogs.filter(l => l.status === 'LIBERADO').length}</span>
                        </div>

                        <div class="footer">
                            <div class="sig">
                                <br>
                                Responsável pelo Almoxarifado
                            </div>
                            <div class="sig">
                                <br>
                                Diretoria de Serviço
                            </div>
                        </div>
                        <script>
                            window.onload = function() {
                                window.print();
                                setTimeout(() => { window.close(); }, 500);
                            };
                        </script>
                    </body>
                </html>
            `;

            const win = window.open('', '_blank');
            if (win) {
                win.document.write(printContent);
                win.document.close();
            } else {
                alert('Pop-up bloqueado. Por favor, permita pop-ups para gerar o relatório.');
            }
        } catch (e) {
            console.error('Erro ao gerar relatório de segregação:', e);
            alert('Não foi possível gerar o relatório.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Control Dashboard Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 border border-slate-100 p-4 rounded-3xl" id="segregation-header">
                <div>
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
                        Segregação de Itens (Entradas e Saídas)
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Registre itens avariados, vencidos, sob suspeita ou separados com motivos detalhados</p>
                </div>
                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    <button
                        type="button"
                        id="btn-new-segregation"
                        onClick={() => {
                            resetForm();
                            setIsCreateModalOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-4 rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center gap-1.5 shadow-sm"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nova Segregação
                    </button>
                    <button
                        type="button"
                        id="btn-print-segregation"
                        onClick={handlePrintReport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2 px-4 rounded-xl uppercase tracking-wider text-[9px] transition-all flex items-center gap-1.5 shadow-sm"
                    >
                        <Printer className="h-3.5 w-3.5" />
                        Gerar PDF / Imprimir
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm" id="segregation-filters">
                <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Search className="h-4 w-4" />
                    </span>
                    <input
                        type="text"
                        placeholder="Buscar por produto, motivo, responsável..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-9 h-10 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700 placeholder:text-slate-400"
                    />
                </div>

                <div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                    >
                        <option value="ALL">TODOS OS STATUS</option>
                        <option value="SEGREGADO">SEGREGADO (ATIVO)</option>
                        <option value="LIBERADO">LIBERADO (CONCLUÍDO)</option>
                    </select>
                </div>

                <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">De</span>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                    />
                </div>

                <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Até</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                    />
                </div>
            </div>

            {/* List Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden" id="segregation-table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-100">
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center w-24">Entrada</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Produto</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center w-28">Quantidade</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400">Motivo / Detalhes</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center w-28">Status</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center w-28">Saída</th>
                                <th className="p-4 text-[10px] font-black uppercase text-slate-400 text-center w-28">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-12 text-center">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <Info className="h-8 w-8 text-slate-300" />
                                            <p className="text-xs font-black uppercase text-slate-400">Nenhum item segregado encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map(log => {
                                    return (
                                        <tr key={log.id} className="hover:bg-slate-50/50 border-b border-slate-100/50 last:border-none transition-colors">
                                            {/* Entry Timestamp */}
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <span className="text-xs font-black text-slate-700">
                                                        {log.entryDate ? new Date(log.entryDate + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                                                        <Clock className="h-3 w-3" />
                                                        {log.entryTime}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Product name */}
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-800 tracking-tight leading-tight">
                                                        {log.productName}
                                                    </span>
                                                    <span className="text-[9px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                                                        <User className="h-3 w-3" />
                                                        Resp: {log.responsibleName || 'Não especificado'}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Quantity / Unit */}
                                            <td className="p-4 text-center">
                                                {log.quantity !== undefined ? (
                                                    <span className="inline-block bg-slate-100 px-2.5 py-1 rounded-lg text-xs font-black text-slate-700">
                                                        {log.quantity} <span className="text-[9px] text-slate-500 font-semibold">{log.unit || 'UN'}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Reason and Observations */}
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <p className="text-xs text-slate-600 font-bold leading-relaxed">
                                                        {log.reason}
                                                    </p>
                                                    {log.observations && (
                                                        <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 max-w-md">
                                                            <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider block mb-0.5">Observações / Histórico</span>
                                                            <p className="text-[9px] text-slate-500 leading-normal font-semibold whitespace-pre-wrap">
                                                                {log.observations}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4 text-center">
                                                {log.status === 'SEGREGADO' ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-100 shadow-sm animate-pulse">
                                                        <AlertTriangle className="h-3 w-3 text-red-500" />
                                                        SEGREGADO
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        LIBERADO
                                                    </span>
                                                )}
                                            </td>

                                            {/* Exit Timestamp */}
                                            <td className="p-4 text-center">
                                                {log.exitDate ? (
                                                    <div className="flex flex-col items-center justify-center">
                                                        <span className="text-xs font-black text-slate-700">
                                                            {new Date(log.exitDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                                                            <Clock className="h-3 w-3" />
                                                            {log.exitTime || ''}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[9px] italic font-semibold text-slate-400 uppercase tracking-wider">Ativo</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    {log.status === 'SEGREGADO' && (
                                                        <button
                                                            type="button"
                                                            title="Registrar Saída"
                                                            onClick={() => handleOpenExitModal(log)}
                                                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-lg transition-all"
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                    <button
                                                        type="button"
                                                        title="Editar Informações"
                                                        onClick={() => handleOpenEditModal(log)}
                                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 border border-slate-200 rounded-lg transition-all"
                                                    >
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        title="Excluir"
                                                        onClick={() => handleDelete(log.id)}
                                                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-500 border border-red-100 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Register Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 bg-zinc-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-amber-500" />
                                <h4 className="text-sm font-black uppercase tracking-wider">Nova Segregação de Item</h4>
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Produto / Item *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Arroz Tipo 1 - Pacote 5kg"
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Quantidade</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        placeholder="Ex: 15"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Unidade</label>
                                    <select
                                        value={unit}
                                        onChange={e => setUnit(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    >
                                        {UNITS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Motivo da Segregação *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Descreva o motivo detalhado (ex: lata amassada, suspeita de contaminação, vencimento em data próxima...)"
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Entrada *</label>
                                    <input
                                        type="date"
                                        required
                                        value={entryDate}
                                        onChange={e => setEntryDate(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora de Entrada *</label>
                                    <input
                                        type="time"
                                        required
                                        value={entryTime}
                                        onChange={e => setEntryTime(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsável pelo Registro</label>
                                <input
                                    type="text"
                                    placeholder="Nome do servidor responsável"
                                    value={responsibleName}
                                    onChange={e => setResponsibleName(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações Adicionais</label>
                                <textarea
                                    rows={2}
                                    placeholder="Lote, número de NF ou outras anotações complementares..."
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs uppercase font-black tracking-wider hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs uppercase font-black tracking-wider shadow-md shadow-indigo-100 transition-all"
                                >
                                    Gravar Registro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Exit Registration Modal */}
            {isExitModalOpen && selectedLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-slate-100 bg-zinc-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Check className="h-5 w-5 text-emerald-500" />
                                <h4 className="text-sm font-black uppercase tracking-wider">Registrar Saída de Segregação</h4>
                            </div>
                            <button
                                onClick={() => setIsExitModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExitSubmit} className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-xs font-bold text-amber-800 space-y-1">
                                <span className="text-[10px] text-amber-500 uppercase block font-black">Item Segregado</span>
                                <p className="text-sm font-black text-slate-800">{selectedLog.productName}</p>
                                <p className="text-slate-500 mt-1 font-semibold">Qtd: {selectedLog.quantity !== undefined ? `${selectedLog.quantity} ${selectedLog.unit || 'UN'}` : 'Não informada'}</p>
                                <p className="text-slate-500 font-semibold">Motivo: {selectedLog.reason}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Saída *</label>
                                    <input
                                        type="date"
                                        required
                                        value={exitDate}
                                        onChange={e => setExitDate(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora de Saída *</label>
                                    <input
                                        type="time"
                                        required
                                        value={exitTime}
                                        onChange={e => setExitTime(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Destino / Observação de Saída *</label>
                                <textarea
                                    required
                                    rows={3}
                                    placeholder="Informe o destino do item (ex: descartado conforme ata, devolvido ao fornecedor com NF de devolução, liberado para uso...)"
                                    value={exitObservations}
                                    onChange={e => setExitObservations(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsExitModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs uppercase font-black tracking-wider hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs uppercase font-black tracking-wider shadow-md shadow-emerald-100 transition-all"
                                >
                                    Confirmar Saída
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && selectedLog && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in">
                    <div className="bg-white rounded-3xl w-full max-w-lg border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 bg-zinc-900 text-white flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Pencil className="h-4 w-4 text-amber-500" />
                                <h4 className="text-sm font-black uppercase tracking-wider">Editar Registro de Segregação</h4>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Produto / Item *</label>
                                <input
                                    type="text"
                                    required
                                    value={productName}
                                    onChange={e => setProductName(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Quantidade</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={quantity}
                                        onChange={e => setQuantity(e.target.value !== '' ? Number(e.target.value) : '')}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Unidade</label>
                                    <select
                                        value={unit}
                                        onChange={e => setUnit(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    >
                                        {UNITS.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Motivo da Segregação *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={reason}
                                    onChange={e => setReason(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Data de Entrada *</label>
                                    <input
                                        type="date"
                                        required
                                        value={entryDate}
                                        onChange={e => setEntryDate(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora de Entrada *</label>
                                    <input
                                        type="time"
                                        required
                                        value={entryTime}
                                        onChange={e => setEntryTime(e.target.value)}
                                        className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Responsável pelo Registro</label>
                                <input
                                    type="text"
                                    value={responsibleName}
                                    onChange={e => setResponsibleName(e.target.value)}
                                    className="w-full h-10 px-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observações Adicionais / Histórico</label>
                                <textarea
                                    rows={3}
                                    value={observations}
                                    onChange={e => setObservations(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-400 transition-all text-xs font-bold text-slate-700"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-500 rounded-xl text-xs uppercase font-black tracking-wider hover:bg-slate-50 transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs uppercase font-black tracking-wider shadow-md shadow-indigo-100 transition-all"
                                >
                                    Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
