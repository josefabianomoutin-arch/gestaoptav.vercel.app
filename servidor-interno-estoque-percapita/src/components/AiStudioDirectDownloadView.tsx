import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Server, 
  HardDrive, 
  Car, 
  Package, 
  Building2, 
  ShieldCheck,
  Check
} from 'lucide-react';
import { ORDENS_SAIDA_EXCEL_B64 } from '../data/ordensSaidaExcelBase64';

export const AiStudioDirectDownloadView: React.FC = () => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadExcel = () => {
    try {
      const binaryString = window.atob(ORDENS_SAIDA_EXCEL_B64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx';
      document.body.appendChild(a);
      a.click();
      setDownloadSuccess(true);
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 500);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Erro no download:', err);
      window.location.href = '/download-planilha';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 sm:p-8 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full bg-slate-950 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-6 sm:p-8 border-b border-slate-800 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-black uppercase tracking-widest mb-3 border border-indigo-500/30">
            <ShieldCheck className="w-4 h-4" /> AI Studio • Painel Direto de Acesso e Download
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Central de Ordens de Saída & Banco de Dados
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-2xl mx-auto">
            Acesse e baixe instantaneamente a planilha oficial consolidada com todas as ordens de transporte, almoxarifado e frotas.
          </p>
        </div>

        {/* Main Content */}
        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Download Card */}
          <div className="bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
                <FileSpreadsheet className="w-4 h-4" /> Arquivo Excel Pronto (.XLSX)
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Planilha de Ordens de Saída & Banco Completo
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                Contém <strong>834 Ordens de Saída de Veículos</strong>, <strong>1.217 Entradas de Estoque</strong>, Fornecedores, Frotas e Motoristas, formatados com filtros e fórmulas.
              </p>
            </div>

            <button
              onClick={handleDownloadExcel}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/80 active:scale-95 transition shrink-0"
            >
              {downloadSuccess ? (
                <>
                  <Check className="w-5 h-5 text-white" />
                  <span>Baixado com Sucesso!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 text-emerald-100" />
                  <span>Baixar Planilha Excel (.XLSX)</span>
                </>
              )}
            </button>
          </div>

          {/* Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
                <Car className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">834</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Ordens de Saída</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">1.217</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Entradas de Estoque</div>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
              <div className="p-3 bg-amber-600/20 text-amber-400 rounded-xl border border-amber-500/30">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-white">81</div>
                <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fornecedores</div>
              </div>
            </div>
          </div>

          {/* Additional Downloads */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-indigo-400" /> Outros Pacotes e Arquivos de Backup
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="/sistema_estoque_percapita_servidor_interno.zip"
                download="sistema_estoque_percapita_servidor_interno.zip"
                className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-white transition"
              >
                <span className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-indigo-400" />
                  Pacote Servidor Interno (.ZIP)
                </span>
                <span className="text-[10px] text-slate-400">74 MB</span>
              </a>

              <a
                href="/banco_de_dados_atual.json"
                download="banco_de_dados_atual.json"
                className="flex items-center justify-between p-4 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-bold text-white transition"
              >
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  Banco de Dados Bruto (.JSON)
                </span>
                <span className="text-[10px] text-slate-400">JSON</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-900/50 p-4 border-t border-slate-800 text-center text-xs text-slate-500">
          Painel de Acesso Exclusivo • AI Studio Preview
        </div>

      </div>
    </div>
  );
};
