import React, { useState, useMemo } from 'react';
import type { Supplier, DirectorPerCapitaLog } from '../types';
import ConfirmModal from './ConfirmModal';

interface AdminDirectorPerCapitaProps {
  suppliers: Supplier[];
  logs: DirectorPerCapitaLog[];
  directorPerCapita?: any;
  warehouseLog?: any[];
  onRegister: (log: Omit<DirectorPerCapitaLog, 'id'>) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<void>;
}

const formatCurrency = (value?: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const normalizeText = (t: string) => {
  if (!t) return '';
  return t
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[;,\-."']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

const getMatchScore = (requestedName: string, logName: string): number => {
  const reqNorm = normalizeText(requestedName);
  const logNorm = normalizeText(logName);
  if (!reqNorm || !logNorm) return 0;
  if (reqNorm === logNorm) return 100;

  const reqWords = reqNorm.split(' ').filter(Boolean);
  const logWords = logNorm.split(' ').filter(Boolean);

  if (reqWords.length === 0 || logWords.length === 0) return 0;

  const reqFirstTwo = reqWords.slice(0, 2).join(' ');
  const logFirstTwo = logWords.slice(0, 2).join(' ');
  if (reqFirstTwo && logFirstTwo && reqFirstTwo === logFirstTwo) return 90;

  if (logNorm.includes(reqNorm)) return 80;
  if (reqNorm.includes(logNorm)) return 70;

  if (reqWords[0] === logWords[0]) return 50;

  const reqFirstWordChars = reqWords[0].slice(0, 4);
  const logFirstWordChars = logWords[0].slice(0, 4);
  if (reqFirstWordChars && logFirstWordChars && reqFirstWordChars === logFirstWordChars) return 40;

  const sharedWords = reqWords.filter(w => logWords.includes(w));
  if (sharedWords.length > 0) {
    return 20 + sharedWords.length;
  }

  return 0;
};

const getPrintableLotDetails = (itemName: string, warehouseLog?: any[]) => {
  if (!itemName || !itemName.trim() || !warehouseLog) return null;

  const candidates: Array<{ log: any; score: number }> = [];

  warehouseLog.forEach((log: any) => {
    if (!log) return;
    const logItemName = log.itemName || log.item || '';
    if (!logItemName) return;

    const score = getMatchScore(itemName, logItemName);
    if (score >= 35) { // broad matching threshold
      candidates.push({ log, score });
    }
  });

  if (candidates.length === 0) {
    return null;
  }

  const entradas = candidates.filter(c => c.log.type === 'entrada');

  if (entradas.length > 0) {
    entradas.sort((a, b) => {
      const scoreDiff = b.score - a.score;
      if (Math.abs(scoreDiff) > 15) {
        return scoreDiff;
      }
      const dateA = a.log.timestamp || a.log.date || 0;
      const dateB = b.log.timestamp || b.log.date || 0;
      return dateB > dateA ? 1 : -1;
    });
    return entradas[0].log;
  } else {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].log;
  }
};

const AdminDirectorPerCapita: React.FC<AdminDirectorPerCapitaProps> = ({ suppliers, logs = [], directorPerCapita, warehouseLog, onDelete }) => {
  const [confirmConfig, setConfirmConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: () => void;
      variant?: 'danger' | 'warning' | 'info';
  }>({
      isOpen: false,
      title: '',
      message: '',
      onConfirm: () => {},
  });

  const displayLogs = useMemo(() => {
    const combinedLogs = [...(logs || [])];

    if (directorPerCapita) {
      const parseHistory = (historyObj: any, recipient: string) => {
        if (!historyObj) return;
        Object.values(historyObj).forEach((order: any) => {
          if (!order.items || order.items.length === 0) return;
          const dDate = new Date(order.createdAt || Date.now());
          combinedLogs.push({
            id: order.id,
            date: dDate.toISOString().split('T')[0],
            month: dDate.toLocaleString('pt-BR', { month: 'long' }),
            week: order.periodType === 'semanal' ? 'S' + Math.ceil(dDate.getDate() / 7) : 'MENSAL',
            recipient: recipient,
            items: order.items.map((it: any) => ({
              name: it.itemName,
              quantity: parseFloat(String(it.quantity).replace(',', '.')) || 0,
              expirationDate: '', // Will populate below
              totalValue: 0
            })),
            totalValue: 0,
            isNewModel: true // Flag to distinguish
          } as DirectorPerCapitaLog & { isNewModel: boolean });
        });
      };

      if (directorPerCapita.chefeDep) {
        parseHistory(directorPerCapita.chefeDep.history, 'Diretor de Disciplina - Alimentação');
        parseHistory(directorPerCapita.chefeDep.limpezaHistory, 'Diretor de Disciplina - Limpeza');
      }
      if (directorPerCapita.chefeSeg) {
        parseHistory(directorPerCapita.chefeSeg.history, 'Diretor de Segurança - Alimentação');
        parseHistory(directorPerCapita.chefeSeg.limpezaHistory, 'Diretor de Segurança - Limpeza');
      }
    }

    // Sort by date descending
    combinedLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combinedLogs;
  }, [logs, directorPerCapita]);

  // Compile a map of item name -> unit
  const itemUnitsMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (suppliers && Array.isArray(suppliers)) {
      suppliers.forEach(s => {
        if (s && s.contractItems) {
          const items = Array.isArray(s.contractItems) 
            ? s.contractItems 
            : typeof s.contractItems === 'object' 
              ? Object.values(s.contractItems) 
              : [];
          items.forEach((ci: any) => {
            if (ci && ci.name && ci.unit) {
              map[ci.name.trim().toUpperCase()] = ci.unit;
            }
          });
        }
      });
    }
    return map;
  }, [suppliers]);

  const getItemUnit = (itemName: string) => {
    if (!itemName) return 'KG';
    const nameKey = itemName.trim().toUpperCase();
    return itemUnitsMap[nameKey] || 'KG';
  };

  // 1. Generate PDF of the entire history list (grouped report)
  const handlePrintReport = () => {
      try {
        const printContent = `
          <html>
            <head>
              <title>Relatório de Encomendas - Diretoria</title>
              <style>
                @page { 
                    size: A4; 
                    margin: 15mm; 
                }
                body { 
                    font-family: Arial, sans-serif; 
                    padding: 10px; 
                    color: #1e293b; 
                    line-height: 1.4; 
                    margin: 0;
                }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
                th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; font-size: 10px; }
                .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; }
                .header-sap { font-size: 13px; margin-bottom: 3px; text-transform: uppercase; color: #475569; }
                .header-unit { font-size: 16px; font-weight: bold; margin-bottom: 4px; color: #1e3a8a; }
                .header-address { font-size: 10px; color: #64748b; }
                .report-title { text-align: center; font-size: 16px; font-weight: bold; margin: 20px 0; text-transform: uppercase; color: #1e293b; }
                .footer { margin-top: 60px; display: flex; justify-content: space-around; }
                .sig { border-top: 1px solid #1e293b; width: 220px; text-align: center; padding-top: 5px; font-size: 11px; font-weight: bold; color: #475569; }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="header-sap">Secretaria da Administração Penitenciária</div>
                <div class="header-unit">Polícia Penal - Penitenciária de Taiúva</div>
                <div class="header-address">Rodovia Brigadeiro Faria Lima, SP 326, KM 359,6 Taiúva/SP - CEP: 14.720-000</div>
                <div class="header-address">Fone: (16) 3247-6261 - E-mail: dg@ptaiuva.sap.gov.br</div>
              </div>
              
              <div class="report-title">Histórico de Envios para a Diretoria</div>
              
              <table>
                <thead>
                  <tr>
                    <th style="width: 30px; text-align: center;">#</th>
                    <th>Data</th>
                    <th>Referência</th>
                    <th>Destinatário</th>
                    <th>Itens Solicitados</th>
                    <th style="width: 90px; text-align: right;">Total Item</th>
                  </tr>
                </thead>
                <tbody>
                  ${displayLogs.flatMap((l, logIdx) => l.items.map((item, index) => {
                      const lotDetails = warehouseLog && (l as any).isNewModel ? getPrintableLotDetails(item.name, warehouseLog) : null;
                      const expirationFormatted = lotDetails ? (lotDetails.expirationDate || lotDetails.expiration || '') : item.expirationDate;
                      const formattedExp = expirationFormatted && expirationFormatted !== 'N/A' && expirationFormatted.includes('-')
                        ? expirationFormatted.split('-').reverse().join('/')
                        : (expirationFormatted || (lotDetails ? 'N/A' : '-'));
                      return `
                    <tr>
                      <td style="text-align: center; color: #64748b;">${logIdx + 1}.${index + 1}</td>
                      <td>${new Date(l.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      <td>${l.month} / ${l.week !== 'MENSAL' ? (l.week.includes('S') ? l.week : 'S' + l.week) : l.week}</td>
                      <td>${l.recipient}</td>
                      <td><strong>${item.name || ''}</strong> (${(item.quantity || 0).toLocaleString('pt-BR')} ${getItemUnit(item.name)}) - Val: ${formattedExp}</td>
                      <td style="text-align: right; font-weight: bold; color: #1e3a8a;">${formatCurrency(item.totalValue || 0)}</td>
                    </tr>
                  `;
                  })).join('')}
                </tbody>
                <tfoot>
                   <tr style="font-weight: bold; background-color: #f8fafc;">
                      <td colspan="5" style="text-align: right; text-transform: uppercase; color: #475569; font-size: 10px;">TOTAL GERAL DO HISTÓRICO:</td>
                      <td style="text-align: right; color: #1e3a8a; font-size: 12px;">${formatCurrency(displayLogs.reduce((acc, curr) => acc + (curr.totalValue || 0), 0))}</td>
                   </tr>
                </tfoot>
              </table>
              
              <div class="footer">
                <div class="sig">Responsável (Almoxarifado)</div>
                <div class="sig">Recebedor (Diretoria)</div>
              </div>
            </body>
          </html>
        `;
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(printContent);
          win.document.close();
          setTimeout(() => {
            win.print();
          }, 500);
        }
      } catch (_err) {
        console.error("Erro ao gerar relatório:", _err);
        alert("Erro ao gerar o relatório. Tente novamente.");
      }
  };

  // 2. Generate PDF of a SINGLE order / withdrawal
  const handlePrintSingleLog = (log: DirectorPerCapitaLog) => {
    try {
      const printContent = `
        <html>
          <head>
            <title>Comprovante de Saída - Diretoria</title>
            <style>
              @page { 
                  size: A4; 
                  margin: 20mm; 
              }
              body { 
                  font-family: Arial, sans-serif; 
                  color: #1e293b; 
                  line-height: 1.5; 
                  margin: 0;
              }
              .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; }
              .header-sap { font-size: 13px; margin-bottom: 3px; text-transform: uppercase; color: #475569; letter-spacing: 0.5px; }
              .header-unit { font-size: 16px; font-weight: bold; margin-bottom: 4px; color: #1e3a8a; }
              .header-sub { font-size: 10px; color: #64748b; }
              
              .report-title { text-align: center; font-size: 18px; font-weight: bold; margin: 25px 0 15px 0; text-transform: uppercase; color: #1e293b; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; }
              
              .meta-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 25px; background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; }
              .meta-item { font-size: 11px; }
              .meta-item strong { color: #475569; }

              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px 8px; text-align: left; font-size: 11px; }
              th { background-color: #f1f5f9; font-weight: bold; color: #334155; text-transform: uppercase; font-size: 10px; }
              
              .footer { margin-top: 80px; display: flex; justify-content: space-between; }
              .sig-container { display: flex; flex-direction: column; align-items: center; width: 45%; }
              .sig-line { border-top: 1px solid #1e293b; width: 100%; text-align: center; margin-top: 40px; padding-top: 5px; font-size: 11px; font-weight: bold; color: #475569; text-transform: uppercase; }
              .sig-title { font-size: 10px; color: #64748b; margin-top: 2px; }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-sap">Secretaria da Administração Penitenciária</div>
              <div class="header-unit">Polícia Penal - Penitenciária de Taiúva</div>
              <div class="header-sub">Rodovia Brigadeiro Faria Lima, SP 326, KM 359,6 Taiúva/SP - CEP: 14.720-000</div>
              <div class="header-sub">Fone: (16) 3247-6261 - E-mail: dg@ptaiuva.sap.gov.br</div>
            </div>
            
            <div class="report-title">Pedido de Suprimento - Saída da Diretoria</div>
            
            <div class="meta-grid">
              <div class="meta-item"><strong>Data do Envio:</strong> ${new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
              <div class="meta-item"><strong>Destinatário:</strong> ${log.recipient}</div>
              <div class="meta-item"><strong>Mês de Referência:</strong> ${log.month}</div>
              <div class="meta-item"><strong>Semana de Consumo:</strong> ${log.week !== 'MENSAL' ? (log.week.includes('S') ? log.week : 'Semana ' + log.week) : log.week}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th style="width: 40px; text-align: center;">#</th>
                  <th>Descrição do Item Entregue</th>
                  <th style="width: 80px; text-align: center;">Lote</th>
                  <th style="width: 80px; text-align: center;">Qtd. Solicitada</th>
                  <th style="width: 70px; text-align: center;">Unid.</th>
                  <th style="width: 100px; text-align: center;">Validade</th>
                </tr>
              </thead>
              <tbody>
                ${log.items.map((item, index) => {
                  const unitVal = getItemUnit(item.name) || 'KG';
                  const lotDetails = warehouseLog && (log as any).isNewModel ? getPrintableLotDetails(item.name, warehouseLog) : null;
                  const lotText = lotDetails ? (lotDetails.lotNumber || lotDetails.lot || 'UNICO') : '-';
                  const expirationFormatted = lotDetails ? (lotDetails.expirationDate || lotDetails.expiration || '') : item.expirationDate;
                  const formattedExp = expirationFormatted && expirationFormatted !== 'N/A' && expirationFormatted.includes('-')
                        ? expirationFormatted.split('-').reverse().join('/')
                        : (expirationFormatted || (lotDetails ? 'N/A' : '-'));
                  return `
                    <tr>
                      <td style="text-align: center; color: #64748b;">${index + 1}</td>
                      <td style="font-weight: bold; color: #0f172a;">${item.name}</td>
                      <td style="text-align: center; font-weight: bold; color: #475569;">${lotText}</td>
                      <td style="text-align: center; font-weight: bold; color: #1e3a8a;">${item.quantity.toLocaleString('pt-BR')}</td>
                      <td style="text-align: center; font-weight: bold; color: #475569;">${unitVal}</td>
                      <td style="text-align: center;">${formattedExp}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>

            <div style="margin-top: 30px; text-align: right; font-size: 12px; font-weight: bold; color: #1e3a8a;">
              VALOR TOTAL DOS ITENS: ${formatCurrency(log.totalValue)}
            </div>
            
            <div class="footer">
              <div class="sig-container">
                <div class="sig-line">Responsável pelo Almoxarifado</div>
                <div class="sig-title">Assinatura e Carimbo</div>
              </div>
              <div class="sig-container">
                <div class="sig-line">Recebedor (Diretoria)</div>
                <div class="sig-title">Assinatura e RG</div>
              </div>
            </div>
          </body>
        </html>
      `;
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(printContent);
        win.document.close();
        setTimeout(() => {
          win.print();
        }, 500);
      }
    } catch (err) {
      console.error("Erro ao gerar PDF do pedido:", err);
      alert("Erro ao gerar o PDF. Verifique se os pop-ups estão autorizados.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4 border-b border-gray-100 pb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tight flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
              Controle de Envios e Retiradas (Diretores)
            </h3>
            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-wider">Histórico simplificado de saídas para as diretorias</p>
          </div>
          <button 
            onClick={handlePrintReport} 
            disabled={displayLogs.length === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Imprimir Histórico Completo
          </button>
        </div>

        <div className="border border-gray-100 rounded-2xl flex flex-col shadow-sm overflow-hidden bg-gray-50/50">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-200">
                <tr>
                  <th className="p-4 text-center w-12">#</th>
                  <th className="p-4 text-left">Data do Envio</th>
                  <th className="p-4 text-left">Referência</th>
                  <th className="p-4 text-left">Destinatário</th>
                  <th className="p-4 text-left">Produtos / Descrições</th>
                  <th className="p-4 text-right w-36">Valor Total</th>
                  <th className="p-4 text-center w-32">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {displayLogs.length > 0 ? displayLogs.map((log, idx) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-center font-bold text-gray-400">{idx + 1}</td>
                    <td className="p-4 font-mono font-bold text-gray-700">{new Date(log.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                    <td className="p-4">
                      <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase border border-indigo-100">
                          {log.month} {log.week !== 'MENSAL' ? `(${log.week})` : ''}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-600">{log.recipient}</td>
                    <td className="p-4 text-xs text-gray-500 max-w-[450px]">
                      <ul className="space-y-1">
                          {log.items.map((item, i) => {
                              const lotDetails = warehouseLog && log.isNewModel ? getPrintableLotDetails(item.name, warehouseLog) : null;
                              const lotText = lotDetails ? (lotDetails.lotNumber || lotDetails.lot || 'UNICO') : '-';
                              const expRaw = lotDetails ? (lotDetails.expirationDate || lotDetails.expiration || '') : item.expirationDate;
                              const expirationText = expRaw && expRaw !== 'N/A' 
                                ? (expRaw.includes('-') ? expRaw.split('-').reverse().join('/') : expRaw) 
                                : (lotDetails ? 'N/A' : '-');

                              return (
                                <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-gray-50 border border-gray-100 rounded-md px-2 py-1 gap-2">
                                  <span className="font-bold text-gray-700 truncate">{item.name}</span>
                                  <div className="flex gap-2 items-center flex-wrap shrink-0">
                                    <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                      LT: {lotText}
                                    </span>
                                    <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase">
                                      VAL: {expirationText}
                                    </span>
                                    <span className="bg-slate-950 text-white font-mono text-[10px] px-2 py-0.5 rounded uppercase font-black">
                                      {item.quantity.toLocaleString('pt-BR')} {getItemUnit(item.name)}
                                    </span>
                                  </div>
                                </li>
                              )
                          })}
                      </ul>
                    </td>
                    <td className="p-4 text-right font-black text-indigo-700">{formatCurrency(log.totalValue)}</td>
                    <td className="p-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handlePrintSingleLog(log)}
                          className="flex items-center gap-1.5 bg-gray-100 hover:bg-slate-900 border hover:border-slate-800 text-gray-700 hover:text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-sm"
                          title="Imprimir Pedido"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                          PDF
                        </button>
                        <button 
                          onClick={() => { 
                              setConfirmConfig({
                                  isOpen: true,
                                  title: 'Excluir Registro',
                                  message: 'Deseja excluir este registro permanentemente? Atenção: O estoque NÃO será devolvido automaticamente ao excluir o log.',
                                  onConfirm: () => {
                                      onDelete(log.id);
                                      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
                                  },
                                  variant: 'danger'
                              });
                          }} 
                          className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-full transition-colors border border-transparent"
                          title="Excluir Registro"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="p-20 text-center text-gray-400 italic">Nenhum registro de envio para diretoria localizado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <ConfirmModal 
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
          variant={confirmConfig.variant}
      />
    </div>
  );
};

export default AdminDirectorPerCapita;
