import React, { useState, useMemo } from 'react';
import type { EpiLog, AcquisitionItem } from '../types';

const formatDateExtended = (dateStr: string) => {
  if (!dateStr) return '';
  let year: string;
  let monthStr: string;
  let dayStr: string;

  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts[0].length === 4) {
      year = parts[0];
      monthStr = parts[1];
      dayStr = parts[2];
    } else {
      year = parts[2];
      monthStr = parts[1];
      dayStr = parts[0];
    }
  } else if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts[2].length === 4) {
      year = parts[2];
      monthStr = parts[1];
      dayStr = parts[0];
    } else {
      year = parts[0];
      monthStr = parts[1];
      dayStr = parts[2];
    }
  } else {
    const dateObj = new Date(dateStr);
    if (!isNaN(dateObj.getTime())) {
      year = String(dateObj.getFullYear());
      monthStr = String(dateObj.getMonth() + 1);
      dayStr = String(dateObj.getDate());
    } else {
      return dateStr;
    }
  }

  const day = parseInt(dayStr, 10);
  const monthIndex = parseInt(monthStr, 10) - 1;
  const months = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
    return `${day} de ${months[monthIndex]} de ${year}`;
  }
  return dateStr;
};

interface AdminEPIControlProps {
  logs: EpiLog[];
  acquisitionItems?: AcquisitionItem[];
  onRegister?: (log: Omit<EpiLog, 'id'>) => Promise<{ success: boolean; message: string }>;
  onDelete?: (id: string) => Promise<any>;
}

