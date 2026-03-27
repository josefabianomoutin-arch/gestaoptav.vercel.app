
import React, { useState } from 'react';
import { ClipboardList, Search, Filter, CheckCircle2, XCircle, Clock, AlertCircle, Edit3, Trash2, Save, X } from 'lucide-react';
import { ServiceOrder } from '../types';

interface AdminServiceOrderProps {
  orders: ServiceOrder[];
  onUpdate: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<void>;
}

const AdminServiceOrder: React.FC<AdminServiceOrderProps> = ({ orders, onUpdate, onDelete }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceOrder | null>(null);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.requestingSector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'todos' || order.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (order: ServiceOrder) => {
    setEditingId(order.id);
    setEditForm({ ...order });
  };

  const handleSave = async () => {
    if (!editForm) return;
    const result = await onUpdate(editForm);
    if (result.success) {
      setEditingId(null);
      setEditForm(null);
    } else {
      alert(result.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'em_andamento': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'concluido': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'cancelado': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ALTA': return 'bg-red-600 text-white';
      case 'MÉDIA': return 'bg-amber-500 text-white';
      case 'BAIXA': return 'bg-emerald-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-200">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter italic leading-none">Gestão de Ordens de Serviço</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Controle Total de Solicitações de Infraestrutura</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div className="relative flex-grow md:flex-grow-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar solicitações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-64"
            />
          </div>
          <div className="relative flex-grow md:flex-grow-0">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-12 pr-10 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none w-full md:w-48"
            >
              <option value="todos">Todos Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-[2.5rem] shadow-xl border-l-[12px] overflow-hidden transition-all hover:shadow-2xl ${
              order.status === 'concluido' ? 'border-emerald-500' : 
              order.status === 'em_andamento' ? 'border-blue-500' : 
              order.status === 'cancelado' ? 'border-red-500' : 'border-amber-500'
            }`}>
              <div className="p-8">
                {editingId === order.id ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade (Pós-Inspeção)</label>
                        <select
                          value={editForm?.priority}
                          onChange={(e) => setEditForm({ ...editForm!, priority: e.target.value as any })}
                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          <option value="PENDENTE">Aguardando Inspeção</option>
                          <option value="ALTA">ALTA</option>
                          <option value="MÉDIA">MÉDIA</option>
                          <option value="BAIXA">BAIXA</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Status do Serviço</label>
                        <select
                          value={editForm?.status}
                          onChange={(e) => setEditForm({ ...editForm!, status: e.target.value as any })}
                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        >
                          <option value="pendente">Pendente</option>
                          <option value="em_andamento">Em Andamento</option>
                          <option value="concluido">Concluído</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Atualização</label>
                        <input
                          type="date"
                          value={editForm?.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0]}
                          onChange={(e) => setEditForm({ ...editForm!, updatedAt: new Date(e.target.value).toISOString() })}
                          className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações da Inspeção / Execução</label>
                      <textarea
                        rows={3}
                        value={editForm?.inspectionObservations || ''}
                        onChange={(e) => setEditForm({ ...editForm!, inspectionObservations: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                        placeholder="Adicione detalhes sobre a inspeção ou progresso do serviço..."
                      />
                    </div>

                    <div className="flex justify-end gap-4">
                      <button 
                        onClick={() => { setEditingId(null); setEditForm(null); }}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-2"
                      >
                        <X className="h-4 w-4" /> Cancelar
                      </button>
                      <button 
                        onClick={handleSave}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all shadow-lg flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" /> Salvar Alterações
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-grow space-y-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getPriorityColor(order.priority)}`}>
                          Prioridade: {order.priority}
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {order.serviceType}
                        </span>
                        <span className="bg-gray-100 text-gray-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                          {order.category}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Setor Solicitante</p>
                          <h4 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">{order.requestingSector}</h4>
                          <p className="text-xs text-gray-500 font-bold mt-1">Solicitado por: <span className="text-indigo-600">{order.requester}</span> em {new Date(order.createdAt).toLocaleString('pt-BR')}</p>
                        </div>
                        <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Descrição da Solicitação</p>
                          <p className="text-sm text-gray-700 italic leading-relaxed font-medium">"{order.description}"</p>
                        </div>
                      </div>

                      {order.inspectionObservations && (
                        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Observações da Infraestrutura</p>
                          <p className="text-sm text-indigo-900 font-bold leading-relaxed">{order.inspectionObservations}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col justify-end md:justify-start gap-4">
                      <button 
                        onClick={() => handleEdit(order)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-600 p-4 rounded-2xl transition-all shadow-sm group"
                        title="Editar Solicitação"
                      >
                        <Edit3 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      </button>
                      <button 
                        onClick={() => { if(window.confirm('Excluir esta ordem de serviço?')) onDelete(order.id); }}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-4 rounded-2xl transition-all shadow-sm group"
                        title="Excluir Solicitação"
                      >
                        <Trash2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white py-20 rounded-[3rem] shadow-xl border-4 border-dashed border-gray-100 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">Nenhuma ordem de serviço localizada</h3>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminServiceOrder;
