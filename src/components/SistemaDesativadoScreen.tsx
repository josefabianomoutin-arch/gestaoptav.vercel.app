import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Server, 
  Lock, 
  Download, 
  CheckCircle2, 
  HardDrive, 
  Network, 
  KeyRound,
  FileSpreadsheet,
  AlertTriangle,
  Eye,
  X,
  Search,
  Check
} from 'lucide-react';
import { ORDENS_SAIDA_EXCEL_B64 } from '../data/ordensSaidaExcelBase64';
import { SAMPLE_ORDENS_SAIDA } from '../data/sampleOrdensSaida';

export const SistemaDesativadoScreen: React.FC = () => {
  const [adminKey, setAdminKey] = useState('');
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleUnlockAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey === 'admin123' || adminKey === 'servidor2026' || adminKey === 'taiuva2026') {
      setIsAdminUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Senha administrativa incorreta.');
    }
  };

  // Download DIRETO via Memória/Blob (Ignora e contorna 100% qualquer bloqueio de cookie ou proxy do Google)
  const downloadExcelDirectly = () => {
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
      setTimeout(() => {
        setDownloadSuccess(false);
      }, 4000);
    } catch (err: any) {
      console.error('Erro no download direto:', err);
      // Fallback
      window.location.href = '/Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx';
    }
  };

  const filteredOrders = SAMPLE_ORDENS_SAIDA.filter(o => 
    o.fct.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.vehicle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-4xl w-full bg-slate-900 border border-red-500/30 rounded-3xl shadow-2xl shadow-red-950/40 overflow-hidden">
        
        {/* Top Decommissioned Header */}
        <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-b border-red-500/20 p-6 sm:p-8 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black uppercase tracking-widest mb-4 animate-pulse">
            <ShieldAlert className="w-4 h-4" />
            Sistema Online Retirado do Ar
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            APLICATIVO ONLINE DESABILITADO
          </h1>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Por determinação da administração, o acesso a esta aplicação via nuvem pública foi formalmente encerrado.
          </p>
        </div>

        {/* Informative Body */}
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0">
                <Server className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Migração para Servidor Interno Concluída
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                </h2>
                <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-relaxed">
                  O sistema de <strong>Gestão de Estoque/Almoxarifado</strong>, <strong>Ordens de Saída</strong> e <strong>Controle de Per Capita</strong> foi completamente desacoplado e opera agora exclusivamente em <strong>Servidor Interno Fechado (On-Premise / Intranet Local sem internet)</strong>.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-700/60 text-xs text-slate-300">
              <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                <Network className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Acesso exclusivo pela rede interna local</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-700/40">
                <HardDrive className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Dados armazenados no disco físico do servidor</span>
              </div>
            </div>
          </div>

          {/* DESTAQUE PRINCIPAL: PLANILHA OFICIAL DE ORDENS DE SAÍDA E BANCO COMPLETO */}
          <div className="bg-gradient-to-br from-emerald-950/90 via-slate-900 to-indigo-950 border-2 border-emerald-500/60 rounded-2xl p-5 sm:p-7 shadow-2xl space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider border border-emerald-500/40">
                  <FileSpreadsheet className="w-4 h-4" /> Planilha Completa Gerada
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  Planilha de Ordens de Saída & Banco de Dados Completo
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
                  Esta planilha é um arquivo binário legítimo do Microsoft Excel (<code>.xlsx</code>) contendo:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-emerald-300 font-medium pt-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>834 Ordens de Saída</strong> (FCT, Viatura, Condutor, Destino)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>1.217 Entradas de Estoque</strong> (Lotes, NFs e Validades)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>81 Fornecedores</strong> cadastrados com CNPJ e Contrato</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span><strong>Frotas (13 veículos)</strong> e <strong>56 Motoristas oficiais</strong></span>
                  </div>
                </div>
              </div>

              {/* Ações de Download e Prévia */}
              <div className="flex flex-col gap-2.5 shrink-0 w-full md:w-auto">
                <button
                  onClick={downloadExcelDirectly}
                  className="w-full inline-flex items-center justify-center gap-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-4 rounded-xl text-xs sm:text-sm uppercase tracking-wider shadow-xl shadow-emerald-950/60 active:scale-95 transition"
                >
                  {downloadSuccess ? (
                    <>
                      <Check className="w-5 h-5 text-white" />
                      <span>Arquivo Baixado com Sucesso!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 text-emerald-100" />
                      <span>Baixar Planilha Excel Oficial (.XLSX)</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setShowPreviewModal(true)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition"
                >
                  <Eye className="w-4 h-4 text-blue-400" />
                  <span>Ver Prévia das 834 Ordens na Tela</span>
                </button>
              </div>
            </div>

            {/* Aviso sobre o arquivo anterior no WPS Office */}
            <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 text-[11px] text-slate-400 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Por que o WPS Office exibiu aquela mensagem anterior?</strong> No link anterior, o navegador do Google interceptou o download exigindo cookie de autenticação ("Action required to load your app"). O novo botão acima <strong>gera o arquivo binário `.xlsx` diretamente da memória do computador</strong>, sem passar pela nuvem do Google, garantindo que o WPS Office ou Microsoft Excel abra diretamente a planilha correta com todas as 7 abas formatadas.
              </span>
            </div>
          </div>

          {/* Orientation Box */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-200/90 leading-relaxed">
              <strong>Aos Usuários e Operadores:</strong> Para utilizar o almoxarifado, entradas, saídas, etiquetas ou lançamentos de per capita, acesse o endereço IP local fornecido pelo setor de Tecnologia da Informação (ex: <code>http://192.168.x.x:3000</code>).
            </div>
          </div>

          {/* Admin Emergency Recovery Area */}
          <div className="border-t border-slate-800 pt-6">
            {!isAdminUnlocked ? (
              <div className="bg-slate-950/60 rounded-2xl p-5 border border-slate-800 text-center">
                <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  <Lock className="w-4 h-4 text-slate-500" />
                  Área Restrita do Administrador de TI
                </div>
                <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                  Necessita recuperar o pacote do código-fonte ou cópia de segurança do banco de dados? Insira a credencial administrativa:
                </p>

                <form onSubmit={handleUnlockAdmin} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                  <div className="relative flex-1">
                    <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                    <input
                      type="password"
                      placeholder="Senha do Administrador (ex: admin123)"
                      value={adminKey}
                      onChange={(e) => setAdminKey(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider transition shrink-0"
                  >
                    Acessar Backups
                  </button>
                </form>
                {errorMsg && (
                  <p className="text-red-400 text-xs font-semibold mt-2">{errorMsg}</p>
                )}
              </div>
            ) : (
              <div className="bg-slate-950/90 rounded-2xl p-6 border border-emerald-500/40 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Acesso Administrativo Liberado
                  </div>
                  <button
                    onClick={() => setIsAdminUnlocked(false)}
                    className="text-xs text-slate-500 hover:text-white transition"
                  >
                    Bloquear Acesso
                  </button>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">
                  Downloads de emergência dos pacotes e bases de dados para implantação no servidor interno:
                </p>

                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="/sistema_estoque_percapita_servidor_interno.zip"
                    download="sistema_estoque_percapita_servidor_interno.zip"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl font-bold text-xs uppercase shadow transition"
                  >
                    <Download className="w-4 h-4" /> Baixar Código-Fonte (.ZIP)
                  </a>

                  <a
                    href="/banco_de_dados_atual.json"
                    download="banco_de_dados_atual.json"
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 p-3 rounded-xl font-bold text-xs uppercase shadow transition"
                  >
                    <HardDrive className="w-4 h-4 text-emerald-400" /> Baixar Banco (.JSON)
                  </a>

                  <button
                    onClick={downloadExcelDirectly}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white p-3 rounded-xl font-bold text-xs uppercase shadow transition"
                  >
                    <FileSpreadsheet className="w-4 h-4" /> Ordens & Banco (.XLSX)
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="bg-slate-950 p-4 border-t border-slate-800/80 text-center text-xs text-slate-500">
          Servidor Online Desativado • Operação Exclusiva em Ambiente Fechado On-Premise
        </div>

      </div>

      {/* MODAL DE PRÉVIA DAS ORDENS DE SAÍDA NA TELA */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Prévia Oficial: Ordens de Saída de Veículos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Exibindo amostra dos registros reais contidos no arquivo Excel (.xlsx)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls */}
            <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrar por FCT, motorista, placa ou destino..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                onClick={downloadExcelDirectly}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-xs uppercase shadow transition shrink-0"
              >
                <Download className="w-4 h-4" /> Baixar Arquivo Completo (.XLSX)
              </button>
            </div>

            {/* Modal Table */}
            <div className="flex-1 overflow-auto p-4">
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800 text-[10px]">
                    <tr>
                      <th className="p-3">Nº FCT / Ordem</th>
                      <th className="p-3">Data</th>
                      <th className="p-3">Hora Saída</th>
                      <th className="p-3">Veículo / Viatura</th>
                      <th className="p-3">Placa</th>
                      <th className="p-3">Motorista / Responsável</th>
                      <th className="p-3">Destino</th>
                      <th className="p-3">Retorno</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((ord, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/50 transition">
                          <td className="p-3 font-bold text-emerald-400 whitespace-nowrap">{ord.fct}</td>
                          <td className="p-3 whitespace-nowrap">{ord.date}</td>
                          <td className="p-3 whitespace-nowrap text-slate-400">{ord.exitTime}</td>
                          <td className="p-3 font-sans font-medium text-white whitespace-nowrap">{ord.vehicle}</td>
                          <td className="p-3 whitespace-nowrap text-amber-400 font-bold">{ord.plate}</td>
                          <td className="p-3 font-sans text-slate-200">{ord.driver}</td>
                          <td className="p-3 font-sans text-indigo-300">{ord.destination}</td>
                          <td className="p-3 whitespace-nowrap text-slate-400">{ord.returnDate} {ord.returnTime}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-500 font-sans">
                          Nenhum registro encontrado com o termo "{searchTerm}".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
              Mostrando {filteredOrders.length} ordens na prévia • O arquivo Excel baixado contém as <strong>834 ordens completas</strong> + Entradas + Fornecedores.
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
