
import React, { useState } from 'react';
import { VehicleExitOrder, DriverAsset, VehicleAsset, ValidationRole } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';

interface JulioDashboardProps {
  vehicleExitOrders: VehicleExitOrder[];
  driverAssets: DriverAsset[];
  vehicleAssets: VehicleAsset[];
  validationRoles: ValidationRole[];
  onLogout: () => void;
  onRegisterVehicleExitOrder: (order: Omit<VehicleExitOrder, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleExitOrder: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleExitOrder: (id: string) => Promise<void>;
  onRegisterDriverAsset: (s: Omit<DriverAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDriverAsset: (s: DriverAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteDriverAsset: (id: string) => Promise<void>;
  onRegisterVehicleAsset: (v: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset: (v: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset: (id: string) => Promise<void>;
  onRegisterValidationRole: (vr: Omit<ValidationRole, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateValidationRole: (vr: ValidationRole) => Promise<{ success: boolean; message: string }>;
  onDeleteValidationRole: (id: string) => Promise<void>;
}

const JulioDashboard: React.FC<JulioDashboardProps> = ({
  vehicleExitOrders,
  driverAssets,
  vehicleAssets,
  validationRoles,
  onLogout,
  onRegisterVehicleExitOrder,
  onUpdateVehicleExitOrder,
  onDeleteVehicleExitOrder,
  onRegisterDriverAsset,
  onUpdateDriverAsset,
  onDeleteDriverAsset,
  onRegisterVehicleAsset,
  onUpdateVehicleAsset,
  onDeleteVehicleAsset,
  onRegisterValidationRole,
  onUpdateValidationRole,
  onDeleteValidationRole
}) => {
  const [activeTab, setActiveTab] = useState<'ordens' | 'veiculos' | 'servidores' | 'validacao'>('ordens');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [driverForm, setDriverForm] = useState<Omit<DriverAsset, 'id'>>({
    name: '',
    role: '',
    cnhCategory: '',
    isFitToDrive: true
  });

  const [vehicleForm, setVehicleForm] = useState<Omit<VehicleAsset, 'id'>>({
    model: '',
    plate: '',
    assetNumber: ''
  });

  const [validationForm, setValidationForm] = useState<Omit<ValidationRole, 'id'>>({
    roleName: '',
    responsibleName: '',
    password: ''
  });

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (activeTab === 'servidores') {
      setDriverForm(item ? { ...item } : { name: '', role: '', cnhCategory: '', isFitToDrive: true });
    } else if (activeTab === 'veiculos') {
      setVehicleForm(item ? { ...item } : { model: '', plate: '', assetNumber: '' });
    } else if (activeTab === 'validacao') {
      setValidationForm(item ? { ...item } : { roleName: '', responsibleName: '', password: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (activeTab === 'servidores') {
      if (editingItem) await onUpdateDriverAsset({ ...driverForm, id: editingItem.id });
      else await onRegisterDriverAsset(driverForm);
    } else if (activeTab === 'veiculos') {
      if (editingItem) await onUpdateVehicleAsset({ ...vehicleForm, id: editingItem.id });
      else await onRegisterVehicleAsset(vehicleForm);
    } else if (activeTab === 'validacao') {
      if (editingItem) await onUpdateValidationRole({ ...validationForm, id: editingItem.id });
      else await onRegisterValidationRole(validationForm);
    }
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">JULIO CESAR NOGUEIRA</h1>
            <p className="text-gray-500 font-medium">Gestão de Ordem de Saída e Ativos</p>
          </div>
          <button onClick={onLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors">Sair</button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'ordens', label: 'Ordem de Saída', icon: '📋' },
            { id: 'veiculos', label: 'Veículos', icon: '🚗' },
            { id: 'servidores', label: 'Servidores', icon: '👥' },
            { id: 'validacao', label: 'Validação', icon: '✅' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-8 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">
              {activeTab === 'ordens' && 'Ordem de Saída de Veículo'}
              {activeTab === 'veiculos' && 'Cadastro de Veículos'}
              {activeTab === 'servidores' && 'Cadastro de Servidores'}
              {activeTab === 'validacao' && 'Cadastro de Validação'}
            </h2>
            {activeTab !== 'ordens' && (
              <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
                <span>+</span> Novo Registro
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'ordens' ? (
              <div className="p-4">
                <AdminVehicleExitOrder 
                  orders={vehicleExitOrders}
                  onRegister={onRegisterVehicleExitOrder}
                  onUpdate={onUpdateVehicleExitOrder}
                  onDelete={onDeleteVehicleExitOrder}
                  vehicleAssets={vehicleAssets}
                  onRegisterVehicleAsset={onRegisterVehicleAsset}
                  onUpdateVehicleAsset={onUpdateVehicleAsset}
                  onDeleteVehicleAsset={onDeleteVehicleAsset}
                  driverAssets={driverAssets}
                  onRegisterDriverAsset={onRegisterDriverAsset}
                  onUpdateDriverAsset={onUpdateDriverAsset}
                  onDeleteDriverAsset={onDeleteDriverAsset}
                  validationRoles={validationRoles}
                />
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    {activeTab === 'veiculos' && (
                      <>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Modelo</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Placa</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Patrimônio</th>
                      </>
                    )}
                    {activeTab === 'servidores' && (
                      <>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Nome</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Cargo</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">CNH</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Apto</th>
                      </>
                    )}
                    {activeTab === 'validacao' && (
                      <>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Cargo</th>
                        <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Responsável</th>
                      </>
                    )}
                    <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activeTab === 'veiculos' && vehicleAssets.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">{v.model}</td>
                      <td className="px-6 py-4 font-black text-gray-900">{v.plate}</td>
                      <td className="px-6 py-4 font-medium text-gray-500">{v.assetNumber}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleOpenModal(v)} className="text-indigo-600 hover:text-indigo-800 font-bold">Editar</button>
                        <button onClick={() => onDeleteVehicleAsset(v.id)} className="text-red-600 hover:text-red-800 font-bold">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'servidores' && driverAssets.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">{s.name}</td>
                      <td className="px-6 py-4 font-medium text-gray-500">{s.role}</td>
                      <td className="px-6 py-4 font-medium text-gray-500">{s.cnhCategory}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${s.isFitToDrive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {s.isFitToDrive ? 'Sim' : 'Não'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleOpenModal(s)} className="text-indigo-600 hover:text-indigo-800 font-bold">Editar</button>
                        <button onClick={() => onDeleteDriverAsset(s.id)} className="text-red-600 hover:text-red-800 font-bold">Excluir</button>
                      </td>
                    </tr>
                  ))}
                  {activeTab === 'validacao' && validationRoles.map(vr => (
                    <tr key={vr.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-700">{vr.roleName}</td>
                      <td className="px-6 py-4 font-black text-gray-900">{vr.responsibleName}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button onClick={() => handleOpenModal(vr)} className="text-indigo-600 hover:text-indigo-800 font-bold">Editar</button>
                        <button onClick={() => onDeleteValidationRole(vr.id)} className="text-red-600 hover:text-red-800 font-bold">Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white">
              <h3 className="text-2xl font-black uppercase tracking-widest">
                {editingItem ? 'Editar' : 'Novo'} {activeTab === 'ordens' ? 'Ordem de Saída' : activeTab === 'veiculos' ? 'Veículo' : activeTab === 'servidores' ? 'Servidor' : 'Cargo de Validação'}
              </h3>
            </div>
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              {activeTab === 'veiculos' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Modelo</label>
                    <input type="text" value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Placa</label>
                      <input type="text" value={vehicleForm.plate} onChange={e => setVehicleForm({...vehicleForm, plate: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Patrimônio</label>
                      <input type="text" value={vehicleForm.assetNumber} onChange={e => setVehicleForm({...vehicleForm, assetNumber: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'servidores' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome Completo</label>
                    <input type="text" value={driverForm.name} onChange={e => setDriverForm({...driverForm, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cargo</label>
                    <input type="text" value={driverForm.role} onChange={e => setDriverForm({...driverForm, role: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Categoria CNH</label>
                      <input type="text" value={driverForm.cnhCategory} onChange={e => setDriverForm({...driverForm, cnhCategory: e.target.value.toUpperCase()})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Apto para Dirigir</label>
                      <select value={driverForm.isFitToDrive ? 'true' : 'false'} onChange={e => setDriverForm({...driverForm, isFitToDrive: e.target.value === 'true'})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold">
                        <option value="true">Sim</option>
                        <option value="false">Não</option>
                      </select>
                    </div>
                  </div>
                </>
              )}
              {activeTab === 'validacao' && (
                <>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cargo de Validação</label>
                    <input type="text" value={validationForm.roleName} onChange={e => setValidationForm({...validationForm, roleName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Ex: Diretor de Centro" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nome do Responsável</label>
                    <input type="text" value={validationForm.responsibleName} onChange={e => setValidationForm({...validationForm, responsibleName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Senha de Validação</label>
                    <input type="password" value={validationForm.password || ''} onChange={e => setValidationForm({...validationForm, password: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Digite a senha" />
                  </div>
                </>
              )}
            </div>
            <div className="p-8 bg-gray-50 flex justify-end gap-4">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 rounded-2xl font-bold text-gray-500 hover:bg-gray-200 transition-all">Cancelar</button>
              <button onClick={handleSave} className="px-8 py-3 rounded-2xl font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Salvar Alterações</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JulioDashboard;
