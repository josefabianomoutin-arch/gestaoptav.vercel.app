import React, { useState, useMemo } from 'react';
import { Upload, Download, RefreshCw, Database, Package, Trash2, TrendingUp, BarChart as BarChartIcon } from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SynchronizationModuleProps {
    onSyncWithFirebase: (data: any[]) => Promise<boolean>;
}

const SynchronizationModule: React.FC<SynchronizationModuleProps> = ({ onSyncWithFirebase }) => {
    const [pendingEntries, setPendingEntries] = useState<any[]>(() => {
        const saved = localStorage.getItem('offline_warehouse_entries');
        return saved ? JSON.parse(saved) : [];
    });
    const [isProcessing, setIsProcessing] = useState(false);

    const [networkPath, setNetworkPath] = useState(() => 
        localStorage.getItem('warehouse_network_path') || ''
    );

    const metrics = useMemo(() => {
        const totalItems = pendingEntries.length;
        const totalWeight = pendingEntries.reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
        const entriesByType = pendingEntries.reduce((acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Agrupar por item para o gráfico
        const itemGroups = pendingEntries.reduce((acc, curr) => {
            const key = curr.itemName;
            acc[key] = (acc[key] || 0) + (parseFloat(curr.quantity) || 0);
            return acc;
        }, {} as Record<string, number>);

        const chartData = Object.entries(itemGroups).map(([name, weight]) => ({
            name,
            weight: Number(weight)
        })).sort((a, b) => (b.weight as number) - (a.weight as number)).slice(0, 8);

        return { totalItems, totalWeight, entriesByType, chartData };
    }, [pendingEntries]);

    const savePath = () => {
        localStorage.setItem('warehouse_network_path', networkPath);
        toast.info("Caminho da pasta de rede salvo!");
    };

    const handleExport = () => {
        if (pendingEntries.length === 0) {
            toast.error("Nenhum lançamento pendente para exportar!");
            return;
        }

        const dataStr = JSON.stringify(pendingEntries, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lancamentos_pendentes_${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        toast.success("Arquivo de sincronização gerado!");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                setIsProcessing(true);
                const success = await onSyncWithFirebase(data);
                if (success) {
                    toast.success("Dados sincronizados com o servidor com sucesso!");
                    localStorage.removeItem('offline_warehouse_entries');
                    setPendingEntries([]);
                } else {
                    toast.error("Erro ao sincronizar com o servidor.");
                }
            } catch (err) {
                toast.error("Erro ao ler arquivo de sincronização.");
            } finally {
                setIsProcessing(false);
            }
        };
        reader.readAsText(file);
    };

    const handleRemovePending = (index: number) => {
        const newList = [...pendingEntries];
        newList.splice(index, 1);
        setPendingEntries(newList);
        localStorage.setItem('offline_warehouse_entries', JSON.stringify(newList));
        toast.success("Lançamento offline removido.");
    };

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header / Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex items-center gap-6">
                    <div className="bg-amber-500 text-white p-5 rounded-[1.5rem] shadow-lg shadow-amber-100">
                        <Database className="h-8 w-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic leading-none">Status Offline</h2>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-2 italic">
                            {metrics.totalItems} lançamentos aguardando sincronização
                        </p>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Peso Pendente</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-gray-900 tracking-tighter italic">{metrics.totalWeight.toFixed(2)}</span>
                        <span className="text-sm font-black text-gray-400 italic">KG</span>
                    </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 flex flex-col justify-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Tipo Dominante</span>
                    <div className="flex items-baseline gap-2">
                        <span className="text-xl font-black text-gray-900 tracking-tighter italic uppercase">
                            {metrics.entriesByType['entrada'] >= (metrics.entriesByType['saída'] || 0) ? 'Entrada' : 'Saída'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Charts and Config */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase mb-6 italic flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-indigo-600" /> Distribuição por Item
                        </h3>
                        <div className="h-64 w-full">
                            {metrics.chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={metrics.chartData} layout="vertical" margin={{ left: -20, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                            labelStyle={{ fontWeight: 'black', textTransform: 'uppercase', fontSize: '10px' }}
                                        />
                                        <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                                            {metrics.chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#f59e0b' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-gray-300 italic opacity-50">
                                    <BarChartIcon className="h-10 w-10 mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">Sem dados para exibir</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
                        <h3 className="text-sm font-black text-gray-900 uppercase mb-4 italic flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 text-indigo-600" /> Sincronização
                        </h3>
                        <div className="space-y-4">
                            <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                                <Download className="h-8 w-8 text-amber-500 mb-3" />
                                <h3 className="text-[10px] font-black text-amber-900 uppercase italic">Exportar Lançamentos</h3>
                                <button 
                                    onClick={handleExport}
                                    disabled={pendingEntries.length === 0}
                                    className="mt-4 w-full bg-amber-500 text-white font-black py-3 rounded-xl text-[10px] uppercase shadow-md hover:bg-amber-600 transition-all disabled:opacity-50"
                                >
                                    Gerar Arquivo ({pendingEntries.length})
                                </button>
                            </div>

                            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                                <Upload className="h-8 w-8 text-emerald-500 mb-3" />
                                <h3 className="text-[10px] font-black text-emerald-900 uppercase italic">Importar Lançamentos</h3>
                                <label className="mt-4 w-full bg-emerald-600 text-white font-black py-3 rounded-xl text-[10px] uppercase shadow-md hover:bg-emerald-700 transition-all cursor-pointer flex justify-center items-center">
                                    Enviar para Nuvem
                                    <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Detailed List */}
                <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-gray-100 overflow-hidden italic">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-sm font-black text-gray-900 uppercase italic flex items-center gap-2">
                            <Package className="h-4 w-4 text-indigo-600" /> Lista de Pendências
                        </h3>
                        <span className="bg-white border border-gray-200 px-3 py-1 rounded-full text-[9px] font-black text-gray-500 uppercase">
                            {pendingEntries.length} itens locais
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50 text-left border-b border-gray-100">
                                    <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Data / Tipo</th>
                                    <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest">Item / Fornecedor</th>
                                    <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Peso (Kg)</th>
                                    <th className="p-4 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pendingEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-12 text-center text-gray-300 font-bold uppercase tracking-widest text-[10px]">
                                            Tudo em dia! Nenhum lançamento offline pendente.
                                        </td>
                                    </tr>
                                ) : (
                                    pendingEntries.map((entry, idx) => (
                                        <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-900 leading-none">{new Date(entry.date || entry.timestamp || 0).toLocaleDateString('pt-BR')}</span>
                                                    <span className={`text-[8px] font-black uppercase mt-1 px-1.5 py-0.5 rounded-full w-fit ${entry.type === 'entrada' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {entry.type}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-gray-900 uppercase italic">{entry.itemName}</span>
                                                    <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase truncate max-w-[150px]">{entry.supplierName || 'Fornecedor Local'}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="text-sm font-black text-gray-900 italic">{(parseFloat(entry.quantity) || 0).toFixed(2)}</span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => handleRemovePending(idx)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remover permanentemente do local"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SynchronizationModule;
