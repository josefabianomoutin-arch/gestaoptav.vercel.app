
import React, { useState } from 'react';
import { ClipboardList, Search, Filter, CheckCircle2, XCircle, Clock, AlertCircle, Edit3, Trash2, Save, X, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, MaintenanceSchedule } from '../types';

interface AdminServiceOrderProps {
  orders: ServiceOrder[];
  onUpdate: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<void>;
  maintenanceSchedules?: MaintenanceSchedule[];
  onRegisterMaintenanceSchedule?: (schedule: Omit<MaintenanceSchedule, 'id'>) => Promise<void>;
  onUpdateMaintenanceSchedule?: (id: string, updates: Partial<MaintenanceSchedule>) => Promise<void>;
  onDeleteMaintenanceSchedule?: (id: string) => Promise<void>;
}

const AdminServiceOrder: React.FC<AdminServiceOrderProps> = ({ 
  orders = [], 
  onUpdate, 
  onDelete,
  maintenanceSchedules = [],
  onRegisterMaintenanceSchedule,
  onUpdateMaintenanceSchedule,
  onDeleteMaintenanceSchedule
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterStage, setFilterStage] = useState<string>('todas');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServiceOrder | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Maintenance Schedule Modal State
  const [schedulingOrderId, setSchedulingOrderId] = useState<string | null>(null);
  const [scheduleForm, setScheduleForm] = useState<Partial<MaintenanceSchedule>>({
    date: '',
    time: '',
    location: '',
    accompanyingPerson: '',
    toolsNeeded: '',
    tools: Array(25).fill(''),
    status: 'agendado',
    toolsStatus: 'fora'
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.requestingSector.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.requester.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'todos' || order.status === filterStatus;
    const matchesStage = filterStage === 'todas' || order.projectStage === filterStage;
    
    return matchesSearch && matchesStatus && matchesStage;
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
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onRegisterMaintenanceSchedule || !schedulingOrderId) return;

    const order = orders.find(o => o.id === schedulingOrderId);
    if (!order) return;

    try {
      await onRegisterMaintenanceSchedule({
        serviceOrderId: schedulingOrderId,
        description: `Manutenção para OS: ${order.description}`,
        date: scheduleForm.date || '',
        time: scheduleForm.time || '',
        location: scheduleForm.location || '',
        accompanyingPerson: scheduleForm.accompanyingPerson || '',
        toolsNeeded: scheduleForm.toolsNeeded || '',
        tools: scheduleForm.tools || Array(25).fill(''),
        status: 'agendado',
        toolsStatus: 'fora',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setSchedulingOrderId(null);
      setScheduleForm({
        date: '',
        time: '',
        location: '',
        accompanyingPerson: '',
        toolsNeeded: '',
        tools: Array(25).fill(''),
        status: 'agendado',
        toolsStatus: 'fora'
      });
    } catch (error) {
      console.error(error);
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

  const getProjectStageText = (stage?: string) => {
    switch(stage) {
      case '1_aquisicao_material': return '1ª Etapa: Aquisição de Material';
      case '2_disponibilidade_mao_obra': return '2ª Etapa: Disponibilidade de Mão de Obra';
      case '3_em_execucao': return '3ª Etapa: Em Execução';
      case '4_finalizada': return '4ª Etapa: Finalizada';
      default: return null;
    }
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-4 rounded-3xl shadow-lg shadow-indigo-200">
            <ClipboardList className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter italic leading-none">Gestão de Infraestrutura</h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Controle Total de Solicitações de Serviço</p>
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
              className="pl-12 pr-6 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all w-full md:w-64"
            />
          </div>
          <div className="relative flex-grow md:flex-grow-0">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none w-full md:w-48"
            >
              <option value="todos">Todos Status</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="concluido">Concluído</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </div>
          <div className="relative flex-grow md:flex-grow-0">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={filterStage}
              onChange={(e) => setFilterStage(e.target.value)}
              className="pl-12 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all appearance-none w-full md:w-64"
            >
              <option value="todas">Todas as Etapas</option>
              <option value="1_aquisicao_material">1ª Etapa: Aquisição de Material</option>
              <option value="2_disponibilidade_mao_obra">2ª Etapa: Disponibilidade de Mão de Obra</option>
              <option value="3_em_execucao">3ª Etapa: Em Execução</option>
              <option value="4_finalizada">4ª Etapa: Finalizada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order, index) => (
            <div 
              key={order.id} 
              className={`bg-white rounded-[2.5rem] shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4 duration-500`}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={`absolute top-0 right-0 p-8 opacity-5 pointer-events-none`}>
                <ClipboardList className="h-32 w-32" />
              </div>
              
              <div className="p-8 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-grow space-y-6">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusColor(order.status)}`}>
                        {order.status.replace('_', ' ')}
                      </span>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm ${getPriorityColor(order.priority)}`}>
                        Prioridade: {order.priority}
                      </span>
                      <span className="bg-zinc-100 text-zinc-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200">
                        {order.serviceType}
                      </span>
                      <span className="bg-zinc-100 text-zinc-600 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-zinc-200">
                        {order.category}
                      </span>
                      {getProjectStageText(order.projectStage) && (
                        <span className="bg-blue-100 text-blue-700 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-200">
                          {getProjectStageText(order.projectStage)}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Setor Solicitante</p>
                        <h4 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic leading-tight">{order.requestingSector}</h4>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="h-6 w-6 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Clock className="h-3 w-3 text-indigo-600" />
                          </div>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Solicitado por <span className="text-indigo-600">{order.requester}</span> em {new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                        </div>
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

                    {maintenanceSchedules?.filter(ms => ms.serviceOrderId === order.id).map(ms => (
                      <div key={ms.id} className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                          <CalendarPlus className="h-3 w-3" />
                          Agendamento de Manutenção
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Data/Hora</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.date} às {ms.time}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Local</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.location}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Acompanhante</p>
                            <p className="text-sm text-emerald-900 font-black">{ms.accompanyingPerson}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Ferramentas</p>
                            <p className="text-sm text-emerald-900 font-black">
                              {ms.tools?.filter(t => t.trim() !== '').length || 0} itens relacionados
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Status das Ferramentas</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ms.toolsStatus === 'dentro' ? 'bg-blue-200 text-blue-800' :
                              ms.toolsStatus === 'devolvido' ? 'bg-emerald-200 text-emerald-800' :
                              'bg-zinc-200 text-zinc-800'
                            }`}>
                              {ms.toolsStatus === 'dentro' ? 'DENTRO DA UNIDADE' : 
                               ms.toolsStatus === 'devolvido' ? 'BAIXA DADA (DEVOLVIDO)' : 
                               'FORA DA UNIDADE'}
                            </span>
                          </div>
                          <div className="md:col-span-2">
                            <p className="text-[10px] text-emerald-600/70 font-bold uppercase">Status do Agendamento</p>
                            <span className={`inline-block mt-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                              ms.status === 'concluido' ? 'bg-emerald-200 text-emerald-800' :
                              ms.status === 'em_andamento' ? 'bg-blue-200 text-blue-800' :
                              'bg-amber-200 text-amber-800'
                            }`}>
                              {ms.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-row md:flex-col justify-end md:justify-start gap-4">
                    <button 
                      onClick={() => setSchedulingOrderId(order.id)}
                      className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Agendar Manutenção"
                    >
                      <CalendarPlus className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => handleEdit(order)}
                      className="bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Editar Solicitação"
                    >
                      <Edit3 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => setDeletingId(order.id)}
                      className="bg-red-50 hover:bg-red-600 hover:text-white text-red-600 p-4 rounded-2xl transition-all shadow-sm group"
                      title="Excluir Solicitação"
                    >
                      <Trash2 className="h-6 w-6 group-hover:scale-110 transition-transform" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white py-20 rounded-[3rem] shadow-sm border border-gray-200 text-center">
            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <ClipboardList className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest italic">Nenhuma ordem de serviço localizada</h3>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter italic">Editar Ordem de Serviço</h3>
              <button 
                onClick={() => { setEditingId(null); setEditForm(null); }}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Prioridade (Pós-Inspeção)</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
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
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Etapa do Projeto</label>
                  <select
                    value={editForm.projectStage || ''}
                    onChange={(e) => setEditForm({ ...editForm, projectStage: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  >
                    <option value="">Não definida</option>
                    <option value="1_aquisicao_material">1ª Etapa: Aquisição de Material</option>
                    <option value="2_disponibilidade_mao_obra">2ª Etapa: Disponibilidade de Mão de Obra</option>
                    <option value="3_em_execucao">3ª Etapa: Em Execução</option>
                    <option value="4_finalizada">4ª Etapa: Finalizada</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data de Atualização</label>
                  <input
                    type="date"
                    value={editForm.updatedAt?.split('T')[0] || new Date().toISOString().split('T')[0]}
                    onChange={(e) => setEditForm({ ...editForm, updatedAt: new Date(e.target.value).toISOString() })}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações da Inspeção / Execução</label>
                <textarea
                  rows={4}
                  value={editForm.inspectionObservations || ''}
                  onChange={(e) => setEditForm({ ...editForm, inspectionObservations: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Adicione detalhes sobre a inspeção ou progresso do serviço..."
                />
              </div>
            </div>

            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
              <button 
                onClick={() => { setEditingId(null); setEditForm(null); }}
                className="bg-white hover:bg-gray-100 text-gray-600 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-2 border border-gray-200"
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
        </div>
      )}

      {/* Deletion Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-500 font-medium">Tem certeza que deseja excluir esta ordem de serviço? Esta ação não pode ser desfeita.</p>
            </div>
            <div className="flex border-t border-gray-100">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 py-4 text-sm font-black text-gray-500 uppercase hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  await onDelete(deletingId);
                  setDeletingId(null);
                }}
                className="flex-1 py-4 text-sm font-black text-red-600 uppercase hover:bg-red-50 transition-colors border-l border-gray-100"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {schedulingOrderId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-2xl font-black text-emerald-950 uppercase tracking-tighter italic">Agendar Manutenção</h3>
              <button 
                onClick={() => setSchedulingOrderId(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-white p-2 rounded-full shadow-sm"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleScheduleSubmit} className="p-8 space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
              {/* Seção 1: Informações Gerais */}
              <div className="bg-gray-50/50 p-6 rounded-[32px] border border-gray-100 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-4 w-4 text-emerald-600" />
                  </div>
                  <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Informações do Agendamento</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data da Manutenção</label>
                    <input
                      type="date"
                      required
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horário Previsto</label>
                    <input
                      type="time"
                      required
                      value={scheduleForm.time}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Local da Manutenção</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.location}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, location: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="Ex: Bloco A, Sala 102"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Responsável pelo Acompanhamento</label>
                    <input
                      type="text"
                      required
                      value={scheduleForm.accompanyingPerson}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, accompanyingPerson: e.target.value })}
                      className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm"
                      placeholder="Nome do responsável"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 2: Inventário de Ferramentas */}
              <div className="bg-emerald-50/30 p-6 rounded-[32px] border border-emerald-100/50 space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-emerald-200/50 rounded-xl flex items-center justify-center">
                      <Wrench className="h-4 w-4 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest leading-none">Relação de Ferramentas</h4>
                      <p className="text-[9px] font-bold text-emerald-600/70 uppercase mt-1">Máximo de 25 itens para controle de entrada/saída</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleForm({ ...scheduleForm, tools: Array(25).fill('') })}
                    className="text-[9px] font-black text-emerald-700 uppercase hover:text-emerald-900 transition-colors bg-white px-3 py-1.5 rounded-lg border border-emerald-100 shadow-sm"
                  >
                    Limpar Tudo
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-1">
                  {Array(25).fill(0).map((_, i) => (
                    <div key={i} className="relative group">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-emerald-300 group-focus-within:text-emerald-500 transition-colors">
                        {String(i + 1).padStart(2, '0')}
                      </div>
                      <input
                        type="text"
                        value={scheduleForm.tools?.[i] || ''}
                        onChange={(e) => {
                          const newTools = [...(scheduleForm.tools || Array(25).fill(''))];
                          newTools[i] = e.target.value;
                          setScheduleForm({ ...scheduleForm, tools: newTools });
                        }}
                        className="w-full bg-white border border-gray-100 rounded-xl pl-8 pr-3 py-2.5 text-[10px] font-bold focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm placeholder:text-gray-300"
                        placeholder={`Ferramenta...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  value={scheduleForm.toolsNeeded}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, toolsNeeded: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all resize-none"
                  placeholder="Outras informações importantes sobre as ferramentas ou o serviço..."
                />
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setSchedulingOrderId(null)}
                  className="bg-white hover:bg-gray-100 text-gray-600 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-2 border border-gray-200"
                >
                  <X className="h-4 w-4" /> Cancelar
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all shadow-lg flex items-center gap-2"
                >
                  <Save className="h-4 w-4" /> Salvar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminServiceOrder;
