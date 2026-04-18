import React, { useState } from 'react';
import { VehicleInspection, VehicleAsset, DriverAsset } from '../types';

interface VehicleInspectionTabProps {
  inspections: VehicleInspection[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  onRegister: (inspection: Omit<VehicleInspection, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdate: (inspection: VehicleInspection) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<void>;
}

const VehicleInspectionTab: React.FC<VehicleInspectionTabProps> = ({
  inspections,
  vehicleAssets,
  driverAssets,
  onRegister,
  onUpdate,
  onDelete
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInspection, setEditingInspection] = useState<VehicleInspection | null>(null);
  
  const [formData, setFormData] = useState<Omit<VehicleInspection, 'id'>>({
    vehicleId: '',
    driverId: '',
    inspector: '',
    date: new Date().toISOString().slice(0, 16),
    type: 'INÍCIO DO PLANTÃO',
    items: {},
    breakdownDescription: '',
    lightingIssues: [],
    lightingDescription: '',
    fluidIssues: [],
    fluidDescription: '',
    mechanicIssues: [],
    mechanicDescription: '',
    wheelIssues: [],
    wheelDescription: '',
    damageIssues: [],
    damageDescription: ''
  });

  const lightingOptions = [
    'LUZ ALTA', 'LUZ BAIXA', 'LANTERNAS DIANTEIRAS', 'SETAS DIANTEIRAS E TRASEIRAS',
    'LUZ DE RÉ', 'LUZ PAINEL', 'ILUMINAÇÃO INTERNA', 'GIROFLEX OU STROBO'
  ];

  const fluidOptions = [
    'NÍVEL DO FLUIDO DE FREIO', 'NÍVEL LIQUIDO DE ARREFECIMENTO', 'NÍVEL ÓLEO DO CÂMBIO',
    'NÍVEL ÓLEO DO MOTOR', 'NÍVEL FLUÍDO DA DIREÇÃO HIDRÁULICA', 'NÍVEL DE COMBUSTÍVEL'
  ];

  const mechanicOptions = [
    'SISTEMA DE FREIOS', 'FREIOS DE ESTACIONAMENTO', 'SISTEMA DE DIREÇÃO',
    'SISTEMA DE ACELERAÇÃO', 'SISTEMA DE REFRIGERAÇÃO'
  ];

  const wheelOptions = [
    'CALIBRAGEM DOS PNEUS', 'PNEUS DANIFICADOS OU SEM CONDIÇÕES DE RODAGEM',
    'RODAS DANIFICADAS OU SEM CONDIÇÕES DE RODAGEM'
  ];

  const damageOptions = [
    'PORTAS', 'CAPÔ', 'CARROCERIA', 'PARALAMAS', 'PARACHOQUES',
    'VIDROS', 'GIROFLEX', 'CADEADOS, TRAVAS E CHAVES'
  ];

  const handleCheckboxChange = (category: 'lightingIssues' | 'fluidIssues' | 'mechanicIssues' | 'wheelIssues' | 'damageIssues', option: string) => {
    setFormData(prev => {
      const currentList = prev[category];
      if (currentList.includes(option)) {
        return { ...prev, [category]: currentList.filter(item => item !== option) };
      } else {
        return { ...prev, [category]: [...currentList, option] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingInspection) {
      await onUpdate({ ...formData, id: editingInspection.id });
    } else {
      await onRegister(formData);
    }
    setIsModalOpen(false);
  };

  const openNewModal = () => {
    setEditingInspection(null);
    setFormData({
      vehicleId: '',
      driverId: '',
      date: new Date().toISOString().slice(0, 16),
      type: 'INÍCIO DO PLANTÃO',
      breakdownDescription: '',
      lightingIssues: [],
      lightingDescription: '',
      fluidIssues: [],
      fluidDescription: '',
      mechanicIssues: [],
      mechanicDescription: '',
      wheelIssues: [],
      wheelDescription: '',
      damageIssues: [],
      damageDescription: ''
    });
    setIsModalOpen(true);
  };

  const openEditModal = (inspection: VehicleInspection) => {
    setEditingInspection(inspection);
    setFormData({
      vehicleId: inspection.vehicleId,
      driverId: inspection.driverId,
      date: inspection.date,
      type: inspection.type,
      breakdownDescription: inspection.breakdownDescription || '',
      lightingIssues: inspection.lightingIssues || [],
      lightingDescription: inspection.lightingDescription || '',
      fluidIssues: inspection.fluidIssues || [],
      fluidDescription: inspection.fluidDescription || '',
      mechanicIssues: inspection.mechanicIssues || [],
      mechanicDescription: inspection.mechanicDescription || '',
      wheelIssues: inspection.wheelIssues || [],
      wheelDescription: inspection.wheelDescription || '',
      damageIssues: inspection.damageIssues || [],
      damageDescription: inspection.damageDescription || ''
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in mt-8">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-black text-gray-800 uppercase tracking-tighter italic">Controle de Verificação</h3>
        <button 
          onClick={openNewModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-2 px-6 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase text-[10px] tracking-widest flex items-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nova Inspeção
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[9px] uppercase text-gray-400 font-black">
              <tr>
                <th className="p-4 text-left">Data/Hora</th>
                <th className="p-4 text-left">Veículo</th>
                <th className="p-4 text-left">Motorista</th>
                <th className="p-4 text-left">Tipo</th>
                <th className="p-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {inspections.map(inspection => {
                const vehicle = vehicleAssets.find(v => v.id === inspection.vehicleId);
                const driver = driverAssets.find(d => d.id === inspection.driverId);
                return (
                  <tr key={inspection.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 font-medium text-gray-900">
                      {new Date(inspection.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="p-4 font-bold text-gray-700">
                      {vehicle ? `${vehicle.model} - ${vehicle.plate}` : 'Desconhecido'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {driver ? driver.name : 'Desconhecido'}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest ${inspection.type === 'INÍCIO DO PLANTÃO' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {inspection.type}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => openEditModal(inspection)} className="text-indigo-600 hover:text-indigo-900 font-bold text-[10px] uppercase tracking-widest">Editar</button>
                      <button onClick={() => onDelete(inspection.id)} className="text-red-600 hover:text-red-900 font-bold text-[10px] uppercase tracking-widest">Excluir</button>
                    </td>
                  </tr>
                );
              })}
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-bold text-xs uppercase tracking-widest">Nenhuma inspeção registrada</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl border border-gray-100 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10 rounded-t-[2rem]">
              <div>
                <h3 className="text-2xl font-black text-gray-800 uppercase tracking-tighter italic">
                  {editingInspection ? 'Editar Inspeção' : 'Nova Inspeção'}
                </h3>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">Verificação de Veículos</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2 rounded-xl transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Veículo</label>
                  <select
                    required
                    value={formData.vehicleId}
                    onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="">Selecione o veículo</option>
                    {vehicleAssets.map(v => (
                      <option key={v.id} value={v.id}>{v.model} - {v.plate}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Motorista</label>
                  <select
                    required
                    value={formData.driverId}
                    onChange={e => setFormData({...formData, driverId: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="">Selecione o motorista</option>
                    {driverAssets.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Data e Hora</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.date}
                    onChange={e => setFormData({...formData, date: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipo de Inspeção</label>
                  <select
                    required
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value as any})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  >
                    <option value="INÍCIO DO PLANTÃO">INÍCIO DO PLANTÃO (INSPEÇÃO INICIAL)</option>
                    <option value="QUEBRA DURANTE O PERCURSO">QUEBRA DURANTE O PERCURSO</option>
                  </select>
                </div>
              </div>

              {formData.type === 'QUEBRA DURANTE O PERCURSO' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrever a quebra durante o percurso</label>
                  <textarea
                    value={formData.breakdownDescription}
                    onChange={e => setFormData({...formData, breakdownDescription: e.target.value})}
                    className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[100px]"
                  />
                </div>
              )}

              <div className="space-y-8 divide-y divide-gray-100">
                {/* Iluminação */}
                <div className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">Iluminação</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selecionar as que não estão em funcionamento</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {lightingOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.lightingIssues.includes(opt)}
                          onChange={() => handleCheckboxChange('lightingIssues', opt)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Problema Encontrado</label>
                    <textarea
                      value={formData.lightingDescription}
                      onChange={e => setFormData({...formData, lightingDescription: e.target.value})}
                      placeholder="Informar o problema na iluminação."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Fluidos */}
                <div className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">Conferência dos Fluidos</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selecionar as que estão abaixo do nível</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {fluidOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.fluidIssues.includes(opt)}
                          onChange={() => handleCheckboxChange('fluidIssues', opt)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Problema Encontrado</label>
                    <textarea
                      value={formData.fluidDescription}
                      onChange={e => setFormData({...formData, fluidDescription: e.target.value})}
                      placeholder="Informar o problema ou a correção do nível na conferência."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Sistema Mecânico */}
                <div className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">Sistema Mecânico</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selecionar as que não estão em funcionamento</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {mechanicOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.mechanicIssues.includes(opt)}
                          onChange={() => handleCheckboxChange('mechanicIssues', opt)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Problema Encontrado</label>
                    <textarea
                      value={formData.mechanicDescription}
                      onChange={e => setFormData({...formData, mechanicDescription: e.target.value})}
                      placeholder="Informar o problema no sistema mecânico."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Sistema de Rodagem */}
                <div className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">Sistema de Rodagem</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selecionar as que não estão conformes</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {wheelOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.wheelIssues.includes(opt)}
                          onChange={() => handleCheckboxChange('wheelIssues', opt)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Problema Encontrado</label>
                    <textarea
                      value={formData.wheelDescription}
                      onChange={e => setFormData({...formData, wheelDescription: e.target.value})}
                      placeholder="Informar o problema ou a correção no sistema de rodagem."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Avaria no Veículo */}
                <div className="pt-6 space-y-4">
                  <div>
                    <h4 className="font-black text-gray-800 uppercase tracking-widest text-sm">Avaria no Veículo</h4>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Selecionar as que foram danificadas</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {damageOptions.map(opt => (
                      <label key={opt} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors">
                        <input 
                          type="checkbox" 
                          checked={formData.damageIssues.includes(opt)}
                          onChange={() => handleCheckboxChange('damageIssues', opt)}
                          className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-bold text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2 mt-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Descrição do Problema Encontrado</label>
                    <textarea
                      value={formData.damageDescription}
                      onChange={e => setFormData({...formData, damageDescription: e.target.value})}
                      placeholder="Informar as avarias encontradas."
                      className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-100 active:scale-95 uppercase text-[10px] tracking-widest"
                >
                  {editingInspection ? 'Salvar Alterações' : 'Registrar Inspeção'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleInspectionTab;
