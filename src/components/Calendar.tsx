
import React, { useMemo } from 'react';
import type { Delivery } from '../types';
import { MONTHS_2026, WEEK_DAYS, HOLIDAYS_2026 } from '../constants';

interface CalendarProps {
  onDayClick: (date: Date) => void;
  deliveries: Delivery[];
  allowedWeeks?: number[];
  monthlySchedule?: Record<string, number[]>;
  activeContractPeriod?: '1_QUAD' | '2_3_QUAD';
}

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const Calendar: React.FC<CalendarProps> = ({ onDayClick, deliveries, allowedWeeks, activeContractPeriod }) => {

  const deliveriesByDate = useMemo(() => {
    const map = new Map<string, Delivery[]>();
    deliveries.forEach(delivery => {
      if (delivery && delivery.date) {
        const existing = map.get(delivery.date) || [];
        map.set(delivery.date, [...existing, delivery]);
      }
    });
    return map;
  }, [deliveries]);

  // Calculate weeks that already have a scheduled delivery
  const deliveryWeekNums = useMemo(() => {
    const map = new Map<string, number>(); // date -> weekNumber
    deliveries.forEach(d => {
      if (d && d.date && !map.has(d.date)) {
        const parts = d.date.split('-');
        if (parts.length === 3) {
          const dDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          map.set(d.date, getWeekNumber(dDate));
        }
      }
    });
    return map;
  }, [deliveries]);

  const scheduledWeeksSet = useMemo(() => {
    return new Set(deliveryWeekNums.values());
  }, [deliveryWeekNums]);

  const isDateAllowed = (date: Date) => {
    const monthIndex = date.getMonth();
    
    // Se estivermos no 2º/3º quadrimestre, meses de Jan-Abr podem ser visualizados mas não agendados
    if (activeContractPeriod === '2_3_QUAD' && monthIndex <= 3) {
      return false;
    }

    // Se houver semanas permitidas definidas, verifica se a semana da data está nelas
    if (allowedWeeks && allowedWeeks.length > 0) {
      const weekNum = getWeekNumber(date);
      if (!allowedWeeks.includes(weekNum)) {
        return false;
      }
    }

    // Liberado para todos os produtores nas datas disponíveis (dias úteis)
    // O Calendar já filtra finais de semana e feriados no cálculo do isClickable
    return true;
  };

  const generateMonthGrid = (month: number, year: number) => {
    const date = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = date.getDay();
    
    const grid = [];
    // Espaços vazios antes do primeiro dia do mês
    for (let i = 0; i < firstDayIndex; i++) {
      grid.push(<div key={`blank-${i}`} className="border-r border-b border-gray-200 bg-gray-50/30"></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      const dateString = currentDate.toISOString().split('T')[0];
      const deliveriesOnThisDate = deliveriesByDate.get(dateString) || [];
      
      const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const holidayName = HOLIDAYS_2026[dateString];
      const isHoliday = !!holidayName;
      
      const isAllowed = isDateAllowed(currentDate);
      
      const currentWeekNum = getWeekNumber(currentDate);
      const hasDeliveryInSameWeekOnOtherDate = scheduledWeeksSet.has(currentWeekNum) && deliveriesOnThisDate.length === 0;
      
      const hasDeliveries = deliveriesOnThisDate.length > 0;
      // Não permite agendar em feriados nem finais de semana, a menos que já existam entregas registradas (por admin)
      const isClickable = ((isAllowed && !isWeekend && !isHoliday && !hasDeliveryInSameWeekOnOtherDate) || hasDeliveries);
      
      let dayClasses = "p-2 text-center border-r border-b border-gray-200 h-20 flex flex-col justify-center items-center relative transition-all";

      let tooltipTitle = undefined;
      if (isHoliday) {
        dayClasses += " bg-gray-200 text-gray-400 cursor-not-allowed overflow-hidden";
      } else if (hasDeliveryInSameWeekOnOtherDate) {
        dayClasses += " bg-gray-100 text-gray-300 cursor-not-allowed opacity-60";
        tooltipTitle = "Limite de 1 entrega por semana excedido";
      } else if (!isClickable) {
        dayClasses += " bg-gray-100 text-gray-300 cursor-not-allowed";
      } else {
        dayClasses += " cursor-pointer";
        const hasDeliveries = deliveriesOnThisDate.length > 0;
        const realDeliveries = deliveriesOnThisDate.filter(d => d.item !== 'AGENDAMENTO PENDENTE');
        const needsInvoice = hasDeliveries && (realDeliveries.length > 0 
           ? realDeliveries.some(d => !d.invoiceUploaded)
           : deliveriesOnThisDate.some(d => !d.invoiceUploaded));
           
        const allFulfilled = hasDeliveries && (realDeliveries.length > 0
           ? realDeliveries.every(d => d.invoiceUploaded)
           : deliveriesOnThisDate.every(d => d.invoiceUploaded));

        if (needsInvoice) {
          dayClasses += " bg-red-500 hover:bg-red-600 text-white font-bold shadow-inner";
        } else if (allFulfilled) {
          dayClasses += " bg-green-600 hover:bg-green-700 text-white font-bold shadow-inner";
        } else if (hasDeliveries) {
          dayClasses += " bg-green-100 hover:bg-green-200 text-green-900 font-bold border-2 border-green-400";
        } else {
          dayClasses += " bg-white hover:bg-blue-50";
        }
      }

      grid.push(
        <div key={day} className={dayClasses} title={tooltipTitle} onClick={() => isClickable && !isHoliday && onDayClick(currentDate)}>
          <span className="text-xs md:text-sm font-mono z-10">{day}</span>
          
          {isHoliday && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-1 opacity-40 select-none hover:opacity-100 transition-opacity z-20">
               <span className="text-[9px] md:text-[10px] leading-tight text-center font-black uppercase text-rose-500 bg-white/80 border border-rose-200 px-1 py-0.5 rounded shadow-sm">{holidayName}</span>
            </div>
          )}

          {hasDeliveries && (
            <span className="text-[8px] mt-1 px-1 rounded bg-black/10 truncate max-w-full uppercase font-black z-10">
              {deliveriesOnThisDate.some(d => d.invoiceUploaded) ? 'Faturado' : 'Agendado'}
            </span>
          )}
          
          {hasDeliveries && deliveriesOnThisDate.some(d => !d.invoiceUploaded) && (
            <span className="absolute top-1 right-1 text-[8px] bg-yellow-400 text-black px-1 rounded font-black shadow-sm animate-pulse z-10">NF!</span>
          )}
        </div>
      );
    }
    return grid;
  };

  return (
    <div className="space-y-12 pb-10">
      {MONTHS_2026.map(month => (
        <div key={month.name} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-800 p-3 text-white flex justify-between items-center px-6">
            <h3 className="text-lg font-black uppercase tracking-widest">{month.name} 2026</h3>
            <span className="text-[10px] font-bold text-gray-400">PPAIS - TAIÚVA</span>
          </div>
          <div className="grid grid-cols-[50px_repeat(7,1fr)] border-l border-gray-200">
            {/* Cabeçalho da Semana e Dias */}
            <div className="p-2 text-center font-black text-[9px] text-gray-400 bg-gray-50 border-r border-b border-gray-200 flex items-center justify-center">SEM.</div>
            {WEEK_DAYS.map(day => (
              <div key={day} className="p-2 text-center font-black text-[10px] text-gray-500 bg-gray-50 border-r border-b border-gray-200">
                {day.toUpperCase()}
              </div>
            ))}
            
            {/* Gerar linhas com número da semana à esquerda */}
            {(() => {
                const rows = [];
                const firstDay = new Date(2026, month.number, 1);
                const lastDay = new Date(2026, month.number + 1, 0).getDate();
                const totalDays = firstDay.getDay() + lastDay;
                const totalRows = Math.ceil(totalDays / 7);
                
                const monthGrid = generateMonthGrid(month.number, 2026);
                
                for (let r = 0; r < totalRows; r++) {
                    const rowDate = new Date(2026, month.number, (r * 7) + 1 - firstDay.getDay() + 3);
                    const weekNum = getWeekNumber(rowDate);
                    
                    const isAllowed = isDateAllowed(rowDate);
                    
                    rows.push(
                        <React.Fragment key={`row-${r}`}>
                            <div className={`p-2 border-r border-b border-gray-200 flex flex-col items-center justify-center ${isAllowed ? 'bg-green-50' : 'bg-gray-50 opacity-40'}`}>
                                <span className={`text-[10px] font-black ${isAllowed ? 'text-green-700' : 'text-gray-400'}`}>{weekNum}</span>
                                {isAllowed && <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-1"></div>}
                            </div>
                            {monthGrid.slice(r * 7, (r + 1) * 7)}
                        </React.Fragment>
                    );
                }
                return rows;
            })()}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Calendar;
