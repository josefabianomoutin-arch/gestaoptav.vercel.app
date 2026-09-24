import React, { useState } from 'react';
import { 
  Server, 
  Download, 
  CheckCircle2, 
  Copy, 
  HardDrive, 
  Network, 
  ShieldCheck, 
  Layers, 
  Check, 
  X,
  FileSpreadsheet
} from 'lucide-react';

interface AdminServidorInternoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminServidorInternoModal: React.FC<AdminServidorInternoModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'windows' | 'linux' | 'docker' | 'rede' | 'estrutura'>('windows');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const windowsBatchSnippet = `@echo off
REM Iniciar Servidor Interno Fechado (Estoque + Per Capita)
node server.js
REM O sistema abrira em http://localhost:3000`;

  const linuxSnippet = `# 1. Extrair pacote no servidor
unzip sistema_estoque_percapita_servidor_interno.zip -d /opt/estoque
cd /opt/estoque

# 2. Dar permissão ao script
chmod +x iniciar_servidor.sh

# 3. Iniciar o sistema
./iniciar_servidor.sh

# 4. (Opcional) Liberar porta no Firewall
sudo ufw allow 3000/tcp`;

  const dockerSnippet = `# Subir container com Docker Compose
docker compose up -d --build

# Verificar logs
docker logs -f sistema_estoque_percapita`;

  const pm2Snippet = `# Instalar PM2 globalmente
npm install -g pm2

# Iniciar servidor em segundo plano 24/7
pm2 start ecosystem.config.cjs

# Configurar para iniciar no boot do sistema operacional
pm2 save
pm2 startup`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex items-start justify-between border-b border-slate-800">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-indigo-600/30 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Server className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Código-Fonte Completo para Servidor Interno Fechado
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Pronto para Rodar
                </span>
              </div>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-3xl">
                Módulo de Estoque/Almoxarifado + Sistema de Per Capita integrados e desacoplados para rodar em 
                <strong> ambiente on-premise, intranet fechada e 100% offline (sem necessidade de internet ou serviços de terceiros)</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Action Downloads Banner */}
        <div className="bg-indigo-50 border-b border-indigo-100 p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
              📦
            </div>
            <div>
              <div className="font-bold text-slate-900 text-sm sm:text-base flex items-center gap-2">
                Pacote Completo de Instalação (.ZIP)
                <span className="text-xs font-normal text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200">
                  74 MB • Backend + Frontend + Banco de Dados
                </span>
              </div>
              <div className="text-xs text-slate-600 mt-0.5">
                Contém todos os arquivos, scripts <code>iniciar_servidor.bat</code>, <code>iniciar_servidor.sh</code>, Dockerfile e dados pré-carregados.
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <a
              href="/sistema_estoque_percapita_servidor_interno.zip"
              download="sistema_estoque_percapita_servidor_interno.zip"
              className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase shadow-md active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              Baixar Pacote (.ZIP)
            </a>

            <a
              href="/banco_de_dados_atual.json"
              download="banco_de_dados_atual.json"
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-sm active:scale-95 transition"
              title="Baixar apenas o arquivo JSON do banco de dados para migração"
            >
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span>Banco (.JSON)</span>
            </a>

            <a
              href="/Planilha_Gestao_Almoxarifado_Completa.xlsx"
              download="Planilha_Gestao_Almoxarifado_Completa.xlsx"
              className="inline-flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-emerald-700 border border-emerald-200 px-3.5 py-2.5 rounded-xl font-semibold text-xs shadow-sm active:scale-95 transition"
              title="Baixar planilha Excel oficial"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel (.XLSX)</span>
            </a>
          </div>
        </div>

        {/* Feature Highlights Pills */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Módulo Estoque Completo</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Módulo Per Capita Completo</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>100% Offline (Sem Internet)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Banco Local embutido</span>
          </div>
        </div>

        {/* Body Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6 pt-3 gap-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('windows')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'windows'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🪟 Windows (1 Clique)
          </button>
          <button
            onClick={() => setActiveTab('linux')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'linux'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🐧 Linux / Ubuntu Server
          </button>
          <button
            onClick={() => setActiveTab('docker')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'docker'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🐳 Docker & Compose
          </button>
          <button
            onClick={() => setActiveTab('rede')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'rede'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🌐 Rede Local & Firewall
          </button>
          <button
            onClick={() => setActiveTab('estrutura')}
            className={`pb-3 px-3 border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'estrutura'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📂 Estrutura de Arquivos
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
          
          {/* TAB 1: WINDOWS */}
          {activeTab === 'windows' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
                  Passo a Passo de Instalação no Windows
                </h3>
                <ol className="list-decimal list-inside space-y-2 text-xs sm:text-sm text-slate-600 leading-relaxed ml-2">
                  <li>
                    Baixe o pacote acima clicando no botão <strong>"Baixar Pacote (.ZIP)"</strong>.
                  </li>
                  <li>
                    Extraia o arquivo <code>.zip</code> em uma pasta permanente no seu computador ou servidor (ex: <code>C:\Sistemas\EstoquePercapita</code>).
                  </li>
                  <li>
                    Certifique-se de que o <strong>Node.js</strong> está instalado no computador (versão 18 ou 20 LTS disponível gratuitamente em <code>https://nodejs.org</code>).
                  </li>
                  <li>
                    Dê um <strong>duplo clique no arquivo <code>iniciar_servidor.bat</code></strong>.
                  </li>
                  <li>
                    O script cuidará de tudo automaticamente: verificará o ambiente, instalará dependências se necessário e abrirá o navegador em <code>http://localhost:3000</code>.
                  </li>
                </ol>
              </div>

              <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs relative">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                  <span>Arquivo: iniciar_servidor.bat</span>
                  <button
                    onClick={() => handleCopy(windowsBatchSnippet, 'bat')}
                    className="flex items-center gap-1 text-xs hover:text-white transition"
                  >
                    {copiedCode === 'bat' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode === 'bat' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="text-emerald-400 overflow-x-auto whitespace-pre">{windowsBatchSnippet}</pre>
              </div>
            </div>
          )}

          {/* TAB 2: LINUX */}
          {activeTab === 'linux' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs">🐧</span>
                  Instalação e Execução no Linux / Ubuntu Server
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  Ideal para servidores dedicados na infraestrutura interna da instituição (sem acesso externo).
                </p>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span>Comandos no Terminal Bash:</span>
                    <button
                      onClick={() => handleCopy(linuxSnippet, 'linux')}
                      className="flex items-center gap-1 text-xs hover:text-white transition"
                    >
                      {copiedCode === 'linux' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'linux' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="text-emerald-400 overflow-x-auto whitespace-pre">{linuxSnippet}</pre>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide">
                    Rodar em Segundo Plano 24 Horas por Dia (Serviço PM2):
                  </h4>
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs mt-2 relative">
                    <pre className="text-indigo-300 overflow-x-auto whitespace-pre">{pm2Snippet}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DOCKER */}
          {activeTab === 'docker' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">🐳</span>
                  Deploy Automatizado com Docker Compose
                </h3>
                <p className="text-xs sm:text-sm text-slate-600">
                  O pacote já inclui <code>Dockerfile</code> de alta performance baseado em Alpine Linux e <code>docker-compose.yml</code> com persistência mapeada de volumes.
                </p>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs relative">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                    <span>Comandos Docker:</span>
                    <button
                      onClick={() => handleCopy(dockerSnippet, 'docker')}
                      className="flex items-center gap-1 text-xs hover:text-white transition"
                    >
                      {copiedCode === 'docker' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode === 'docker' ? 'Copiado!' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="text-emerald-400 overflow-x-auto whitespace-pre">{dockerSnippet}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REDE */}
          {activeTab === 'rede' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Network className="w-5 h-5 text-indigo-600" />
                  Como Liberar o Acesso para Outros Computadores da Intranet
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Para que funcionários do almoxarifado, nutricionistas e diretores usem o sistema a partir dos seus próprios computadores na rede interna:
                </p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
                  <div className="font-bold text-slate-800">1. Descobrir o IP local do servidor:</div>
                  <div className="font-mono text-slate-700 bg-slate-200/70 p-2 rounded">
                    Windows: abrir Prompt de Comando e digitar "ipconfig"<br/>
                    Linux: abrir Terminal e digitar "hostname -I"
                  </div>
                  <div className="font-bold text-slate-800 mt-2">2. Endereço de acesso pelos outros computadores:</div>
                  <div className="font-mono text-indigo-600 bg-indigo-50 p-2 rounded border border-indigo-200 font-bold">
                    http://192.168.1.100:3000 &nbsp;&nbsp;(substitua pelo IP do servidor)
                  </div>
                  <div className="font-bold text-slate-800 mt-2">3. Regra de Firewall:</div>
                  <div className="text-slate-600">
                    Certifique-se de permitir entrada TCP na porta <code>3000</code> no firewall do Windows ou no <code>ufw</code> do Linux.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: ESTRUTURA */}
          {activeTab === 'estrutura' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Arquitetura e Conteúdo do Pacote Descompactado
                </h3>
                <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs space-y-1">
                  <div className="text-amber-400">📁 sistema-estoque-percapita/</div>
                  <div className="pl-4 text-emerald-400">├── 📄 iniciar_servidor.bat &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Executável de 1 clique no Windows</span></div>
                  <div className="pl-4 text-emerald-400">├── 📄 iniciar_servidor.sh &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Executável de 1 comando no Linux</span></div>
                  <div className="pl-4 text-blue-400">├── 📄 server.js &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Backend Node.js / Express com API REST</span></div>
                  <div className="pl-4 text-blue-400">├── 📄 Dockerfile & docker-compose.yml <span className="text-slate-400"># Conteinerização pronta</span></div>
                  <div className="pl-4 text-blue-400">├── 📄 ecosystem.config.cjs &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Configuração PM2 para 24/7 sem quedas</span></div>
                  <div className="pl-4 text-indigo-300">├── 📁 server-data/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Diretório do banco de dados local</span></div>
                  <div className="pl-8 text-indigo-300">└── 📄 db.json &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Base de dados JSON com fornecedores, estoque e per capita</span></div>
                  <div className="pl-4 text-purple-300">├── 📁 uploads/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Armazenamento local de notas fiscais e documentos</span></div>
                  <div className="pl-4 text-yellow-300">├── 📁 src/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Código-fonte React / TypeScript completo</span></div>
                  <div className="pl-8 text-yellow-300">├── 📁 components/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># AlmoxarifadoDashboard, AdminPerCapita, Excel, etc.</span></div>
                  <div className="pl-8 text-yellow-300">└── 📁 services/ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-400"># Conector local REST offline</span></div>
                  <div className="pl-4 text-slate-300">└── 📄 MANUAL_INSTALACAO_SERVIDOR.md &nbsp;<span className="text-slate-400"># Guia completo de TI em Português</span></div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="bg-slate-100 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Código-fonte independente com licença de uso interno permanente.</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
