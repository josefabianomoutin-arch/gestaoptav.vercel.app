
import React, { useState } from 'react';
import { ShieldCheck, MapPin, ClipboardList, PenTool, Printer, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface RondaRegistroFormProps {
    onSave?: (data: any) => Promise<void>;
}

const RondaRegistroForm: React.FC<RondaRegistroFormProps> = ({ onSave }) => {
    const [formData, setFormData] = useState({
        responsavel: '',
        veiculo: '',
        kmInicial: '',
        kmFinal: '',
        data: new Date().toISOString().split('T')[0],
        turno: 'DIURNO',
        pontosVerificacao: {
            portariaPrincipal: false,
            areaEstocagem: false,
            perimetroExterno: false,
            estacionamento: false,
            almoxarifado: false,
            gerador: false
        },
        observacoes: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleCheck = (ponto: string) => {
        setFormData(prev => ({
            ...prev,
            pontosVerificacao: {
                ...prev.pontosVerificacao,
                //@ts-ignore
                [ponto]: !prev.pontosVerificacao[ponto]
            }
        }));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (onSave) await onSave(formData);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto space-y-6"
        >
            <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-indigo-50 relative overflow-hidden print:shadow-none print:border-none print:p-0">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50 pointer-events-none" />
                
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-10 relative">
                    <div>
                        <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter italic flex items-center gap-3">
                            <ShieldCheck className="h-8 w-8 text-indigo-600" />
                            Relatório de Ronda
                        </h2>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Controle de Segurança e Vigilância</p>
                    </div>
                    <button 
                        type="button"
                        onClick={handlePrint}
                        className="p-3 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-2xl transition-all print:hidden"
                        title="Imprimir Relatório"
                    >
                        <Printer className="h-6 w-6" />
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Infos Básicas */}
                    <div className="space-y-6">
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-indigo-900/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserCheckIcon /> Identificação
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Responsável pela Ronda</label>
                                    <input 
                                        required
                                        type="text"
                                        value={formData.responsavel}
                                        onChange={e => setFormData({...formData, responsavel: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-800 transition-all placeholder:text-slate-300"
                                        placeholder="Nome do Vigilante"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Data</label>
                                    <input 
                                        type="date"
                                        value={formData.data}
                                        onChange={e => setFormData({...formData, data: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-800 transition-all cursor-pointer"
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Turno</label>
                                    <select 
                                        value={formData.turno}
                                        onChange={e => setFormData({...formData, turno: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-black text-indigo-900 transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="DIURNO">DIURNO</option>
                                        <option value="NOTURNO">NOTURNO</option>
                                    </select>
                                </div>
                            </div>
                        </section>

                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-indigo-900/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <MapPin className="h-3 w-3" /> Monitoramento de KM
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">KM Inicial</label>
                                    <input 
                                        type="number"
                                        value={formData.kmInicial}
                                        onChange={e => setFormData({...formData, kmInicial: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-800 transition-all"
                                        placeholder="00000"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">KM Final</label>
                                    <input 
                                        type="number"
                                        value={formData.kmFinal}
                                        onChange={e => setFormData({...formData, kmFinal: e.target.value})}
                                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-800 transition-all"
                                        placeholder="00000"
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Checklist */}
                    <div className="space-y-6">
                        <section className="space-y-4">
                            <h3 className="text-xs font-black text-indigo-900/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ClipboardList className="h-3 w-3" /> Pontos de Verificação
                            </h3>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.entries(formData.pontosVerificacao).map(([key, checked]) => (
                                    <button
                                        key={key}
                                        type="button"
                                        onClick={() => handleCheck(key)}
                                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all group ${
                                            checked 
                                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                                : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-indigo-200'
                                        }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-wider">
                                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                        </span>
                                        {checked ? <CheckCircle2 className="h-5 w-5" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-200 group-hover:border-indigo-200" />}
                                    </button>
                                ))}
                            </div>
                        </section>
                    </div>
                </div>

                <div className="mt-8">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2">
                        <PenTool className="h-3 w-3" /> Observações e Ocorrências
                    </label>
                    <textarea 
                        value={formData.observacoes}
                        onChange={e => setFormData({...formData, observacoes: e.target.value})}
                        rows={4}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-100 font-bold text-slate-800 transition-all resize-none placeholder:text-slate-300"
                        placeholder="Descreva qualquer irregularidade ou detalhe relevante da ronda..."
                    />
                </div>

                {/* Footer Section */}
                <div className="mt-12 pt-10 border-t border-dashed border-slate-100 flex flex-col md:flex-row justify-between items-end gap-10">
                    <div className="w-full md:w-64 space-y-4">
                        <div className="h-px w-full bg-slate-300" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Assinatura do Vigilante</p>
                    </div>
                    
                    <button 
                        disabled={isSaving}
                        className={`px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] shadow-2xl transition-all transform hover:scale-105 active:scale-95 print:hidden ${
                            saved 
                                ? 'bg-green-600 text-white' 
                                : 'bg-indigo-950 text-white hover:bg-indigo-900 shadow-indigo-200'
                        }`}
                    >
                        {isSaving ? 'Processando...' : saved ? 'Salvo com Sucesso!' : 'Registrar Ronda'}
                    </button>
                </div>
            </form>
        </motion.div>
    );
};

const UserCheckIcon = () => (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <polyline points="16 11 18 13 22 9" />
    </svg>
);

export default RondaRegistroForm;
