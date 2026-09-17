import React, { useState, useMemo } from 'react';
import { VehicleExitOrder } from '../types';
import { PoliciaPenalLogo } from './PoliciaPenalLogo';
import { POLICIA_PENAL_BADGE_B64 } from './policiaPenalData';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Clock, 
  Car, 
  Search, 
  Calendar, 
  X, 
  Download,
  FileDown
} from 'lucide-react';

interface VehicleUsageReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: VehicleExitOrder[];
  initialMonth?: string;
}

// Helpers for duration calculation
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours * 60 + minutes;
}

function calculateOrderDurationMinutes(order: VehicleExitOrder): number {
  if (!order.exitTime || !order.returnTime) return 0;

  const exitDateStr = order.exitDate || order.date;
  const returnDateStr = order.returnDate || order.exitDate || order.date;

  if (exitDateStr && returnDateStr) {
    const startIso = `${exitDateStr}T${order.exitTime.padStart(5, '0')}:00`;
    const endIso = `${returnDateStr}T${order.returnTime.padStart(5, '0')}:00`;
    const startDate = new Date(startIso);
    const endDate = new Date(endIso);

    if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
      const diffMs = endDate.getTime() - startDate.getTime();
      if (diffMs > 0) {
        return Math.round(diffMs / (1000 * 60));
      }
    }
  }

  const exitMin = parseTimeToMinutes(order.exitTime);
  const returnMin = parseTimeToMinutes(order.returnTime);

  if (exitMin !== null && returnMin !== null) {
    if (returnMin >= exitMin) {
      return returnMin - exitMin;
    } else {
      // Crosses midnight
      return (24 * 60 - exitMin) + returnMin;
    }
  }

  return 0;
}

function formatMinutesToReadable(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}

