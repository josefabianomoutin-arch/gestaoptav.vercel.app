
import React, { useState } from 'react';
import { Printer, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface RondaRegistroFormProps {
    onSave?: (data: any) => Promise<void>;
}

const RondaRegistroForm: React.FC<RondaRegistroFormProps> = ({ onSave }) => {
    const [header, setHeader] = useState({ data: new Date().toISOString().split('T')[0], turno: 'DIURNO', fctNumber: '' });
    const [rows, setRows] = useState(Array(8).fill(null).map(() => ({ policial: '', hInicio: '', kmInicio: '', hFinal: '', kmFinal: '', ocorrencias: '' })));
    
    const [checkList, setCheckList] = useState<{
        qtdCadastrados: string;
        qtdLocal: string;
        todosPresentes: boolean | null;
        obsPPL: string;
        trabalho: boolean | null;
        obsTrabalho: string;
        uniforme: boolean | null;
        obsUniforme: string;
        conduta: boolean | null;
        obsConduta: string;
        embriagues: boolean | null;
        obsEmbriagues: string;
        drogas: boolean | null;
        obsDrogas: string;
        agressividade: boolean | null;
        obsAgressividade: string;
        pendenciasAnterior: boolean | null;
        obsPendencias: string;
    }>({
        qtdCadastrados: '',
        qtdLocal: '',
        todosPresentes: null,
        obsPPL: '',
        trabalho: null,
        obsTrabalho: '',
        uniforme: null,
        obsUniforme: '',
        conduta: null,
        obsConduta: '',
        embriagues: null,
        obsEmbriagues: '',
        drogas: null,
        obsDrogas: '',
        agressividade: null,
        obsAgressividade: '',
        pendenciasAnterior: null,
        obsPendencias: ''
    });

    const updateRow = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        newRows[index][field as keyof typeof newRows[0]] = value;
        setRows(newRows);
    };

    const handlePrint = () => window.print();

    const getObsValue = (key: string): string => {
        const obsKey = `obs${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof checkList;
        return checkList[obsKey] as string;
    };

    const setObsValue = (key: string, value: string) => {
        const obsKey = `obs${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof checkList;
        setCheckList(prev => ({ ...prev, [obsKey]: value }));
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 shadow-lg rounded-xl border border-slate-200 print:shadow-none print:border-none">
            {/* Header */}
            <div className="grid grid-cols-3 gap-2 mb-4 border-2 border-black p-2 text-sm">
                <div className="font-bold">Data: <input type="date" value={header.data} onChange={e => setHeader({...header, data: e.target.value})} className="border-b" /></div>
                <div className="font-bold">Turno: <select value={header.turno} onChange={e => setHeader({...header, turno: e.target.value})} className="border-b"><option>DIURNO</option><option>NOTURNO</option></select></div>
                <div className="font-bold">RONDA EXTERNA / FCT Nº <input type="text" value={header.fctNumber} onChange={e => setHeader({...header, fctNumber: e.target.value})} className="w-16 border-b" /> / 2026</div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border-2 border-black text-xs mb-6">
                <thead>
                    <tr className="bg-slate-200 border-b-2 border-black">
                        <th className="border-r border-black p-1">POLICIAL</th>
                        <th className="border-r border-black p-1">H. INÍCIO</th>
                        <th className="border-r border-black p-1">KM INICIAL</th>
                        <th className="border-r border-black p-1">H. FINAL</th>
                        <th className="border-r border-black p-1">KM FINAL</th>
                        <th className="p-1">Ocorrências</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            <td className="border-r border-black"><input className="w-full p-1" value={row.policial} onChange={e => updateRow(i, 'policial', e.target.value)} /></td>
                            <td className="border-r border-black"><input className="w-full p-1 text-center" value={row.hInicio} onChange={e => updateRow(i, 'hInicio', e.target.value)} placeholder="00:00" /></td>
                            <td className="border-r border-black"><input className="w-full p-1 text-center" value={row.kmInicio} onChange={e => updateRow(i, 'kmInicio', e.target.value)} /></td>
                            <td className="border-r border-black"><input className="w-full p-1 text-center" value={row.hFinal} onChange={e => updateRow(i, 'hFinal', e.target.value)} placeholder="00:00" /></td>
                            <td className="border-r border-black"><input className="w-full p-1 text-center" value={row.kmFinal} onChange={e => updateRow(i, 'kmFinal', e.target.value)} /></td>
                            <td className="p-1"><input className="w-full p-1" value={row.ocorrencias} onChange={e => updateRow(i, 'ocorrencias', e.target.value)} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Checklist */}
            <div className="space-y-4 text-xs">
                <h3 className="font-bold border-b border-black pb-1">Inspeção:</h3>
                
                <div className="border border-slate-300 p-2 rounded">
                   <p>Quantidade de PPl - Nº Cadastrados: <input className="border-b w-12" value={checkList.qtdCadastrados} onChange={e => setCheckList({...checkList, qtdCadastrados: e.target.value})} />, Nº no local da Inspeção: <input className="border-b w-12" value={checkList.qtdLocal} onChange={e => setCheckList({...checkList, qtdLocal: e.target.value})} /></p>
                   <p>Todos PPL alocados estão presentes: <button onClick={() => setCheckList({...checkList, todosPresentes: true})} className={`${checkList.todosPresentes === true ? 'font-bold' : ''}`}>() sim</button> <button onClick={() => setCheckList({...checkList, todosPresentes: false})} className={`${checkList.todosPresentes === false ? 'font-bold' : ''}`}>() não</button></p>
                   <p>Obs: <input className="border-b w-full" value={checkList.obsPPL} onChange={e => setCheckList({...checkList, obsPPL: e.target.value})} /></p>
                </div>
                
                {[
                    { key: 'trabalho', label: 'Trabalho' },
                    { key: 'uniforme', label: 'Uniforme' },
                    { key: 'conduta', label: 'Conduta' },
                    { key: 'embriagues', label: 'Indicio de enbriagues' },
                    { key: 'drogas', label: 'Uso de drogas' },
                    { key: 'agressividade', label: 'Agressividade ou desobediencia' },
                    { key: 'pendenciasAnterior', label: 'Verificação de pendências da ronda anterior' }
                ].map(item => (
                    <p key={item.key}>
                        {item.label}: 
                        <button onClick={() => setCheckList(prev => ({...prev, [item.key]: true}))} className={`${checkList[item.key as keyof typeof checkList] === true ? 'font-bold' : ''}`}>() ok</button> 
                        <button onClick={() => setCheckList(prev => ({...prev, [item.key]: false}))} className={`${checkList[item.key as keyof typeof checkList] === false ? 'font-bold' : ''}`}>() não ok</button> 
                        - Obs: <input className="border-b w-1/3" value={getObsValue(item.key)} onChange={e => setObsValue(item.key, e.target.value)} />
                    </p>
                ))}
            </div>
            
            <button onClick={handlePrint} className="mt-6 flex items-center gap-2 bg-indigo-900 text-white p-3 rounded-lg print:hidden">
                <Printer className="h-4 w-4" /> Imprimir Relatório
            </button>
        </motion.div>
    );
};

export default RondaRegistroForm;
