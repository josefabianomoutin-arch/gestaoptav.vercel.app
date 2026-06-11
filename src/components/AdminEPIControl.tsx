import React, { useState, useMemo } from 'react';
import type { EpiLog, AcquisitionItem } from '../types';

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
  const [isSaving, setIsSaving] = useState(false);

  // Group items by category to make it extremely clear
  const cleaningItems = useMemo(() => {
    return acquisitionItems.filter(item => 
      item.category === "LIMPEZA" || 
      item.category === "EPI" || 
      item.name.toLowerCase().includes("limpeza") || 
      item.name.toLowerCase().includes("epi")
    );
  }, [acquisitionItems]);

  // Apply search filtering on cleaning items
  const filteredCleaningItems = useMemo(() => {
    if (!itemSearchText.trim()) return cleaningItems;
    const term = itemSearchText.toLowerCase();
    return cleaningItems.filter(item => item.name.toLowerCase().includes(term));
  }, [cleaningItems, itemSearchText]);

  // Find currently selected item details
  const selectedItem = useMemo(() => {
    return cleaningItems.find(item => item.name === itemName);
  }, [itemName, cleaningItems]);

  // Calculate dynamic total value
  const calculatedValue = useMemo(() => {
    if (!selectedItem) return 0;
    const unitPrice = selectedItem.unitValue || 0;
    return unitPrice * quantity;
  }, [selectedItem, quantity]);

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

  return (
    <div className="space-y-6">
      {onRegister && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-orange-500">
          <h2 className="text-xl font-black text-gray-800 mb-4 uppercase flex items-center gap-2">
            <span>🛡️ Controle de Entrega de EPIs</span>
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Data</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Horário</label>
                <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Responsável / Funcionário</label>
                <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Nome completo" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" required />
              </div>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Matrícula</label>
                <input type="text" value={registration} onChange={e => setRegistration(e.target.value)} placeholder="ex: 12.345-6" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
              <div className="flex flex-col lg:col-span-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Buscar & Selecionar Item de Limpeza / EPI</label>
                <div className="space-y-1.5">
                  <input 
                    type="text" 
                    value={itemSearchText} 
                    onChange={e => setItemSearchText(e.target.value)} 
                    placeholder="🔍 Digite para buscar nos itens..." 
                    className="p-3 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50"
                  />
                  <select 
                    value={itemName} 
                    onChange={e => {
                      setItemName(e.target.value);
                      const matched = cleaningItems.find(x => x.name === e.target.value);
                      if (matched) {
                        setItemSearchText(matched.name);
                      }
                    }} 
                    className="p-3 border rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white" 
                    required
                  >
                    <option value="">Selecione o Item ({filteredCleaningItems.length} encontrados)</option>
                    {filteredCleaningItems.map(item => (
                      <option key={item.id} value={item.name}>
                        {item.name} (R$ {(item.unitValue || 0).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Quantidade</label>
                <input type="number" min="1" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} placeholder="Quantidade" className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" required />
              </div>

              <div className="flex flex-col p-3 bg-orange-50 rounded-xl border border-orange-200">
                <span className="text-[9px] font-bold text-orange-600 uppercase">Resumo Financeiro</span>
                <div className="flex justify-between mt-1 text-xs">
                  <span className="text-gray-500">Unitário:</span>
                  <span className="font-bold text-gray-800">R$ {(selectedItem?.unitValue || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Valor Total:</span>
                  <span className="font-black text-orange-700">R$ {calculatedValue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">Observações</label>
              <input type="text" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Informações adicionais..." className="p-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50" />
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-orange-600 text-white py-3.5 rounded-xl font-black uppercase tracking-wider text-xs hover:bg-orange-700 transition-all transition-duration-150 flex items-center justify-center gap-2">
              {isSaving ? 'Salvando...' : 'Registrar Entrega de EPI'}
            </button>
          </form>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">📋 Histórico de Entregas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 uppercase text-[10px] font-black border-b border-gray-100">
                <th className="p-3 text-left">Data/Hora</th>
                <th className="p-3 text-left">Responsável</th>
                <th className="p-3 text-left">Matrícula</th>
                <th className="p-3 text-left">Item de Limpeza / EPI</th>
                <th className="p-3 text-center">Quant.</th>
                <th className="p-3 text-right">Valor Total</th>
                {onDelete && <th className="p-3 text-center">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={onDelete ? 7 : 6} className="p-8 text-center text-gray-400 font-medium">
                    Nenhuma entrega registrada ainda.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 font-mono text-xs text-gray-500">{log.date} {log.time}</td>
                    <td className="p-3 font-semibold text-gray-700">{log.responsible}</td>
                    <td className="p-3 text-gray-600">{log.registration || <span className="text-gray-300">-</span>}</td>
                    <td className="p-3 text-gray-600">{log.itemName}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{log.quantity}</td>
                    <td className="p-3 text-right font-bold text-emerald-600">R$ {(log.value || 0).toFixed(2)}</td>
                    {onDelete && (
                      <td className="p-3 text-center">
                        <button 
                          onClick={() => {
                            if (confirm('Tem certeza de que deseja deletar este registro?')) {
                              onDelete(log.id);
                            }
                          }} 
                          className="text-red-500 hover:text-red-700 font-bold transition-colors"
                        >
                          Excluir
                        </button>
                      </td>
                    )}
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
