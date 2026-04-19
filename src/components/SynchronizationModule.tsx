import React, { useState, useEffect } from 'react';
import { Upload, Download, RefreshCw, AlertTriangle, CheckCircle, Database } from 'lucide-react';
import { toast } from 'sonner';

interface SynchronizationModuleProps {
    onSyncWithFirebase: (data: any[]) => Promise<boolean>;
}

const SynchronizationModule: React.FC<SynchronizationModuleProps> = ({ onSyncWithFirebase }) => {
    const [pendingEntries, setPendingEntries] = useState<any[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('offline_warehouse_entries');
        if (saved) {
            setPendingEntries(JSON.parse(saved));
        }
    }, []);

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

    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 italic">
            <div className="flex items-center gap-3 mb-6">
                <div className="bg-indigo-600 text-white p-3 rounded-[1.2rem]">
                    <Database className="h-6 w-6" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-indigo-900 uppercase tracking-tighter italic leading-none">Painel de Sincronização</h2>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1 italic">Gestão de arquivos para tráfego offline</p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Lado Offline */}
                <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 flex flex-col items-center text-center">
                    <Download className="h-10 w-10 text-amber-500 mb-4" />
                    <h3 className="font-black text-amber-900 uppercase italic">Modo Offline (Exportar)</h3>
                    <p className="text-[10px] text-amber-700 font-bold mt-2 mb-6 uppercase tracking-widest">Gere arquivos de lançamentos para salvar na pasta do servidor.</p>
                    <button 
                        onClick={handleExport}
                        disabled={pendingEntries.length === 0}
                        className="bg-amber-500 text-white font-black py-3 px-8 rounded-xl text-xs uppercase shadow-md hover:bg-amber-600 transition-all disabled:opacity-50"
                    >
                        Exportar {pendingEntries.length} Pendentes
                    </button>
                </div>

                {/* Lado Online */}
                <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col items-center text-center">
                    <Upload className="h-10 w-10 text-emerald-500 mb-4" />
                    <h3 className="font-black text-emerald-900 uppercase italic">Modo Online (Importar)</h3>
                    <p className="text-[10px] text-emerald-700 font-bold mt-2 mb-6 uppercase tracking-widest">Importe o arquivo gerado no setor offline.</p>
                    <label className="bg-emerald-600 text-white font-black py-3 px-8 rounded-xl text-xs uppercase shadow-md hover:bg-emerald-700 transition-all cursor-pointer">
                        Importar Lançamentos
                        <input type="file" className="hidden" accept=".json" onChange={handleImport} />
                    </label>
                </div>
            </div>
        </div>
    );
};

export default SynchronizationModule;
