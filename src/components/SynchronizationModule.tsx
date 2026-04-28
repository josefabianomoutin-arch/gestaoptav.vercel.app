import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Download, RefreshCw, Database, Package, Trash2, TrendingUp, BarChart as BarChartIcon, Monitor, HelpCircle, FileText as FileTextIcon, FolderSearch, Loader2, PlayCircle, Users, Settings } from 'lucide-react';
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

    const handleDirectSync = async () => {
        if (pendingEntries.length === 0) {
            toast.info("Nenhum lançamento pendente para sincronizar.");
            return;
        }
        if (!navigator.onLine) {
            toast.error("Sem conexão com a internet para sincronizar diretamente.");
            return;
        }

        setIsProcessing(true);
        const loadingToast = toast.loading('Sincronizando registros com o servidor...');
        try {
            const success = await onSyncWithFirebase(pendingEntries);
            if (success) {
                toast.success(`${pendingEntries.length} registros sincronizados com sucesso!`, { id: loadingToast });
                localStorage.removeItem('offline_warehouse_entries');
                setPendingEntries([]);
            } else {
                toast.error("Erro na sincronização automática. Tente novamente.", { id: loadingToast });
            }
        } catch (err: any) {
            toast.error(`Falha: ${err.message}`, { id: loadingToast });
        } finally {
            setIsProcessing(false);
        }
    };

    useEffect(() => {
        const handleOnline = () => {
            if (pendingEntries.length > 0) {
                toast.info("Conexão restaurada! Sincronizando dados pendentes...", {
                    duration: 5000,
                    action: {
                        label: 'Sincronizar Agora',
                        onClick: () => handleDirectSync()
                    }
                });
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [pendingEntries]);

    // --- New: Full Database State Export (for Offline Computer update) ---
    const handleExportFullDatabase = () => {
        try {
            const suppliers = JSON.parse(localStorage.getItem('cached_suppliers') || '[]');
            const items = JSON.parse(localStorage.getItem('cached_acquisitionItems') || '[]');
            const config = JSON.parse(localStorage.getItem('cached_perCapitaConfig') || '{}');
            const menu = JSON.parse(localStorage.getItem('cached_standardMenu') || '[]');

            const fullData = {
                type: 'FULL_DATABASE_UPDATE',
                version: '1.0',
                timestamp: new Date().toISOString(),
                payload: {
                    suppliers,
                    items,
                    config,
                    menu
                }
            };

            const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `BASE_DADOS_ATUALIZADA_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            toast.success("Base de dados exportada com sucesso! Leve este arquivo ao computador offline.");
        } catch (err) {
            console.error("Export failure:", err);
            toast.error("Falha ao exportar base de dados.");
        }
    };

    const handleImportFullDatabase = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (data.type !== 'FULL_DATABASE_UPDATE') {
                    throw new Error("Arquivo inválido. Use um arquivo de Base de Dados.");
                }

                const { suppliers, items, config, menu } = data.payload;
                
                // Save to local storage for offline use
                localStorage.setItem('cached_suppliers', JSON.stringify(suppliers));
                localStorage.setItem('cached_acquisitionItems', JSON.stringify(items));
                localStorage.setItem('cached_perCapitaConfig', JSON.stringify(config));
                localStorage.setItem('cached_standardMenu', JSON.stringify(menu));

                toast.success("Base de dados local atualizada! Recarregue a página para aplicar.");
                setTimeout(() => window.location.reload(), 1500);
            } catch (err: any) {
                toast.error(`Erro na importação: ${err.message}`);
            }
        };
        reader.readAsText(file);
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
                        {pendingEntries.length > 0 && navigator.onLine && (
                            <button 
                                onClick={handleDirectSync}
                                disabled={isProcessing}
                                className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-black py-2 px-6 rounded-xl transition-all shadow-lg shadow-amber-100 flex items-center gap-2 text-[10px] uppercase tracking-widest"
                            >
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                Sincronizar Agora
                            </button>
                        )}
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

                    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 italic">
                        <div className="flex items-center gap-3 mb-6">
                            <div className={`p-2 rounded-xl ${navigator.onLine ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                {navigator.onLine ? <Users className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-gray-900 uppercase italic leading-none">
                                    {navigator.onLine ? 'Computador 2 (Online)' : 'Computador 1 (Offline)' }
                                </h3>
                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                    Fluxo de Sincronização via Pasta/USB
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Workflow 1: Database Setup/Update (Online -> Offline) */}
                            <div className="p-5 rounded-2xl border border-zinc-100 bg-zinc-50/30">
                                <h4 className="text-[10px] font-black text-zinc-800 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                    <Settings className="h-3 w-3" /> 1. Atualizar Cadastros
                                </h4>
                                {navigator.onLine ? (
                                    <div className="space-y-2">
                                        <button
                                            onClick={handleExportFullDatabase}
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Download className="h-4 w-4" /> Exportar para PC Offline
                                        </button>
                                        <p className="text-[8px] text-zinc-400 font-bold uppercase italic leading-tight">Gere este arquivo no PC Online para atualizar Fornecedores e Itens no PC Offline via Pendrive.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-indigo-200 rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors bg-white group">
                                            <Upload className="h-5 w-5 text-indigo-400 group-hover:text-indigo-600 mb-2" />
                                            <span className="text-[9px] font-black text-indigo-700 uppercase tracking-widest">Importar de Pendrive</span>
                                            <input type="file" className="hidden" accept=".json" onChange={handleImportFullDatabase} />
                                        </label>
                                        <p className="text-[8px] text-zinc-400 font-bold uppercase italic leading-tight text-center">Use o arquivo gerado no PC Online para ver novos fornecedores e configurações aqui no Offline.</p>
                                    </div>
                                )}
                            </div>

                            {/* Workflow 2: Synchronize Logs (Offline -> Online) */}
                            <div className="p-5 rounded-2xl border border-zinc-100 bg-zinc-50/30">
                                <h4 className="text-[10px] font-black text-zinc-800 uppercase mb-3 flex items-center gap-2 tracking-widest">
                                    <RefreshCw className="h-3 w-3" /> 2. Sincronizar Lançamentos
                                </h4>
                                {!navigator.onLine ? (
                                    <div className="space-y-2">
                                        <button 
                                            onClick={handleExport}
                                            disabled={pendingEntries.length === 0}
                                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-xl text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <Download className="h-4 w-4" /> Exportar Lançamentos
                                        </button>
                                        <p className="text-[8px] text-zinc-400 font-bold uppercase italic leading-tight">Gere este arquivo no final do dia para levar ao PC Online via Pendrive.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <label className="flex flex-col items-center justify-center w-full p-4 border-2 border-dashed border-emerald-200 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors bg-white group">
                                            <Upload className="h-5 w-5 text-emerald-400 group-hover:text-emerald-600 mb-2" />
                                            <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Processar Sincronização</span>
                                            <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                                        </label>
                                        <p className="text-[8px] text-zinc-400 font-bold uppercase italic leading-tight text-center">Importe aqui o arquivo trazido do PC Offline para subir os dados para a Nuvem.</p>
                                    </div>
                                )}
                            </div>

                            {/* App Install Hook */}
                            <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                                <button 
                                    onClick={handleInstallApp}
                                    className="w-full bg-slate-800 text-white font-black py-3 px-4 rounded-xl text-[9px] uppercase tracking-widest mb-2 flex items-center justify-center gap-2"
                                >
                                    <Monitor className="h-4 w-4" /> Instalar Aplicativo
                                </button>
                                <button 
                                    onClick={handleDownloadGuide}
                                    className="w-full text-zinc-400 font-bold py-1 text-[8px] uppercase tracking-widest hover:text-indigo-600 transition-colors underline"
                                >
                                    Guia de Instalação Offline
                                </button>
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
