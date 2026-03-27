
import React, { useState, useMemo } from 'react';
import { ClipboardList, Plus, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ServiceOrder } from '../types';

interface ServiceOrderDashboardProps {
  serviceOrders: ServiceOrder[];
  onRegisterServiceOrder: (order: Omit<ServiceOrder, 'id'>) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
}

const ServiceOrderDashboard: React.FC<ServiceOrderDashboardProps> = ({
  serviceOrders,
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
      case 'ALTA': return <span className="bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">Alta</span>;
      case 'MÉDIA': return <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(245,158,11,0.2)]">Média</span>;
      case 'BAIXA': return <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(16,185,129,0.2)]">Baixa</span>;
      default: return <span className="bg-white/5 text-white/40 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Aguardando Inspeção</span>;
    }
  };

  const sortedOrders = useMemo(() => {
    return [...serviceOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serviceOrders]);

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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-600 blur-lg opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-indigo-700 p-3.5 rounded-2xl shadow-2xl">
                <ClipboardList className="h-7 w-7 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter leading-none bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
                ORDEM DE SERVIÇO
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="h-1 w-1 bg-indigo-500 rounded-full animate-ping" />
                <p className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.3em]">Portal de Solicitações Infraestrutura</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="group relative bg-white text-black hover:bg-indigo-600 hover:text-white font-black py-3 px-8 rounded-2xl text-xs uppercase transition-all flex items-center gap-3 active:scale-95 shadow-[0_10px_20px_rgba(255,255,255,0.1)] overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Plus className="h-4 w-4 relative z-10" />
              <span className="relative z-10">Nova Solicitação</span>
            </button>
            <button onClick={onLogout} className="text-white/20 hover:text-red-500 font-black text-[10px] uppercase tracking-[0.2em] transition-all hover:tracking-[0.3em]">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-10 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order, idx) => (
              <div 
                key={order.id} 
                className="group bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-8 hover:border-indigo-500/40 transition-all hover:bg-white/[0.06] relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-100 transition-opacity">
                  {getStatusIcon(order.status)}
                </div>
                
                <div className="flex flex-col h-full">
                  <div className="mb-6">
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {order.serviceType}
                      </span>
                      <span className="bg-white/5 text-white/40 border border-white/10 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest">
                        {order.category}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight mb-2 group-hover:text-indigo-400 transition-colors">
                      {order.requestingSector}
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-[1px] bg-white/20" />
                      <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">Solicitante: <span className="text-white/60">{order.requester}</span></p>
                    </div>
                  </div>

                  <div className="bg-black/40 rounded-3xl p-6 mb-6 flex-grow border border-white/5 group-hover:border-indigo-500/20 transition-colors">
                    <p className="text-sm text-white/60 italic leading-relaxed line-clamp-4 font-medium">
                      "{order.description}"
                    </p>
                  </div>

                  <div className="flex justify-between items-end pt-6 border-t border-white/5">
                    <div className="space-y-2">
                      <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Prioridade</p>
                      {getPriorityBadge(order.priority)}
                    </div>
                    <div className="text-right space-y-2">
                      <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">Status Atual</p>
                      <div className="flex items-center gap-2 justify-end">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'concluido' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                          order.status === 'em_andamento' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse' : 
                          order.status === 'cancelado' ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        }`} />
                        <span className={`text-xs font-black uppercase italic tracking-tight ${
                          order.status === 'concluido' ? 'text-emerald-400' : 
                          order.status === 'em_andamento' ? 'text-blue-400' : 
                          order.status === 'cancelado' ? 'text-red-400' : 'text-amber-400'
                        }`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.projectStage && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      <p className="text-[9px] text-white/20 font-black uppercase tracking-widest mb-2">Andamento do Projeto</p>
                      <div className="bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-xl inline-flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          {getProjectStageText(order.projectStage)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {order.inspectionObservations && (
                    <div className="mt-6 p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl group-hover:bg-indigo-500/10 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-3 w-3 text-indigo-400" />
                        <p className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Feedback Infraestrutura</p>
                      </div>
                      <p className="text-[11px] text-indigo-200/60 leading-relaxed font-medium">{order.inspectionObservations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-32 text-center">
              <div className="relative inline-block mb-8">
                <div className="absolute inset-0 bg-white/5 blur-3xl rounded-full" />
                <div className="relative bg-white/[0.03] border border-white/10 w-28 h-28 rounded-full flex items-center justify-center mx-auto">
                  <ClipboardList className="h-12 w-12 text-white/10" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-white/30 uppercase tracking-[0.3em] italic">Vazio Absoluto</h2>
              <p className="text-white/10 text-sm mt-3 font-bold uppercase tracking-widest">Nenhuma solicitação registrada no momento</p>
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
