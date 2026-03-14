import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import type { Supplier, WarehouseMovement, CleaningLog, FinancialRecord, VehicleExitOrder, ThirdPartyEntryLog, DirectorPerCapitaLog, PerCapitaConfig, AcquisitionItem } from '../types';

interface AdminGraphsProps {
  suppliers: Supplier[];
  warehouseLog: WarehouseMovement[];
  cleaningLogs: CleaningLog[];
  financialRecords: FinancialRecord[];
  vehicleExitOrders: VehicleExitOrder[];
  thirdPartyEntries: ThirdPartyEntryLog[];
  directorWithdrawals: DirectorPerCapitaLog[];
  perCapitaConfig: PerCapitaConfig;
  acquisitionItems: AcquisitionItem[];
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6'];

const AdminGraphs: React.FC<AdminGraphsProps> = ({ 
  suppliers = [], 
  warehouseLog = [], 
  cleaningLogs = [], 
  financialRecords = [], 
  vehicleExitOrders = [],
  thirdPartyEntries = [],
  directorWithdrawals = [],
  perCapitaConfig,
  acquisitionItems = []
}) => {

  const inmateCount = perCapitaConfig?.inmateCount || 1;

  // 1. Resumo Financeiro
  const financialSummary = useMemo(() => {
    const resources = financialRecords
      .filter(r => r.tipo === 'RECURSO')
      .reduce((acc, r) => acc + (Number(r.valorRecebido) || 0), 0);
    const expenses = financialRecords
      .filter(r => r.tipo === 'DESPESA')
      .reduce((acc, r) => acc + (Number(r.valorUtilizado) || 0), 0);
    
    return [
      { name: 'Recursos', value: resources, color: '#10b981' },
      { name: 'Despesas', value: expenses, color: '#ef4444' }
    ];
  }, [financialRecords]);

  // 2. Performance de Entrega
  const deliveryPerformance = useMemo(() => {
    let deliveredCount = 0;
    let notDeliveredCount = 0;

    suppliers.forEach(s => {
      const totalDelivered = (s.deliveries || []).reduce((acc, d) => acc + (d.kg || 0), 0);
      if (totalDelivered > 0) deliveredCount++;
      else notDeliveredCount++;
    });

    return [
      { name: 'Com Entregas', value: deliveredCount, color: '#10b981' },
      { name: 'Sem Entregas', value: notDeliveredCount, color: '#f43f5e' }
    ];
  }, [suppliers]);

  // 3. Materiais em Falta (Itens com 0% de entrega)
  const missingMaterials = useMemo(() => {
    const itemsMap = new Map<string, { contracted: number; delivered: number }>();
    
    suppliers.forEach(s => {
      (s.contractItems || []).forEach(ci => {
        const current = itemsMap.get(ci.name) || { contracted: 0, delivered: 0 };
        current.contracted += ci.totalKg || 0;
        itemsMap.set(ci.name, current);
      });
      (s.deliveries || []).forEach(d => {
        const current = itemsMap.get(d.item) || { contracted: 0, delivered: 0 };
        const deliveredKg = Number(d.kg) || 0;
        current.delivered += deliveredKg;
        itemsMap.set(d.item || 'Item Indefinido', current);
      });
    });

    return Array.from(itemsMap.entries())
      .map(([name, vals]) => ({
        name,
        ...vals,
        percentage: vals.contracted > 0 ? (vals.delivered / vals.contracted) * 100 : 0
      }))
      .filter(i => i.percentage === 0 && i.contracted > 0)
      .sort((a, b) => b.contracted - a.contracted)
      .slice(0, 5);
  }, [suppliers]);

  // 4. Per Capita - Custo por Preso
  const perCapitaStats = useMemo(() => {
    const totalContractValue = suppliers.reduce((acc, s) => {
      return acc + (s.contractItems || []).reduce((sum, item) => sum + ((item.totalKg || 0) * (item.valuePerKg || 0)), 0);
    }, 0);

    const dailyCost = totalContractValue / 365; 
    const perPersonDaily = dailyCost / inmateCount;

    return {
      totalMonthly: totalContractValue / 12,
      dailyTotal: dailyCost,
      perPersonDaily: perPersonDaily
    };
  }, [suppliers, inmateCount]);

  // 5. Movimentação de Almoxarifado
  const warehouseData = useMemo(() => {
    const last30Days = new Map<string, { entries: number; withdrawals: number }>();
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last30Days.set(dateStr, { entries: 0, withdrawals: 0 });
    }

    warehouseLog.forEach(log => {
      if (!log.date) return;
      const dateStr = log.date.split('T')[0];
      if (last30Days.has(dateStr)) {
        const current = last30Days.get(dateStr)!;
        if (log.type === 'entrada') current.entries += Number(log.quantity) || 0;
        else current.withdrawals += Number(log.quantity) || 0;
      }
    });

    return Array.from(last30Days.entries()).map(([date, values]) => ({
      date: date ? date.split('-').reverse().slice(0, 2).join('/') : '',
      ...values
    }));
  }, [warehouseLog]);

