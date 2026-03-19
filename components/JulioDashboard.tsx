
import React, { useState } from 'react';
import { DailyAllowance, Staff, VehicleAsset, ValidationRole } from '../types';

interface JulioDashboardProps {
  dailyAllowances: DailyAllowance[];
  staff: Staff[];
  vehicleAssets: VehicleAsset[];
  validationRoles: ValidationRole[];
  onLogout: () => void;
  onRegisterDailyAllowance: (da: Omit<DailyAllowance, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDailyAllowance: (da: DailyAllowance) => Promise<{ success: boolean; message: string }>;
  onDeleteDailyAllowance: (id: string) => Promise<void>;
  onRegisterStaff: (s: Omit<Staff, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateStaff: (s: Staff) => Promise<{ success: boolean; message: string }>;
  onDeleteStaff: (id: string) => Promise<void>;
  onRegisterVehicleAsset: (v: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset: (v: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset: (id: string) => Promise<void>;
  onRegisterValidationRole: (vr: Omit<ValidationRole, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateValidationRole: (vr: ValidationRole) => Promise<{ success: boolean; message: string }>;
  onDeleteValidationRole: (id: string) => Promise<void>;
}

const JulioDashboard: React.FC<JulioDashboardProps> = ({
  dailyAllowances,
  staff,
  vehicleAssets,
  validationRoles,
  onLogout,
  onRegisterDailyAllowance,
  onUpdateDailyAllowance,
  onDeleteDailyAllowance,
  onRegisterStaff,
  onUpdateStaff,
  onDeleteStaff,
  onRegisterVehicleAsset,
  onUpdateVehicleAsset,
  onDeleteVehicleAsset,
  onRegisterValidationRole,
  onUpdateValidationRole,
  onDeleteValidationRole
}) => {
  const [activeTab, setActiveTab] = useState<'diarias' | 'veiculos' | 'servidores' | 'validacao'>('diarias');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [daForm, setDaForm] = useState<Omit<DailyAllowance, 'id'>>({
    date: new Date().toISOString().split('T')[0],
    staffName: '',
    staffRole: '',
    destination: '',
    purpose: '',
    departureTime: '',
    arrivalTime: '',
    value: 0,
    status: 'pendente'
  });

  const [staffForm, setStaffForm] = useState<Omit<Staff, 'id'>>({
    name: '',
    role: '',
    cpf: '',
    registrationNumber: ''
  });

  const [vehicleForm, setVehicleForm] = useState<Omit<VehicleAsset, 'id'>>({
    model: '',
    plate: '',
    assetNumber: ''
  });

  const [validationForm, setValidationForm] = useState<Omit<ValidationRole, 'id'>>({
    roleName: '',
    responsibleName: ''
  });

  const handleOpenModal = (item: any = null) => {
    setEditingItem(item);
    if (activeTab === 'diarias') {
      setDaForm(item ? { ...item } : {
        date: new Date().toISOString().split('T')[0],
        staffName: '',
        staffRole: '',
        destination: '',
        purpose: '',
        departureTime: '',
        arrivalTime: '',
        value: 0,
        status: 'pendente'
      });
    } else if (activeTab === 'servidores') {
      setStaffForm(item ? { ...item } : { name: '', role: '', cpf: '', registrationNumber: '' });
    } else if (activeTab === 'veiculos') {
      setVehicleForm(item ? { ...item } : { model: '', plate: '', assetNumber: '' });
    } else if (activeTab === 'validacao') {
      setValidationForm(item ? { ...item } : { roleName: '', responsibleName: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (activeTab === 'diarias') {
      if (editingItem) await onUpdateDailyAllowance({ ...daForm, id: editingItem.id });
      else await onRegisterDailyAllowance(daForm);
    } else if (activeTab === 'servidores') {
      if (editingItem) await onUpdateStaff({ ...staffForm, id: editingItem.id });
      else await onRegisterStaff(staffForm);
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
            <p className="text-gray-500 font-medium">Gestão de Diárias e Ativos</p>
          </div>
          <button onClick={onLogout} className="bg-red-50 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-100 transition-colors">Sair</button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'diarias', label: 'Diárias', icon: '💰' },
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
              {activeTab === 'diarias' && 'Controle de Diárias'}
              {activeTab === 'veiculos' && 'Cadastro de Veículos'}
              {activeTab === 'servidores' && 'Cadastro de Servidores'}
              {activeTab === 'validacao' && 'Cadastro de Validação'}
            </h2>
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
              <span>+</span> Novo Registro
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50">
                <tr>
                  {activeTab === 'diarias' && (
                    <>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Servidor</th>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Destino</th>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Valor</th>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Status</th>
                    </>
                  )}
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
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">CPF</th>
                      <th className="px-6 py-4 font-black text-xs text-gray-400 uppercase tracking-widest">Prontuário</th>
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
                {activeTab === 'diarias' && dailyAllowances.map(da => (
                  <tr key={da.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{new Date(da.date).toLocaleDateString('pt-BR')}</td>
                    <td className="px-6 py-4 font-bold text-gray-700">{da.staffName}</td>
                    <td className="px-6 py-4 font-medium text-gray-500">{da.destination}</td>
                    <td className="px-6 py-4 font-black text-indigo-600">R$ {da.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${da.status === 'pago' ? 'bg-green-100 text-green-600' : da.status === 'aprovado' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                        {da.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(da)} className="text-indigo-600 hover:text-indigo-800 font-bold">Editar</button>
                      <button onClick={() => onDeleteDailyAllowance(da.id)} className="text-red-600 hover:text-red-800 font-bold">Excluir</button>
                    </td>
                  </tr>
                ))}
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
                {activeTab === 'servidores' && staff.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-bold text-gray-700">{s.name}</td>
                    <td className="px-6 py-4 font-medium text-gray-500">{s.role}</td>
                    <td className="px-6 py-4 font-medium text-gray-500">{s.cpf}</td>
                    <td className="px-6 py-4 font-medium text-gray-500">{s.registrationNumber}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button onClick={() => handleOpenModal(s)} className="text-indigo-600 hover:text-indigo-800 font-bold">Editar</button>
                      <button onClick={() => onDeleteStaff(s.id)} className="text-red-600 hover:text-red-800 font-bold">Excluir</button>
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
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-8 bg-indigo-600 text-white">
              <h3 className="text-2xl font-black uppercase tracking-widest">
                {editingItem ? 'Editar' : 'Novo'} {activeTab === 'diarias' ? 'Diária' : activeTab === 'veiculos' ? 'Veículo' : activeTab === 'servidores' ? 'Servidor' : 'Cargo de Validação'}
              </h3>
            </div>
            <div className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              {activeTab === 'diarias' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Data</label>
                      <input type="date" value={daForm.date} onChange={e => setDaForm({...daForm, date: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Valor (R$)</label>
                      <input type="number" value={daForm.value} onChange={e => setDaForm({...daForm, value: Number(e.target.value)})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Servidor</label>
                    <input type="text" value={daForm.staffName} onChange={e => setDaForm({...daForm, staffName: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="Nome completo" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Destino</label>
                      <input type="text" value={daForm.destination} onChange={e => setDaForm({...daForm, destination: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Status</label>
                      <select value={daForm.status} onChange={e => setDaForm({...daForm, status: e.target.value as any})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold">
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="pago">Pago</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Finalidade</label>
                    <textarea value={daForm.purpose} onChange={e => setDaForm({...daForm, purpose: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" rows={3} />
                  </div>
                </>
              )}
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
                    <input type="text" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cargo</label>
                    <input type="text" value={staffForm.role} onChange={e => setStaffForm({...staffForm, role: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">CPF</label>
                      <input type="text" value={staffForm.cpf} onChange={e => setStaffForm({...staffForm, cpf: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Prontuário</label>
                      <input type="text" value={staffForm.registrationNumber} onChange={e => setStaffForm({...staffForm, registrationNumber: e.target.value})} className="w-full p-4 bg-gray-50 rounded-2xl border-none focus:ring-2 focus:ring-indigo-500 font-bold" />
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
