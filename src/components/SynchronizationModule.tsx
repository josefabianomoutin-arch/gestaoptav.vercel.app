import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Download, RefreshCw, Database, Package, Trash2, TrendingUp, BarChart as BarChartIcon, Monitor, HelpCircle, FileText as FileTextIcon, FolderSearch, Loader2, PlayCircle } from 'lucide-react';
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
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    const [networkPath, setNetworkPath] = useState(() => 
        localStorage.getItem('warehouse_network_path') || ''
    );

    useEffect(() => {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        });
    }, []);

    const handleInstallApp = async () => {
        if (!deferredPrompt) {
            toast.info("O aplicativo já está instalado ou seu navegador não suporta a instalação direta. Use o menu do navegador (Instalar Aplicativo) ou exporte o código para uso local.");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
        }
    };

    const handleDownloadGuide = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const html = `
            <html>
                <head>
                    <title>Guia de Uso Offline - Gestão Taiuva</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                        h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
                        h2 { margin-top: 30px; color: #334155; }
                        li { margin-bottom: 15px; }
                        .code { background: #f1f5f9; padding: 10px; border-radius: 5px; font-family: monospace; }
                        .note { background: #fef3c7; border-left: 5px solid #f59e0b; padding: 15px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <h1>Guia de Instalação e Uso Offline</h1>
                    <p>Este sistema é uma aplicação web de alta performance que pode ser executada como um programa desktop comum em seu computador.</p>
                    
                    <h2>Opção 1: Uso com Pasta Compartilhada (Workstation Offline)</h2>
                    <p>Ideal para Computador 1 (Sem Internet) e Computador 2 (Com Internet).</p>
                    <ol>
                        <li><strong>No Computador 1:</strong> Abra o sistema uma vez com internet e clique em "Instalar Aplicativo". Ele passará a abrir offline através do ícone da área de trabalho.</li>
                        <li>Realize seus lançamentos normalmente. Eles ficarão salvos no banco local.</li>
                        <li>Ao final do turno, clique em <strong>"Gerar Arquivo"</strong> e salve-o diretamente na <strong>Pasta Compartilhada</strong> (ex: Unidade Z:\\ ou Pasta de Rede).</li>
                        <li><strong>No Computador 2:</strong> Clique em <strong>"Sincronizar Pasta de Rede"</strong>, aponte para a mesma pasta e o sistema enviará tudo para a nuvem automaticamente.</li>
                    </ol>

                    <h2>Solução para Tela Branca (Computador Sem Internet)</h2>
                    <p>Se ao abrir o arquivo <code>index.html</code> a tela ficar branca, é porque o navegador bloqueia scripts locais por segurança. Siga um destes métodos:</p>
                    <ol>
                        <li><strong>Método App Instalado (Recomendado):</strong> Antes de levar o computador para o local sem internet, abra o sistema <u>com internet uma vez</u>, clique nos 3 pontos do Chrome > Salvar e Compartilhar > <strong>Instalar página como Aplicativo</strong>. O ícone criado na área de trabalho funcionará 100% offline.</li>
                        <li><strong>Método Servidor Portátil:</strong> Se precisar rodar de um pendrive ou pasta na rede, baixe um servidor portátil (como o <i>Mongoose Binary</i> ou <i>Baby Web Server</i> - são apenas um arquivo .exe). Coloque esse .exe na mesma pasta dos arquivos do sistema e execute-o. Ele criará um link (ex: http://localhost:8080) que abrirá o sistema corretamente.</li>
                    </ol>

                    <div class="note">
                        <strong>Pasta Compartilhada:</strong> O sistema busca arquivos de sincronização na pasta que você configurar. Sincronize o Computador 1 (Offline) salvando os arquivos JSON lá, e no Computador 2 (Online) use a opção "Escanear Pasta de Rede" para subir os dados para a nuvem.
                    </div>

                    <button onclick="window.print()">Imprimir este Guia</button>
                </body>
            </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
    };

    const [isScanning, setIsScanning] = useState(false);
    const [directoryHandle, setDirectoryHandle] = useState<any>(null);

    const metrics = useMemo(() => {
        const totalItems = pendingEntries.length;
        const totalWeight = pendingEntries.reduce((acc, curr) => acc + (parseFloat(curr.quantity) || 0), 0);
        const entriesByType = pendingEntries.reduce((acc, curr) => {
            acc[curr.type] = (acc[curr.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

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

    // New: Handle Directory Selection for PC2 Sync
    const handlePickDirectory = async () => {
        try {
            // @ts-ignore
            const handle = await window.showDirectoryPicker();
            setDirectoryHandle(handle);
            toast.success("Pasta selecionada com sucesso! Clique em 'Escanear Pasta' para sincronizar.");
        } catch (err) {
            console.error(err);
            toast.error("Seu navegador não suporta a seleção direta de pastas ou a permissão foi negada.");
        }
    };

    const handleScanDirectory = async () => {
        if (!directoryHandle) {
            toast.error("Selecione a pasta compartilhada primeiro.");
            return;
        }

        setIsScanning(true);
        try {
            let filesFound = 0;
            let totalSynced = 0;

            // @ts-ignore
            for await (const entry of directoryHandle.values()) {
                if (entry.kind === 'file' && entry.name.startsWith('sincronizacao_') && entry.name.endsWith('.json')) {
                    filesFound++;
                    const file = await entry.getFile();
                    const content = await file.text();
                    try {
                        const rawData = JSON.parse(content);
                        const data = Array.isArray(rawData) ? rawData : (rawData.entries || []);
                        
                        if (data.length > 0) {
                            const success = await onSyncWithFirebase(data);
                            if (success) {
                                totalSynced += data.length;
                                // Ideally we would delete or move the file, but browsers can't easily move files between directories without creating new ones
                                // We'll just inform the user to archive them
                            }
                        }
                    } catch (e) {
                        console.error(`Erro ao ler arquivo ${entry.name}:`, e);
                    }
                }
            }

            if (filesFound === 0) {
                toast.info("Nenhum arquivo de sincronização novo encontrado na pasta.");
            } else {
                toast.success(`Escaneamento concluído: ${filesFound} arquivos processados, ${totalSynced} registros sincronizados.`);
                toast.info("Lembre-se de mover ou deletar os arquivos processados da pasta para evitar duplicidade.");
            }
        } catch (err) {
            toast.error("Erro ao escanear a pasta.");
        } finally {
            setIsScanning(false);
        }
    };

    const handleExport = async () => {
        if (pendingEntries.length === 0) {
            toast.error("Nenhum lançamento pendente para exportar!");
            return;
        }

        const exportData = {
            metadata: {
                exportDate: new Date().toISOString(),
                systemVersion: '2026.1.Q'
            },
            entries: pendingEntries
        };

        const fileName = `sincronizacao_estoque_${new Date().toISOString().slice(0, 10)}.json`;
        const dataStr = JSON.stringify(exportData, null, 2);

        // Try to use File System Access API for a better Save experience
        // @ts-ignore
        if (window.showSaveFilePicker) {
            try {
                // @ts-ignore
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: 'JSON Sincronização',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(dataStr);
                await writable.close();
                toast.success("Arquivo salvo diretamente na pasta selecionada!");
                return;
            } catch (err) {
                console.log("Usuário cancelou ou erro no picker:", err);
            }
        }

        // Fallback to traditional download
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        toast.success("Arquivo de sincronização gerado! Salve-o na pasta compartilhada.");
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const rawData = JSON.parse(event.target?.result as string);
                
                // Suporte tanto para o novo formato com metadata quanto para o formato antigo (array direto)
                const data = Array.isArray(rawData) ? rawData : (rawData.entries || []);
                
                if (data.length === 0) {
                    toast.info("Nenhum dado novo encontrado no arquivo.");
                    return;
                }

                setIsProcessing(true);
                const success = await onSyncWithFirebase(data);
                if (success) {
                    toast.success(`${data.length} registros sincronizados com sucesso!`);
                    localStorage.removeItem('offline_warehouse_entries');
                    setPendingEntries([]);
                } else {
                    toast.error("Erro na sincronização. Verifique os dados.");
                }
            } catch (err) {
                toast.error("Arquivo de sincronização inválido.");
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
                            <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-xl text-white">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="bg-white/20 p-3 rounded-xl">
                                        <Monitor className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black uppercase italic leading-none">Instalar Aplicativo</h3>
                                        <p className="text-[9px] text-indigo-100 font-bold uppercase tracking-tight mt-1">Uso Offline Profissional</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={handleInstallApp}
                                    className="w-full bg-white text-indigo-700 font-black py-4 rounded-xl text-[10px] uppercase shadow-lg hover:bg-slate-50 transition-all active:scale-95"
                                >
                                    {deferredPrompt ? 'Baixar e Instalar agora!' : 'App Disponível no Navegador'}
                                </button>
                                <button 
                                    onClick={handleDownloadGuide}
                                    className="w-full mt-2 bg-indigo-500/30 text-white font-black py-3 rounded-xl text-[9px] uppercase border border-white/20 hover:bg-indigo-500/50 transition-all flex items-center justify-center gap-2"
                                >
                                    <HelpCircle className="h-3 w-3" /> Guia de Instalação
                                </button>
                            </div>

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

                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                                <FolderSearch className="h-8 w-8 text-indigo-500 mb-3" />
                                <h3 className="text-[10px] font-black text-slate-900 uppercase italic">Sincronizador de Pasta de Rede</h3>
                                <div className="mt-4 w-full space-y-3">
                                    {!directoryHandle ? (
                                        <button 
                                            onClick={handlePickDirectory}
                                            className="w-full bg-slate-800 text-white font-black py-4 rounded-xl text-[9px] uppercase shadow-md hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                                        >
                                            <PlayCircle className="h-4 w-4" /> Selecionar Pasta Compartilhada
                                        </button>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                                                <span className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[150px]">
                                                    {directoryHandle.name}
                                                </span>
                                                <button onClick={() => setDirectoryHandle(null)} className="text-[8px] font-black text-red-500 uppercase">Trocar</button>
                                            </div>
                                            <button 
                                                onClick={handleScanDirectory}
                                                disabled={isScanning}
                                                className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl text-[9px] uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                            >
                                                {isScanning ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <RefreshCw className="h-4 w-4" />
                                                )}
                                                Escanear Pasta e Sincronizar
                                            </button>
                                        </div>
                                    )}
                                    
                                    <p className="text-[7px] text-slate-400 font-bold uppercase mt-2 leading-relaxed">
                                        Use esta função no <strong className="text-emerald-600">Computador 2</strong> para ler os arquivos gerados pelo <strong className="text-amber-600">Computador 1</strong> que foram salvos na rede.
                                    </p>
                                </div>
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
