
import React, { useState } from 'react';
import { Printer, PenTool, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

interface RondaRegistroFormProps {
    systemPasswords?: Record<string, string>;
}

const RondaRegistroForm: React.FC<RondaRegistroFormProps> = ({ systemPasswords = {} }) => {
    const [header, setHeader] = useState({ data: new Date().toISOString().split('T')[0], turno: 'DIURNO', fctNumber: '', superior: '' });
    const [rows, setRows] = useState(Array(11).fill(null).map(() => ({ policial: '', hInicio: '', kmInicio: '', hFinal: '', kmFinal: '', ocorrencias: '', outros: '' })));
    
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
        obsPendenciasAnterior: string;
        outros: boolean | null;
        obsOutros: string;
        labelOutros: string;
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
        obsPendenciasAnterior: '',
        outros: null,
        obsOutros: '',
        labelOutros: ''
    });

    const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);
    const [signName, setSignName] = useState('');
    const [signPassword, setSignPassword] = useState('');
    const [digitalSignature, setDigitalSignature] = useState<{ name: string; timestamp: string; hash: string } | null>(null);

    const updateRow = (index: number, field: string, value: string) => {
        const newRows = [...rows];
        newRows[index][field as keyof typeof newRows[0]] = value;
        setRows(newRows);
    };

    const getObsValueString = (key: string): string => {
        const obsKey = `obs${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof checkList;
        return (checkList[obsKey] as string) || '';
    };

    const executePrint = (signatureData: { name: string; timestamp: string; hash: string } | null) => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Por favor, permita popups para imprimir.');
            return;
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Registro de Rondas</title>
                <style>
                    @page { size: A4 portrait; margin: 10mm; }
                    body { font-family: Arial, sans-serif; font-size: 11px; line-height: 1.3; margin: 0; padding: 0; color: #000; box-sizing: border-box; }
                    h2 { margin: 5px 0 15px 0; text-align: center; font-size: 15px; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; }
                    table { border-collapse: collapse; width: 100%; margin: 10px 0 15px 0; }
                    th, td { border: 1px solid #000; padding: 4px; text-align: left; }
                    th { background-color: #e2e8f0; font-size: 10px; color: #000; text-transform: uppercase; }
                    td { font-size: 10px; height: 18px; }
                    .grid-2 { display: flex; justify-content: space-between; margin-bottom: 10px; }
                    .checklist-item { margin-bottom: 4px; display: flex; align-items: flex-start; }
                    .checklist-item > .label { width: 300px; font-weight: bold; }
                    .checklist-item > .status { width: 100px; }
                    .checklist-item > .obs { flex: 1; }
                    .signature-box { margin-top: 30px; text-align: center; page-break-inside: avoid; }
                    .header-box { border: 1px solid #000; padding: 8px; margin-bottom: 10px; border-radius: 4px; background: #fafafa; }
                    .mb-2 { margin-bottom: 8px; }
                </style>
            </head>
            <body>
                <h2>REGISTRO DE RONDAS - PENITENCIÁRIA DE TAIÚVA</h2>
                
                <div class="header-box grid-2">
                    <div><strong>Superior Responsável:</strong> ${header.superior || '_________________________________'}</div>
                    <div>
                       <strong>Data:</strong> ${header.data.split('-').reverse().join('/')} 
                       &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                       <strong>Turno:</strong> ${header.turno}
                    </div>
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th style="width: 25%">Policial</th>
                            <th style="width: 10%; text-align: center;">Início</th>
                            <th style="width: 10%; text-align: center;">KM Inicial</th>
                            <th style="width: 10%; text-align: center;">Fim</th>
                            <th style="width: 10%; text-align: center;">KM Final</th>
                            <th style="width: 15%">Ocorrência</th>
                            <th style="width: 25%">Outros</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.map(row => `
                            <tr>
                                <td>${row.policial}</td>
                                <td style="text-align: center;">${row.hInicio}</td>
                                <td style="text-align: center;">${row.kmInicio}</td>
                                <td style="text-align: center;">${row.hFinal}</td>
                                <td style="text-align: center;">${row.kmFinal}</td>
                                <td>${row.ocorrencias}</td>
                                <td>${row.outros}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="header-box">
                    <h3 style="margin: 0 0 10px 0; font-size: 12px; border-bottom: 1px solid #ccc; padding-bottom: 4px; text-transform: uppercase;">Inspeção Geral</h3>
                    <div class="checklist-item mb-2" style="display: block;">
                        <strong>Quantidade de PPL:</strong> Cadastrados: ${checkList.qtdCadastrados || '_____'} | No local da Inspeção: ${checkList.qtdLocal || '_____'}
                    </div>
                    <div class="checklist-item mb-2" style="display: block;">
                        <strong>Todos PPL alocados estão presentes:</strong> ${checkList.todosPresentes === true ? 'Sim' : (checkList.todosPresentes === false ? 'Não' : 'N/A')}
                        &nbsp; | &nbsp; <strong>Obs:</strong> ${checkList.obsPPL}
                    </div>
                    
                    <div style="margin-top: 15px;">
                        ${[
                            { key: 'trabalho', label: 'Trabalho' },
                            { key: 'uniforme', label: 'Uniforme' },
                            { key: 'conduta', label: 'Conduta' },
                            { key: 'embriagues', label: 'Indício de embriaguez' },
                            { key: 'drogas', label: 'Uso de drogas' },
                            { key: 'agressividade', label: 'Agressividade ou desobediência' },
                            { key: 'pendenciasAnterior', label: 'Verificação de pendências da ronda anterior' },
                            { key: 'outros', label: `Outros (${checkList.labelOutros || '_________________'})` }
                        ].map(item => `
                            <div class="checklist-item">
                                <div class="label">${item.label}:</div>
                                <div class="status">${(checkList as any)[item.key] === true ? '<b>[ X ] OK</b>' : ((checkList as any)[item.key] === false ? '<b>[ X ] Não OK</b>' : '[  ] OK &nbsp; [  ] Não')}</div>
                                <div class="obs"><strong>Obs:</strong> ${getObsValueString(item.key)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${signatureData ? `
                    <div class="signature-box" style="margin-top: 40px;">
                        <div style="font-size: 11px; font-weight: bold; border-top: 1.5px solid #000; width: 350px; margin: 0 auto; padding-top: 5px;">
                            ASSINATURA DIGITAL - VALIDADO PELO SISTEMA
                        </div>
                        <div style="margin-top:5px; font-size: 12px; text-transform: uppercase;"><strong>Responsável:</strong> ${signatureData.name}</div>
                        <div style="font-size:9px; color:#444; margin-top:2px;">Autenticado em: ${signatureData.timestamp}</div>
                        <div style="font-size:8px; font-family: monospace; color:#666; margin-top:2px;">HASH: ${signatureData.hash}</div>
                    </div>
                ` : `
                    <div class="signature-box" style="margin-top: 60px;">
                        <div style="border-top: 1.5px solid #000; width: 350px; margin: 0 auto; padding-top: 5px; font-weight: bold;">
                            Assinatura do Responsável
                        </div>
                    </div>
                `}
                <script>window.onload = function() { setTimeout(function(){ window.print(); window.close(); }, 500); }</script>
            </body>
            </html>
        `;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const handlePrint = () => {
        executePrint(digitalSignature);
    };

    const resetForm = () => {
        setHeader({ data: new Date().toISOString().split('T')[0], turno: 'DIURNO', fctNumber: '', superior: '' });
        setRows(Array(11).fill(null).map(() => ({ policial: '', hInicio: '', kmInicio: '', hFinal: '', kmFinal: '', ocorrencias: '', outros: '' })));
        setCheckList({
            qtdCadastrados: '', qtdLocal: '', todosPresentes: null, obsPPL: '',
            trabalho: null, obsTrabalho: '', uniforme: null, obsUniforme: '',
            conduta: null, obsConduta: '', embriagues: null, obsEmbriagues: '',
            drogas: null, obsDrogas: '', agressividade: null, obsAgressividade: '',
            pendenciasAnterior: null, obsPendenciasAnterior: '', outros: null, obsOutros: '', labelOutros: ''
        });
        setSignName('');
        setSignPassword('');
        setDigitalSignature(null);
    };

    const setObsValue = (key: string, value: string) => {
        const obsKey = `obs${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof checkList;
        setCheckList(prev => ({ ...prev, [obsKey]: value }));
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white p-4 shadow-lg rounded-xl border border-slate-200 print:shadow-none print:border-none">
            {/* Header */}
            <div className="grid grid-cols-2 gap-4 mb-4 p-2 text-sm">
                <div className="font-bold">Superior responsável: <input type="text" value={header.superior} onChange={e => setHeader({...header, superior: e.target.value})} className="border-b border-black w-64" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4 border-2 border-black p-2 text-sm">
                <div className="font-bold">Data: <input type="date" value={header.data} onChange={e => setHeader({...header, data: e.target.value})} className="border-b" /></div>
                <div className="font-bold">Turno: <select value={header.turno} onChange={e => setHeader({...header, turno: e.target.value})} className="border-b"><option>DIURNO</option><option>NOTURNO</option></select></div>
            </div>

            {/* Table */}
            <table className="w-full border-collapse border-2 border-black text-xs mb-6">
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} className="border-b border-black">
                            <td className="border-r border-black p-1">Policial: <input className="p-1 w-24 border-b" value={row.policial} onChange={e => updateRow(i, 'policial', e.target.value)} /></td>
                            <td className="border-r border-black p-1">Início: <input className="p-1 w-12 text-center border-b" value={row.hInicio} onChange={e => updateRow(i, 'hInicio', e.target.value)} placeholder="00:00" /></td>
                            <td className="border-r border-black p-1">KM Inicial: <input className="p-1 w-12 text-center border-b" value={row.kmInicio} onChange={e => updateRow(i, 'kmInicio', e.target.value)} /></td>
                            <td className="border-r border-black p-1">Fim: <input className="p-1 w-12 text-center border-b" value={row.hFinal} onChange={e => updateRow(i, 'hFinal', e.target.value)} placeholder="00:00" /></td>
                            <td className="border-r border-black p-1">KM Final: <input className="p-1 w-12 text-center border-b" value={row.kmFinal} onChange={e => updateRow(i, 'kmFinal', e.target.value)} /></td>
                            <td className="border-r border-black p-1">Ocorrência: <input className="p-1 w-24 border-b" value={row.ocorrencias} onChange={e => updateRow(i, 'ocorrencias', e.target.value)} /></td>
                            <td className="p-1">Outros: <input className="p-1 w-full border-b" value={row.outros || ''} onChange={e => updateRow(i, 'outros', e.target.value)} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Checklist */}
            <div className="space-y-4 text-xs">
                <h3 className="font-bold border-b border-black pb-1">Inspeção:</h3>
                
                <div className="border border-slate-300 p-2 rounded">
                   <p>Quantidade de PPl - Nº Cadastrados: <input className="border-b w-12" value={checkList.qtdCadastrados} onChange={e => setCheckList({...checkList, qtdCadastrados: e.target.value})} />, Nº no local da Inspeção: <input className="border-b w-12" value={checkList.qtdLocal} onChange={e => setCheckList({...checkList, qtdLocal: e.target.value})} /></p>
                   <div className="flex gap-4">
                       <p>Todos PPL alocados estão presentes:</p>
                       <label className="flex items-center gap-1 cursor-pointer">
                           <input type="radio" checked={checkList.todosPresentes === true} onChange={() => setCheckList({...checkList, todosPresentes: true})} /> Sim
                       </label>
                       <label className="flex items-center gap-1 cursor-pointer">
                           <input type="radio" checked={checkList.todosPresentes === false} onChange={() => setCheckList({...checkList, todosPresentes: false})} /> Não
                       </label>
                   </div>
                   <p>Obs: <input className="border-b w-full" value={checkList.obsPPL} onChange={e => setCheckList({...checkList, obsPPL: e.target.value})} /></p>
                </div>
                
                {[
                    { key: 'trabalho', label: 'Trabalho' },
                    { key: 'uniforme', label: 'Uniforme' },
                    { key: 'conduta', label: 'Conduta' },
                    { key: 'embriagues', label: 'Indicio de enbriagues' },
                    { key: 'drogas', label: 'Uso de drogas' },
                    { key: 'agressividade', label: 'Agressividade ou desobediencia' },
                    { key: 'pendenciasAnterior', label: 'Verificação de pendências da ronda anterior' },
                    { key: 'outros', label: 'Outros' }
                ].map(item => (
                    <div key={item.key} className={`flex items-center gap-2 p-1.5 rounded-lg ${item.key === 'outros' ? 'bg-red-50 border border-red-200 text-red-700' : ''}`}>
                        {item.key === 'outros' ? (
                            <div className="flex items-center gap-1 font-bold">
                                <span>Outros:</span>
                                <input 
                                    className="border-b border-red-300 bg-transparent w-40 px-1 focus:outline-none placeholder:text-red-300" 
                                    value={checkList.labelOutros} 
                                    onChange={e => setCheckList(prev => ({...prev, labelOutros: e.target.value}))} 
                                    placeholder="Descrever campo..."
                                />
                            </div>
                        ) : (
                            <span className="font-medium">{item.label}:</span>
                        )}
                        <div className="flex gap-2 ml-auto">
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" checked={checkList[item.key as keyof typeof checkList] === true} onChange={() => setCheckList(prev => ({...prev, [item.key]: true}))} /> OK
                            </label>
                            <label className="flex items-center gap-1 cursor-pointer">
                                <input type="radio" checked={checkList[item.key as keyof typeof checkList] === false} onChange={() => setCheckList(prev => ({...prev, [item.key]: false}))} /> Não OK
                            </label>
                        </div>
                        <span className="ml-2 font-bold">Obs:</span> <input className={`border-b w-1/3 bg-transparent ${item.key === 'outros' ? 'border-red-300' : 'border-slate-300'}`} value={getObsValueString(item.key)} onChange={e => setObsValue(item.key, e.target.value)} />
                    </div>
                ))}
                 {/* <div className="flex items-center gap-2 mt-4">
                    <span>Outros:</span>
                    <input 
                        className="border-b flex-1" 
                        value={checkList.obsOutros} 
                        onChange={e => setCheckList({...checkList, obsOutros: e.target.value})} 
                        placeholder="Descrever outros itens..."
                    />
                </div> */}
            </div>

            {digitalSignature && (
                <div className="mt-8 border-t-2 border-black pt-4 flex flex-col items-center justify-center">
                    <div className="text-center font-bold text-sm uppercase">Assinatura Digital - Validado Pelo Sistema</div>
                    <div className="text-center text-xs mt-1">Responsável: {digitalSignature.name}</div>
                    <div className="text-center text-[10px] text-zinc-600">Autenticado em: {digitalSignature.timestamp}</div>
                    <div className="text-center text-[8px] font-mono mt-1 text-slate-400">HASH: {digitalSignature.hash}</div>
                </div>
            )}
            
            <div className="mt-6 flex flex-wrap items-center gap-4 print:hidden">
                <button onClick={handlePrint} className="flex items-center gap-2 bg-indigo-900 text-white p-3 rounded-lg hover:bg-indigo-800 transition-colors">
                    <Printer className="h-4 w-4" /> Imprimir Relatório
                </button>
                <button 
                    onClick={() => setIsSignatureModalOpen(true)} 
                    className="flex items-center gap-2 bg-yellow-500 text-slate-900 p-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors"
                >
                    <PenTool className="h-4 w-4" /> Salvar PDF com Assinatura
                </button>
            </div>

            <AnimatePresence>
                {isSignatureModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print:hidden">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[2rem] shadow-2xl overflow-hidden w-full max-w-md"
                        >
                            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 text-white flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none mb-1">Assinatura Digital</h2>
                                    <p className="text-yellow-100 text-xs font-medium">Autenticação com senha</p>
                                </div>
                                <button onClick={() => setIsSignatureModalOpen(false)} className="bg-yellow-600/50 hover:bg-yellow-700/50 p-2 rounded-full transition-colors backdrop-blur-md text-white">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-6 bg-slate-50">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Responsável</label>
                                    <select 
                                        value={signName} 
                                        onChange={e => setSignName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                    >
                                        <option value="">Selecione um responsável...</option>
                                        {Object.keys(systemPasswords).map(key => (
                                            <option key={key} value={key}>{key}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Senha</label>
                                    <input 
                                        type="password" 
                                        value={signPassword} 
                                        onChange={e => setSignPassword(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
                                        placeholder="Digite a senha..."
                                    />
                                </div>

                                <button 
                                    onClick={() => {
                                        if (!signName) {
                                            toast.error("Selecione um nome.");
                                            return;
                                        }
                                        if (systemPasswords[signName] !== signPassword) {
                                            toast.error("Senha incorreta.");
                                            return;
                                        }
                                        const now = new Date();
                                        const sig = {
                                            name: signName,
                                            timestamp: now.toLocaleString('pt-BR'),
                                            hash: (Math.random() + 1).toString(36).substring(2).toUpperCase()
                                        };
                                        setDigitalSignature(sig);
                                        setIsSignatureModalOpen(false);
                                        toast.success("Assinatura validada! Gerando relatório...");
                                        
                                        // Execute print in popup with the generated signature
                                        executePrint(sig);
                                        
                                        // Reset form for a new entry
                                        resetForm();
                                    }}
                                    className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-900 font-black uppercase tracking-widest py-4 rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    Assinar e Salvar
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default RondaRegistroForm;
