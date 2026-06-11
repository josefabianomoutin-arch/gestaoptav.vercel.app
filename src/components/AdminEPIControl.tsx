import React, { useState, useMemo } from 'react';
import type { EpiLog, AcquisitionItem } from '../types';

interface AdminEPIControlProps {
  logs: EpiLog[];
  acquisitionItems: AcquisitionItem[];
  onRegister: (log: Omit<EpiLog, 'id'>) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<any>;
}

const AdminEPIControl: React.FC<AdminEPIControlProps> = ({ logs, acquisitionItems, onRegister, onDelete }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
  const [responsible, setResponsible] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState<number>(0);
  const [value, setValue] = useState<number>(0);
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const cleaningItems = useMemo(() => {
    return acquisitionItems.filter(item => item.category === "LIMPEZA" || item.category === "EPI" || item.name.toLowerCase().includes("limpeza") || item.name.toLowerCase().includes("epi"));
  }, [acquisitionItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsible.trim() || !itemName.trim() || quantity <= 0) {
      alert('Preencha os campos obrigatórios (Responsável, Item, Quantidade).');
      return;
    }
    setIsSaving(true);
    await onRegister({ date, time, responsible, itemName, quantity, value, observations });
    setResponsible('');
    setItemName('');
    setQuantity(0);
    setValue(0);
    setObservations('');
    setIsSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-lg border-t-4 border-orange-500">
        <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">Controle de EPIs</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="p-2 border rounded-lg" required />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} className="p-2 border rounded-lg" required />
          <input type="text" value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Responsável" className="p-2 border rounded-lg" required />
          
          <select value={itemName} onChange={e => setItemName(e.target.value)} className="p-2 border rounded-lg" required>
            <option value="">Selecione o Item</option>
            {cleaningItems.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          
          <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} placeholder="Quantidade" className="p-2 border rounded-lg" required />
          <input type="number" value={value} onChange={e => setValue(Number(e.target.value))} placeholder="Valor" className="p-2 border rounded-lg" />
          <input type="text" value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observações" className="col-span-1 md:col-span-2 lg:col-span-3 p-2 border rounded-lg" />
          
          <button type="submit" disabled={isSaving} className="col-span-1 md:col-span-2 lg:col-span-3 bg-orange-600 text-white py-2 rounded-lg font-black hover:bg-orange-700">
            {isSaving ? 'Salvando...' : 'Registrar'}
          </button>
        </form>
      </div>
      
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <h3 className="text-xl font-black text-gray-800 mb-4 uppercase">Histórico de EPIs</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 uppercase text-[10px] font-black border-b">
              <th className="p-2 text-left">Data/Hora</th>
              <th className="p-2 text-left">Responsável</th>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left">Qtd</th>
              <th className="p-2 text-left">Valor</th>
              <th className="p-2 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b">
                <td className="p-2 font-mono">{log.date} {log.time}</td>
                <td className="p-2">{log.responsible}</td>
                <td className="p-2">{log.itemName}</td>
                <td className="p-2">{log.quantity}</td>
                <td className="p-2">R$ {log.value.toFixed(2)}</td>
                <td className="p-2">
                  <button onClick={() => onDelete(log.id)} className="text-red-500 hover:text-red-700">Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEPIControl;
