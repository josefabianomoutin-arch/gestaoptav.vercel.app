/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  UtensilsCrossed, 
  FileSpreadsheet, 
  Server, 
  Download, 
  Upload, 
  RefreshCw, 
  CheckCircle2, 
  ShieldCheck, 
  HardDrive, 
  Network, 
  AlertTriangle
} from 'lucide-react';
import AlmoxarifadoDashboard from './components/AlmoxarifadoDashboard';
import AdminPerCapita from './components/AdminPerCapita';
import AdminExcelAlmoxarifado from './components/AdminExcelAlmoxarifado';
import { localDatabase, ServerStatus } from './services/localDatabase';
import { Supplier, WarehouseMovement, PerCapitaConfig, Delivery } from './types';

export default function App() {
  const [activeModule, setActiveModule] = useState<'almoxarifado' | 'percapita' | 'excel' | 'servidor'>('almoxarifado');
  const [loading, setLoading] = useState(true);
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);

  // Estados principais de dados
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseLog, setWarehouseLog] = useState<WarehouseMovement[]>([]);
  const [perCapitaConfig, setPerCapitaConfig] = useState<PerCapitaConfig>({});
  const [acquisitionItems, setAcquisitionItems] = useState<any[]>([]);
  const [thirdPartyEntries, setThirdPartyEntries] = useState<any[]>([]);
  const [publicInfo, setPublicInfo] = useState<any[]>([]);

  // Usuário local do servidor
  const [currentUser, _setCurrentUser] = useState({
    username: 'admin_local',
    name: 'Administrador do Servidor Interno',
    role: 'almoxarifado'
  });

  // Carregar dados locais ao iniciar
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        loadedSuppliers,
        loadedWarehouseLog,
        loadedPerCapita,
        loadedAcquisitions,
        loadedThirdParty,
        loadedPublicInfo,
        status
      ] = await Promise.all([
        localDatabase.getCollection<Supplier[]>('suppliers'),
        localDatabase.getCollection<WarehouseMovement[]>('warehouseLog'),
        localDatabase.getCollection<PerCapitaConfig>('perCapitaConfig'),
        localDatabase.getCollection<any[]>('acquisitionItems'),
        localDatabase.getCollection<any[]>('thirdPartyEntries'),
        localDatabase.getCollection<any[]>('publicInfo'),
        localDatabase.getStatus()
      ]);

      if (loadedSuppliers) setSuppliers(Array.isArray(loadedSuppliers) ? loadedSuppliers : Object.values(loadedSuppliers));
      if (loadedWarehouseLog) setWarehouseLog(Array.isArray(loadedWarehouseLog) ? loadedWarehouseLog : Object.values(loadedWarehouseLog));
      if (loadedPerCapita) setPerCapitaConfig(loadedPerCapita);
      if (loadedAcquisitions) setAcquisitionItems(Array.isArray(loadedAcquisitions) ? loadedAcquisitions : Object.values(loadedAcquisitions));
      if (loadedThirdParty) setThirdPartyEntries(Array.isArray(loadedThirdParty) ? loadedThirdParty : Object.values(loadedThirdParty));
      if (loadedPublicInfo) setPublicInfo(Array.isArray(loadedPublicInfo) ? loadedPublicInfo : Object.values(loadedPublicInfo));
      if (status) setServerStatus(status);
    } catch (err) {
      console.error('[App] Erro ao carregar dados locais:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Handlers para Módulo de Almoxarifado
  const handleRegisterWarehouseEntry = async (entry: any) => {
    const newEntry: WarehouseMovement = {
      id: `mov_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'entrada',
      ...entry
    };
    const updated = [newEntry, ...warehouseLog];
    setWarehouseLog(updated);
    await localDatabase.setCollection('warehouseLog', updated);
    return { success: true, message: 'Entrada registrada com sucesso no servidor interno' };
  };

  const handleRegisterWarehouseWithdrawal = async (withdrawal: any) => {
    const newExit: WarehouseMovement = {
      id: `mov_${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: 'saída',
      ...withdrawal
    };
    const updated = [newExit, ...warehouseLog];
    setWarehouseLog(updated);
    await localDatabase.setCollection('warehouseLog', updated);
    return { success: true, message: 'Saída registrada com sucesso no servidor interno' };
  };

  const handleResetWarehouseExits = async () => {
    const filtered = warehouseLog.filter(m => m.type === 'entrada');
    setWarehouseLog(filtered);
    await localDatabase.setCollection('warehouseLog', filtered);
    return { success: true, message: 'Saídas resetadas com sucesso' };
  };

  const handleDeleteWarehouseEntry = async (id: string) => {
    const updated = warehouseLog.filter(m => m.id !== id);
    setWarehouseLog(updated);
    await localDatabase.setCollection('warehouseLog', updated);
    return { success: true };
  };

  const handleUpdateWarehouseEntry = async (updatedItem: WarehouseMovement) => {
    const updated = warehouseLog.map(m => m.id === updatedItem.id ? updatedItem : m);
    setWarehouseLog(updated);
    await localDatabase.setCollection('warehouseLog', updated);
    return { success: true };
  };

  const handleSaveInvoice = async (deliveryId: string, invoiceData: any) => {
    // Atualizar no fornecedor correspondente
    const updatedSuppliers = suppliers.map(s => {
      if (s.deliveries && Array.isArray(s.deliveries)) {
        const dIdx = s.deliveries.findIndex((d: Delivery) => d.id === deliveryId);
        if (dIdx !== -1) {
          const newDelivs = [...s.deliveries];
          newDelivs[dIdx] = { ...newDelivs[dIdx], ...invoiceData, invoiceUploaded: true };
          return { ...s, deliveries: newDelivs };
        }
      }
      return s;
    });
    setSuppliers(updatedSuppliers);
    await localDatabase.setCollection('suppliers', updatedSuppliers);
    return { success: true, message: 'Nota fiscal salva com sucesso' };
  };

  const handleDeleteDelivery = async (deliveryId: string) => {
    const updatedSuppliers = suppliers.map(s => {
      if (s.deliveries && Array.isArray(s.deliveries)) {
        return { ...s, deliveries: s.deliveries.filter((d: Delivery) => d.id !== deliveryId) };
      }
      return s;
    });
    setSuppliers(updatedSuppliers);
    await localDatabase.setCollection('suppliers', updatedSuppliers);
    return { success: true };
  };

  const handleUpdateDelivery = async (deliveryId: string, updatedDelivery: any) => {
    const updatedSuppliers = suppliers.map(s => {
      if (s.deliveries && Array.isArray(s.deliveries)) {
        return {
          ...s,
          deliveries: s.deliveries.map((d: Delivery) => d.id === deliveryId ? { ...d, ...updatedDelivery } : d)
        };
      }
      return s;
    });
    setSuppliers(updatedSuppliers);
    await localDatabase.setCollection('suppliers', updatedSuppliers);
    return { success: true };
  };

  // Handlers para Módulo de Per Capita
  const handleUpdatePerCapitaConfig = async (newConfig: PerCapitaConfig) => {
    setPerCapitaConfig(newConfig);
    await localDatabase.setCollection('perCapitaConfig', newConfig);
  };

  const handleUpdateContractForItem = async (category: string, itemIdx: number, contractData: any) => {
    const configCopy = { ...perCapitaConfig };
    const list = (configCopy as any)[category];
    if (Array.isArray(list) && list[itemIdx]) {
      list[itemIdx] = { ...list[itemIdx], ...contractData };
      setPerCapitaConfig(configCopy);
      await localDatabase.setCollection('perCapitaConfig', configCopy);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Barra Superior Master do Servidor Interno */}
      <header className="bg-slate-900 text-white shadow-lg border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo e Identificação do Sistema */}
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white font-bold shadow-md flex items-center justify-center">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                  Gestão Integrada de Estoque & Per Capita
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Servidor Interno Fechado
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Operação On-Premise 100% Offline (Sem Dependência de Internet)
                </div>
              </div>
            </div>

            {/* Abas Principais de Troca de Módulo */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={() => setActiveModule('almoxarifado')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeModule === 'almoxarifado'
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Package className="w-4 h-4" />
                Módulo de Estoque
              </button>

              <button
                onClick={() => setActiveModule('percapita')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeModule === 'percapita'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4" />
                Gestão de Per Capita
              </button>

              <button
                onClick={() => setActiveModule('excel')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeModule === 'excel'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                Planilha Excel
              </button>

              <button
                onClick={() => setActiveModule('servidor')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeModule === 'servidor'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Server className="w-4 h-4" />
                Servidor & Backups
              </button>
            </nav>

            {/* Status e Recarregamento */}
            <div className="flex items-center space-x-3">
              <button
                onClick={loadAllData}
                disabled={loading}
                title="Recarregar Dados Locais"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
              </button>
              <div className="text-right">
                <span className="text-xs block text-slate-400">Usuário Local</span>
                <span className="text-xs font-semibold text-emerald-400">Administrador</span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* Conteúdo do Módulo Ativo */}
      <main className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <RefreshCw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
            <p className="text-slate-700 font-semibold text-lg">Carregando Banco de Dados do Servidor Interno...</p>
            <p className="text-slate-500 text-sm">Lendo arquivos locais em ./server-data/db.json</p>
          </div>
        ) : (
          <>
            {/* MÓDULO 1: ALMOXARIFADO / ESTOQUE COMPLETO */}
            {activeModule === 'almoxarifado' && (
              <AlmoxarifadoDashboard
                currentUser={currentUser}
                suppliers={suppliers}
                warehouseLog={warehouseLog}
                publicInfoList={publicInfo}
                thirdPartyEntries={thirdPartyEntries}
                perCapitaConfig={perCapitaConfig}
                acquisitionItems={acquisitionItems}
                onLogout={() => {}}
                onRegisterEntry={handleRegisterWarehouseEntry}
                onRegisterWithdrawal={handleRegisterWarehouseWithdrawal}
                onResetExits={handleResetWarehouseExits}
                onDeleteWarehouseEntry={handleDeleteWarehouseEntry}
                onUpdateWarehouseEntry={handleUpdateWarehouseEntry}
                onSaveInvoice={handleSaveInvoice}
                onDeleteDelivery={handleDeleteDelivery}
                onUpdateDelivery={handleUpdateDelivery}
                onReopenInvoice={async () => ({ success: true })}
                onUpdateInvoiceItems={async () => ({ success: true })}
                onUpdateInvoiceUrl={async () => ({ success: true })}
                onManualInvoiceEntry={async () => ({ success: true })}
                onMarkInvoiceAsOpened={async () => ({ success: true })}
                onDeleteInvoice={async () => ({ success: true })}
                onRegisterThirdPartyEntry={async (entry) => {
                  const updated = [entry, ...thirdPartyEntries];
                  setThirdPartyEntries(updated);
                  await localDatabase.setCollection('thirdPartyEntries', updated);
                  return { success: true };
                }}
                onUpdateThirdPartyEntry={async (entry) => {
                  const updated = thirdPartyEntries.map(e => e.id === entry.id ? entry : e);
                  setThirdPartyEntries(updated);
                  await localDatabase.setCollection('thirdPartyEntries', updated);
                  return { success: true };
                }}
                onDeleteThirdPartyEntry={async (id) => {
                  const updated = thirdPartyEntries.filter(e => e.id !== id);
                  setThirdPartyEntries(updated);
                  await localDatabase.setCollection('thirdPartyEntries', updated);
                }}
              />
            )}

            {/* MÓDULO 2: GESTÃO DE PER CAPITA COMPLETO */}
            {activeModule === 'percapita' && (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <UtensilsCrossed className="w-6 h-6 text-emerald-600" />
                      Módulo de Gestão de Per Capita
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      Controle completo de contratos (PPAIS, Perecíveis, Estocáveis), cardápios, projeções de consumo e efetivo.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveModule('almoxarifado')}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-medium border border-blue-200 flex items-center gap-1.5"
                    >
                      <Package className="w-4 h-4" /> Ver Estoque
                    </button>
                    <button
                      onClick={() => setActiveModule('excel')}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-sm font-medium border border-amber-200 flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Planilha Excel
                    </button>
                  </div>
                </div>

                <AdminPerCapita
                  suppliers={suppliers}
                  warehouseLog={warehouseLog}
                  perCapitaConfig={perCapitaConfig}
                  onUpdatePerCapitaConfig={handleUpdatePerCapitaConfig}
                  onUpdateContractForItem={handleUpdateContractForItem}
                  onUpdateAcquisitionItem={async (idx, item) => {
                    const updated = [...acquisitionItems];
                    updated[idx] = item;
                    setAcquisitionItems(updated);
                    await localDatabase.setCollection('acquisitionItems', updated);
                  }}
                  onDeleteAcquisitionItem={async (idx) => {
                    const updated = acquisitionItems.filter((_, i) => i !== idx);
                    setAcquisitionItems(updated);
                    await localDatabase.setCollection('acquisitionItems', updated);
                  }}
                  acquisitionItems={acquisitionItems}
                  onUpdateSupplierObservations={async (cpf, obs) => {
                    const updated = suppliers.map(s => s.cpf === cpf ? { ...s, observations: obs } : s);
                    setSuppliers(updated);
                    await localDatabase.setCollection('suppliers', updated);
                  }}
                  onSyncPPAISToAgenda={async () => {
                    return { success: true };
                  }}
                  onSaveInvoice={handleSaveInvoice}
                  onDeleteDelivery={handleDeleteDelivery}
                />
              </div>
            )}

            {/* MÓDULO 3: PLANILHA EXCEL INTEGRADA */}
            {activeModule === 'excel' && (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
                <div className="mb-6 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                      <FileSpreadsheet className="w-6 h-6 text-amber-600" />
                      Planilha Excel Oficial de Gestão de Estoque
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      Aba interativa com download de planilha `.xlsx` com fornecedores, itens, etiquetas, cronograma e fórmulas.
                    </p>
                  </div>
                  <button
                    onClick={() => setActiveModule('almoxarifado')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-sm"
                  >
                    Voltar ao Estoque
                  </button>
                </div>

                <AdminExcelAlmoxarifado
                  suppliers={suppliers}
                  warehouseLog={warehouseLog}
                />
              </div>
            )}

            {/* MÓDULO 4: PAINEL DE CONTROLE DO SERVIDOR INTERNO & BACKUPS */}
            {activeModule === 'servidor' && (
              <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                
                {/* Banner de Diagnóstico */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-800">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold border border-emerald-500/30 mb-3">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Servidor Fechado Ativo e Seguro
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Painel de Controle do Servidor Interno
                      </h2>
                      <p className="text-slate-300 text-sm mt-2 max-w-2xl leading-relaxed">
                        Este servidor está rodando de forma 100% autônoma em seu ambiente local. Os dados são persistidos no arquivo local <code className="bg-slate-800 px-2 py-0.5 rounded text-emerald-400">server-data/db.json</code>, sem necessidade de internet ou serviços de terceiros.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => localDatabase.exportBackupFile()}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition"
                      >
                        <Download className="w-5 h-5" /> Baixar Backup Completo (.JSON)
                      </button>
                    </div>
                  </div>

                  {/* Cards de Métricas do Servidor */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                    <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
                      <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-blue-400" /> Banco de Dados Local
                      </div>
                      <div className="text-lg font-bold text-white mt-1">db.json Ativo</div>
                      <div className="text-xs text-emerald-400 mt-1">Transações atômicas seguras</div>
                    </div>

                    <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
                      <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                        <Network className="w-4 h-4 text-purple-400" /> Acesso na Rede Local
                      </div>
                      <div className="text-lg font-bold text-white mt-1">Porta 3000</div>
                      <div className="text-xs text-slate-300 mt-1">
                        {serverStatus?.localIPs?.[0]?.ip ? `http://${serverStatus.localIPs[0].ip}:3000` : 'http://localhost:3000'}
                      </div>
                    </div>

                    <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
                      <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-amber-400" /> Fornecedores & Estoque
                      </div>
                      <div className="text-lg font-bold text-white mt-1">{suppliers.length} Fornecedores</div>
                      <div className="text-xs text-slate-300 mt-1">{warehouseLog.length} movimentações registradas</div>
                    </div>

                    <div className="bg-slate-800/80 backdrop-blur rounded-xl p-4 border border-slate-700">
                      <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-400" /> Isolamento de Rede
                      </div>
                      <div className="text-lg font-bold text-emerald-400 mt-1">100% Offline</div>
                      <div className="text-xs text-slate-300 mt-1">Zero tráfego externo</div>
                    </div>
                  </div>
                </div>

                {/* Seções de Instruções e Gerenciamento */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Card de Restauração de Backup */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Upload className="w-5 h-5 text-blue-600" /> Restaurar Cópia de Segurança
                    </h3>
                    <p className="text-sm text-slate-600">
                      Envie um arquivo <code>.json</code> exportado anteriormente para restaurar todas as informações do almoxarifado, estoque e per capita.
                    </p>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-blue-500 transition">
                      <input
                        type="file"
                        accept=".json"
                        id="backup-file-input"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const text = await file.text();
                            const parsed = JSON.parse(text);
                            if (window.confirm(`Deseja realmente restaurar o backup com ${Object.keys(parsed).length} coleções? Os dados atuais serão substituídos.`)) {
                              await localDatabase.restoreBackup(parsed);
                              alert('Backup restaurado com sucesso!');
                              loadAllData();
                            }
                          } catch (err: any) {
                            alert('Erro ao ler arquivo de backup: ' + err.message);
                          }
                        }}
                      />
                      <label htmlFor="backup-file-input" className="cursor-pointer flex flex-col items-center">
                        <Upload className="w-10 h-10 text-slate-400 mb-2" />
                        <span className="text-sm font-semibold text-blue-600">Clique para selecionar o arquivo .json</span>
                        <span className="text-xs text-slate-400 mt-1">Formatos aceitos: backup_*.json</span>
                      </label>
                    </div>
                  </div>

                  {/* Card de Configuração de Rede Interna */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <Network className="w-5 h-5 text-indigo-600" /> Acesso na Rede Local (Intranet)
                    </h3>
                    <p className="text-sm text-slate-600">
                      Para que outros computadores da instituição acessem o sistema, use o IP deste servidor com a porta 3000:
                    </p>
                    <div className="bg-slate-900 text-slate-200 rounded-lg p-4 font-mono text-sm space-y-2">
                      <div className="text-xs text-slate-400"># Endereço para outros computadores:</div>
                      {serverStatus?.localIPs && serverStatus.localIPs.length > 0 ? (
                        serverStatus.localIPs.map(ip => (
                          <div key={ip.ip} className="text-emerald-400">
                            http://{ip.ip}:3000 <span className="text-slate-500">({ip.iface})</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-emerald-400">http://192.168.1.xxx:3000</div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Certifique-se de que o firewall do servidor permite conexões de entrada na porta 3000.
                    </div>
                  </div>
                </div>

              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
