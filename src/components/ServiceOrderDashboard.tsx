
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ClipboardList, Plus, Clock, CheckCircle2, AlertCircle, XCircle, Calendar, User, Users, FileText, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder, MaintenanceSchedule, PublicInfo } from '../types';

interface ServiceOrderDashboardProps {
  serviceOrders: ServiceOrder[];
  maintenanceSchedules?: MaintenanceSchedule[];
  publicInfoList: PublicInfo[];
  onRegisterServiceOrder: (order: Omit<ServiceOrder, 'id'>) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
}

const ServiceOrderDashboard: React.FC<ServiceOrderDashboardProps> = ({
  serviceOrders = [],
  maintenanceSchedules = [],
  publicInfoList = [],
  onRegisterServiceOrder,
  onLogout,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt' | 'priority' | 'status' | 'inspectionObservations'>>({
    requestingSector: '',
    serviceType: 'hidraulico',
    category: 'manutenção',
    requester: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await onRegisterServiceOrder({
      ...formData,
      priority: 'PENDENTE',
      status: 'pendente',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setLoading(false);
    if (result.success) {
      setIsModalOpen(false);
      setFormData({
        requestingSector: '',
        serviceType: 'hidraulico',
        category: 'manutenção',
        requester: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
      });
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock className="h-5 w-5 text-amber-500" />;
      case 'em_andamento': return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
      case 'concluido': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'cancelado': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'ALTA': return <span className="bg-red-100 text-red-700 border border-red-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Alta</span>;
      case 'MÉDIA': return <span className="bg-amber-100 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Média</span>;
      case 'BAIXA': return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Baixa</span>;
      default: return <span className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Aguardando Inspeção</span>;
    }
  };

  const [activeSubTab, setActiveSubTab] = useState<'ongoing' | 'finished'>('ongoing');

  const sortedOrders = useMemo(() => {
    const priorityWeight: Record<string, number> = {
      'ALTA': 0,
      'MÉDIA': 1,
      'BAIXA': 2,
      'PENDENTE': 3
    };
    
    return [...serviceOrders]
      .filter(order => {
        if (activeSubTab === 'ongoing') {
          return order.status !== 'concluido' && order.status !== 'cancelado';
        } else {
          return order.status === 'concluido' || order.status === 'cancelado';
        }
      })
      .sort((a, b) => {
        const weightA = priorityWeight[a.priority] ?? 4;
        const weightB = priorityWeight[b.priority] ?? 4;
        if (weightA !== weightB) return weightA - weightB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [serviceOrders, activeSubTab]);

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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

       {/* Infobar */}
       <div className="bg-blue-50 border-b border-blue-100 overflow-hidden py-2">
         <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
            <span className="text-[10px] whitespace-nowrap font-black uppercase text-blue-800 bg-blue-100 px-3 py-1 rounded-full">Comunicados:</span>
            <div className="w-full overflow-hidden">
                <motion.div 
                    className="flex gap-8 whitespace-nowrap"
                    animate={{ x: ["100%", "-100%"] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                    {publicInfoList.map(info => (
                        <p key={info.id} className="text-xs font-bold text-blue-900">
                             <span className="uppercase text-blue-600">{info.sector}:</span> {info.title}
                        </p>
                    ))}
                </motion.div>
            </div>
         </div>
       </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-2xl border-b border-gray-200 p-4 md:p-6 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-20 animate-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 p-3.5 rounded-2xl shadow-xl">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none text-indigo-950">
                ORDEM DE SERVIÇO
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1 w-1 bg-indigo-500 rounded-full animate-ping" />
                <p className="text-[10px] text-indigo-600 font-black uppercase tracking-[0.3em]">Portal de Solicitações Infraestrutura</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group relative bg-indigo-600 text-white hover:bg-indigo-700 font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-3 active:scale-95 shadow-lg overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-4 w-4 relative z-10" />
              <span className="relative z-10">Nova Solicitação</span>
            </button>
            <button onClick={onLogout} className="text-gray-400 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:tracking-[0.3em]">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
        {/* Summary Cards Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Geral', value: serviceOrders.length, color: 'text-indigo-950' },
            { label: 'Pendentes', value: serviceOrders.filter(o => o.status === 'pendente').length, color: 'text-amber-600' },
            { label: 'Em Andamento', value: serviceOrders.filter(o => o.status === 'em_andamento').length, color: 'text-blue-600' },
            { label: 'Finalizadas', value: serviceOrders.filter(o => o.status === 'concluido' || o.status === 'cancelado').length, color: 'text-emerald-600' }
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-gray-200 flex flex-col items-center justify-center text-center transition-all hover:shadow-md">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{stat.label}</p>
              <p className={`text-4xl font-black ${stat.color} tracking-tighter italic`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Sub-tabs */}
        <div className="flex bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 shadow-sm self-start mb-10 inline-flex">
          <button
            onClick={() => setActiveSubTab('ongoing')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeSubTab === 'ongoing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Clock className="h-4 w-4" />
            Em Andamento
          </button>
          <button
            onClick={() => setActiveSubTab('finished')}
            className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeSubTab === 'finished'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Finalizadas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order, idx) => (
              <div 
                key={order.id} 
                className="group bg-white border border-gray-200 rounded-[2.5rem] p-8 hover:border-indigo-300 transition-all hover:shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  {getStatusIcon(order.status)}
                </div>
                
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {order.serviceType}
                      </span>
                      <span className="bg-gray-100 text-gray-500 border border-gray-200 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {order.category}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-tight mb-2 group-hover:text-indigo-600 transition-colors">
                      {order.requestingSector}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-[1px] bg-gray-300" />
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Solicitante: <span className="text-gray-600">{order.requester}</span></p>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-3xl p-6 mb-6 flex-grow border border-gray-100 group-hover:border-indigo-100 transition-colors">
                    <p className="text-sm text-gray-600 italic leading-relaxed line-clamp-4 font-medium">
                      "{order.description}"
                    </p>
                  </div>

                  <div className="flex justify-between items-end pt-6 border-t border-gray-100">
                    <div className="space-y-2">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Prioridade</p>
                      {getPriorityBadge(order.priority)}
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Status Atual</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'concluido' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                          order.status === 'em_andamento' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse' : 
                          order.status === 'cancelado' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        }`} />
                        <span className={`text-xs font-black uppercase italic tracking-tight ${
                          order.status === 'concluido' ? 'text-emerald-600' : 
                          order.status === 'em_andamento' ? 'text-blue-600' : 
                          order.status === 'cancelado' ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.projectStage && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mb-2">Andamento do Projeto</p>
                      <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                          {getProjectStageText(order.projectStage)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {order.inspectionObservations && (
                    <div className="mt-6 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl group-hover:bg-indigo-100/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-3 w-3 text-indigo-600" />
                        <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">Feedback Infraestrutura</p>
                      </div>
                      <p className="text-[11px] text-indigo-800 leading-relaxed font-medium">{order.inspectionObservations}</p>
                    </div>
                  )}

                  {maintenanceSchedules?.filter(ms => ms.serviceOrderId === order.id).map(ms => (
                    <div key={ms.id} className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl group-hover:bg-emerald-100/50 transition-colors space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-3 w-3 text-emerald-600" />
                        <p className="text-[9px] text-emerald-600 font-black uppercase tracking-widest">Agendamento de Manutenção</p>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-emerald-400" />
                          <p className="text-[10px] text-emerald-900 font-bold uppercase tracking-tight">
                            Data: <span className="text-emerald-600">{new Date(ms.date).toLocaleDateString('pt-BR')} às {ms.time}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-emerald-400" />
                          <p className="text-[10px] text-emerald-900 font-bold uppercase tracking-tight">
                            Acompanhante: <span className="text-emerald-600">{ms.accompanyingPerson}</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Users className="h-3 w-3 text-emerald-400" />
                          <div className="flex flex-col">
                            <p className="text-[10px] text-emerald-900 font-bold uppercase tracking-tight">Mão de Obra (PPLs):</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {ms.ppls?.filter(p => p.trim() !== '').map((ppl, pIdx) => (
                                <span key={pIdx} className="bg-white px-2 py-0.5 rounded-lg text-[9px] font-black text-emerald-700 border border-emerald-100">
                                  {ppl}
                                </span>
                              ))}
                              {(!ms.ppls || ms.ppls.filter(p => p.trim() !== '').length === 0) && (
                                <span className="text-[9px] text-emerald-400 font-bold italic">Nenhum PPL designado</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {ms.exitAuthorizationUrl && (
                          <div className="pt-3 mt-1 border-t border-emerald-100/50">
                            <a 
                              href={ms.exitAuthorizationUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-sm group/pdf"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              <span>Visualizar Anexo (PDF)</span>
                              <ExternalLink className="h-3 w-3 opacity-0 group-hover/pdf:opacity-100 transition-opacity ml-auto" />
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-indigo-50 blur-3xl rounded-full" />
                <div className="relative bg-gray-50 border border-gray-200 w-28 h-28 rounded-full flex items-center justify-center mx-auto">
                  <ClipboardList className="h-12 w-12 text-gray-300" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-gray-300 uppercase tracking-[0.3em] italic">Vazio Absoluto</h2>
              <p className="text-gray-400 text-sm mt-3 font-bold uppercase tracking-widest">Nenhuma solicitação registrada no momento</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white border border-gray-200 w-full max-w-xl rounded-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-600 to-transparent" />
            
            <div className="bg-indigo-600 p-6 flex justify-between items-center rounded-t-3xl shrink-0">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Nova Solicitação</h2>
                <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.3em] mt-1">Infraestrutura e Logística</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-black/20 hover:bg-black/40 p-2 rounded-xl transition-all active:scale-90">
                <XCircle className="h-6 w-6 text-white" />
              </button>
            </div>

            <div className="overflow-y-auto p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Setor Solicitante</label>
                    <input
                      required
                      type="text"
                      value={formData.requestingSector}
                      onChange={(e) => setFormData({ ...formData, requestingSector: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                      placeholder="Ex: ADMINISTRATIVO"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Nome do Solicitante</label>
                    <input
                      required
                      type="text"
                      value={formData.requester}
                      onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-400"
                      placeholder="NOME COMPLETO"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Tipo de Serviço</label>
                    <div className="relative">
                      <select
                        value={formData.serviceType}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                      >
                        <option value="hidraulico">HIDRÁULICO</option>
                        <option value="eletrico">ELÉTRICO</option>
                        <option value="mecânico">MECÂNICO</option>
                        <option value="alvenaria">ALVENARIA</option>
                        <option value="estrutural">ESTRUTURAL</option>
                        <option value="pintura">PINTURA</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Classificação</label>
                    <div className="relative">
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer"
                      >
                        <option value="manutenção">MANUTENÇÃO</option>
                        <option value="reforma">REFORMA</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">Descrição Detalhada</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none placeholder:text-gray-400"
                    placeholder="DESCREVA O PROBLEMA OU NECESSIDADE..."
                  />
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] text-amber-800 font-bold uppercase tracking-widest leading-tight">
                      A prioridade será definida pela Seção de Infraestrutura após inspeção técnica.
                    </p>
                  </div>
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="group relative w-full bg-indigo-600 text-white hover:bg-indigo-700 font-black py-4 rounded-xl text-sm uppercase tracking-[0.3em] transition-all shadow-lg active:scale-[0.98] overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10">{loading ? 'PROCESSANDO...' : 'ENVIAR SOLICITAÇÃO'}</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDashboard;
