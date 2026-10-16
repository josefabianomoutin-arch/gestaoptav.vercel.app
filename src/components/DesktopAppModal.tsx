import React, { useState, useEffect } from 'react';
import { 
  Laptop, 
  Download, 
  Terminal, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Sparkles, 
  Monitor, 
  Server,
  ArrowDownToLine
} from 'lucide-react';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'pwa' | 'linux' | 'windows' | 'server'>('pwa');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // Detectar se já está rodando em modo standalone (sem barra de URL)
    const checkStandalone = () => {
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();
    window.matchMedia('(display-mode: standalone)').addEventListener('change', checkStandalone);

    // Capturar evento PWA de instalação
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setInstalledSuccess(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      alert("Para instalar direto pelo navegador, clique no ícone de 'Instalar Aplicativo' (computador com seta para baixo) na barra de endereços do seu navegador Chrome ou Edge.");
      return;
    }
    setIsInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setInstalledSuccess(true);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-950 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                Trabalhar como Aplicativo Desktop
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Sem barra de internet
                </span>
              </h2>
              <p className="text-xs text-slate-400">Execute o sistema em janela nativa dedicada no Linux e Windows</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status atual */}
        {isStandalone && (
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Você já está executando o sistema em modo Aplicativo Nativo (Janela sem barra de navegador)!</span>
          </div>
        )}

        {/* Navegação de Abas */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 p-1.5 gap-1 text-xs font-bold">
          <button
            onClick={() => setActiveTab('pwa')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'pwa'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            1-Clique (PWA)
          </button>

          <button
            onClick={() => setActiveTab('linux')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'linux'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Linux / Servidor
          </button>

          <button
            onClick={() => setActiveTab('windows')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'windows'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            Windows
          </button>

          <button
            onClick={() => setActiveTab('server')}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'server'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Baixar ZIP Completo
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* ABA 1: PWA (1-Clique) */}
          {activeTab === 'pwa' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl">
                <h3 className="font-bold text-sm text-indigo-300 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Instalar como Aplicativo PWA Oficial
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O navegador Chrome, Edge ou Chromium permite fixar o sistema diretamente na Área de Trabalho e no Menu Iniciar/Aplicativos. Ao abrir, ele roda como <strong>aplicativo autônomo</strong> sem barra de URL, sem abas e com ícone próprio da Polícia Penal!
                </p>
              </div>

              {installedSuccess ? (
                <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-center space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <h4 className="font-black text-emerald-300 text-sm">Aplicativo Instalado com Sucesso!</h4>
                  <p className="text-xs text-slate-300">
                    O atalho já foi criado no seu computador. Feche esta aba e use o novo ícone do sistema!
                  </p>
                </div>
              ) : deferredPrompt ? (
                <button
                  onClick={handleInstallPWA}
                  disabled={isInstalling}
                  className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-3 transition transform active:scale-98"
                >
                  <Download className="w-5 h-5" />
                  {isInstalling ? 'Instalando no Computador...' : 'Instalar Aplicativo no Computador Agora'}
                </button>
              ) : (
                <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-300">Como instalar no Chrome / Edge:</h4>
                  <ol className="text-xs text-slate-400 space-y-2 list-decimal list-inside leading-relaxed">
                    <li>Olhe para o canto direito da barra de endereços do seu navegador.</li>
                    <li>Clique no ícone de <strong>"Instalar Aplicativo"</strong> (computador com seta para baixo 🖥️ ou três pontinhos).</li>
                    <li>Clique em <strong>"Instalar"</strong>.</li>
                    <li>Pronto! Uma janela exclusiva abrirá sem nenhuma barra de internet!</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          {/* ABA 2: LINUX */}
          {activeTab === 'linux' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-indigo-400" />
                  Base Linux e Servidor Fechado (Sem Internet)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  No servidor interno Linux, incluímos scripts prontos que abrem o sistema diretamente em <strong>Modo App</strong> (Chromium/Chrome Window App), eliminando completamente a barra de URL e botões de internet.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">1. Abrir imediatamente em modo Aplicativo:</div>
                  <div className="text-emerald-400 selection:bg-emerald-900 select-all font-bold">
                    ./iniciar_como_aplicativo_linux.sh
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Inicia o servidor e abre a janela do aplicativo nativo sem barra de internet.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 font-mono text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">2. Criar Ícone na Área de Trabalho (Desktop):</div>
                  <div className="text-emerald-400 selection:bg-emerald-900 select-all font-bold">
                    ./instalar_atalho_area_de_trabalho_linux.sh
                  </div>
                  <p className="text-[11px] text-slate-500 font-sans">
                    Cria o atalho oficial <strong>"Sistema de Estoque e Per Capita"</strong> na sua Área de Trabalho com o brasão oficial. Bastará dar dois cliques!
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <a
                  href="/download-app-linux"
                  download="iniciar_como_aplicativo_linux.sh"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 text-white shadow-md transition"
                >
                  <ArrowDownToLine className="w-4 h-4 text-white" />
                  Baixar Script Iniciar App (.sh)
                </a>
                <a
                  href="/download-atalho-linux"
                  download="instalar_atalho_area_de_trabalho_linux.sh"
                  className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 text-white transition"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Baixar Criador de Ícone (.sh)
                </a>
              </div>
            </div>
          )}

          {/* ABA 3: WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-indigo-400" />
                  Executar no Windows como Aplicativo
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  O pacote inclui inicializadores em lote (.bat) que aproveitam o Microsoft Edge (já nativo no Windows 10 e 11) para abrir a interface em janela dedicada sem nenhuma barra de navegação.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Como Usar no Windows:</div>
                  <p className="text-slate-300 leading-relaxed">
                    Dentro da pasta do sistema extraído, basta dar dois cliques no arquivo:
                  </p>
                  <div className="text-indigo-400 font-mono font-bold select-all bg-slate-900 p-2 rounded-lg border border-slate-800">
                    Abrir_Como_Aplicativo_Windows.bat
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Ele inicia o servidor e abre a janela do sistema como aplicativo de desktop na hora.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <a
                  href="/download-app-windows"
                  download="Abrir_Como_Aplicativo_Windows.bat"
                  className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-xs font-bold text-center flex items-center justify-center gap-2 text-white transition"
                >
                  <ArrowDownToLine className="w-4 h-4 text-indigo-400" />
                  Baixar Inicializador Windows (.bat)
                </a>
              </div>
            </div>
          )}

          {/* ABA 4: BAIXAR ZIP COMPLETO */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div className="bg-indigo-950/40 border border-indigo-700/50 p-4 rounded-2xl space-y-2">
                <h3 className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-400" />
                  Pacote Completo do Servidor Interno (On-Premise)
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contém o sistema completo compilado, banco de dados real sincronizado (145MB), backend Node.js autônomo, scripts de serviço 24/7 e inicializadores em modo aplicativo para Linux e Windows.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Arquivo:</span>
                  <span className="font-mono text-indigo-400">sistema_estoque_percapita_servidor_interno.zip</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Banco de Dados:</span>
                  <span className="text-emerald-400">Sincronizado e Integrado</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 font-bold">
                  <span>Modo de Download:</span>
                  <span className="text-slate-200">Streaming Contínuo (Sem limite 32MB)</span>
                </div>
              </div>

              <a
                href="/download-servidor-interno"
                download="sistema_estoque_percapita_servidor_interno.zip"
                className="w-full py-4 px-6 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-950/50 flex items-center justify-center gap-3 transition transform active:scale-98"
              >
                <Download className="w-5 h-5" />
                Baixar Servidor Completo (.ZIP)
              </a>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <span className="font-medium text-[11px]">Sistema de Gestão Penitenciária • Taiúva 2026</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition text-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
