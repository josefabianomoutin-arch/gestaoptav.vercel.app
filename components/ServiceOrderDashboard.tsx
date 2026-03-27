
import React, { useState, useMemo } from 'react';
import { ClipboardList, Plus, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
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
    } else {
      alert(result.message);
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
      case 'ALTA': return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Alta</span>;
      case 'MÉDIA': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Média</span>;
      case 'BAIXA': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Baixa</span>;
      default: return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-black uppercase">Aguardando Inspeção</span>;
    }
  };

  const sortedOrders = useMemo(() => {
    return [...serviceOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [serviceOrders]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.4)]">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase italic tracking-tighter leading-none">
                ORDEM DE SERVIÇO
              </h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] mt-1">Portal de Solicitações</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-white text-black hover:bg-indigo-500 hover:text-white font-black py-2.5 px-6 rounded-xl text-xs uppercase transition-all flex items-center gap-2 active:scale-95 shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Nova Solicitação
            </button>
            <button onClick={onLogout} className="text-white/40 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-colors">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedOrders.length > 0 ? (
            sortedOrders.map((order) => (
              <div key={order.id} className="group bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-indigo-500/50 transition-all hover:bg-white/[0.07] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                  {getStatusIcon(order.status)}
                </div>
                
                <div className="flex flex-col h-full">
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {order.serviceType}
                      </span>
                      <span className="bg-white/10 text-white/60 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider">
                        {order.category}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white uppercase tracking-tight leading-tight mb-1">
                      {order.requestingSector}
                    </h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest">Solicitante: {order.requester}</p>
                  </div>

                  <div className="bg-black/40 rounded-2xl p-4 mb-4 flex-grow border border-white/5">
                    <p className="text-xs text-white/70 italic leading-relaxed line-clamp-3">
                      "{order.description}"
                    </p>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <div>
                      <p className="text-[9px] text-white/30 font-black uppercase mb-1">Prioridade</p>
                      {getPriorityBadge(order.priority)}
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-white/30 font-black uppercase mb-1">Status</p>
                      <span className={`text-[10px] font-black uppercase italic ${
                        order.status === 'concluido' ? 'text-emerald-400' : 
                        order.status === 'em_andamento' ? 'text-blue-400' : 
                        order.status === 'cancelado' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {order.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  
                  {order.inspectionObservations && (
                    <div className="mt-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                      <p className="text-[9px] text-indigo-400 font-black uppercase mb-1">Observação da Infraestrutura</p>
                      <p className="text-[10px] text-indigo-200/70 leading-tight">{order.inspectionObservations}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center">
              <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ClipboardList className="h-10 w-10 text-white/20" />
              </div>
              <h2 className="text-xl font-bold text-white/40 uppercase tracking-widest">Nenhuma ordem de serviço encontrada</h2>
              <p className="text-white/20 text-sm mt-2">Clique em "Nova Solicitação" para começar.</p>
            </div>
          )}
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl shadow-indigo-500/10">
            <div className="bg-indigo-600 p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Nova Ordem de Serviço</h2>
                <p className="text-[10px] text-indigo-200 font-bold uppercase tracking-widest">Preencha os detalhes abaixo</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-black/20 hover:bg-black/40 p-2 rounded-full transition-colors">
                <XCircle className="h-6 w-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Setor Solicitante</label>
                  <input
                    required
                    type="text"
                    value={formData.requestingSector}
                    onChange={(e) => setFormData({ ...formData, requestingSector: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Ex: Administrativo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Solicitante (Nome)</label>
                  <input
                    required
                    type="text"
                    value={formData.requester}
                    onChange={(e) => setFormData({ ...formData, requester: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Tipo de Serviço</label>
                  <select
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="hidraulico" className="bg-[#111]">Hidráulico</option>
                    <option value="eletrico" className="bg-[#111]">Elétrico</option>
                    <option value="mecânico" className="bg-[#111]">Mecânico</option>
                    <option value="alvenaria" className="bg-[#111]">Alvenaria</option>
                    <option value="estrutural" className="bg-[#111]">Estrutural</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Categoria</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none"
                  >
                    <option value="manutenção" className="bg-[#111]">Manutenção</option>
                    <option value="reforma" className="bg-[#111]">Reforma</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Descrição do Problema</label>
                <textarea
                  required
                  rows={4}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
                  placeholder="Descreva detalhadamente o que precisa ser feito..."
                />
              </div>

              <button
                disabled={loading}
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
              >
                {loading ? 'Registrando...' : 'Enviar Solicitação'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceOrderDashboard;