const AdminEPIControl: React.FC<AdminEPIControlProps> = ({ logs, acquisitionItems = [], onRegister, onDelete }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [responsible, setResponsible] = useState('');
  const [registration, setRegistration] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [observations, setObservations] = useState('');
  const [itemSearchText, setItemSearchText] = useState('');
  const [historySearchText, setHistorySearchText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // States for print preview modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printTargetLog, setPrintTargetLog] = useState<EpiLog | null>(null);
  const [printType, setPrintType] = useState<'individual' | 'general'>('individual');

  // Filter items specifically of category EPI
  const epiItems = useMemo(() => {
    return acquisitionItems.filter(item => 
      item.category === "EPI"
    );
  }, [acquisitionItems]);

  // Apply search filtering on EPI items
  const filteredEpiItems = useMemo(() => {
    if (!itemSearchText.trim()) return epiItems;
    const term = itemSearchText.toLowerCase();
    return epiItems.filter(item => item.name.toLowerCase().includes(term));
  }, [epiItems, itemSearchText]);

  // Find currently selected item details
  const selectedItem = useMemo(() => {
    return epiItems.find(item => item.name === itemName);
  }, [itemName, epiItems]);

  // Calculate dynamic total value
  const calculatedValue = useMemo(() => {
    if (!selectedItem) return 0;
    const unitPrice = selectedItem.unitValue || 0;
    return unitPrice * quantity;
  }, [selectedItem, quantity]);

  // Apply filter to logs history
  const filteredLogs = useMemo(() => {
    if (!historySearchText.trim()) return logs;
    const term = historySearchText.toLowerCase();
    return logs.filter(log => 
      log.responsible.toLowerCase().includes(term) ||
      (log.registration && log.registration.toLowerCase().includes(term)) ||
      log.itemName.toLowerCase().includes(term)
    );
  }, [logs, historySearchText]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegister) return;
    if (!responsible.trim() || !itemName.trim() || quantity <= 0) {
      alert('Preencha os campos obrigatórios (Responsável, Item, Quantidade).');
      return;
    }
    setIsSaving(true);
    await onRegister({ 
      date, 
      time, 
      responsible, 
      registration: registration.trim() || undefined,
      itemName, 
      quantity, 
      value: calculatedValue, 
      observations 
    });
    setResponsible('');
    setRegistration('');
    setItemName('');
    setItemSearchText('');
    setQuantity(0);
    setObservations('');
    setIsSaving(false);
  };

  const triggerIndividualPrint = (log: EpiLog) => {
    setPrintTargetLog(log);
    setPrintType('individual');
    setPrintModalOpen(true);
  };

  const triggerGeneralPrint = () => {
    setPrintType('general');
    setPrintModalOpen(true);
  };

  const handlePrintAction = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ON-SCREEN PRINT PREVIEW MODAL */}
      {printModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto no-print">
          <div className="bg-white text-zinc-900 rounded-3xl p-6 md:p-8 w-full max-w-3xl shadow-2xl relative space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 pb-4">
              <h2 className="text-lg font-black text-gray-800 uppercase">🛡️ Visualização de Impressão</h2>
              <button 
                onClick={() => setPrintModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-extrabold text-xl p-1"
              >
                ✕
              </button>
            </div>

            {/* PREVIEW CONTAINER DESIGNED A4 EXACT STYLE */}
            <div className="border border-gray-300 p-6 md:p-10 bg-white rounded-2xl max-h-[60vh] overflow-y-auto shadow-inner text-zinc-800 font-sans">
              
              {/* INDIVIDUAL LOG PREVIEW */}
              {printType === 'individual' && printTargetLog && (
                <div className="space-y-6 text-sm">
                  <div className="text-center border-b border-gray-400 pb-4 space-y-1">
                    <h3 className="text-base font-black tracking-wide">PENITENCIÁRIA DE TAIÚVA</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Secretaria de Administração Penitenciária - SP</p>
                    <h4 className="text-md font-bold mt-2 uppercase text-orange-600">TERMO DE RESPONSABILIDADE E ENTREGA DE EPI</h4>
                  </div>
                  
                  <p className="text-justify leading-relaxed text-xs">
                    Declaro para os devidos fins de direito, que recebi do Setor de Almoxarifado desta unidade prisional, em perfeitas condições de higiene e uso, o Equipamento de Proteção Individual (EPI) listado abaixo, comprometendo-me a fazer o uso correto do mesmo e preservá-lo atendendo os normativos vigentes de segurança.
                  </p>

                  <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-1.5 text-xs">
                    <div><strong>Beneficiário (PPL):</strong> <span className="uppercase font-semibold">{printTargetLog.responsible}</span></div>
                    {printTargetLog.registration && <div><strong>Matrícula:</strong> <span className="font-mono">{printTargetLog.registration}</span></div>}
                    <div><strong>Equipamento (Item):</strong> <span className="font-medium text-orange-700">{printTargetLog.itemName}</span></div>
                    <div><strong>Quantidade:</strong> <span>{printTargetLog.quantity} unidade(s)</span></div>
                    <div><strong>Data/Hora de Retirada:</strong> <span className="font-mono">{printTargetLog.date} às {printTargetLog.time}</span></div>
                    {printTargetLog.value > 0 && <div><strong>Custo Registrado:</strong> <span>R$ {printTargetLog.value.toFixed(2)}</span></div>}
                    {printTargetLog.observations && <div><strong>Observações:</strong> <span className="italic text-zinc-500">{printTargetLog.observations}</span></div>}
                  </div>

                  <div className="pt-10 space-y-8 text-center animate-fade-in">
                    <p className="text-right text-xs font-semibold">Taiúva - SP, {formatDateExtended(printTargetLog.date)}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-4">
                      <div className="space-y-1.5">
                        <div className="border-t border-zinc-500 w-3/4 mx-auto"></div>
                        <p className="text-xs font-bold uppercase">{printTargetLog.responsible}</p>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Assinatura da Pessoa Privada de Liberdade</p>
                      </div>
                      <div className="space-y-1.5">
                        <div className="border-t border-zinc-300 w-3/4 mx-auto"></div>
                        <p className="text-xs font-semibold uppercase text-zinc-600">Almoxarifado / Segurança</p>
                        <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Responsável pela Entrega</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* GENERAL LIST PREVIEW */}
              {printType === 'general' && (
                <div className="space-y-6 text-sm">
                  <div className="text-center border-b border-gray-400 pb-4 space-y-1">
                    <h3 className="text-base font-black tracking-wide">PENITENCIÁRIA DE TAIÚVA</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Secretaria de Administração Penitenciária - SP</p>
                    <h4 className="text-md font-bold mt-2 uppercase text-indigo-700">COORDENADORIA DE ATIVIDADES E CONTROLE DE EPIS</h4>
                    {historySearchText.trim() && (
                      <p className="text-xs font-bold text-gray-600 uppercase mt-1">Filtro aplicado: "{historySearchText}"</p>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-zinc-300 text-[10px]">
                      <thead>
                        <tr className="bg-zinc-100 border-b border-zinc-300 uppercase font-bold text-zinc-700">
                          <th className="p-1.5 border-r border-zinc-300">Data</th>
                          <th className="p-1.5 border-r border-zinc-300">Beneficiário (PPL)</th>
                          <th className="p-1.5 border-r border-zinc-300">Matrícula</th>
                          <th className="p-1.5 border-r border-zinc-300">Equipamento</th>
                          <th className="p-1.5 border-r border-zinc-300 text-center">Quant.</th>
                          <th className="p-1.5 text-right">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200">
                        {filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-zinc-50">
                            <td className="p-1.5 border-r border-zinc-300 font-mono text-[9px]">{log.date} {log.time}</td>
                            <td className="p-1.5 border-r border-zinc-300 font-bold uppercase">{log.responsible}</td>
                            <td className="p-1.5 border-r border-zinc-300 font-mono">{log.registration || '-'}</td>
                            <td className="p-1.5 border-r border-zinc-300">{log.itemName}</td>
                            <td className="p-1.5 border-r border-zinc-300 text-center font-semibold">{log.quantity}</td>
                            <td className="p-1.5 text-right font-mono">R$ {log.value.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* SIGNATURE BLOCK FOR GENERAL REPORT */}
                  {filteredLogs.length > 0 && (
                    <div className="pt-6 space-y-6">
                      <p className="text-[11px] text-zinc-500 text-justify leading-relaxed">
                        Pelo instrumento geral de controle consolidado acima, os beneficiários acima identificados dão ciência do adimplemento, conformidade e adestramento de uso dos respectivos equipamentos descritos.
                      </p>
                      
                      {/* If filtered by a single person, highlight their signature line as requested */}
                      {historySearchText.trim() && filteredLogs.length > 0 ? (
                        <div className="space-y-8 text-center pt-4">
                          <p className="text-right text-xs">Taiúva - SP, {formatDateExtended(new Date().toLocaleDateString('pt-BR'))}</p>
                          <div className="space-y-1.5 max-w-sm mx-auto">
                            <div className="border-t border-zinc-500 w-3/4 mx-auto"></div>
                            <p className="text-xs font-bold uppercase">{filteredLogs[0].responsible}</p>
                            <p className="text-[9px] text-zinc-400 uppercase tracking-widest">Assinatura da Pessoa Privada de Liberdade</p>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-8 pt-4 text-center">
                          <div className="space-y-1.5">
                            <div className="border-t border-zinc-300 w-3/4 mx-auto"></div>
                            <p className="text-[10px] font-bold uppercase text-zinc-500">SETOR DE TRABALHO / LABORTERAPIA</p>
                            <p className="text-[9px] text-zinc-400 uppercase">Assinatura do Diretor de Trabalho</p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="border-t border-zinc-300 w-3/4 mx-auto"></div>
                            <p className="text-[10px] font-bold uppercase text-zinc-500">ALMOXARIFADO</p>
                            <p className="text-[9px] text-zinc-400 uppercase">Conferente Geral</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setPrintModalOpen(false)}
                className="flex-1 bg-zinc-200 text-zinc-700 py-3 rounded-xl font-bold uppercase text-xs hover:bg-zinc-300 transition-all"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handlePrintAction}
                className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-orange-700 transition-all shadow-md shadow-orange-600/20"
              >
                🖨️ Confirmar e Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RENDER FOR HIDDEN PRINT ENGINE (This is printed because of @media print css) */}
      <div className="hidden print:block bg-white text-zinc-900 p-8 w-full font-sans text-sm">
        {printType === 'individual' && printTargetLog ? (
          <div className="space-y-8 max-w-2xl mx-auto">
            <div className="text-center border-b-2 border-zinc-800 pb-4 space-y-1">
              <h3 className="text-lg font-black tracking-wide">PENITENCIÁRIA DE TAIÚVA</h3>
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Secretaria de Administração Penitenciária - SP</p>
              <h4 className="text-lg font-extrabold mt-3 uppercase text-black tracking-wide">TERMO DE RESPONSABILIDADE E ENTREGA DE EPI</h4>
            </div>
            
            <p className="text-justify leading-relaxed indent-8 text-xs">
              Declaro para os devidos fins de direito, que recebi do Setor de Almoxarifado desta unidade prisional, em perfeitas condições de higiene e uso, o Equipamento de Proteção Individual (EPI) listado abaixo, comprometendo-me a fazer o uso correto do mesmo e preservá-lo atendendo os normativos vigentes de segurança e disciplina de labor.
            </p>

            <div className="border-2 border-zinc-800 p-4 rounded-lg space-y-2 text-xs">
              <div><strong>Beneficiário (PPL):</strong> <span className="uppercase font-bold text-sm">{printTargetLog.responsible}</span></div>
              {printTargetLog.registration && <div><strong>Matrícula:</strong> <span className="font-mono font-bold">{printTargetLog.registration}</span></div>}
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div><strong>Equipamento (Item):</strong> <span className="font-bold">{printTargetLog.itemName}</span></div>
                <div><strong>Quantidade:</strong> <span className="font-bold">{printTargetLog.quantity} unidade(s)</span></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><strong>Data de Retirada:</strong> <span className="font-mono">{printTargetLog.date}</span></div>
                <div><strong>Horário:</strong> <span className="font-mono">{printTargetLog.time}</span></div>
              </div>
              {printTargetLog.value > 0 && <div><strong>Custo Registrado:</strong> <span className="font-bold">R$ {printTargetLog.value.toFixed(2)}</span></div>}
              {printTargetLog.observations && <div><strong>Observações Gerais:</strong> <span className="italic">{printTargetLog.observations}</span></div>}
            </div>

            <div className="pt-20 space-y-16">
              <p className="text-right text-xs font-bold">Taiúva - SP, {formatDateExtended(printTargetLog.date)}</p>
              <div className="grid grid-cols-2 gap-12 text-center pt-8">
                <div className="space-y-2">
                  <div className="border-t border-black w-11/12 mx-auto"></div>
                  <p className="text-xs font-bold uppercase">{printTargetLog.responsible}</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Assinatura da Pessoa Privada de Liberdade</p>
                </div>
                <div className="space-y-2">
                  <div className="border-t border-black w-11/12 mx-auto"></div>
                  <p className="text-xs font-bold uppercase">ALMOXARIFADO / SEÇÃO DE EPIs</p>
                  <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Servidor Responsável</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center border-b-2 border-black pb-4 space-y-1">
              <h3 className="text-lg font-black tracking-wide">PENITENCIÁRIA DE TAIÚVA</h3>
              <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold">Secretaria de Administração Penitenciária - SP</p>
              <h4 className="text-md font-bold mt-2 uppercase">RELATÓRIO CONSOLIDADO / HISTÓRICO DE ENTREGA DE EPI</h4>
              {historySearchText.trim() && (
                <p className="text-xs font-bold uppercase mt-1">Beneficiário: {historySearchText}</p>
              )}
            </div>

            <table className="w-full text-left border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-zinc-100 border-b-2 border-black uppercase font-bold">
                  <th className="p-2 border border-black">Data/Hora</th>
                  <th className="p-2 border border-black">Beneficiário (PPL)</th>
                  <th className="p-2 border border-black">Matrícula</th>
                  <th className="p-2 border border-black">Equipamento</th>
                  <th className="p-2 border border-black text-center">Qtd.</th>
                  <th className="p-2 border border-black text-right">Valor Consolidado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map(log => (
                  <tr key={log.id} className="border-b border-zinc-400">
                    <td className="p-2 border border-black font-mono">{log.date} {log.time}</td>
                    <td className="p-2 border border-black font-bold uppercase">{log.responsible}</td>
                    <td className="p-2 border border-black font-mono">{log.registration || '-'}</td>
                    <td className="p-2 border border-black">{log.itemName}</td>
                    <td className="p-2 border border-black text-center font-bold">{log.quantity}</td>
                    <td className="p-2 border border-black text-right font-mono">R$ {log.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* General table signature block */}
            {filteredLogs.length > 0 && (
              <div className="pt-16 space-y-12">
                <p className="text-xs text-justify leading-relaxed">
                  Os agentes de labor e responsáveis pelas pessoas privadas de liberdade detalhadas acima dão fé de que todas as quantidades e itens especificados foram de fato asseverados aos destinos de laborterapia e vigilância individual prescrita.
                </p>
                
                {historySearchText.trim() && filteredLogs.length > 0 ? (
                  <div className="space-y-2 text-center pt-4">
                    <p className="text-right text-xs font-bold">Taiúva - SP, {formatDateExtended(new Date().toLocaleDateString('pt-BR'))}</p>
                    <div className="border-t border-black w-1/2 mx-auto pt-2">
                      <p className="text-xs font-bold uppercase">{filteredLogs[0].responsible}</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Assinatura da Pessoa Privada de Liberdade</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-12 text-center pt-8">
                    <div className="space-y-2">
                      <div className="border-t border-black w-11/12 mx-auto"></div>
                      <p className="text-xs font-bold uppercase">CHEFE DE DEPARTAMENTO / DIRETORIA</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Responsável Setorial</p>
                    </div>
                    <div className="space-y-2">
                      <div className="border-t border-black w-11/12 mx-auto"></div>
                      <p className="text-xs font-bold uppercase">CONFERÊNCIA ALMOXARIFADO</p>
                      <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Supervisor Técnico</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* REGISTER FORM (SCREEN ONLY) */}
      {onRegister && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-orange-500 no-print">
          <h2 className="text-xl font-black text-gray-800 mb-4 uppercase flex items-center gap-2">
            <span>🛡️ Controle de Entrega de EPIs</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Horário</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Pessoa Privada de Liberdade (PPL)</label>
                <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome completo" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Matrícula (PPL)</label>
                <input type="text" value={registration} onChange={e => setRegistration(e.target.value)} placeholder="ex: 123.456-7" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col lg:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar & Selecionar Item de EPI</label>
                <div className="space-y-1.5">
                  <input 
                    type="text" 
                    value={itemSearchText} 
                    onChange={e => setItemSearchText(e.target.value)} 
                    placeholder="🔍 Digite para filtrar os EPIs cadastrados..." 
                    className="p-3 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800"
                  />
                  <select 
                    value={itemName} 
                    onChange={e => {
                      setItemName(e.target.value);
                      const matched = epiItems.find(x => x.name === e.target.value);
                      if (matched) {
                        setItemSearchText(matched.name);
                      }
                    }} 
                    className="p-3 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white text-gray-800 font-medium" 
                    required
                  >
                    <option value="">Selecione o EPI ({filteredEpiItems.length} encontrados)</option>
                    {filteredEpiItems.map(item => (
                      <option key={item.id} value={item.name}>
                        {item.name} (R$ {(item.unitValue || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Quantidade</label>
                <input type="number" min="1" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} placeholder="Quantidade" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" required />
              </div>

              <div className="flex flex-col p-3 bg-orange-50 rounded-xl border border-orange-200">
                <span className="text-[9px] font-bold text-orange-600 uppercase">Resumo Financeiro</span>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Unitário:</span>
                  <span className="font-bold text-zinc-800">R$ {(selectedItem?.unitValue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-black text-orange-700">R$ {calculatedValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Observações</label>
              <input type="text" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Informações adicionais..." className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 text-gray-800" />
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-orange-700 transition-all transition-duration-150 flex items-center justify-center gap-2">
              {isSaving ? 'Salvando...' : 'Registrar Entrega de EPI'}
            </button>
          </form>
        </div>
      )}
      
      {/* HISTORY & REPORT SEARCH LIST (SCREEN ONLY) */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 no-print">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
          <div>
            <h3 className="text-lg font-black text-zinc-800 uppercase flex items-center gap-2">
              <span>📋 Histórico de Entregas</span>
            </h3>
            <p className="text-xs text-zinc-400">Exibindo histórico de EPIs registrados na base de dados.</p>
          </div>
          
          <button 
            onClick={triggerGeneralPrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] tracking-wider transition-all shadow-md flex items-center gap-2"
          >
            🖨️ Imprimir Relatório Geral
          </button>
        </div>

        {/* SEARCH AND QUICK FILTER BLOCK */}
        <div className="mb-4 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
          <input 
            type="text" 
            value={historySearchText} 
            onChange={e => setHistorySearchText(e.target.value)} 
            placeholder="Pesquisar por nome do PPL, matrícula ou nome do equipamento..." 
            className="p-3 pl-10 border rounded-xl w-full text-xs text-zinc-800 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {historySearchText.trim() && (
            <button 
              onClick={() => setHistorySearchText('')} 
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
            >
              Limpar Filtro
            </button>
          )}
        </div>

        {/* FILTER BANNER FOR PRINTING SINGLE USER */}
        {historySearchText.trim() && filteredLogs.length > 0 && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex justify-between items-center text-xs">
            <span className="text-indigo-800 font-medium">
              💡 Pronto para imprimir a <strong>Ficha de EPI Individual</strong> de <span className="uppercase font-bold">{filteredLogs[0].responsible}</span>?
            </span>
            <button 
              onClick={triggerGeneralPrint}
              className="bg-indigo-700 hover:bg-indigo-900 text-white px-3 py-1.5 rounded-lg text-[9px] uppercase font-bold tracking-wider transition-all"
            >
              🖨️ Imprimir Ficha de {filteredLogs[0].responsible.split(' ')[0]}
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 uppercase text-[10px] font-black border-b border-gray-100">
                <th className="p-3 text-left">Data/Hora</th>
                <th className="p-3 text-left">PPL (Recebedor)</th>
                <th className="p-3 text-left">Matrícula</th>
                <th className="p-3 text-left">EPI</th>
                <th className="p-3 text-center">Quant.</th>
                <th className="p-3 text-right">Valor Total</th>
                <th className="p-3 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 font-medium">
                    {historySearchText.trim() ? 'Nenhum registro correspondente à busca.' : 'Nenhuma entrega registrada ainda.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-500">{log.date} {log.time}</td>
                    <td className="p-3 font-semibold text-gray-700 uppercase">{log.responsible}</td>
                    <td className="p-3 text-gray-600 font-medium">{log.registration || <span className="text-gray-300">-</span>}</td>
                    <td className="p-3 text-gray-600">{log.itemName}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{log.quantity}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">R$ {(log.value || 0).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <div className="flex gap-3 justify-center">
                        <button 
                          onClick={() => triggerIndividualPrint(log)}
                          className="text-indigo-600 hover:text-indigo-800 font-bold transition-colors text-xs"
                          title="Imprimir Termo de Entrega Individual"
                        >
                          Imprimir Termo
                        </button>
                        {onDelete && (
                          <button 
                            onClick={() => {
                              if (confirm('Tem certeza de que deseja deletar este registro?')) {
                                onDelete(log.id);
                              }
                            }} 
                            className="text-red-500 hover:text-red-700 font-bold transition-colors text-xs"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminEPIControl;