  // 6. Logs de Limpeza por Categoria
  const cleaningData = useMemo(() => {
    const counts: Record<string, number> = {};
    cleaningLogs.forEach(log => {
      counts[log.type] = (counts[log.type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [cleaningLogs]);

  // 7. Top 5 Veículos por Saídas
  const vehicleData = useMemo(() => {
    const counts: Record<string, number> = {};
    vehicleExitOrders.forEach(order => {
      const v = `${order.vehicle} (${order.plate})`;
      counts[v] = (counts[v] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [vehicleExitOrders]);

  // 8. Progresso de Fornecedores (Top 5 por Kg entregue)
  const supplierProgress = useMemo(() => {
    return suppliers
      .map(s => ({
        name: s.name,
        delivered: (s.deliveries || []).reduce((acc, d) => acc + (Number(d.kg) || 0), 0),
        contracted: (s.contractItems || []).reduce((acc, ci) => acc + (Number(ci.totalKg) || 0), 0)
      }))
      .filter(s => s.contracted > 0)
      .sort((a, b) => b.delivered - a.delivered)
      .slice(0, 5);
  }, [suppliers]);

  // 9. Entradas de Terceiros por Local
  const thirdPartyData = useMemo(() => {
    const counts: Record<string, number> = {};
    thirdPartyEntries.forEach(entry => {
      const loc = entry.locations || 'Outros';
      counts[loc] = (counts[loc] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [thirdPartyEntries]);

  // 10. Retiradas do Diretor (Top 5 Itens)
  const directorData = useMemo(() => {
    const counts: Record<string, number> = {};
    directorWithdrawals.forEach(log => {
      (log.items || []).forEach(item => {
        counts[item.name] = (counts[item.name] || 0) + (Number(item.quantity) || 0);
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [directorWithdrawals]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Dashboard Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Custo Diário / Preso</p>
            <p className="text-3xl font-black text-indigo-600">{formatCurrency(perCapitaStats.perPersonDaily)}</p>
          </div>
          <p className="text-[9px] text-zinc-400 mt-2 font-bold uppercase">População: {inmateCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Fornecedores Sem Entrega</p>
            <p className="text-3xl font-black text-rose-500">{deliveryPerformance.find(d => d.name === 'Sem Entregas')?.value || 0}</p>
          </div>
          <p className="text-[9px] text-zinc-400 mt-2 font-bold uppercase">Total: {suppliers.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Materiais em Falta (0%)</p>
            <p className="text-3xl font-black text-amber-500">{missingMaterials.length}</p>
          </div>
          <p className="text-[9px] text-zinc-400 mt-2 font-bold uppercase">Itens Críticos</p>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-zinc-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Valor Total Contratos</p>
            <p className="text-2xl font-black text-emerald-600">{formatCurrency(perCapitaStats.totalMonthly * 12)}</p>
          </div>
          <p className="text-[9px] text-zinc-400 mt-2 font-bold uppercase">Previsão Anual</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Delivery Performance Pie */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Status de Entregas</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={deliveryPerformance} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {deliveryPerformance.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Missing Materials Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-2">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Materiais Críticos (0% Entregue)</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={missingMaterials} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} width={150} />
                <Tooltip formatter={(value: number) => `${value.toFixed(2)} Kg`} />
                <Bar dataKey="contracted" name="Qtd. Contratada (Kg)" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Warehouse Movement Area Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-2">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Fluxo de Almoxarifado (30 Dias)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={warehouseData}>
                <defs>
                  <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWithdrawals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip />
                <Area type="monotone" dataKey="entries" name="Entradas" stroke="#6366f1" fillOpacity={1} fill="url(#colorEntries)" strokeWidth={3} />
                <Area type="monotone" dataKey="withdrawals" name="Saídas" stroke="#f59e0b" fillOpacity={1} fill="url(#colorWithdrawals)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Pie Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Balanço Financeiro</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={financialSummary} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {financialSummary.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Supplier Progress Horizontal Bar */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Top 5 Fornecedores (Kg)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierProgress} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} width={100} />
                <Tooltip />
                <Bar dataKey="delivered" name="Entregue (Kg)" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cleaning Logs Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Tipos de Limpeza</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cleaningData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vehicle Trips Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Top 5 Veículos (Viagens)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicleData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 8, fontWeight: 700, fill: '#94a3b8'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                <Tooltip />
                <Bar dataKey="value" name="Viagens" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Third Party Entries Pie Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-1">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Entradas Terceiros / Local</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={thirdPartyData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} paddingAngle={5} dataKey="value">
                  {thirdPartyData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" height={36}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Director Withdrawals Bar Chart */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-zinc-100 lg:col-span-2">
          <h3 className="text-lg font-black text-zinc-800 uppercase tracking-tighter mb-6">Top 5 Itens Retirados (Diretoria)</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={directorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#94a3b8'}} width={150} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" fill="#ec4899" radius={[0, 4, 4, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminGraphs;