const VehicleUsageReportModal: React.FC<VehicleUsageReportModalProps> = ({
  isOpen,
  onClose,
  orders,
  initialMonth = '',
}) => {
  const [selectedMonthOverride, setSelectedMonthOverride] = useState<string | null>(null);
  const selectedMonth = selectedMonthOverride !== null ? selectedMonthOverride : initialMonth;
  const setSelectedMonth = (val: string) => setSelectedMonthOverride(val);

  const [searchTerm, setSearchTerm] = useState('');

  // Extract all unique available months from the orders
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    const currentYear = new Date().getFullYear();
    // Add current year months as defaults
    for (let i = 1; i <= 12; i++) {
      set.add(`${currentYear}-${i.toString().padStart(2, '0')}`);
    }
    // Add any order dates
    orders.forEach(o => {
      const d = o.date || o.exitDate;
      if (typeof d === 'string' && d.length >= 7) {
        const ym = d.substring(0, 7);
        if (/^\d{4}-\d{2}$/.test(ym)) {
          set.add(ym);
        }
      }
    });
    return Array.from(set).sort().reverse();
  }, [orders]);

  // Filter orders by month
  const monthlyOrders = useMemo(() => {
    return orders.filter(o => {
      const orderDate = o.date || o.exitDate || '';
      if (!selectedMonth) return true;
      return orderDate.startsWith(selectedMonth);
    });
  }, [orders, selectedMonth]);

  // Aggregate by Employee
  const employeeAggregations = useMemo(() => {
    const map = new Map<string, {
      employeeName: string;
      role: string;
      totalMinutes: number;
      totalOrders: number;
      completedOrders: number;
      pendingOrders: number;
      totalKm: number;
      localitiesSet: Set<string>;
      vehiclesMap: Map<string, {
        vehicleName: string;
        plate: string;
        minutes: number;
        count: number;
        km: number;
      }>;
      ordersList: VehicleExitOrder[];
    }>();

    monthlyOrders.forEach(order => {
      const empName = (order.responsibleServer || 'NÃO INFORMADO').trim().toUpperCase();
      const role = order.serverRole || 'POLICIAL PENAL';
      const durationMin = calculateOrderDurationMinutes(order);
      const km = (order.kmIn && order.kmOut && order.kmIn >= order.kmOut) 
        ? (order.kmIn - order.kmOut) 
        : 0;

      const vehicleName = (order.vehicle || 'VEÍCULO NÃO IDENTIFICADO').trim().toUpperCase();
      const plate = (order.plate || 'SEM PLACA').trim().toUpperCase();
      const vehicleKey = `${vehicleName}__${plate}`;

      if (!map.has(empName)) {
        map.set(empName, {
          employeeName: empName,
          role,
          totalMinutes: 0,
          totalOrders: 0,
          completedOrders: 0,
          pendingOrders: 0,
          totalKm: 0,
          localitiesSet: new Set(),
          vehiclesMap: new Map(),
          ordersList: []
        });
      }

      const item = map.get(empName)!;
      item.totalMinutes += durationMin;
      item.totalOrders += 1;
      if (order.returnTime) {
        item.completedOrders += 1;
      } else {
        item.pendingOrders += 1;
      }
      item.totalKm += km;
      item.ordersList.push(order);

      const dest = (order.destination || '').trim();
      if (dest) {
        item.localitiesSet.add(dest);
      }

      // Vehicle sub-breakdown
      if (!item.vehiclesMap.has(vehicleKey)) {
        item.vehiclesMap.set(vehicleKey, {
          vehicleName,
          plate,
          minutes: 0,
          count: 0,
          km: 0
        });
      }
      const v = item.vehiclesMap.get(vehicleKey)!;
      v.minutes += durationMin;
      v.count += 1;
      v.km += km;
    });

    // Convert map to array and sort by totalMinutes descending
    return Array.from(map.values())
      .map(item => ({
        ...item,
        localities: Array.from(item.localitiesSet).sort()
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [monthlyOrders]);

  // Aggregate by Vehicle
  const vehicleAggregations = useMemo(() => {
    const map = new Map<string, {
      vehicleName: string;
      plate: string;
      totalMinutes: number;
      totalOrders: number;
      totalKm: number;
      localitiesSet: Set<string>;
      employeesMap: Map<string, {
        employeeName: string;
        minutes: number;
        count: number;
        km: number;
      }>;
      ordersList: VehicleExitOrder[];
    }>();

    monthlyOrders.forEach(order => {
      const vehicleName = (order.vehicle || 'VEÍCULO NÃO IDENTIFICADO').trim().toUpperCase();
      const plate = (order.plate || 'SEM PLACA').trim().toUpperCase();
      const vehicleKey = `${vehicleName}__${plate}`;

      const empName = (order.responsibleServer || 'NÃO INFORMADO').trim().toUpperCase();
      const durationMin = calculateOrderDurationMinutes(order);
      const km = (order.kmIn && order.kmOut && order.kmIn >= order.kmOut) 
        ? (order.kmIn - order.kmOut) 
        : 0;

      if (!map.has(vehicleKey)) {
        map.set(vehicleKey, {
          vehicleName,
          plate,
          totalMinutes: 0,
          totalOrders: 0,
          totalKm: 0,
          localitiesSet: new Set(),
          employeesMap: new Map(),
          ordersList: []
        });
      }

      const item = map.get(vehicleKey)!;
      item.totalMinutes += durationMin;
      item.totalOrders += 1;
      item.totalKm += km;
      item.ordersList.push(order);

      const dest = (order.destination || '').trim();
      if (dest) {
        item.localitiesSet.add(dest);
      }

      if (!item.employeesMap.has(empName)) {
        item.employeesMap.set(empName, {
          employeeName: empName,
          minutes: 0,
          count: 0,
          km: 0
        });
      }
      const emp = item.employeesMap.get(empName)!;
      emp.minutes += durationMin;
      emp.count += 1;
      emp.km += km;
    });

    return Array.from(map.values())
      .map(item => ({
        ...item,
        localities: Array.from(item.localitiesSet).sort()
      }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [monthlyOrders]);

  // Total monthly stats
  const stats = useMemo(() => {
    let totalMin = 0;
    let totalKm = 0;
    let completed = 0;
    let pending = 0;

    monthlyOrders.forEach(o => {
      totalMin += calculateOrderDurationMinutes(o);
      if (o.returnTime) completed++;
      else pending++;
      if (o.kmIn && o.kmOut && o.kmIn >= o.kmOut) {
        totalKm += (o.kmIn - o.kmOut);
      }
    });

    return {
      totalMinutes: totalMin,
      totalOrders: monthlyOrders.length,
      completedOrders: completed,
      pendingOrders: pending,
      totalKm,
      totalEmployees: employeeAggregations.length,
      totalVehicles: vehicleAggregations.length
    };
  }, [monthlyOrders, employeeAggregations, vehicleAggregations]);

  // Helper label for month
  const monthLabel = useMemo(() => {
    if (!selectedMonth) return 'TODOS OS MESES';
    const [year, month] = selectedMonth.split('-');
    const d = new Date(parseInt(year), parseInt(month) - 1, 15);
    return `${d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${year}`;
  }, [selectedMonth]);

  // Generate PDF Report
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    try {
      doc.addImage(POLICIA_PENAL_BADGE_B64, 'PNG', 14, 10, 16, 21);
    } catch (e) {
      console.warn('Could not add badge image to PDF', e);
    }

    // Header
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('PENITENCIÁRIA DE TAIÚVA', 105, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229);
    doc.text(
      'RELATÓRIO MENSAL DE UTILIZAÇÃO DE VEÍCULOS E FUNCIONÁRIOS',
      105,
      22,
      { align: 'center' }
    );

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.text(`MÊS DE REFERÊNCIA: ${monthLabel}`, 105, 27, { align: 'center' });
    doc.text(`Emissão: ${new Date().toLocaleString('pt-BR')}  •  Total de Horas: ${formatMinutesToReadable(stats.totalMinutes)}  •  Total de Saídas: ${stats.totalOrders}`, 105, 32, { align: 'center' });

    // Table rows
    const tableData: any[] = [];

    monthlyOrders.forEach(order => {
      const empName = (order.responsibleServer || 'NÃO INFORMADO').trim().toUpperCase();
      const vehicleStr = `${order.vehicle || 'N/A'} (${order.plate || 'SEM PLACA'})`.trim();
      const locAndDate = `${order.destination || 'Não informada'} - ${(order.date || order.exitDate || '').split('-').reverse().join('/')}`;
      const durationMin = calculateOrderDurationMinutes(order);

      tableData.push([
        empName,
        vehicleStr,
        locAndDate,
        '1',
        formatMinutesToReadable(durationMin)
      ]);
    });

    autoTable(doc, {
      startY: 38,
      head: [['FUNCIONÁRIO (RESPONSÁVEL)', 'VEÍCULO / PLACA', 'LOCALIDADE E DATA', 'VIAGENS', 'TEMPO TOTAL']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      },
      styles: {
        fontSize: 7,
        cellPadding: 2.5,
        overflow: 'linebreak'
      },
      columnStyles: {
        0: { cellWidth: 44, fontStyle: 'bold' },
        1: { cellWidth: 48 },
        2: { cellWidth: 46 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 26, halign: 'center', fontStyle: 'bold' }
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      foot: [[
        'TOTAIS CONSOLIDADOS',
        `${stats.totalVehicles} Veículos`,
        `${stats.totalOrders} Saídas no Período`,
        stats.totalOrders.toString(),
        formatMinutesToReadable(stats.totalMinutes)
      ]],
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 8
      }
    });

    // Signatures area on final page
    const finalY = (doc as any).lastAutoTable?.finalY || 200;
    const signY = finalY > 240 ? 250 : Math.max(finalY + 25, 240);

    if (signY < 280) {
      doc.setDrawColor(203, 213, 225);
      doc.line(25, signY, 95, signY);
      doc.line(115, signY, 185, signY);

      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('RESPONSÁVEL PELO CONTROLE DE FROTA', 60, signY + 4, { align: 'center' });
      doc.text('DIRETORIA / CHEFIA DE INFRAESTRUTURA', 150, signY + 4, { align: 'center' });
    }

    const fileName = `relatorio-utilizacao-veiculos-${selectedMonth || 'geral'}.pdf`;
    doc.save(fileName);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'FUNCIONARIO;VEICULO;PLACA;LOCALIDADE;DATA_SAIDA;VIAGENS;TEMPO_MINUTOS;TEMPO_FORMATADO\n';
    monthlyOrders.forEach(order => {
      const emp = (order.responsibleServer || '').replace(/"/g, '""');
      const veh = (order.vehicle || '').replace(/"/g, '""');
      const plate = (order.plate || '').replace(/"/g, '""');
      const dest = (order.destination || '').replace(/"/g, '""');
      const dt = (order.date || order.exitDate || '');
      const duration = calculateOrderDurationMinutes(order);
      csv += `"${emp}";"${veh}";"${plate}";"${dest}";"${dt}";1;${duration};"${formatMinutesToReadable(duration)}"\n`;
    });

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `relatorio-uso-veiculos-${selectedMonth || 'geral'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="bg-white/10 p-2.5 rounded-2xl border border-white/15 shadow-sm flex items-center justify-center flex-shrink-0">
              <PoliciaPenalLogo className="h-10 w-auto object-contain max-w-[40px]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">
                  Controle de Frota
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Taiúva
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-300 inline" />
                Relatório de Utilização: Funcionários e Veículos
              </h2>
              <p className="text-xs text-indigo-200/80 font-medium mt-0.5">
                Relação detalhada de tempo de uso, saídas e veículos conduzidos por mês.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="Fechar"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Month selector */}
            <div className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-xs">
              <Calendar className="h-4 w-4 text-indigo-600" />
              <span className="text-[11px] font-black uppercase text-slate-500 tracking-wider">Mês:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer uppercase"
              >
                <option value="">TODOS OS MESES</option>
                {availableMonths.map(ym => {
                  const [y, m] = ym.split('-');
                  const d = new Date(parseInt(y), parseInt(m) - 1, 15);
                  const label = `${d.toLocaleDateString('pt-BR', { month: 'long' }).toUpperCase()} DE ${y}`;
                  return (
                    <option key={ym} value={ym}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search filter */}
            <div className="relative min-w-[220px] flex-grow sm:flex-grow-0">
              <input
                type="text"
                placeholder="Buscar funcionário ou carro..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={handleExportPDF}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-indigo-200 active:scale-95 transition-all"
              title="Gerar PDF para Impressão"
            >
              <FileDown className="h-4 w-4" />
              <span>Gerar PDF Oficial</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-black px-3 py-2 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
              title="Exportar dados para planilha CSV"
            >
              <Download className="h-4 w-4 text-emerald-600" />
              <span>CSV</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="bg-indigo-50/70 border border-indigo-100 p-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">Tempo Total de Uso</span>
              <Clock className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-xl font-black text-indigo-950 mt-1">
              {formatMinutesToReadable(stats.totalMinutes)}
            </p>
            <p className="text-[10px] text-indigo-600/80 font-bold mt-0.5">
              Equivale a {formatMinutesToDecimalHours(stats.totalMinutes)}
            </p>
          </div>

          <div className="bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Viagens / Saídas</span>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-xl font-black text-emerald-950 mt-1">
              {stats.totalOrders}
            </p>
            <p className="text-[10px] text-emerald-700/80 font-bold mt-0.5">
              {stats.completedOrders} concluídas • {stats.pendingOrders} abertas
            </p>
          </div>

          <div className="bg-amber-50/70 border border-amber-100 p-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Funcionários Ativos</span>
              <User className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-xl font-black text-amber-950 mt-1">
              {stats.totalEmployees}
            </p>
            <p className="text-[10px] text-amber-700/80 font-bold mt-0.5">
              Com saídas registradas
            </p>
          </div>

          <div className="bg-purple-50/70 border border-purple-100 p-3 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider">Veículos Utilizados</span>
              <Car className="h-4 w-4 text-purple-600" />
            </div>
            <p className="text-xl font-black text-purple-950 mt-1">
              {stats.totalVehicles}
            </p>
            <p className="text-[10px] text-purple-700/80 font-bold mt-0.5">
              {stats.totalKm > 0 ? `${stats.totalKm} km percorridos` : 'Carros em trânsito'}
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-grow overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {monthlyOrders.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-300">
              <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-700 uppercase">Nenhum registro encontrado</p>
              <p className="text-xs text-slate-400 mt-1">
                Não foram encontradas saídas para o mês e critérios selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Funcionário (Responsável)</th>
                    <th className="p-3">Veículo / Placa</th>
                    <th className="p-3">Localidade e Data</th>
                    <th className="p-3 text-center">Viagens</th>
                    <th className="p-3 text-center">Tempo Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {monthlyOrders
                    .filter(o => {
                      if (!searchTerm.trim()) return true;
                      const term = searchTerm.toLowerCase();
                      const matchEmp = (o.responsibleServer || '').toLowerCase().includes(term);
                      const matchVeh = (o.vehicle || '').toLowerCase().includes(term) || (o.plate || '').toLowerCase().includes(term);
                      const matchLoc = (o.destination || '').toLowerCase().includes(term);
                      const matchDate = (o.date || o.exitDate || '').includes(term);
                      return matchEmp || matchVeh || matchLoc || matchDate;
                    })
                    .map(order => {
                      const duration = calculateOrderDurationMinutes(order);
                      const dt = (order.date || order.exitDate || '').split('-').reverse().join('/');
                      return (
                        <tr key={order.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-900 uppercase">
                            {order.responsibleServer || 'NÃO INFORMADO'}
                          </td>
                          <td className="p-3 font-bold text-slate-800">
                            {order.vehicle || 'N/A'}
                            <span className="text-[10px] text-indigo-600 font-mono ml-1.5 bg-indigo-50 px-1.5 py-0.5 rounded">
                              {order.plate || 'SEM PLACA'}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-700">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>{order.destination || 'Não informada'}</span>
                              <span className="text-slate-400">•</span>
                              <span className="text-indigo-600 font-mono">{dt}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center font-black text-slate-700">
                            1
                          </td>
                          <td className="p-3 text-center font-black text-indigo-700 whitespace-nowrap">
                            {order.returnTime ? (
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {formatMinutesToReadable(duration)}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 text-[10px] uppercase font-black">
                                Em Trânsito
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-bold flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>Período Ativo:</span>
            <span className="bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg uppercase tracking-wider font-black">
              {monthLabel}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black uppercase text-xs tracking-wider transition-colors"
          >
            Fechar Relatório
          </button>
        </div>

      </div>
    </div>
  );
};

export default VehicleUsageReportModal;
