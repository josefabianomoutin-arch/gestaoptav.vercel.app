
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Supplier, Delivery, WarehouseMovement, PerCapitaConfig, CleaningLog, DirectorPerCapitaLog, StandardMenu, DailyMenus, FinancialRecord, UserRole, ThirdPartyEntryLog, AcquisitionItem, VehicleExitOrder, VehicleAsset, DriverAsset, VehicleInspection, ServiceOrder, MaintenanceSchedule, PublicInfo, ValidationRole, EpiLog } from './types';
import LoginScreen from './components/LoginScreen';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import AlmoxarifadoDashboard from './components/AlmoxarifadoDashboard';
import ItespDashboard from './components/ItespDashboard';
import FinanceDashboard from './components/FinanceDashboard';
import SubportariaDashboard from './components/SubportariaDashboard';
import MenuDashboard from './components/MenuDashboard';
import VehicleOrderDashboard from './components/VehicleOrderDashboard';
import JulioDashboard from './components/JulioDashboard';
import ServiceOrderDashboard from './components/ServiceOrderDashboard';
import InfobarTicker from './components/InfobarTicker';
import { getDatabase, ref, onValue, set, runTransaction, push, child, update, remove, get } from 'firebase/database';
import { app } from './firebaseConfig';
import { getCombinedSuppliers } from './lib/supplierUtils';
import { ensureArray, safeLocalStorageSetItem } from './lib/utils';

let database: any;
let rootRef: any;
let suppliersRef: any;
let warehouseLogRef: any;
let perCapitaConfigRef: any;
let cleaningLogsRef: any;
let epiLogsRef: any;
let directorWithdrawalsRef: any;
let standardMenuRef: any;
let dailyMenusRef: any;
let financialRecordsRef: any;
let thirdPartyEntriesRef: any;
let acquisitionItemsRef: any;
let vehicleExitOrdersRef: any;
let vehicleInspectionsRef: any;
let serviceOrdersRef: any;
let vehicleAssetsRef: any;
let driverAssetsRef: any;
let dailyAllowancesRef: any;
let staffRef: any;
let validationRolesRef: any;
let systemPasswordsRef: any;
let maintenanceSchedulesRef: any;
let publicInfoRef: any;
let directorPerCapitaRef: any;

try {
  database = getDatabase(app);
  rootRef = ref(database);
  suppliersRef = ref(database, 'suppliers');
  warehouseLogRef = ref(database, 'warehouseLog');
  perCapitaConfigRef = ref(database, 'perCapitaConfig');
  cleaningLogsRef = ref(database, 'cleaningLogs');
  epiLogsRef = ref(database, 'epiLogs');
  directorWithdrawalsRef = ref(database, 'directorWithdrawals');
  directorPerCapitaRef = ref(database, 'directorPerCapita');
  standardMenuRef = ref(database, 'standardMenu');
  dailyMenusRef = ref(database, 'dailyMenus');
  financialRecordsRef = ref(database, 'financialRecords');
  thirdPartyEntriesRef = ref(database, 'thirdPartyEntries');
  acquisitionItemsRef = ref(database, 'acquisitionItems');
  vehicleExitOrdersRef = ref(database, 'vehicleExitOrders');
  vehicleInspectionsRef = ref(database, 'vehicleInspections');
  serviceOrdersRef = ref(database, 'serviceOrders');
  vehicleAssetsRef = ref(database, 'vehicleAssets');
  driverAssetsRef = ref(database, 'driverAssets');
  dailyAllowancesRef = ref(database, 'dailyAllowances');
  staffRef = ref(database, 'staff');
  validationRolesRef = ref(database, 'validationRoles');
  systemPasswordsRef = ref(database, 'systemPasswords');
  maintenanceSchedulesRef = ref(database, 'maintenanceSchedules');
  publicInfoRef = ref(database, 'publicInfo');
} catch (error) {
  console.error("Erro ao inicializar Firebase:", error);
}

const getWeekNumber = (d: Date): number => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
};

const App: React.FC = () => {
  const [user, setUser] = useState<{ name: string; cpf: string; role: UserRole } | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouseLog, setWarehouseLog] = useState<WarehouseMovement[]>([]);
  const [perCapitaConfig, setPerCapitaConfig] = useState<PerCapitaConfig>({});
  const [cleaningLogs, setCleaningLogs] = useState<CleaningLog[]>([]);
  const [epiLogs, setEpiLogs] = useState<EpiLog[]>([]);
  const [directorWithdrawals, setDirectorWithdrawals] = useState<DirectorPerCapitaLog[]>([]);
  const [standardMenu, setStandardMenu] = useState<StandardMenu>({});
  const [dailyMenus, setDailyMenus] = useState<DailyMenus>({});
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [thirdPartyEntries, setThirdPartyEntries] = useState<ThirdPartyEntryLog[]>([]);
  const [acquisitionItems, setAcquisitionItems] = useState<AcquisitionItem[]>([]);
  const [vehicleExitOrders, setVehicleExitOrders] = useState<VehicleExitOrder[]>([]);
  const [vehicleInspections, setVehicleInspections] = useState<VehicleInspection[]>([]);
  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>([]);
  const [vehicleAssets, setVehicleAssets] = useState<VehicleAsset[]>([]);
  const [driverAssets, setDriverAssets] = useState<DriverAsset[]>([]);
  const [validationRoles, setValidationRoles] = useState<ValidationRole[]>([]);
  const [systemPasswords, setSystemPasswords] = useState<Record<string, string>>({});
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [_dailyAllowances, setDailyAllowances] = useState<any[]>([]);
  const [_staff, setStaff] = useState<any[]>([]);
  const [publicInfo, setPublicInfo] = useState<PublicInfo[]>([]);
  const [directorPerCapita, setDirectorPerCapita] = useState<any>(null);

  console.log("App mounted, user:", user);

  const [hasError, setHasError] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Global Error Captured:", event.error);
      setHasError(true);
      setErrorDetails(event.error?.message || String(event.error));
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // Bloquear F12, Ctrl+Shift+I (Inspeção), Ctrl+Shift+J (Console), Ctrl+Shift+C (Elementos), Ctrl+U (Código-fonte)
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key.toUpperCase() === 'I' || e.key.toUpperCase() === 'J' || e.key.toUpperCase() === 'C')) || 
        (e.ctrlKey && e.key.toUpperCase() === 'U')
      ) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // 1. Carrega os dados persistidos do LocalStorage IMEDIATAMENTE no mount para tempo de carregamento zero 
  useEffect(() => {
    const collectionsToPersist = [
      { key: 'suppliers', setter: setSuppliers },
      { key: 'warehouseLog', setter: setWarehouseLog },
      { key: 'perCapitaConfig', setter: setPerCapitaConfig },
      { key: 'thirdPartyEntries', setter: setThirdPartyEntries },
      { key: 'acquisitionItems', setter: setAcquisitionItems },
      { key: 'standardMenu', setter: setStandardMenu },
      { key: 'dailyMenus', setter: setDailyMenus },
      { key: 'publicInfo', setter: setPublicInfo },
      { key: 'financialRecords', setter: setFinancialRecords },
      { key: 'vehicleExitOrders', setter: setVehicleExitOrders },
      { key: 'vehicleInspections', setter: setVehicleInspections },
      { key: 'serviceOrders', setter: setServiceOrders },
      { key: 'vehicleAssets', setter: setVehicleAssets },
      { key: 'driverAssets', setter: setDriverAssets },
      { key: 'validationRoles', setter: setValidationRoles },
      { key: 'systemPasswords', setter: setSystemPasswords },
      { key: 'maintenanceSchedules', setter: setMaintenanceSchedules },
      { key: 'directorPerCapita', setter: setDirectorPerCapita },
      { key: 'cleaningLogs', setter: setCleaningLogs },
      { key: 'epiLogs', setter: setEpiLogs },
      { key: 'directorWithdrawals', setter: setDirectorWithdrawals }
    ];

    collectionsToPersist.forEach(({ key, setter }) => {
      const saved = localStorage.getItem(`cached_${key}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed) setter(parsed);
        } catch (e) {
          console.error(`Error loading cached ${key}:`, e);
        }
      }
    });
  }, []);

  // 2. Conecta aos dados públicos essenciais no mount de forma leve (PublicInfo para tela de Login e Senhas do sistema)
  useEffect(() => {
    if (!database) return;

    const unsubscribes: (() => void)[] = [];

    const connectedRef = ref(database, '.info/connected');
    const unsubConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log("Conectado ao Firebase Realtime Database!");
      } else {
        console.warn("Desconectado do Firebase Realtime Database.");
      }
    });
    unsubscribes.push(unsubConnected);

    const unsubPublicInfo = onValue(publicInfoRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setPublicInfo(list as PublicInfo[]);
      safeLocalStorageSetItem('cached_publicInfo', JSON.stringify(list));
    });
    unsubscribes.push(unsubPublicInfo);

    const unsubPasswords = onValue(systemPasswordsRef, (snapshot) => {
      const data = snapshot.val() || {};
      setSystemPasswords(data);
      safeLocalStorageSetItem('cached_systemPasswords', JSON.stringify(data));
    });
    unsubscribes.push(unsubPasswords);

    // Carregamento de Fornecedores e PerCapitaConfig ANTES do usuário autenticar, pois são necessários para o login dos produtores
    const unsubSuppliers = onValue(suppliersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([key, value]: [string, any]) => ({
        ...value,
        id: value.id || key,
        cpf: value.cpf || key
      })) : [];
      setSuppliers(list as Supplier[]);
      safeLocalStorageSetItem('cached_suppliers', JSON.stringify(list));
    });
    unsubscribes.push(unsubSuppliers);

    const unsubPerCapita = onValue(perCapitaConfigRef, (snapshot) => {
      const data = snapshot.val();
      const config = data || {};
      setPerCapitaConfig(config);
      safeLocalStorageSetItem('cached_perCapitaConfig', JSON.stringify(config));
    });
    unsubscribes.push(unsubPerCapita);

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, []);

  // 3. Conecta aos dados pesados dinamicamente e APENAS quando o usuário estiver autenticado
  useEffect(() => {
    if (!database || !user) return;

    const unsubscribes: (() => void)[] = [];

    // Logs de Movimentação do Almoxarifado (Altamente pesado)
    const unsubWarehouseLog = onValue(warehouseLogRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([key, value]: [string, any]) => ({
        ...value,
        id: value.id || key
      })) : [];
      setWarehouseLog(list as WarehouseMovement[]);
      safeLocalStorageSetItem('cached_warehouseLog', JSON.stringify(list));
    });
    unsubscribes.push(unsubWarehouseLog);

    // Registros de Limpeza
    const unsubCleaningLogs = onValue(cleaningLogsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setCleaningLogs(list as CleaningLog[]);
      safeLocalStorageSetItem('cached_cleaningLogs', JSON.stringify(list));
    });
    unsubscribes.push(unsubCleaningLogs);

    // Registros de EPI
    const unsubEpiLogs = onValue(epiLogsRef, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.values(data) : [];
        setEpiLogs(list as EpiLog[]);
        safeLocalStorageSetItem('cached_epiLogs', JSON.stringify(list));
    });
    unsubscribes.push(unsubEpiLogs);

    // Retiradas dos Diretores
    const unsubDirectorWithdrawals = onValue(directorWithdrawalsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setDirectorWithdrawals(list as DirectorPerCapitaLog[]);
      safeLocalStorageSetItem('cached_directorWithdrawals', JSON.stringify(list));
    });
    unsubscribes.push(unsubDirectorWithdrawals);

    // Cardápio Padrão
    const unsubStandardMenu = onValue(standardMenuRef, (snapshot) => {
      const data = snapshot.val() || {};
      setStandardMenu(data);
      safeLocalStorageSetItem('cached_standardMenu', JSON.stringify(data));
    });
    unsubscribes.push(unsubStandardMenu);

    // Cardápios Diários
    const unsubDailyMenus = onValue(dailyMenusRef, (snapshot) => {
      const data = snapshot.val() || {};
      setDailyMenus(data);
      safeLocalStorageSetItem('cached_dailyMenus', JSON.stringify(data));
    });
    unsubscribes.push(unsubDailyMenus);

    // Registros Financeiros
    const unsubFinancial = onValue(financialRecordsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.entries(data).map(([key, value]: [string, any]) => ({
        ...value,
        id: value.id || key
      })) : [];
      setFinancialRecords(list as FinancialRecord[]);
      safeLocalStorageSetItem('cached_financialRecords', JSON.stringify(list));
    });
    unsubscribes.push(unsubFinancial);

    // Entradas de Terceiros
    const unsubThirdParty = onValue(thirdPartyEntriesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setThirdPartyEntries(list as ThirdPartyEntryLog[]);
      safeLocalStorageSetItem('cached_thirdPartyEntries', JSON.stringify(list));
    });
    unsubscribes.push(unsubThirdParty);

    // Itens de Aquisição
    const unsubAcquisitionItems = onValue(acquisitionItemsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setAcquisitionItems(list as AcquisitionItem[]);
      safeLocalStorageSetItem('cached_acquisitionItems', JSON.stringify(list));
    });
    unsubscribes.push(unsubAcquisitionItems);

    // Autorizações de Saída de Veículos
    const unsubVehicleOrders = onValue(vehicleExitOrdersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setVehicleExitOrders(list as VehicleExitOrder[]);
      safeLocalStorageSetItem('cached_vehicleExitOrders', JSON.stringify(list));
    });
    unsubscribes.push(unsubVehicleOrders);

    // Inspeções de Veículos
    const unsubVehicleInspections = onValue(vehicleInspectionsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setVehicleInspections(list as VehicleInspection[]);
      safeLocalStorageSetItem('cached_vehicleInspections', JSON.stringify(list));
    });
    unsubscribes.push(unsubVehicleInspections);

    // Ordens de Serviço
    const unsubServiceOrders = onValue(serviceOrdersRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setServiceOrders(list as ServiceOrder[]);
      safeLocalStorageSetItem('cached_serviceOrders', JSON.stringify(list));
    });
    unsubscribes.push(unsubServiceOrders);

    // Veículos Ativos
    const unsubVehicleAssets = onValue(vehicleAssetsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setVehicleAssets(list as VehicleAsset[]);
      safeLocalStorageSetItem('cached_vehicleAssets', JSON.stringify(list));
    });
    unsubscribes.push(unsubVehicleAssets);

    // Motoristas Ativos
    const unsubDriverAssets = onValue(driverAssetsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setDriverAssets(list as DriverAsset[]);
      safeLocalStorageSetItem('cached_driverAssets', JSON.stringify(list));
    });
    unsubscribes.push(unsubDriverAssets);

    // Diárias/Ajuda de Custo
    const unsubDailyAllowances = onValue(dailyAllowancesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setDailyAllowances(list);
    });
    unsubscribes.push(unsubDailyAllowances);

    // Funcionários Ativos
    const unsubStaff = onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setStaff(list);
    });
    unsubscribes.push(unsubStaff);

    // Perfis de Validação
    const unsubValidationRoles = onValue(validationRolesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setValidationRoles(list as ValidationRole[]);
      safeLocalStorageSetItem('cached_validationRoles', JSON.stringify(list));
    });
    unsubscribes.push(unsubValidationRoles);

    // Agendamentos de Manutenção
    const unsubMaintenance = onValue(maintenanceSchedulesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setMaintenanceSchedules(list as MaintenanceSchedule[]);
      safeLocalStorageSetItem('cached_maintenanceSchedules', JSON.stringify(list));
    });
    unsubscribes.push(unsubMaintenance);

    // Registros Per Capita dos Diretores
    const unsubDirectorPerCapita = onValue(directorPerCapitaRef, (snapshot) => {
      const data = snapshot.val() || {};
      
      const createEmptyItems = () => Array.from({ length: 25 }, (_, i) => ({
        index: i + 1,
        itemName: '',
        quantity: '',
        observation: ''
      }));

      const chefeDep = data.chefeDep || {
        activeOrder: {
          items: createEmptyItems(),
          id: 'atual',
          signed: false,
          signedAt: '',
          signerName: ''
        },
        history: {}
      };

      const chefeSeg = data.chefeSeg || {
        activeOrder: {
          items: createEmptyItems(),
          id: 'atual',
          signed: false,
          signedAt: '',
          signerName: ''
        },
        history: {}
      };

      if (!chefeDep.activeOrder) {
        chefeDep.activeOrder = {
          items: createEmptyItems(),
          id: 'atual',
          signed: false,
          signedAt: '',
          signerName: ''
        };
      }
      if (!chefeDep.history) {
        chefeDep.history = {};
      }

      if (!chefeSeg.activeOrder) {
        chefeSeg.activeOrder = {
          items: createEmptyItems(),
          id: 'atual',
          signed: false,
          signedAt: '',
          signerName: ''
        };
      }
      if (!chefeSeg.history) {
        chefeSeg.history = {};
      }

      const merged = { chefeDep, chefeSeg };
      setDirectorPerCapita(merged);
      safeLocalStorageSetItem('cached_directorPerCapita', JSON.stringify(merged));
    });
    unsubscribes.push(unsubDirectorPerCapita);

    return () => {
      console.log("Desinscrevendo de todos os listeners pesados do Firebase Realtime Database.");
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [user]);

  const handleUpdateDirectorPerCapita = async (updatedData: any) => {
    try {
      await set(directorPerCapitaRef, updatedData);
      return { success: true };
    } catch (e) {
      console.error('Erro ao atualizar per capita dos diretores:', e);
      return { success: false, message: 'Erro ao salvar os dados no banco de dados.' };
    }
  };

  const handleRegisterMaintenanceSchedule = async (schedule: Omit<MaintenanceSchedule, 'id'>) => {
    try {
      const newScheduleRef = push(maintenanceSchedulesRef);
      const newSchedule = { ...schedule, id: newScheduleRef.key as string };
      await set(newScheduleRef, newSchedule);
      toast.success('Agendamento de manutenção registrado com sucesso!');
      return { success: true, message: 'Agendamento registrado' };
    } catch (error) {
      console.error('Erro ao registrar agendamento:', error);
      toast.error('Erro ao registrar agendamento.');
      return { success: false, message: 'Erro ao registrar agendamento' };
    }
  };

  const handleUpdateMaintenanceSchedule = async (idOrSchedule: string | MaintenanceSchedule, updates?: Partial<MaintenanceSchedule>) => {
    try {
      if (typeof idOrSchedule === 'string') {
        const scheduleRef = child(maintenanceSchedulesRef, idOrSchedule);
        await update(scheduleRef, updates!);
      } else {
        const scheduleRef = child(maintenanceSchedulesRef, idOrSchedule.id);
        await set(scheduleRef, idOrSchedule);
      }
      toast.success('Agendamento atualizado com sucesso!');
      return { success: true, message: 'Agendamento atualizado' };
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento.');
      return { success: false, message: 'Erro ao atualizar agendamento' };
    }
  };

  const handleDeleteMaintenanceSchedule = async (id: string) => {
    try {
      const scheduleRef = child(maintenanceSchedulesRef, id);
      await remove(scheduleRef);
      toast.success('Agendamento removido com sucesso!');
      return { success: true, message: 'Agendamento removido' };
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
      toast.error('Erro ao remover agendamento.');
      return { success: false, message: 'Erro ao remover agendamento' };
    }
  };

  const handleLogin = (nameInput: string, passwordInput: string) => {
    const cleanName = (nameInput || '').trim().toUpperCase();
    const rawPass = (passwordInput || '').trim();

    if (cleanName === 'ORDEM DE SERVIÇO' && rawPass === 'serviço') {
      setUser({ name: 'ORDEM DE SERVIÇO', cpf: 'os-user', role: 'ordem_servico' });
      return true;
    }

    const numericPass = rawPass.replace(/\D/g, '');

    // ACESSO ESPECÍFICO: DANIELE GARCIA POSSIDONIO
    if (cleanName.includes('DANIELE') && numericPass === '33342143894') {
      setUser({ name: 'DANIELE GARCIA POSSIDONIO', cpf: numericPass, role: 'financeiro' });
      return true;
    }

    const adminCpfs = ['15210361870', '29099022859', '36554895876'];

    // ACESSO ESPECÍFICO: DOUGLAS FERNANDO SEMENZIN GALDINO
    if (['DOUGLAS', 'GALDINO', 'SEMENZIN'].some(n => cleanName.includes(n))) {
      const douglasDbPass = (systemPasswords['DOUGLAS FERNANDO SEMENZIN GALDINO'] || 'diretor123').trim().toLowerCase();
      if (numericPass === '29099022859' || rawPass.toLowerCase() === douglasDbPass) {
        setUser({ name: 'DOUGLAS FERNANDO SEMENZIN GALDINO', cpf: '29099022859', role: 'financeiro' });
        return true;
      }
    }

    // ACESSO ESPECÍFICO: ALFREDO GUILHERME LOPES
    if (['ALFREDO', 'LOPES', 'GUILHERME'].some(n => cleanName.includes(n))) {
      const alfredoDbPass = (systemPasswords['ALFREDO GUILHERME LOPES'] || 'diretor123').trim().toLowerCase();
      if (numericPass === '36554895876' || rawPass.toLowerCase() === alfredoDbPass) {
        setUser({ name: 'ALFREDO GUILHERME LOPES', cpf: '36554895876', role: 'financeiro' });
        return true;
      }
    }

    if (['ADMINISTRADOR', 'ADM', 'GALDINO', 'DOUGLAS', 'ALFREDO'].some(n => cleanName.includes(n))) {
      if (adminCpfs.includes(numericPass)) {
        let displayName = cleanName;
        if (numericPass === '29099022859') {
          displayName = 'DOUGLAS FERNANDO SEMENZIN GALDINO';
        } else if (numericPass === '36554895876') {
          displayName = 'ALFREDO GUILHERME LOPES';
        }
        const isFinanceAdmin = cleanName.includes('DOUGLAS') || cleanName.includes('ALFREDO') || numericPass === '29099022859' || numericPass === '36554895876';
        setUser({ name: displayName, cpf: numericPass, role: isFinanceAdmin ? 'financeiro' : 'admin' });
        return true;
      }
    }

    if (cleanName === 'ALMOXARIFADO' || cleanName === 'ALMOX') {
      if (rawPass.toLowerCase() === (systemPasswords['ALMOXARIFADO'] || 'almoxarifado123').toLowerCase()) {
        setUser({ name: 'ALMOXARIFADO', cpf: 'almoxarifado123', role: 'almoxarifado' });
        return true;
      }
    }
    if (cleanName === 'ITESP' && rawPass.toLowerCase() === (systemPasswords['ITESP'] || 'taiuvaitesp2026').toLowerCase()) {
      setUser({ name: 'ITESP', cpf: 'taiuvaitesp2026', role: 'itesp' });
      return true;
    }
    if (cleanName === 'FINANCEIRO' && rawPass.toLowerCase() === (systemPasswords['FINANCEIRO'] || 'financeiro123').toLowerCase()) {
      setUser({ name: 'FINANCEIRO', cpf: 'financeiro123', role: 'financeiro' });
      return true;
    }
    if (cleanName === 'CARDAPIO' && rawPass.toLowerCase() === (systemPasswords['CARDAPIO'] || 'cardapio123').toLowerCase()) {
      setUser({ name: 'CARDAPIO', cpf: 'cardapio123', role: 'cardapio' });
      return true;
    }
    if (cleanName === 'SEGURANÇA EXTERNA' && rawPass === (systemPasswords['SEGURANÇA EXTERNA'] || 'externa2026')) {
      setUser({ name: 'SEGURANÇA EXTERNA', cpf: 'externa2026', role: 'subportaria' });
      return true;
    }
    if (cleanName === 'INFRAESTRUTURA' && rawPass === (systemPasswords['INFRAESTRUTURA'] || 'infra2026')) {
      setUser({ name: 'INFRAESTRUTURA', cpf: 'infra2026', role: 'infraestrutura' });
      return true;
    }
    if (cleanName === 'ORDEM DE SAIDA' && rawPass === (systemPasswords['ORDEM DE SAIDA'] || 'saida2026')) {
      setUser({ name: 'ORDEM DE SAIDA', cpf: 'saida2026', role: 'ordem_saida' });
      return true;
    }
    const julioPass = systemPasswords['SEÇÃO DE INFRAESTRUTURA E LOGÍSTICA'] || systemPasswords['JULIO CESAR NOGUEIRA'] || '431385464';
    if ((cleanName === 'SEÇÃO DE INFRAESTRUTURA E LOGÍSTICA' || cleanName === 'JULIO CESAR NOGUEIRA') && rawPass === julioPass) {
      setUser({ name: 'SEÇÃO DE INFRAESTRUTURA E LOGÍSTICA', cpf: '431385464', role: 'julio' });
      return true;
    }
    const ppaisProducer = ensureArray(perCapitaConfig.ppaisProducers).find(p => p?.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === numericPass);
    console.log('--- Debug: Login ---', { numericPass, found: !!ppaisProducer, all: perCapitaConfig.ppaisProducers?.map(p => p.cpfCnpj) });
    if (ppaisProducer) {
      setUser({ name: ppaisProducer.name, cpf: ppaisProducer.cpfCnpj, role: 'producer' });
      return true;
    }

    const pereciveisSupplier = ensureArray(perCapitaConfig.pereciveisSuppliers).find(p => p?.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === numericPass);
    if (pereciveisSupplier) {
      setUser({ name: pereciveisSupplier.name, cpf: pereciveisSupplier.cpfCnpj, role: 'pereciveis_supplier' });
      return true;
    }

    const estocaveisSupplier = ensureArray(perCapitaConfig.estocaveisSuppliers).find(p => p?.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === numericPass);
    if (estocaveisSupplier) {
      setUser({ name: estocaveisSupplier.name, cpf: estocaveisSupplier.cpfCnpj, role: 'estocaveis_supplier' });
      return true;
    }

    const supplier = suppliers.find(s => s?.cpf && String(s.cpf).replace(/\D/g, '') === numericPass);
    if (supplier) {
      setUser({ name: supplier.name, cpf: supplier.cpf, role: 'supplier' });
      return true;
    }
    
    return false;
  };

  const handleRegisterServiceOrder = async (order: Omit<ServiceOrder, 'id'>) => {
    try {
      const newRef = push(serviceOrdersRef);
      const id = newRef.key || `so-${Date.now()}`;
      await set(newRef, { ...order, id, createdAt: order.createdAt || new Date().toISOString() });
      return { success: true, message: 'Ordem de serviço registrada com sucesso!' };
    } catch (e) {
      console.error('Erro ao registrar ordem de serviço:', e);
      return { success: false, message: 'Falha ao registrar ordem de serviço.' };
    }
  };

  const handleUpdateServiceOrder = async (order: ServiceOrder) => {
    try {
      await set(child(serviceOrdersRef, order.id), order);
      return { success: true, message: 'Ordem de serviço atualizada com sucesso!' };
    } catch (e) {
      console.error('Erro ao atualizar ordem de serviço:', e);
      return { success: false, message: 'Falha ao atualizar ordem de serviço.' };
    }
  };

  const handleDeleteServiceOrder = async (id: string) => {
    try {
      await remove(child(serviceOrdersRef, id));
      return { success: true, message: 'Ordem de serviço excluída com sucesso!' };
    } catch (e) {
      console.error('Erro ao excluir ordem de serviço:', e);
      return { success: false, message: 'Falha ao excluir ordem de serviço.' };
    }
  };

  const handleLogout = () => setUser(null);

  const handleSavePublicInfo = async (info: Omit<PublicInfo, 'id'> & { id?: string }) => {
    try {
      const id = info.id || push(publicInfoRef).key;
      if (!id) throw new Error('Falha ao gerar ID');
      await set(child(publicInfoRef, id), { ...info, id });
      toast.success('Informação pública salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar informação pública:', error);
      toast.error('Erro ao salvar informação pública.');
    }
  };

  const handleDeletePublicInfo = async (id: string) => {
    try {
      await remove(child(publicInfoRef, id));
      toast.success('Informação pública removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover informação pública:', error);
      toast.error('Erro ao remover informação pública.');
    }
  };

  const handleRestoreFullBackup = async (fullData: any) => {
    try {
        await set(rootRef, fullData);
        return true;
    } catch (e) {
        console.error("Erro na restauração:", e);
        return false;
    }
  };

  const handleSyncPPAISToAgenda = async () => {
    const producers = ensureArray(perCapitaConfig.ppaisProducers);
    const pereciveis = ensureArray(perCapitaConfig.pereciveisSuppliers);
    const allPerCapita = [...producers, ...pereciveis];

    if (allPerCapita.length === 0) {
      toast.error('Nenhum cadastro Per Capita encontrado.');
      return;
    }

    const year = 2026;
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    try {
      // Get all current suppliers to handle the "not registered" ones
      const suppliersSnapshot = await get(suppliersRef);
      const allSuppliers = suppliersSnapshot.val() || {};
      const registeredCpfs = new Set(allPerCapita.map(p => p.cpfCnpj));

      for (const entry of allPerCapita) {
        // Calculate weeks for the entire year (Jan-Dec) to keep both contracts independent
        const newWeeks: number[] = [];
        for (let m = 0; m <= 11; m++) { // January (index 0) to December (index 11)
          const monthName = monthNames[m];
          const weekOfMonthListRaw = entry.monthlySchedule?.[monthName.charAt(0).toUpperCase() + monthName.slice(1)] || entry.monthlySchedule?.[monthName] || [];
          const weekOfMonthList = ensureArray(weekOfMonthListRaw);
          
          if (weekOfMonthList.length > 0) {
            const firstDayOfMonth = new Date(year, m, 1);
            const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
            
            weekOfMonthList.forEach((weekIdx: any) => {
              // weekIdx is 1, 2, 3, 4
              newWeeks.push(firstWeekOfYear + (Number(weekIdx) - 1));
            });
          }
        }
        const uniqueNewWeeks = Array.from(new Set(newWeeks)).sort((a, b) => a - b);

        const supplierRef = child(suppliersRef, entry.cpfCnpj);
        const existingSupplier = allSuppliers[entry.cpfCnpj] as Supplier | null;

        if (existingSupplier) {
          // Merge Q1 and Q2/Q3 data to keep them independent but accessible
          const q1Weeks = (existingSupplier.allowedWeeks || []).filter(w => w <= 18);
          const updatedWeeks = Array.from(new Set([...q1Weeks, ...uniqueNewWeeks])).sort((a, b) => a - b);
          
          // REMOVE contractItems sync to decouple PPAIS from main agenda
          // We only keep the Q1 items in the main list
          const q1Items = (existingSupplier.contractItems || []).filter(item => item.period !== '2_3_QUAD');

          await update(supplierRef, { 
            allowedWeeks: updatedWeeks,
            contractItems: q1Items,
            // Update initialValue to reflect only Q1 items in the main list
            initialValue: q1Items.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0)
          });
        } else {
          // New entry - only sync weeks, no items in the main list
          const newSupplier: Supplier = {
            name: entry.name,
            cpf: entry.cpfCnpj,
            initialValue: 0,
            contractItems: [], // Keep empty in main list
            deliveries: [],
            allowedWeeks: uniqueNewWeeks,
            address: entry.address || '',
            city: entry.city || '',
            processNumber: entry.processNumber || ''
          };
          await set(supplierRef, newSupplier);
        }
      }

      // Handle non-registered suppliers
      // "para os demais fornecedores que não possuem cadastro, deixar os campos de maio a dezembro com 0 no peso e 0 no valor."
      for (const cpf in allSuppliers) {
        if (!registeredCpfs.has(cpf)) {
          const supplier = allSuppliers[cpf] as Supplier;
          const supplierRef = child(suppliersRef, cpf);
          
          // Remove weeks that are no longer valid (e.g., if contract period changed)
          // For now, keep weeks that are > 18 if they were already there implicitly
          const updatedWeeks = (supplier.allowedWeeks || []);
          
          // Remove Q2/Q3 items and tag legacy items as Q1 only to ensure they don't show in Q2/Q3
          const updatedItems = (supplier.contractItems || [])
            .filter(item => item.period !== '2_3_QUAD')
            .map(item => ({
              ...item,
              period: (item.period || '1_QUAD') as '1_QUAD' | '2_3_QUAD'
            }));
          
          // Update if changed
          if (updatedWeeks.length !== (supplier.allowedWeeks || []).length || updatedItems.length !== (supplier.contractItems || []).length) {
             await update(supplierRef, {
               allowedWeeks: updatedWeeks,
               contractItems: updatedItems,
               initialValue: updatedItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0)
             });
          }
        }
      }

      toast.success('Agenda sincronizada com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar agenda:', error);
      toast.error('Erro ao sincronizar agenda.');
    }
  };

  const handleUpdatePerCapitaConfig = async (newConfig: Partial<PerCapitaConfig>) => {
    try {
      await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
        if (!currentData) return newConfig as PerCapitaConfig;
        return {
          ...currentData,
          ...newConfig
        } as PerCapitaConfig;
      });
      return { success: true };
    } catch (e) {
      console.error('Erro ao atualizar PerCapitaConfig:', e);
      return { success: false, message: String(e) };
    }
  };

  const handleRegisterSupplier = async (name: string, cpf: string, allowedWeeks: number[]) => {
    try {
      console.log('Tentando registrar fornecedor:', { name, cpf, allowedWeeks });
      const newSupplier: Supplier = {
        name,
        cpf,
        initialValue: 0,
        contractItems: [],
        deliveries: [],
        allowedWeeks
      };
      await set(child(suppliersRef, cpf), newSupplier);
      console.log('Fornecedor registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar fornecedor:', error);
      throw error;
    }
  };

  const handleUpdateSupplier = async (oldCpf: string, newName: string, newCpf: string, newAllowedWeeks: number[]) => {
    try {
      console.log('Tentando atualizar fornecedor:', { oldCpf, newName, newCpf, newAllowedWeeks });
      const supplierRef = child(suppliersRef, oldCpf);
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao atualizar fornecedor')), 10000));
      
      await Promise.race([
        runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData) {
            currentData.name = newName;
            currentData.cpf = newCpf;
            currentData.allowedWeeks = newAllowedWeeks;
          }
          return currentData;
        }),
        timeoutPromise
      ]);

      if (oldCpf !== newCpf) {
        const snapshot = await get(child(suppliersRef, oldCpf));
        const oldData = snapshot.val();
        await set(child(suppliersRef, newCpf), oldData);
        await remove(child(suppliersRef, oldCpf));
      }
      console.log('Fornecedor atualizado com sucesso!');
      return null;
    } catch (error) {
      console.error('Erro ao atualizar fornecedor:', error);
      return 'Erro ao atualizar fornecedor: ' + (error instanceof Error ? error.message : String(error));
    }
  };

  const handleUpdateSupplierObservations = async (cpf: string, observations: string) => {
    try {
      const supplierRef = child(suppliersRef, cpf);
      await update(supplierRef, { observations });
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar observações do fornecedor:', error);
      return { success: false, message: String(error) };
    }
  };

  const handleScheduleDelivery = useCallback(async (supplierCpf: string, date: string, time: string) => {
    try {
      console.log('Agendando entrega:', { supplierCpf, date, time });
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);

      // If not in per capita lists, schedule inside the Main Suppliers list
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        console.log('Found main supplier:', mainSupplier);
        const refId = mainSupplier.id || targetCpf;
        if (!refId) {
            throw new Error('Supplier ID not found');
        }
        const supRefPath = `${refId}/deliveries`;
        console.log('Supplier ref path:', supRefPath);
        const supRef = child(suppliersRef, supRefPath);
        const newDeliveryRef = push(supRef);
        await set(newDeliveryRef, {
          id: newDeliveryRef.key,
          date,
          time,
          item: 'AGENDAMENTO PENDENTE',
          invoiceUploaded: false
        });
        toast.success('Agendamento realizado!');
        return;
      }

      toast.error('Fornecedor não encontrado para agendar.');
    } catch (error) {
      console.error('Erro ao agendar entrega:', error);
      toast.error(`Erro ao agendar entrega: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [suppliers]);

  const handleUpdateInvoiceUrl = useCallback(async (supplierCpf: string, invoiceNumber: string, finalInvoiceUrl: string) => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);
      const targetInv = clean(invoiceNumber);

      const fetchWithTimeout = async (dbRef: any) => {
          const fetchPromise = get(dbRef);
          const timeout = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout ao ler banco de dados")), 30000));
          return Promise.race([fetchPromise, timeout]);
      };

      let anyUpdated = false;

      // 1. Check in PerCapita
      const snapshotPC = await fetchWithTimeout(perCapitaConfigRef);
      const currentPC = snapshotPC.val() as PerCapitaConfig;
      if (currentPC) {
        const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
        for (const lKey of lists) {
          const list = ensureArray(currentPC[lKey]);
          const idx = list.findIndex(p => clean(p.cpfCnpj || p.cpf) === targetCpf);
          if (idx !== -1) {
            const deliveries = ensureArray(list[idx].deliveries);
            let updatedAny = false;
            const updatedDeliveries = deliveries.map((d: any) => {
              if (clean(d.invoiceNumber) === targetInv) {
                updatedAny = true;
                return { ...d, invoiceUrl: finalInvoiceUrl };
              }
              return d;
            });
            if (updatedAny) {
              await update(child(perCapitaConfigRef, `${lKey}/${idx}`), { deliveries: updatedDeliveries });
              anyUpdated = true;
            }
          }
        }
      }

      // 2. Check in Main Suppliers
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        const supRef = child(suppliersRef, mainSupplier.id || targetCpf);
        const snapshotSup = await fetchWithTimeout(supRef);
        const data = snapshotSup.val() as Supplier;
        if (data && data.deliveries) {
          let updatedAny = false;
          const deliveries = data.deliveries.map(d => {
            if (clean(d.invoiceNumber) === targetInv) {
              updatedAny = true;
              return { ...d, invoiceUrl: finalInvoiceUrl };
            }
            return d;
          });
          if (updatedAny) {
            await update(supRef, { deliveries });
            anyUpdated = true;
          }
        }
      }

      // 3. Check and update in warehouseLog
      const snapshotLog = await fetchWithTimeout(warehouseLogRef);
      const currentLog = snapshotLog.val();
      if (currentLog) {
        const logUpdates: Record<string, any> = {};
        let logUpdatedAny = false;
        Object.entries(currentLog).forEach(([key, record]: [string, any]) => {
          if (record && clean(record.supplierCpf) === targetCpf && clean(record.invoiceNumber || record.inboundInvoice || record.outboundInvoice) === targetInv) {
            logUpdates[`${key}/invoiceUrl`] = finalInvoiceUrl;
            logUpdatedAny = true;
          }
        });
        if (logUpdatedAny) {
          await update(warehouseLogRef, logUpdates);
          anyUpdated = true;
        }
      }

      if (anyUpdated) {
        return { success: true };
      }

      return { success: false, message: 'Dados do fornecedor não encontrados nos cadastros ou nenhuma entrega correspondente.' };
    } catch (e) {
      console.error("Error updating supplier invoice URL:", e);
      return { success: false, message: 'Erro interno ao atualizar nota.' };
    }
  }, [suppliers]);



  const handleMarkInvoiceAsOpened = useCallback(async (supplierCpf: string, invoiceNumber: string) => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);
      const targetInv = clean(invoiceNumber);

      // 1. Try PerCapita
      await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
        if (currentData) {
          const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
          for (const lKey of lists) {
            const list = ensureArray(currentData[lKey]);
            const idx = list.findIndex(p => clean(p.cpfCnpj || p.cpf) === targetCpf);
            if (idx !== -1) {
              const deliveries = ensureArray(list[idx].deliveries);
              let changed = false;
              const updated = deliveries.map(d => {
                if (clean(d.invoiceNumber) === targetInv && !d.isOpened) {
                  changed = true;
                  return { ...d, isOpened: true };
                }
                return d;
              });
              if (changed) {
                list[idx].deliveries = updated;
                return currentData;
              }
            }
          }
        }
        return currentData;
      });

      // 2. Try Main Suppliers
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        const supRef = child(suppliersRef, `${mainSupplier.id || targetCpf}/deliveries`);
        await runTransaction(supRef, (currentDeliveries) => {
          if (Array.isArray(currentDeliveries)) {
            let changed = false;
            const updated = currentDeliveries.map(d => {
              if (clean(d.invoiceNumber) === targetInv && !d.isOpened) {
                changed = true;
                return { ...d, isOpened: true };
              }
              return d;
            });
            if (changed) return updated;
          }
          return currentDeliveries;
        });
      }

      return { success: true };
    } catch (e) {
      console.error("Error marking invoice as opened:", e);
      return { success: false, message: 'Erro ao marcar nota como aberta.' };
    }
  }, [suppliers]);

  const handleDeleteDelivery = async (supplierCpf: string, deliveryId: string) => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);

      // 1. Clean up warehouseLog first if there's a matching entry
      const logSnapshot = await get(warehouseLogRef);
      const allLogs = logSnapshot.val() || {};
      const logKeysToDelete = Object.keys(allLogs).filter(key => {
          const entry = allLogs[key];
          return clean(entry.supplierCpf) === targetCpf && (entry.deliveryId === deliveryId || entry.id === deliveryId);
      });

      if (logKeysToDelete.length > 0) {
          await Promise.all(logKeysToDelete.map(key => remove(child(warehouseLogRef, key))));
      }

      // 2. Try Per Capita FIRST
      const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      for (const listKey of lists) {
        const list = ensureArray(perCapitaConfig[listKey]);
        const idx = list.findIndex((p: any) => p && clean(p.cpfCnpj || p.cpf) === targetCpf);
        if (idx !== -1) {
          const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${idx}/deliveries`);
          await runTransaction(deliveriesRef, (current) => {
            if (!current || !Array.isArray(current)) return current;
            return current.filter(d => d && d.id !== deliveryId);
          });
          return { success: true };
        }
      }

      // 3. Try Main Suppliers
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        const deliveriesRef = child(suppliersRef, `${mainSupplier.id || targetCpf}/deliveries`);
        await runTransaction(deliveriesRef, (current) => {
          if (!current || !Array.isArray(current)) return current;
          return current.filter(d => d && d.id !== deliveryId);
        });
        return { success: true };
      }

      return { success: true };
    } catch (e) {
      console.error("Error deleting delivery:", e);
      return { success: false, message: 'Erro ao excluir lançamento.' };
    }
  };


  const handleUpdateDelivery = async (supplierCpf: string, deliveryId: string, updates: Partial<Delivery>) => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);

      // 1. Try Per Capita FIRST
      const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      for (const listKey of lists) {
        const list = ensureArray(perCapitaConfig[listKey]);
        const idx = list.findIndex((p: any) => p && clean(p.cpfCnpj || p.cpf) === targetCpf);
        if (idx !== -1) {
          const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${idx}/deliveries`);
          await runTransaction(deliveriesRef, (current) => {
            if (!current || !Array.isArray(current)) return current;
            return current.map(d => d && d.id === deliveryId ? { ...d, ...updates } : d);
          });
          return { success: true };
        }
      }

      // 2. Try Main Suppliers
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        const supRef = child(suppliersRef, mainSupplier.id || targetCpf);
        const deliveriesRef = child(supRef, `deliveries`);
        await runTransaction(deliveriesRef, (current) => {
          if (!current || !Array.isArray(current)) return current;
          return current.map(d => d && d.id === deliveryId ? { ...d, ...updates } : d);
        });
        return { success: true };
      }

      return { success: false, message: 'Lançamento não encontrado.' };
    } catch (e) {
      console.error("Error updating delivery:", e);
      return { success: false, message: 'Erro ao atualizar lançamento.' };
    }
  };

  const handleSaveInvoice = async (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string): Promise<void> => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);

      const enrichedDeliveries = updatedDeliveries.map(d => ({
        ...d,
        invoiceNumber,
        invoiceUrl,
        invoiceDate: invoiceDate || d.invoiceDate || d.date || new Date().toISOString().split('T')[0],
        date: d.date || invoiceDate || new Date().toISOString().split('T')[0],
        invoiceUploaded: true,
        status: 'CONCLUÍDO',
        updatedAt: new Date().toISOString()
      }));

      // Find Main Supplier or Per Capita Info
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      let pcSup = null;
      const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      for (const listKey of lists) {
        const producers = ensureArray(perCapitaConfig[listKey]);
        const found = producers.find((p: any) => p && clean(p.cpfCnpj || p.cpf) === targetCpf);
        if (found) {
          pcSup = found;
          break;
        }
      }

      let saveSuccess = false;

      // 1. Try Per Capita FIRST to prioritize Per Capita mappings
      for (const listKey of lists) {
        const producers = ensureArray(perCapitaConfig[listKey]);
        const idx = producers.findIndex((p: any) => p && clean(p.cpfCnpj || p.cpf) === targetCpf);
        if (idx !== -1) {
          const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${idx}/deliveries`);
          await runTransaction(deliveriesRef, (current) => {
            const list = ensureArray<any>(current);
            const otherDeliveries = list.filter(d => d && !deliveryIds.includes(d.id));
            return [...otherDeliveries, ...enrichedDeliveries];
          });
          saveSuccess = true;
          break;
        }
      }

      // 2. Try Main Suppliers
      if (!saveSuccess && mainSupplier) {
        const deliveriesRef = child(suppliersRef, `${mainSupplier.id || targetCpf}/deliveries`);
        await runTransaction(deliveriesRef, (current) => {
          const list = ensureArray<any>(current);
          const otherDeliveries = list.filter(d => d && !deliveryIds.includes(d.id));
          return [...otherDeliveries, ...enrichedDeliveries];
        });
        saveSuccess = true;
      }

      if (saveSuccess) {
        // 3. Synchronize with warehouseLog if there are matching entries
        if (database && navigator.onLine) {
          try {
            const logSnapshot = await get(warehouseLogRef);
            const allLogs = logSnapshot.val() || {};
            const targetInvoice = clean(invoiceNumber);
            const existingLogsForKey: Record<string, any> = {};
            
            Object.keys(allLogs).forEach(key => {
              const entry = allLogs[key];
              const entryInv = clean(entry.inboundInvoice || entry.outboundInvoice || entry.invoiceNumber || '');
              const entryCpf = clean(entry.supplierCpf || '');
              if (entryCpf === targetCpf && entryInv === targetInvoice) {
                existingLogsForKey[key] = entry;
              }
            });

            if (Object.keys(existingLogsForKey).length > 0) {
              const logUpdates: any = {};
              const usedLogKeys = new Set<string>();

              for (const item of updatedDeliveries) {
                const itName = clean(item.item || item.itemName || '');
                const logKey = Object.keys(existingLogsForKey).find(k => {
                  if (usedLogKeys.has(k)) return false;
                  const logEntry = existingLogsForKey[k];
                  const logName = clean(logEntry.itemName || logEntry.item || '');
                  if (item.id && logEntry.id && item.id === logEntry.id) return true;
                  if (item.id && logEntry.deliveryId && item.id === logEntry.deliveryId) return true;
                  return itName === logName;
                });

                if (logKey) {
                  usedLogKeys.add(logKey);
                  logUpdates[`${logKey}/itemName`] = item.item || item.itemName;
                  logUpdates[`${logKey}/item`] = item.item || item.itemName;
                  logUpdates[`${logKey}/quantity`] = Number(item.kg) || 0;
                  logUpdates[`${logKey}/kg`] = Number(item.kg) || 0;
                  logUpdates[`${logKey}/value`] = Number(item.value) || 0;
                } else {
                  const newRef = push(warehouseLogRef);
                  const newId = newRef.key || `it-${Date.now()}`;
                  logUpdates[newId] = {
                    id: newId,
                    type: 'entrada',
                    timestamp: new Date().toISOString(),
                    date: invoiceDate || new Date().toISOString().split('T')[0],
                    itemName: item.item || item.itemName,
                    supplierName: mainSupplier?.name || pcSup?.name || 'FORNECEDOR',
                    supplierCpf: supplierCpf,
                    invoiceNumber: invoiceNumber,
                    inboundInvoice: invoiceNumber,
                    quantity: Number(item.kg) || 0,
                    kg: Number(item.kg) || 0,
                    value: Number(item.value) || 0,
                    lotNumber: 'UNICO',
                    expirationDate: item.expirationDate || '',
                    barcode: item.barcode || ''
                  };
                }
              }

              // Remove logs that are no longer present in the updated deliveries
              Object.keys(existingLogsForKey).forEach(k => {
                if (!usedLogKeys.has(k)) {
                  logUpdates[k] = null;
                }
              });

              if (Object.keys(logUpdates).length > 0) {
                await update(warehouseLogRef, logUpdates);
              }
            }
          } catch (err) {
            console.warn("Error synchronizing warehouseLog:", err);
          }
        }

        toast.success('Nota Fiscal salva com sucesso!');
        return;
      }

      toast.error('Fornecedor não encontrado para salvar nota.');
    } catch (e) {
      console.error("Error saving invoice:", e);
      toast.error('Erro ao salvar nota fiscal.');
    }
  };

  const handleCancelDeliveries = async (supplierCpf: string, deliveryIds: string[]): Promise<void> => {
    try {
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetCpf = clean(supplierCpf);

      // 1. Try Per Capita FIRST to prioritize Per Capita mappings
      const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      for (const listKey of lists) {
        const producers = ensureArray(perCapitaConfig[listKey]);
        const idx = producers.findIndex((p: any) => p && clean(p.cpfCnpj || p.cpf) === targetCpf);
        if (idx !== -1) {
          const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${idx}/deliveries`);
          await runTransaction(deliveriesRef, (current) => {
            if (!current) return current;
            const list = ensureArray<any>(current);
            return list.filter(d => d && !deliveryIds.includes(d.id));
          });
          toast.success('Agendamentos excluídos.');
          return;
        }
      }

      // 2. Try Main Suppliers
      const mainSupplier = (suppliers || []).find(s => s && clean(s.cpf) === targetCpf);
      if (mainSupplier) {
        const deliveriesRef = child(suppliersRef, `${mainSupplier.id || targetCpf}/deliveries`);
        await runTransaction(deliveriesRef, (current) => {
          if (!current) return current;
          const list = ensureArray<any>(current);
          return list.filter(d => d && !deliveryIds.includes(d.id));
        });
        toast.success('Agendamentos excluídos.');
        return;
      }
    } catch (e) {
      console.error("Error canceling deliveries:", e);
      toast.error('Erro ao excluir agendamentos.');
    }
  };

  const handleUpdateInvoiceItems = async (supplierCpf: string, invoiceNumber: string, items: any[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, supplierNameHint?: string, ne?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      console.log('handleUpdateInvoiceItems:', { supplierCpf, invoiceNumber, itemsCount: items.length });
      
      const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      const targetInvoice = clean(invoiceNumber);
      const targetCpf = clean(supplierCpf);

      let supplierName = supplierNameHint || '';
      const targetNameClean = clean(supplierName);
      
      let mainSup = null;
      let pcSup = null;

      const findSup = (s: any) => {
          if (!s) return false;
          const sCpf = clean(s.cpf || s.cpfCnpj);
          if (targetCpf && sCpf === targetCpf) return true;
          if (targetNameClean && clean(s.name) === targetNameClean) return true;
          return false;
      };

      mainSup = (suppliers || []).find(findSup);
      if (mainSup) {
          supplierName = mainSup.name;
      } else {
        const pcLists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
        for (const lKey of pcLists) {
          pcSup = ensureArray(perCapitaConfig ? perCapitaConfig[lKey] : []).find(findSup);
          if (pcSup) {
            supplierName = pcSup.name;
            break;
          }
        }
      }
      
      const updatedTargetNameClean = clean(supplierName);
      const logSnapshot = await get(warehouseLogRef);
      const allLogs = logSnapshot.val() || {};
      const logUpdates: any = {};
      
      const existingLogsForKey: Record<string, any> = {};
      Object.keys(allLogs).forEach(key => {
          const entry = allLogs[key];
          const entryInv = clean(entry.inboundInvoice || entry.outboundInvoice || entry.invoiceNumber || '');
          const entryCpf = clean(entry.supplierCpf || '');
          const entryName = clean(entry.supplierName || '');
          if ((entryCpf === targetCpf || (updatedTargetNameClean && entryName === updatedTargetNameClean)) && entryInv === targetInvoice) {
              existingLogsForKey[key] = entry;
          }
      });
      
      console.log('handleUpdateInvoiceItems existing logs:', Object.keys(existingLogsForKey).length, existingLogsForKey);

      const usedLogKeys = new Set<string>();
      for (const item of items) {
          const itName = clean(item.name || item.itemName || '');
          const logKey = Object.keys(existingLogsForKey).find(k => {
              if (usedLogKeys.has(k)) return false;
              const logEntry = existingLogsForKey[k];
              const logName = clean(logEntry.itemName || logEntry.item || '');
              if (item.id && logEntry.id && item.id === logEntry.id) return true;
              if (item.id && logEntry.deliveryId && item.id === logEntry.deliveryId) return true;
              return itName === logName;
          });

          if (logKey) {
              usedLogKeys.add(logKey);
              logUpdates[`${logKey}/inboundInvoice`] = newInvoiceNumber || invoiceNumber;
              logUpdates[`${logKey}/invoiceNumber`] = newInvoiceNumber || invoiceNumber;
              logUpdates[`${logKey}/itemName`] = item.name;
              logUpdates[`${logKey}/item`] = item.name;
              logUpdates[`${logKey}/quantity`] = Number(item.kg) || 0;
              logUpdates[`${logKey}/kg`] = Number(item.kg) || 0;
              logUpdates[`${logKey}/value`] = item.value !== undefined ? Number(item.value) : (existingLogsForKey[logKey].value || 0);
              logUpdates[`${logKey}/lotNumber`] = item.lotNumber || '';
              logUpdates[`${logKey}/expirationDate`] = item.expirationDate || '';
              logUpdates[`${logKey}/barcode`] = item.barcode || '';
              logUpdates[`${logKey}/pdNumber`] = pd ?? item.pd ?? '';
              logUpdates[`${logKey}/neNumber`] = ne ?? item.ne ?? '';
              logUpdates[`${logKey}/location`] = item.location || '';
              logUpdates[`${logKey}/date`] = newDate || existingLogsForKey[logKey].date || '';
          } else {
              const newRef = push(warehouseLogRef);
              const newId = newRef.key || `it-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`;
              logUpdates[newId] = {
                  id: newId,
                  type: 'entrada',
                  timestamp: new Date().toISOString(),
                  date: newDate || new Date().toISOString().split('T')[0],
                  itemName: item.name,
                  supplierName: supplierName || 'FORNECEDOR EDITADO',
                  supplierCpf: supplierCpf,
                  invoiceNumber: newInvoiceNumber || invoiceNumber,
                  inboundInvoice: newInvoiceNumber || invoiceNumber,
                  quantity: Number(item.kg) || 0,
                  kg: Number(item.kg) || 0,
                  value: Number(item.value) || 0,
                  lotNumber: item.lotNumber || 'UNICO',
                  expirationDate: item.expirationDate || '',
                  barcode: item.barcode || '',
                  location: item.location || '',
                  pdNumber: pd ?? item.pd ?? '',
                  neNumber: ne ?? item.ne ?? ''
              };
          }
      }

      Object.keys(existingLogsForKey).forEach(k => {
          if (!usedLogKeys.has(k)) {
              logUpdates[k] = null;
          }
      });

      console.log('handleUpdateInvoiceItems applying logUpdates:', logUpdates);

      if (Object.keys(logUpdates).length > 0) {
          await update(warehouseLogRef, logUpdates);
      }

      const updateDeliveries = (list: any[]) => {
        const currentList = ensureArray(list);
        const others = currentList.filter(d => d && clean(d.invoiceNumber) !== targetInvoice);
        const updated = items.map(it => {
          const original = currentList.find(d => d && clean(d.invoiceNumber) === targetInvoice && (it.id === d.id || (d.id && it.id === d.id) || clean(it.name) === clean(d.itemName || d.item)));
          return {
            id: it.id || original?.id || `del-${Date.now()}-${crypto.randomUUID().substring(0, 8)}`,
            ...original,
            invoiceNumber: newInvoiceNumber || invoiceNumber,
            date: newDate || original?.date || new Date().toISOString().split('T')[0],
            itemName: it.name,
            item: it.name,
            kg: Number(it.kg || 0),
            quantity: Number(it.kg || 0),
            value: Number(it.value || 0),
            lotNumber: it.lotNumber || '',
            expirationDate: it.expirationDate || '',
            barcode: it.barcode || barcode || '',
            location: it.location || '',
            receiptTermNumber: receiptTermNumber || original?.receiptTermNumber || '',
            invoiceDate: invoiceDate || original?.invoiceDate || '',
            pdNumber: pd ?? it.pd ?? original?.pdNumber ?? '',
            pd: pd ?? it.pd ?? original?.pd ?? '',
            neNumber: ne ?? it.ne ?? original?.neNumber ?? '',
            ne: ne ?? it.ne ?? original?.ne ?? ''
          };
        });
        return [...others, ...updated];
      };

      if (!suppliers || suppliers.length === 0) {
        console.warn("Suppliers not loaded yet during update attempt.");
      }

      let supplierFound = false;

      // Update in Main Suppliers if found
      const mainSups = (suppliers || []).filter(findSup);
      for (const mSup of mainSups) {
        const supRef = child(suppliersRef, `${mSup.id || targetCpf}/deliveries`);
        await runTransaction(supRef, (current) => updateDeliveries(current));
        supplierFound = true;
      }

      // Update in Per Capita Config if found
      const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
      for (const lKey of lists) {
        const list = ensureArray(perCapitaConfig ? perCapitaConfig[lKey] : []);
        // Find ALL matching indices in this list
        const indices = list.reduce((acc, s, i) => {
          if (findSup(s)) acc.push(i);
          return acc;
        }, [] as number[]);
        
        for (const idx of indices) {
          const dRef = child(perCapitaConfigRef, `${lKey}/${idx}/deliveries`);
          await runTransaction(dRef, (current) => updateDeliveries(current));
          supplierFound = true;
        }
      }

      if (!supplierFound) {
        console.warn("Supplier not found in any list during invoice update:", { supplierCpf, targetCpf });
      }

      return { success: true };
    } catch (e) {
      console.error("Error in handleUpdateInvoiceItems:", e);
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, message: 'Erro ao atualizar itens da nota: ' + msg };
    }
  };

  const handleReopenInvoice = async (supplierCpf: string, invoiceNumber: string) => {
    const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
    const targetCpf = clean(supplierCpf);
    const targetInvoice = clean(invoiceNumber);
    
    const mainSupplier = suppliers.find(s => clean(s.cpf) === targetCpf);
    if (mainSupplier) {
      const deliveriesRef = child(suppliersRef, `${mainSupplier.id || targetCpf}/deliveries`);
      await runTransaction(deliveriesRef, (currentDeliveries) => {
        if (Array.isArray(currentDeliveries)) {
          const deliveries = currentDeliveries as any[];
          const entriesForNf = deliveries.filter(d => clean(d.invoiceNumber) === targetInvoice);
          if (entriesForNf.length > 0) {
            const baseDate = entriesForNf[0].date;
            const baseTime = entriesForNf[0].time;
            const filtered = deliveries.filter(d => clean(d.invoiceNumber) !== targetInvoice);
            filtered.push({
              id: `reopen-${Date.now()}`,
              date: baseDate,
              time: baseTime,
              item: 'AGENDAMENTO PENDENTE',
              invoiceUploaded: false
            });
            return filtered;
          }
        }
        return currentDeliveries;
      });
      return;
    }

    let listKey: 'ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers' | null = null;
    let producerIdx = -1;

    const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
    for (const lKey of lists) {
      const list = ensureArray(perCapitaConfig[lKey]);
      const idx = list.findIndex((p: any) => clean(p.cpfCnpj || p.cpf) === targetCpf);
      if (idx !== -1) {
        listKey = lKey;
        producerIdx = idx;
        break;
      }
    }

    if (listKey && producerIdx !== -1) {
      const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
      await runTransaction(deliveriesRef, (currentDeliveries) => {
        if (Array.isArray(currentDeliveries)) {
          const deliveries = currentDeliveries as any[];
          const entriesForNf = deliveries.filter((d: any) => clean(d.invoiceNumber) === targetInvoice);
          if (entriesForNf.length > 0) {
            const baseDate = entriesForNf[0].date;
            const baseTime = entriesForNf[0].time;
            const filtered = deliveries.filter((d: any) => clean(d.invoiceNumber) !== targetInvoice);
            filtered.push({
              id: `reopen-${Date.now()}`,
              date: baseDate,
              time: baseTime,
              item: 'AGENDAMENTO PENDENTE',
              invoiceUploaded: false
            });
            return filtered;
          }
        }
        return currentDeliveries;
      });
    }
  };

  const handleDeleteInvoice = async (supplierCpf: string, invoiceNumber: string, retries = 5) => {
    console.log('handleDeleteInvoice chamado:', supplierCpf, invoiceNumber);
    const clean = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
    const targetCpf = clean(supplierCpf);
    const targetInvoice = clean(invoiceNumber);

    for (let i = 0; i < retries; i++) {
      try {
        const _mainSupplier = suppliers.find(s => clean(s.cpf) === targetCpf);
        
        // --- NOVO: Deletar também do log do almoxarifado ---
        const logSnapshot = await get(warehouseLogRef);
        const allLogs = logSnapshot.val() || {};
        const logKeysToDelete = Object.keys(allLogs).filter(key => {
            const entry = allLogs[key];
            const entryInv = clean(entry.inboundInvoice || entry.outboundInvoice || entry.invoiceNumber || 'S/N');
            const entryCpf = clean(entry.supplierCpf || '');
            
            const isTarget = entryCpf === targetCpf && entryInv === targetInvoice;
            
            if (isTarget && targetInvoice === 'SN') {
                if (clean(entry.item || entry.itemName) === 'AGENDAMENTO PENDENTE') return false;
            }
            return isTarget;
        });

        if (logKeysToDelete.length > 0) {
            console.log(`Deletando ${logKeysToDelete.length} itens do warehouseLog correspondentes à NF ${invoiceNumber}`);
            await Promise.all(logKeysToDelete.map(key => remove(child(warehouseLogRef, key))));
        }

        let deletedAny = false;

        const mainSups = suppliers.filter(s => clean(s.cpf) === targetCpf);
        for (const mSup of mainSups) {
          const deliveriesRef = child(suppliersRef, `${mSup.id || targetCpf}/deliveries`);
          console.log(`Iniciando transação MainSupplier (tentativa ${i + 1}):`, targetCpf);
          await runTransaction(deliveriesRef, (currentDeliveries) => {
            if (Array.isArray(currentDeliveries)) {
              return currentDeliveries.filter(d => {
                const dInv = clean(d.invoiceNumber || 'S/N');
                const isTargetInvoice = dInv === targetInvoice;
                
                if (isTargetInvoice && targetInvoice === 'SN') {
                    if (d.item === 'AGENDAMENTO PENDENTE') return true; 
                }
                return !isTargetInvoice;
              });
            }
            return currentDeliveries;
          });
          deletedAny = true;
          console.log('Transação de exclusão concluída para MainSupplier');
        }

        const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = ['ppaisProducers', 'pereciveisSuppliers', 'estocaveisSuppliers'];
        for (const lKey of lists) {
          const list = ensureArray(perCapitaConfig[lKey]);
          const indices = list.reduce((acc, p, idx) => {
            if (clean((p as any).cpfCnpj || (p as any).cpf) === targetCpf) acc.push(idx);
            return acc;
          }, [] as number[]);

          for (const idx of indices) {
            const deliveriesRef = child(perCapitaConfigRef, `${lKey}/${idx}/deliveries`);
            await runTransaction(deliveriesRef, (currentDeliveries) => {
              if (Array.isArray(currentDeliveries)) {
                return (currentDeliveries as any[]).filter(d => {
                  const dInv = clean(d.invoiceNumber || 'S/N');
                  const isTargetInvoice = dInv === targetInvoice;
                  
                  if (isTargetInvoice && targetInvoice === 'SN') {
                      if (d.item === 'AGENDAMENTO PENDENTE') return true; 
                  }
                  return !isTargetInvoice;
                });
              }
              return currentDeliveries;
            });
            deletedAny = true;
            console.log('Transação de exclusão concluída para PerCapita indexada');
          }
        }
        
        console.log('Transação de exclusão concluída para fornecedores. Algo deletado?', deletedAny);
        return { success: true };
      } catch (error) {
        console.log('--- INÍCIO DO ERRO ---');
        console.log('Erro como string:', String(error));
        if (error instanceof Error) {
            console.log('Mensagem do erro:', error.message);
        }
        console.log('--- FIM DO ERRO ---');
        if (i === retries - 1) {
          return { success: false, message: 'Erro ao excluir nota fiscal após várias tentativas: ' + (error instanceof Error ? error.message : String(error)) };
        }
        // Espera um pouco antes de tentar novamente (backoff simples)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const handleManualInvoiceEntry = async (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, type: 'entrada' | 'saída' = 'entrada', invoiceUrl?: string, ne?: string) => {
    let supplierName = '';
    const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
    const cleanEntryCpf = cleanStr(supplierCpf);

    const mainSupplier = (suppliers || []).find(s => s && cleanStr(s.cpf) === cleanEntryCpf);
    if (mainSupplier) {
      supplierName = mainSupplier.name;
    } else {
      const p = (perCapitaConfig.ppaisProducers || []).find(s => (cleanStr(s.cpfCnpj || s.cpf) === cleanEntryCpf)) || 
                (perCapitaConfig.pereciveisSuppliers || []).find(s => (cleanStr(s.cpfCnpj || s.cpf) === cleanEntryCpf)) ||
                (perCapitaConfig.estocaveisSuppliers || []).find(s => (cleanStr(s.cpfCnpj || s.cpf) === cleanEntryCpf));
      if (p) supplierName = p.name;
    }

    if (!supplierName) return { success: false, message: 'Fornecedor não encontrado.' };

    try {
      // 1. Registrar no log do almoxarifado primeiro
      const logEntries: { ref: any, entry: any, lotId: string }[] = items.map((item, idx) => {
        const newLogRef = push(warehouseLogRef);
        const lotId = `lot-manual-${Date.now()}-${idx}`;
        const entry: any = {
            id: newLogRef.key || `ent-man-${Date.now()}-${idx}`,
            type: type,
            timestamp: new Date().toISOString(),
            date: invoiceDate || date,
            itemName: item.name,
            supplierName: supplierName,
            supplierCpf: supplierCpf,
            lotNumber: item.lotNumber || 'UNICO',
            quantity: item.kg,
            value: item.value || 0,
            barcode: item.barcode || barcode || '',
            pdNumber: pd || '',
            neNumber: ne || '',
            lotId: lotId,
            deliveryId: ''
        };
        
        if (type === 'entrada') {
            entry.inboundInvoice = String(invoiceNumber || '').trim();
        } else {
            entry.outboundInvoice = String(invoiceNumber || '').trim();
        }
        if (item.expirationDate !== undefined) entry.expirationDate = item.expirationDate;

        return { ref: newLogRef, entry, lotId };
      });

      // Salva todos os logs
      await Promise.all(logEntries.map(le => set(le.ref, le.entry)));

      // 2. Sincronizar com as entregas do fornecedor
      const entryDate = invoiceDate || date;
      if (mainSupplier) {
        const supplierRef = child(suppliersRef, mainSupplier.cpf);
        await runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData) {
            let deliveries = Array.isArray(currentData.deliveries) 
              ? [...currentData.deliveries] 
              : Object.values(currentData.deliveries || {});
            
            // Remover agendamento pendente do mesmo dia
            deliveries = deliveries.filter((d: any) => !(d.date === entryDate && d.item === 'AGENDAMENTO PENDENTE'));

            logEntries.forEach((le, idx) => {
              const item = items[idx];
              const newDelivery: any = {
                id: `manual-${Date.now()}-${idx}`,
                date: entryDate,
                time: '08:00',
                item: item.name,
                kg: item.kg,
                value: item.value,
                invoiceUploaded: true,
                invoiceNumber: String(invoiceNumber || '').trim(),
                barcode: item.barcode || barcode || '',
                type: type,
                status: 'CONCLUÍDO',
                lots: [{
                  id: le.lotId,
                  lotNumber: item.lotNumber || 'MANUAL',
                  initialQuantity: item.kg,
                  remainingQuantity: item.kg
                }]
              };

              if (invoiceDate !== undefined) newDelivery.invoiceDate = invoiceDate;
              if (receiptTermNumber !== undefined) newDelivery.receiptTermNumber = receiptTermNumber;
              if (pd !== undefined) newDelivery.pd = pd;
              if (ne !== undefined) newDelivery.ne = ne;
              if (invoiceUrl !== undefined) newDelivery.invoiceUrl = invoiceUrl;
              if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

              deliveries.push(newDelivery);
            });
            currentData.deliveries = deliveries;
          }
          return currentData;
        });
      } else {
        await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
          if (currentData) {
            const findAndAdd = (list: any[] | undefined) => {
              const s = list?.find(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanEntryCpf));
              if (s) {
                let deliveries = Array.isArray(s.deliveries)
                  ? [...s.deliveries]
                  : Object.values(s.deliveries || {});
                
                // Remover agendamento pendente do mesmo dia
                deliveries = deliveries.filter((d: any) => !(d.date === entryDate && d.item === 'AGENDAMENTO PENDENTE'));

                logEntries.forEach((le, idx) => {
                  const item = items[idx];
                  const newDelivery: any = {
                    id: `manual-${Date.now()}-${idx}`,
                    date: entryDate,
                    time: '08:00',
                    item: item.name,
                    kg: item.kg,
                    value: item.value,
                    invoiceUploaded: true,
                    invoiceNumber: String(invoiceNumber || '').trim(),
                    barcode: item.barcode || barcode || '',
                    status: 'CONCLUÍDO',
                    lots: [{
                      id: le.lotId,
                      lotNumber: item.lotNumber || 'MANUAL',
                      initialQuantity: item.kg,
                      remainingQuantity: item.kg
                    }]
                  };

                  if (invoiceDate !== undefined) newDelivery.invoiceDate = invoiceDate;
                  if (receiptTermNumber !== undefined) newDelivery.receiptTermNumber = receiptTermNumber;
                  if (pd !== undefined) newDelivery.pd = pd;
                  if (ne !== undefined) newDelivery.ne = ne;
                  if (invoiceUrl !== undefined) newDelivery.invoiceUrl = invoiceUrl;
                  if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

                  deliveries.push(newDelivery);
                });
                s.deliveries = deliveries;
                return true;
              }
              return false;
            };
            if (!findAndAdd(currentData.ppaisProducers)) {
              if (!findAndAdd(currentData.pereciveisSuppliers)) {
                 findAndAdd(currentData.estocaveisSuppliers);
              }
            }
          }
          return currentData;
        });
      }

      return { success: true };
    } catch (e) {
      console.error("Erro no lançamento manual:", e);
      return { success: false, message: 'Falha no lançamento manual.' };
    }
  };

  // --- FIM GERENCIAMENTO NOTAS ---

  const handleUpdateContractForItem = async (itemName: string, assignments: any[]) => {
    try {
      console.log('Tentando atualizar contratos para o item:', itemName, 'Assignments:', assignments);
      
      const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
      
      // Identificar fornecedores que PRECISAM ser atualizados:
      // 1. Fornecedores que estão nos novos assignments
      // 2. Fornecedores que atualmente possuem o item mas não estão nos novos assignments
      const suppliersToUpdate = suppliers.filter(s => {
        const isAssigned = assignments.some(a => cleanStr(a.supplierCpf) === cleanStr(s.cpf));
        const hasItem = (s.contractItems || []).some(ci => ci.name === itemName);
        return isAssigned || hasItem;
      });

      console.log('Total de fornecedores afetados:', suppliersToUpdate.length);
      
      let count = 0;
      // Processar em pequenos lotes ou sequencialmente mas apenas os afetados
      for (const supplier of suppliersToUpdate) {
        count++;
        const assignment = assignments.find(a => cleanStr(a.supplierCpf) === cleanStr(supplier.cpf));
        const supplierRef = child(suppliersRef, supplier.id || supplier.cpf);
        
        console.log(`Processando fornecedor ${count}/${suppliersToUpdate.length}: ${supplier.name} (${supplier.id || supplier.cpf})`);
        
        // Tenta a transação com retentativas manuais se necessário, mas o runTransaction já faz isso.
        // Removemos o Promise.race com timeout curto para evitar interromper transações legítimas
        await runTransaction(supplierRef, (data: Supplier) => {
          if (!data) return data; // Se não existir, não faz nada
          
          // Remove o item atual (para atualizar ou deletar)
          const otherItems = (data.contractItems || []).filter(ci => ci.name !== itemName);
          
          if (assignment) {
            // Adiciona o item atualizado
            otherItems.push({
              name: itemName,
              totalKg: assignment.totalKg,
              valuePerKg: assignment.valuePerKg,
              unit: assignment.unit || 'kg-1',
              category: assignment.category || 'OUTROS',
              comprasCode: assignment.comprasCode || '',
              becCode: assignment.becCode || '',
              commitmentNumber: assignment.commitmentNumber || '',
              commitmentValue: assignment.commitmentValue || 0,
              monthlyWeight: assignment.monthlyWeight || 0,
              monthlyValue: assignment.monthlyValue || 0
            });
          }
          
          data.contractItems = otherItems;
          // Recalcula o valor inicial do contrato
          data.initialValue = otherItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0);
          
          return data;
        });

        // --- NOVO: Sincronizar com perCapitaConfig se for produtor ou perecível ---
        await runTransaction(perCapitaConfigRef, (current: any) => {
          if (!current) return current;
          
          let changed = false;
          const updatedPpais = Array.isArray(current.ppaisProducers) ? [...current.ppaisProducers] : Object.values(current.ppaisProducers || {});
          const updatedPereciveis = Array.isArray(current.pereciveisSuppliers) ? [...current.pereciveisSuppliers] : Object.values(current.pereciveisSuppliers || {});
          const updatedEstocaveis = Array.isArray(current.estocaveisSuppliers) ? [...current.estocaveisSuppliers] : Object.values(current.estocaveisSuppliers || {});

          const ppaisIndex = updatedPpais.findIndex(p => cleanStr(p.cpfCnpj || p.cpf) === cleanStr(supplier.cpf));
          const pereciveisIndex = updatedPereciveis.findIndex(p => cleanStr(p.cpfCnpj || p.cpf) === cleanStr(supplier.cpf));
          const estocaveisIndex = updatedEstocaveis.findIndex(p => cleanStr(p.cpfCnpj || p.cpf) === cleanStr(supplier.cpf));

          if (ppaisIndex !== -1) {
            const p = updatedPpais[ppaisIndex];
            const otherItems = (p.contractItems || []).filter(ci => ci.name !== itemName);
            if (assignment) {
              otherItems.push({
                name: itemName,
                totalKg: assignment.totalKg,
                valuePerKg: assignment.valuePerKg,
                unit: assignment.unit || 'kg-1',
                category: assignment.category || 'PPAIS',
                comprasCode: assignment.comprasCode || '',
                becCode: assignment.becCode || '',
                commitmentNumber: assignment.commitmentNumber || '',
                commitmentValue: assignment.commitmentValue || 0,
                monthlyWeight: assignment.monthlyWeight || 0,
                monthlyValue: assignment.monthlyValue || 0,
                period: '2_3_QUAD'
              });
            }
            updatedPpais[ppaisIndex] = { ...p, contractItems: otherItems };
            changed = true;
          }

          if (pereciveisIndex !== -1) {
            const p = updatedPereciveis[pereciveisIndex];
            const otherItems = (p.contractItems || []).filter(ci => ci.name !== itemName);
            if (assignment) {
              otherItems.push({
                name: itemName,
                totalKg: assignment.totalKg,
                valuePerKg: assignment.valuePerKg,
                unit: assignment.unit || 'kg-1',
                category: assignment.category || 'PERECÍVEIS',
                comprasCode: assignment.comprasCode || '',
                becCode: assignment.becCode || '',
                commitmentNumber: assignment.commitmentNumber || '',
                commitmentValue: assignment.commitmentValue || 0,
                monthlyWeight: assignment.monthlyWeight || 0,
                monthlyValue: assignment.monthlyValue || 0,
                period: '2_3_QUAD'
              });
            }
            updatedPereciveis[pereciveisIndex] = { ...p, contractItems: otherItems };
            changed = true;
          }

          if (estocaveisIndex !== -1) {
            const p = updatedEstocaveis[estocaveisIndex];
            const otherItems = (p.contractItems || []).filter(ci => ci.name !== itemName);
            if (assignment) {
              otherItems.push({
                name: itemName,
                totalKg: assignment.totalKg,
                valuePerKg: assignment.valuePerKg,
                unit: assignment.unit || 'kg-1',
                category: assignment.category || 'ESTOCÁVEIS',
                comprasCode: assignment.comprasCode || '',
                becCode: assignment.becCode || '',
                commitmentNumber: assignment.commitmentNumber || '',
                commitmentValue: assignment.commitmentValue || 0,
                monthlyWeight: assignment.monthlyWeight || 0,
                monthlyValue: assignment.monthlyValue || 0,
                period: '2_3_QUAD'
              });
            }
            updatedEstocaveis[estocaveisIndex] = { ...p, contractItems: otherItems };
            changed = true;
          }

          if (changed) {
            return {
              ...current,
              ppaisProducers: updatedPpais,
              pereciveisSuppliers: updatedPereciveis,
              estocaveisSuppliers: updatedEstocaveis
            };
          }
          return current;
        });
      }
      
      console.log('Contratos atualizados com sucesso!');
      return { success: true, message: 'Contratos atualizados' };
    } catch (error) {
      console.error('Erro ao atualizar contratos:', error);
      return { success: false, message: 'Falha ao atualizar contratos: ' + (error instanceof Error ? error.message : String(error)) };
    }
  };

  const handleUpdateAcquisitionItem = async (item: AcquisitionItem) => {
    try {
      const itemRef = child(acquisitionItemsRef, item.id);
      const oldItemSnapshot = await get(itemRef);
      const oldItem = oldItemSnapshot.val() as AcquisitionItem | null;

      await set(itemRef, item);

      // Se o nome mudou, precisamos atualizar em todos os fornecedores
      if (oldItem && oldItem.name !== item.name) {
        const suppliersSnapshot = await get(suppliersRef);
        const allSuppliers = suppliersSnapshot.val() || {};
        
        for (const cpf in allSuppliers) {
          const supplier = allSuppliers[cpf] as Supplier;
          if (supplier.contractItems) {
            const updatedItems = supplier.contractItems.map(ci => 
              ci.name === oldItem.name ? { ...ci, name: item.name } : ci
            );
            if (JSON.stringify(updatedItems) !== JSON.stringify(supplier.contractItems)) {
              await update(child(suppliersRef, cpf), { contractItems: updatedItems });
            }
          }
        }

        // Também atualizar no perCapitaConfig
        const updatedPpais = (perCapitaConfig.ppaisProducers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).map(ci => ci.name === oldItem.name ? { ...ci, name: item.name } : ci)
        }));
        const updatedPereciveis = (perCapitaConfig.pereciveisSuppliers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).map(ci => ci.name === oldItem.name ? { ...ci, name: item.name } : ci)
        }));
        const updatedEstocaveis = (perCapitaConfig.estocaveisSuppliers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).map(ci => ci.name === oldItem.name ? { ...ci, name: item.name } : ci)
        }));
        await set(perCapitaConfigRef, { 
          ...perCapitaConfig, 
          ppaisProducers: updatedPpais, 
          pereciveisSuppliers: updatedPereciveis,
          estocaveisSuppliers: updatedEstocaveis 
        });
      }
      return { success: true, message: 'Item atualizado com sucesso' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Erro ao atualizar item' };
    }
  };

  const handleDeleteAcquisitionItem = async (id: string) => {
    try {
      const itemRef = child(acquisitionItemsRef, id);
      const itemSnapshot = await get(itemRef);
      const item = itemSnapshot.val() as AcquisitionItem | null;

      if (item) {
        // Remover de todos os fornecedores
        const suppliersSnapshot = await get(suppliersRef);
        const allSuppliers = suppliersSnapshot.val() || {};
        
        for (const cpf in allSuppliers) {
          const supplier = allSuppliers[cpf] as Supplier;
          if (supplier.contractItems) {
            const updatedItems = supplier.contractItems.filter(ci => ci.name !== item.name);
            if (updatedItems.length !== supplier.contractItems.length) {
              await update(child(suppliersRef, cpf), { contractItems: updatedItems });
            }
          }
        }

        // Também remover do perCapitaConfig
        const updatedPpais = (perCapitaConfig.ppaisProducers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).map(ci => ci.name === item.name ? null : ci).filter(Boolean)
        }));
        const updatedPereciveis = (perCapitaConfig.pereciveisSuppliers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).filter(ci => ci.name !== item.name)
        }));
        const updatedEstocaveis = (perCapitaConfig.estocaveisSuppliers || []).map(p => ({
          ...p,
          contractItems: (p.contractItems || []).filter(ci => ci.name !== item.name)
        }));
        await set(perCapitaConfigRef, { 
          ...perCapitaConfig, 
          ppaisProducers: updatedPpais, 
          pereciveisSuppliers: updatedPereciveis,
          estocaveisSuppliers: updatedEstocaveis
        });
      }

      await remove(itemRef);
      return { success: true, message: 'Item excluído com sucesso' };
    } catch (e) {
      console.error(e);
      return { success: false, message: 'Erro ao excluir item' };
    }
  };

  const handleUpdateStandardMenu = async (m: any) => {
    setStandardMenu(m);
    safeLocalStorageSetItem('cached_standardMenu', JSON.stringify(m));
    if (database && navigator.onLine) {
      try {
        await set(standardMenuRef, m);
      } catch (err) {
        console.warn("Could not save standard menu to database, offline cache kept:", err);
      }
    }
  };

  const handleUpdateDailyMenu = async (m: any) => {
    setDailyMenus(m);
    safeLocalStorageSetItem('cached_dailyMenus', JSON.stringify(m));
    if (database && navigator.onLine) {
      try {
        await set(dailyMenusRef, m);
      } catch (err) {
        console.warn("Could not save daily menu to database, offline cache kept:", err);
      }
    }
  };

  const handleRegisterWarehouseEntry = async (payload: any) => {
    console.log("Iniciando registro de entrada:", payload.itemName);
    try {
        const newRef = push(warehouseLogRef);
        
        let finalInvoiceUrl = payload.invoiceUrl || '';
        if (finalInvoiceUrl && (finalInvoiceUrl.startsWith('data:application/pdf') || finalInvoiceUrl.startsWith('data:pdf/') || (finalInvoiceUrl.startsWith('data:') && finalInvoiceUrl.includes('base64')))) {
            console.log("Detectado possível PDF/Arquivo base64, iniciando upload para Storage...");
            try {
                const invoiceId = `inv_entry_NF${String(payload.invoiceNumber || 'S-N').replace(/[^\w-]/g, '_')}_${Date.now()}_${crypto.randomUUID().substring(0, 4)}.pdf`;
                
                const parts = finalInvoiceUrl.split(',');
                if (parts.length > 1) {
                    const byteString = atob(parts[1]);
                    const mimeString = parts[0].includes(':') ? parts[0].split(':')[1].split(';')[0] : 'application/pdf';
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                      ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    
                    console.log("Blob criado, tamanho:", blob.size, "Enviando para storage via resumable...");
                    
                    const uploadPromise = async () => {
                        const bucket = 'gestao-ppais.firebasestorage.app';
                        
                        const res = await fetch('/api/proxy-storage-upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ bucket, path: `invoices/${invoiceId}`, base64: finalInvoiceUrl, contentType: mimeString })
                        });
                        
                        const text = await res.text();
                        let data;
                        try {
                            data = JSON.parse(text);
                        } catch (e: any) {
                            throw new Error(`Erro no servidor (${res.status}): Resposta inválida. O arquivo pode ser muito grande ou a internet oscilou.`, { cause: e });
                        }
                        
                        if (!data.success) {
                            throw new Error(data.error || 'Erro no servidor ao enviar arquivo');
                        }
                        return data.url;
                    };

                    const timeoutPromise = new Promise<never>((_, reject) => 
                        setTimeout(() => {
                            reject(new Error("Timeout no upload do PDF (180s)"));
                        }, 180000)
                    );
                    
                    finalInvoiceUrl = await Promise.race([uploadPromise(), timeoutPromise]);
                    console.log("Upload concluído com sucesso:", finalInvoiceUrl);
                }
            } catch (storageError) {
                console.error("Storage upload failed for entry attachment:", storageError);
                if (finalInvoiceUrl.length > 500000) {
                    console.warn("PDF muito grande para o RTDB (>500KB), removendo anexo para permitir salvamento.");
                    finalInvoiceUrl = '';
                } else {
                    console.log("Mantendo anexo em base64 no RTDB (menor que 500KB)");
                }
            }
        }

        const cleanStr = (s: any) => String(s || '').trim().replace(/^0+/, '').replace(/[.\-/]/g, '').toUpperCase();
        const cleanPayloadCpf = cleanStr(payload.supplierCpf);

        // Find supplier in both main list and perCapitaConfig
        const ppaisProducer = (perCapitaConfig.ppaisProducers || []).find(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
        const pereciveisSupplier = (perCapitaConfig.pereciveisSuppliers || []).find(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
        const estocavelSupplier = (perCapitaConfig.estocaveisSuppliers || []).find(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
        const mainSupplier = (suppliers || []).find(s => cleanStr(s.cpf) === cleanPayloadCpf);
        
        const supplier = mainSupplier || ppaisProducer || pereciveisSupplier || estocavelSupplier;

        const lotId = `lot-${Date.now()}`;
        const entryDate = payload.invoiceDate || payload.date || new Date().toISOString().split('T')[0];
        const entry: any = {
            id: newRef.key || `ent-${Date.now()}`,
            type: 'entrada',
            timestamp: new Date().toISOString(),
            date: entryDate,
            itemName: payload.itemName,
            supplierName: supplier?.name || 'Desconhecido',
            supplierCpf: payload.supplierCpf,
            lotNumber: payload.lotNumber || 'UNICO',
            quantity: Number(payload.quantity || 0),
            value: Number(payload.value || 0),
            barcode: payload.barcode || '',
            pdNumber: payload.pdNumber || '',
            lotId: lotId,
            deliveryId: '',
            invoiceUrl: finalInvoiceUrl
        };
        if (payload.invoiceNumber !== undefined) {
            entry.inboundInvoice = String(payload.invoiceNumber || '').trim();
        } else if (payload.inboundInvoice !== undefined) {
            entry.inboundInvoice = String(payload.inboundInvoice || '').trim();
        }
        if (payload.expirationDate !== undefined) entry.expirationDate = payload.expirationDate;

        await set(newRef, entry);

        // Sincronizar com as entregas do fornecedor para aparecer na Consulta de Notas Fiscais
        if (supplier) {
            const newDelivery = {
                id: `sync-${Date.now()}`,
                date: entryDate,
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                item: payload.itemName,
                kg: Number(payload.quantity || 0),
                value: Number(payload.value || 0),
                invoiceUploaded: true, // Se está registrando a entrada com NF, ela está "carregada" no sistema
                invoiceNumber: String(payload.invoiceNumber || '').trim(),
                barcode: payload.barcode || '',
                invoiceUrl: finalInvoiceUrl || '',
                pd: payload.pdNumber || '',
                status: 'CONCLUÍDO',
                lots: [{
                    id: lotId,
                    lotNumber: payload.lotNumber || 'UNICO',
                    initialQuantity: Number(payload.quantity || 0),
                    remainingQuantity: Number(payload.quantity || 0),
                    expirationDate: payload.expirationDate || ''
                }]
            };

            if (mainSupplier) {
                const deliveriesRef = child(suppliersRef, `${mainSupplier.cpf}/deliveries`);
                await runTransaction(deliveriesRef, (currentDeliveries) => {
                    let deliveries = Array.isArray(currentDeliveries) 
                        ? [...currentDeliveries] 
                        : (currentDeliveries ? Object.values(currentDeliveries) : []);
                    
                    // Remover agendamento pendente do mesmo dia
                    deliveries = deliveries.filter((d: any) => !(d.date === entryDate && d.item === 'AGENDAMENTO PENDENTE'));
                    
                    deliveries.push(newDelivery as any);
                    return deliveries;
                });
            } else {
                // Determine which list and index the producer belongs to
                let listKey: string | null = null;
                let producerIdx = -1;

                const ppList = perCapitaConfig.ppaisProducers || [];
                producerIdx = ppList.findIndex(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
                if (producerIdx !== -1) {
                    listKey = 'ppaisProducers';
                } else {
                    const perecList = perCapitaConfig.pereciveisSuppliers || [];
                    producerIdx = perecList.findIndex(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
                    if (producerIdx !== -1) {
                        listKey = 'pereciveisSuppliers';
                    } else {
                        const estocList = perCapitaConfig.estocaveisSuppliers || [];
                        producerIdx = estocList.findIndex(p => (cleanStr(p.cpfCnpj || p.cpf) === cleanPayloadCpf));
                        if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
                    }
                }

                if (listKey && producerIdx !== -1) {
                    // Update only the specific producer's deliveries to avoid locking the entire config
                    const producerDeliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
                    await runTransaction(producerDeliveriesRef, (currentDeliveries) => {
                        let deliveries = Array.isArray(currentDeliveries) 
                            ? [...currentDeliveries] 
                            : (currentDeliveries ? Object.values(currentDeliveries) : []);
                        
                        // Remover agendamento pendente do mesmo dia
                        deliveries = deliveries.filter((d: any) => !(d.date === entryDate && d.item === 'AGENDAMENTO PENDENTE'));
                        
                        deliveries.push(newDelivery);
                        return deliveries;
                    });
                }
            }
        }

        return { success: true, message: 'Entrada registrada', invoiceUrl: finalInvoiceUrl };
    } catch (e) {
        console.error('Erro ao registrar entrada (tentando modo offline):', e);
        
        const offlineEntry = {
            ...payload,
            id: `off-ent-${Date.now()}`,
            timestamp: new Date().toISOString(),
            date: payload.invoiceDate || new Date().toISOString().split('T')[0],
            isOffline: true,
            type: 'entrada'
        };

        try {
            const currentOffline = JSON.parse(localStorage.getItem('offline_warehouse_entries') || '[]');
            currentOffline.push(offlineEntry);
            const saved = safeLocalStorageSetItem('offline_warehouse_entries', JSON.stringify(currentOffline));
            if (!saved) {
                return { success: false, message: 'Erro ao salvar offline: Limite de armazenamento local excedido.' };
            }
            return { success: true, message: 'Registrado offline com sucesso! Use o Módulo de Sincronização via Pendrive.' };
        } catch (storageError) {
            return { success: false, message: 'Erro ao salvar offline: ' + (storageError instanceof Error ? storageError.message : String(storageError)) };
        }
    }
  };

  const handleRegisterWarehouseWithdrawal = async (payload: any) => {
    console.log("Iniciando registro de saída:", payload.itemName, "Quantidade:", payload.quantity);
    try {
        const newRef = push(warehouseLogRef);
        
        // Find supplier in both lists
        const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
        const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
        const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
        const mainSupplier = suppliers.find(s => s.cpf === payload.supplierCpf);
        
        const supplier = mainSupplier || ppaisProducer || pereciveisSupplier || estocavelSupplier;
        
        // --- Atualiza o saldo no lote do fornecedor ---
        if (supplier) {
            let updatedLotQty = 0;
            let transactionCommitted = false;

            if (mainSupplier) {
                console.log("Atualizando fornecedor principal via transação...");
                const deliveriesPath = `${mainSupplier.cpf}/deliveries`;
                const deliveriesRef = child(suppliersRef, deliveriesPath);
                
                const transactionResult = await runTransaction(deliveriesRef, (currentDeliveries) => {
                    if (currentDeliveries) {
                        const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                        let found = false;
                        const updatedDeliveries = deliveries.map(d => {
                            if (d.item === payload.itemName && String(d.invoiceNumber) === String(payload.inboundInvoice)) {
                                if (d.lots) {
                                    const lotIndex = d.lots.findIndex((l: any) => l.lotNumber === payload.lotNumber);
                                    if (lotIndex !== -1) {
                                        updatedLotQty = (d.lots[lotIndex].remainingQuantity || 0) - payload.quantity;
                                        d.lots[lotIndex].remainingQuantity = updatedLotQty;
                                        found = true;
                                    }
                                }
                            }
                            return d;
                        });
                        
                        if (found) return updatedDeliveries;
                    }
                    return; // Abort
                });
                transactionCommitted = transactionResult.committed;
            } else {
                console.log("Atualizando produtor PerCapita via transação específica...");
                // Determine which list and index the producer belongs to
                let listKey: 'ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers' | null = null;
                let producerIdx = -1;

                if (perCapitaConfig.ppaisProducers) {
                    producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
                    if (producerIdx !== -1) listKey = 'ppaisProducers';
                }
                if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
                    producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
                    if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
                }
                if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
                    producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => (p.cpfCnpj === payload.supplierCpf || p.cpf === payload.supplierCpf));
                    if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
                }

                if (listKey && producerIdx !== -1) {
                    const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
                    const transactionResult = await runTransaction(deliveriesRef, (currentDeliveries) => {
                        if (currentDeliveries) {
                            const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                            let found = false;
                            const updatedDeliveries = deliveries.map(d => {
                                if (d.item === payload.itemName && String(d.invoiceNumber) === String(payload.inboundInvoice)) {
                                    if (d.lots) {
                                        const lotIndex = d.lots.findIndex((l: any) => l.lotNumber === payload.lotNumber);
                                        if (lotIndex !== -1) {
                                            updatedLotQty = (d.lots[lotIndex].remainingQuantity || 0) - payload.quantity;
                                            d.lots[lotIndex].remainingQuantity = updatedLotQty;
                                            found = true;
                                        }
                                    }
                                }
                                return d;
                            });
                            if (found) return updatedDeliveries;
                        }
                        return;
                    });
                    transactionCommitted = transactionResult.committed;
                }
            }
            
            if (!transactionCommitted) {
                console.warn("Transação de baixa falhou ou foi abortada.");
                return { success: false, message: 'Falha ao processar a baixa no estoque. Verifique se o lote e item estão corretos.' };
            }
            payload.remainingQuantity = updatedLotQty;
        }

        const exit: any = {
            id: newRef.key || `sai-${Date.now()}`,
            type: 'saída',
            timestamp: new Date().toISOString(),
            date: payload.date || new Date().toISOString().split('T')[0],
            itemName: payload.itemName,
            supplierName: supplier?.name || 'Desconhecido',
            lotNumber: payload.lotNumber || 'SAIDA_AVULSA',
            quantity: payload.quantity,
            barcode: payload.barcode || '',
            lotId: '',
            deliveryId: ''
        };
        if (payload.inboundInvoice !== undefined) exit.inboundInvoice = payload.inboundInvoice;
        if (payload.outboundInvoice !== undefined) {
            exit.outboundInvoice = payload.outboundInvoice;
        } else if (payload.invoiceNumber !== undefined) {
            exit.outboundInvoice = payload.invoiceNumber;
        }
        if (payload.expirationDate !== undefined) exit.expirationDate = payload.expirationDate;

        await set(newRef, exit);
        console.log("Saída registrada com sucesso no log.");
        return { success: true, message: 'Saída registrada' };
    } catch (e) {
        console.error('Erro ao registrar saída (tentando modo offline):', e);
        // ... (rest of offline logic)

        const offlineWithdrawal = {
            ...payload,
            id: `off-sai-${Date.now()}`,
            timestamp: new Date().toISOString(),
            date: payload.date || new Date().toISOString().split('T')[0],
            isOffline: true,
            type: 'saída'
        };

        try {
            const currentOffline = JSON.parse(localStorage.getItem('offline_warehouse_entries') || '[]');
            currentOffline.push(offlineWithdrawal);
            const saved = safeLocalStorageSetItem('offline_warehouse_entries', JSON.stringify(currentOffline));
            if (!saved) {
                return { success: false, message: 'Erro ao salvar offline: Limite de armazenamento local excedido.' };
            }
            return { success: true, message: 'Registrado offline com sucesso! Use o Módulo de Sincronização via Pendrive.' };
        } catch (storageError) {
             return { success: false, message: 'Erro ao registrar offline: ' + (storageError instanceof Error ? storageError.message : String(storageError)) };
        }
    }
  };

  const handleResetWarehouseExits = async () => {
    try {
      const snapshot = await get(warehouseLogRef);
      const data = snapshot.val();
      if (data) {
        const updates: any = {};
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          if (value.type === 'saída') {
            updates[key] = null;
          }
        });
        await update(warehouseLogRef, updates);
      }
      return { success: true, message: 'Registros de saída zerados com sucesso.' };
    } catch (e: any) {
      return { success: false, message: 'Falha ao zerar registros de saída.', detail: e.message };
    }
  };

  const handleDeleteWarehouseEntry = async (l: WarehouseMovement) => {
      // Se for saída, devolve a quantidade para o saldo do lote
      if (l.type === 'saída' || l.type === 'saida') {
        const mainSupplier = suppliers.find(s => s.cpf === l.supplierCpf);
        const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
        const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
        const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
          
        if (mainSupplier) {
            const deliveriesRef = child(suppliersRef, `${mainSupplier.cpf}/deliveries`);
            await runTransaction(deliveriesRef, (currentDeliveries) => {
                if (currentDeliveries) {
                    const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                    let found = false;
                    const updatedDeliveries = deliveries.map(d => {
                        if (d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice || l.invoiceNumber || '')) {
                            if (d.lots) {
                                const lotIndex = d.lots.findIndex((lotItem: any) => lotItem.lotNumber === l.lotNumber);
                                if (lotIndex !== -1) {
                                    d.lots[lotIndex].remainingQuantity = (d.lots[lotIndex].remainingQuantity || 0) + l.quantity;
                                    found = true;
                                }
                            }
                        }
                        return d;
                    });
                    if (found) return updatedDeliveries;
                }
                return; // Abort
            });
        } else if (ppaisProducer || pereciveisSupplier || estocavelSupplier) {
            let listKey: 'ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers' | null = null;
            let producerIdx = -1;

            if (perCapitaConfig.ppaisProducers) {
                producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
                if (producerIdx !== -1) listKey = 'ppaisProducers';
            }
            if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
                producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
                if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
            }
            if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
                producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
                if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
            }

            if (listKey && producerIdx !== -1) {
                const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
                await runTransaction(deliveriesRef, (currentDeliveries) => {
                    if (currentDeliveries) {
                        const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                        let found = false;
                        const updatedDeliveries = deliveries.map(d => {
                            if (d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice || l.invoiceNumber || '')) {
                                if (d.lots) {
                                    const lotIndex = d.lots.findIndex((lotItem: any) => lotItem.lotNumber === l.lotNumber);
                                    if (lotIndex !== -1) {
                                        d.lots[lotIndex].remainingQuantity = (d.lots[lotIndex].remainingQuantity || 0) + l.quantity;
                                        found = true;
                                    }
                                }
                            }
                            return d;
                        });
                        if (found) return updatedDeliveries;
                    }
                    return;
                });
            }
        }
      } else if (l.type === 'entrada') {
          // Se for entrada, remove a entrega correspondente do fornecedor
          const mainSupplier = suppliers.find(s => s.cpf === l.supplierCpf);
          const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
          const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);
          const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf);

          if (mainSupplier) {
              const sRef = child(suppliersRef, mainSupplier.cpf);
              await runTransaction(sRef, (currentData: Supplier) => {
                  if (currentData && currentData.deliveries) {
                      currentData.deliveries = currentData.deliveries.filter(d => 
                          !(d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice || l.invoiceNumber || '') && d.barcode === l.barcode)
                      );
                  }
                  return currentData;
              });
          } else if (ppaisProducer || pereciveisSupplier || estocavelSupplier) {
              const targetSupplier = (ppaisProducer || pereciveisSupplier || estocavelSupplier)!;
              const targetCpf = targetSupplier.cpfCnpj || targetSupplier.cpf;
              await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
                  if (currentData) {
                      const updateInList = (list: any[] | undefined) => {
                          if (!list) return false;
                          const s = list.find(p => (p.cpfCnpj === targetCpf || p.cpf === targetCpf));
                          if (s && s.deliveries) {
                              s.deliveries = s.deliveries.filter((d: any) => 
                                  !(d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice || l.invoiceNumber || '') && d.barcode === l.barcode)
                              );
                              return true;
                          }
                          return false;
                      };
                      if (updateInList(currentData.ppaisProducers) || 
                          updateInList(currentData.pereciveisSuppliers) || 
                          updateInList(currentData.estocaveisSuppliers)) {
                          return currentData;
                      }
                  }
                  return;
              });
          }
      }
      await remove(child(warehouseLogRef, l.id));
      return { success: true, message: 'Excluído e saldo atualizado' };
  };

  const handleUpdateWarehouseEntry = async (l: WarehouseMovement) => {
      await set(child(warehouseLogRef, l.id), l);
      
      // --- NOVO: Sincronizar com as entregas do fornecedor ---
      if (l.type === 'entrada') {
          const mainSupplier = suppliers.find(s => s.cpf === l.supplierCpf);
          if (mainSupplier) {
              const sRef = child(suppliersRef, mainSupplier.cpf);
              await runTransaction(sRef, (currentData: Supplier) => {
                  if (currentData && currentData.deliveries) {
                      currentData.deliveries = currentData.deliveries.map(d => {
                          // Tenta encontrar a entrega correspondente. 
                          // Como o ID pode não bater (sync- vs manual-), usamos critérios
                          if (String(d.invoiceNumber) === String(l.inboundInvoice) && d.item === l.itemName && d.barcode === l.barcode) {
                              return {
                                  ...d,
                                  kg: l.quantity,
                                  value: l.value,
                                  lots: d.lots.map(lot => lot.id === (l as any).lotId ? { ...lot, initialQuantity: l.quantity, lotNumber: l.lotNumber } : lot)
                              };
                          }
                          return d;
                      });
                  }
                  return currentData;
              });
          } else {
              await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
                  if (currentData) {
                      const updateList = (list: any[] | undefined) => {
                          const s = list?.find(p => (p.cpfCnpj === l.supplierCpf || p.cpf === l.supplierCpf));
                          if (s && s.deliveries) {
                              s.deliveries = s.deliveries.map((d: any) => {
                                  if (String(d.invoiceNumber) === String(l.inboundInvoice) && d.item === l.itemName && d.barcode === l.barcode) {
                                      return {
                                          ...d,
                                          kg: l.quantity,
                                          value: l.value,
                                          lots: d.lots.map((lot: any) => lot.id === (l as any).lotId ? { ...lot, initialQuantity: l.quantity, lotNumber: l.lotNumber } : lot)
                                      };
                                  }
                                  return d;
                              });
                              return true;
                          }
                          return false;
                      };
                      if (!updateList(currentData.ppaisProducers)) {
                          updateList(currentData.pereciveisSuppliers);
                      }
                  }
                  return currentData;
              });
          }
      }

      return { success: true, message: 'Atualizado' };
  };

  const combinedSuppliers = React.useMemo(() => {
    return getCombinedSuppliers(suppliers, perCapitaConfig);
  }, [suppliers, perCapitaConfig]);

  const renderContent = () => {
    console.log("renderContent called, hasError:", hasError, "user:", user);
    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
          <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl text-center max-w-md">
            <div className="bg-indigo-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Erro de Transmissão</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-8">
              Ocorreu um erro ao carregar o seu perfil. Isso pode ser causado por oscilação na rede ou inconsistência nos dados de cache.
            </p>
            <div className="bg-black/20 p-4 rounded-2xl mb-8 border border-white/5">
              <p className="text-[10px] font-mono text-slate-500 break-all">{errorDetails || 'Error code: 0x882'}</p>
            </div>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              className="w-full bg-indigo-600 text-white font-black py-4 px-8 rounded-2xl text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-900/40"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );
    }

    try {
      if (!user) {
        return <LoginScreen onLogin={handleLogin} publicInfoList={publicInfo} />;
      }

    if (user.role === 'admin') {
      return (
        <AdminDashboard 
          user={user}
          suppliers={combinedSuppliers} 
          onRegister={handleRegisterSupplier}
          onSyncPPAISToAgenda={handleSyncPPAISToAgenda}
          onUpdateSupplier={handleUpdateSupplier}
          onUpdateSupplierObservations={handleUpdateSupplierObservations}
          onDeleteDelivery={handleDeleteDelivery}
          onUpdateDelivery={handleUpdateDelivery}
          onSaveInvoice={handleSaveInvoice}
          onLogout={handleLogout}
          warehouseLog={warehouseLog}
          perCapitaConfig={perCapitaConfig}
          onUpdatePerCapitaConfig={handleUpdatePerCapitaConfig}
          cleaningLogs={cleaningLogs}
          onRegisterCleaningLog={async (l) => {
              const r = push(cleaningLogsRef);
              await set(r, { ...l, id: r.key });
              return { success: true, message: 'Ok' };
          }}
          onDeleteCleaningLog={async (id) => remove(child(cleaningLogsRef, id))}
          epiLogs={epiLogs}
          onRegisterEpi={async (l) => {
              const r = push(epiLogsRef);
              await set(r, { ...l, id: r.key });
              return { success: true, message: 'Ok' };
          }}
          onDeleteEpi={async (id) => remove(child(epiLogsRef, id))}
          financialRecords={financialRecords}
          onSaveFinancialRecord={async (rec) => {
              const id = rec.id || push(financialRecordsRef).key;
              await set(child(financialRecordsRef, id!), { ...rec, id });
              return { success: true };
          }}
          onDeleteFinancialRecord={async (id) => remove(child(financialRecordsRef, id))}
          thirdPartyEntries={thirdPartyEntries}
          onRegisterThirdPartyEntry={async (l) => {
              const r = push(thirdPartyEntriesRef);
              await set(r, { ...l, id: r.key });
              return { success: true, message: 'Ok' };
          }}
          onUpdateThirdPartyEntry={async (log) => {
              await set(child(thirdPartyEntriesRef, log.id), log);
              return { success: true, message: 'Atualizado' };
          }}
          onDeleteThirdPartyEntry={async (id) => remove(child(thirdPartyEntriesRef, id))}
          vehicleExitOrders={vehicleExitOrders}
          onRegisterVehicleExitOrder={async (order) => {
              const r = push(vehicleExitOrdersRef);
              await set(r, { ...order, id: r.key });
              return { success: true, message: 'Ordem de Saída registrada com sucesso!' };
          }}
          onUpdateVehicleExitOrder={async (order) => {
              await set(child(vehicleExitOrdersRef, order.id), order);
              return { success: true, message: 'Ordem de Saída atualizada com sucesso!' };
          }}
          onDeleteVehicleExitOrder={async (id) => {
              console.log("Deleting vehicle exit order (AdminDashboard) with ID:", id);
              await remove(child(vehicleExitOrdersRef, id));
              return { success: true, message: 'Ordem de saída excluída com sucesso!' };
          }}
          vehicleAssets={vehicleAssets}
          onRegisterVehicleAsset={async (asset) => {
              const r = push(vehicleAssetsRef);
              await set(r, { ...asset, id: r.key });
              return { success: true, message: 'Veículo registrado' };
          }}
          onUpdateVehicleAsset={async (asset) => {
              await set(child(vehicleAssetsRef, asset.id), asset);
              return { success: true, message: 'Veículo atualizado' };
          }}
          onDeleteVehicleAsset={async (id) => remove(child(vehicleAssetsRef, id))}
          driverAssets={driverAssets}
          onRegisterDriverAsset={async (asset) => {
              const r = push(driverAssetsRef);
              await set(r, { ...asset, id: r.key });
              return { success: true, message: 'Motorista/Acompanhante registrado' };
          }}
          onUpdateDriverAsset={async (asset) => {
              await set(child(driverAssetsRef, asset.id), asset);
              return { success: true, message: 'Motorista/Acompanhante atualizado' };
          }}
          onDeleteDriverAsset={async (id) => remove(child(driverAssetsRef, id))}
          onCancelDeliveries={handleCancelDeliveries}
          onUpdateContractForItem={handleUpdateContractForItem}
          onUpdateAcquisitionItem={handleUpdateAcquisitionItem}
          onDeleteAcquisitionItem={handleDeleteAcquisitionItem}
          acquisitionItems={acquisitionItems}
          directorPerCapita={directorPerCapita}
          directorWithdrawals={directorWithdrawals}
          onRegisterDirectorWithdrawal={async (log) => {
               const newRef = push(directorWithdrawalsRef);
               await set(newRef, { ...log, id: newRef.key });
               return { success: true, message: 'Ok' };
          }}
          onDeleteDirectorWithdrawal={async (id) => {
            if (id.startsWith('pedido_') && directorPerCapita) {
              const paths = [
                ['chefeDep', 'history'],
                ['chefeDep', 'limpezaHistory'],
                ['chefeSeg', 'history'],
                ['chefeSeg', 'limpezaHistory'],
              ];
              for (const [dep, hKey] of paths) {
                if (directorPerCapita[dep] && directorPerCapita[dep][hKey] && directorPerCapita[dep][hKey][id]) {
                  await remove(child(directorPerCapitaRef, `${dep}/${hKey}/${id}`));
                  return;
                }
              }
            }
            await remove(child(directorWithdrawalsRef, id));
          }}
          standardMenu={standardMenu}
          dailyMenus={dailyMenus}
          serviceOrders={serviceOrders}
          maintenanceSchedules={maintenanceSchedules}
          onUpdateServiceOrder={handleUpdateServiceOrder}
          onDeleteServiceOrder={handleDeleteServiceOrder}
          onRegisterMaintenanceSchedule={async (schedule) => {
            const r = push(maintenanceSchedulesRef);
            await set(r, { ...schedule, id: r.key });
            return { success: true, message: 'Agendamento registrado' };
          }}
          onUpdateMaintenanceSchedule={handleUpdateMaintenanceSchedule}
          onDeleteMaintenanceSchedule={handleDeleteMaintenanceSchedule}
          vehicleInspections={vehicleInspections}
          onRegisterVehicleInspection={async (inspection) => {
            const r = push(vehicleInspectionsRef);
            await set(r, { ...inspection, id: r.key });
            return { success: true, message: 'Inspeção registrada' };
          }}
          onUpdateVehicleInspection={async (inspection) => {
            await set(child(vehicleInspectionsRef, inspection.id), inspection);
            return { success: true, message: 'Inspeção atualizada' };
          }}
          onDeleteVehicleInspection={async (id) => remove(child(vehicleInspectionsRef, id))}
          onUpdateStandardMenu={handleUpdateStandardMenu}
          onUpdateDailyMenu={handleUpdateDailyMenu}
          onRegisterEntry={handleRegisterWarehouseEntry}
          onRegisterWithdrawal={handleRegisterWarehouseWithdrawal}
          onReopenInvoice={handleReopenInvoice}
          onDeleteInvoice={async (supplierCpf, invoiceNumber) => {
            await handleDeleteInvoice(supplierCpf, invoiceNumber);
          }}
          onUpdateInvoiceItems={handleUpdateInvoiceItems}
          onUpdateInvoiceUrl={handleUpdateInvoiceUrl}
          onManualInvoiceEntry={handleManualInvoiceEntry}
          onMarkInvoiceAsOpened={handleMarkInvoiceAsOpened}
          onDeleteWarehouseEntry={handleDeleteWarehouseEntry}
          onUpdateWarehouseEntry={handleUpdateWarehouseEntry}
          onPersistSuppliers={() => {}}
          onRestoreData={async () => true}
          onRestoreFullBackup={handleRestoreFullBackup}
          onResetData={async () => { await set(rootRef, null); }}
          registrationStatus={null}
          onClearRegistrationStatus={() => {}}
          validationRoles={validationRoles}
          systemPasswords={systemPasswords}
          onUpdateSystemPassword={async (key, pass) => {
            await set(child(systemPasswordsRef, key), pass);
          }}
          publicInfo={publicInfo}
          onSavePublicInfo={handleSavePublicInfo}
          onDeletePublicInfo={handleDeletePublicInfo}
        />
      );
    }

    if (user.role === 'financeiro') {
      return <FinanceDashboard 
               records={financialRecords} 
               onLogout={handleLogout} 
               user={user}
               standardMenu={standardMenu}
               dailyMenus={dailyMenus}
               suppliers={combinedSuppliers}
               thirdPartyEntries={thirdPartyEntries}
               vehicleExitOrders={vehicleExitOrders}
               vehicleAssets={vehicleAssets}
               driverAssets={driverAssets}
               validationRoles={validationRoles}
               directorPerCapita={directorPerCapita}
               onUpdateDirectorPerCapita={handleUpdateDirectorPerCapita}
               warehouseLog={warehouseLog}
               perCapitaConfig={perCapitaConfig}
               epiLogs={epiLogs}
               acquisitionItems={acquisitionItems}
             />;
    }

    if (user.role === 'cardapio') {
      return <MenuDashboard standardMenu={standardMenu} dailyMenus={dailyMenus} suppliers={combinedSuppliers} onLogout={handleLogout} />;
    }

    if (user.role === 'almoxarifado') {
      return <AlmoxarifadoDashboard 
               currentUser={user}
               suppliers={combinedSuppliers || []} 
               warehouseLog={warehouseLog || []} 
               onLogout={handleLogout} 
               publicInfoList={publicInfo || []}
               onRegisterEntry={handleRegisterWarehouseEntry} 
               onRegisterWithdrawal={handleRegisterWarehouseWithdrawal} 
               onResetExits={handleResetWarehouseExits}
               onReopenInvoice={handleReopenInvoice}
               onUpdateInvoiceItems={handleUpdateInvoiceItems}
               onUpdateInvoiceUrl={handleUpdateInvoiceUrl}
               onManualInvoiceEntry={handleManualInvoiceEntry}
               onMarkInvoiceAsOpened={handleMarkInvoiceAsOpened}
               onDeleteWarehouseEntry={handleDeleteWarehouseEntry}
               onUpdateWarehouseEntry={handleUpdateWarehouseEntry}
               onDeleteInvoice={handleDeleteInvoice}
               onDeleteDelivery={handleDeleteDelivery}
               onUpdateDelivery={handleUpdateDelivery}
               onSaveInvoice={handleSaveInvoice}
               thirdPartyEntries={thirdPartyEntries || []}
               perCapitaConfig={perCapitaConfig || {}}
               acquisitionItems={acquisitionItems || []}
               onRegisterThirdPartyEntry={async (l) => {
                   const r = push(thirdPartyEntriesRef);
                   await set(r, { ...l, id: r.key });
                   return { success: true, message: 'Ok' };
               }}
               onUpdateThirdPartyEntry={async (log) => {
                   await set(child(thirdPartyEntriesRef, log.id), log);
                   return { success: true, message: 'Atualizado' };
               }}
               onDeleteThirdPartyEntry={async (id) => remove(child(thirdPartyEntriesRef, id))}
               vehicleExitOrders={vehicleExitOrders}
               onRegisterVehicleExitOrder={async (order) => {
                   const r = push(vehicleExitOrdersRef);
                   const id = r.key || `order-${Date.now()}`;
                   await set(r, { ...order, id });
                   return { success: true, message: 'Ok', id };
               }}
               onUpdateVehicleExitOrder={async (order) => {
                   await set(child(vehicleExitOrdersRef, order.id), order);
                   return { success: true, message: 'Atualizado' };
               }}
               onDeleteVehicleExitOrder={undefined}
               vehicleAssets={vehicleAssets}
               onRegisterVehicleAsset={async (asset) => {
                   const r = push(vehicleAssetsRef);
                   await set(r, { ...asset, id: r.key });
                   return { success: true, message: 'Veículo registrado' };
               }}
               onUpdateVehicleAsset={async (asset) => {
                   await set(child(vehicleAssetsRef, asset.id), asset);
                   return { success: true, message: 'Veículo atualizado' };
               }}
               onDeleteVehicleAsset={async (id) => remove(child(vehicleAssetsRef, id))}
               driverAssets={driverAssets}
               onRegisterDriverAsset={async (asset) => {
                   const r = push(driverAssetsRef);
                   await set(r, { ...asset, id: r.key });
                   return { success: true, message: 'Motorista/Acompanhante registrado' };
               }}
               onUpdateDriverAsset={async (asset) => {
                   await set(child(driverAssetsRef, asset.id), asset);
                   return { success: true, message: 'Motorista/Acompanhante atualizado' };
               }}
               onDeleteDriverAsset={async (id) => remove(child(driverAssetsRef, id))}
               validationRoles={validationRoles}
               standardMenu={standardMenu}
               dailyMenus={dailyMenus}
               onUpdateStandardMenu={handleUpdateStandardMenu}
               onUpdateDailyMenu={handleUpdateDailyMenu}
               directorPerCapita={directorPerCapita}
               onUpdateDirectorPerCapita={handleUpdateDirectorPerCapita}
             />;
    }

    if (user.role === 'julio') {
      return (
        <JulioDashboard
          vehicleExitOrders={vehicleExitOrders}
          vehicleInspections={vehicleInspections}
          driverAssets={driverAssets}
          vehicleAssets={vehicleAssets}
          validationRoles={validationRoles}
          serviceOrders={serviceOrders}
          maintenanceSchedules={maintenanceSchedules}
          onUpdateServiceOrder={handleUpdateServiceOrder}
          onDeleteServiceOrder={handleDeleteServiceOrder}
          onRegisterMaintenanceSchedule={handleRegisterMaintenanceSchedule}
          onUpdateMaintenanceSchedule={handleUpdateMaintenanceSchedule}
          onDeleteMaintenanceSchedule={handleDeleteMaintenanceSchedule}
          onLogout={handleLogout}
          onRegisterVehicleExitOrder={async (order) => {
            const r = push(vehicleExitOrdersRef);
            await set(r, { ...order, id: r.key });
            return { success: true, message: 'Ordem de saída registrada' };
          }}
          onUpdateVehicleExitOrder={async (order) => {
            await set(child(vehicleExitOrdersRef, order.id), order);
            return { success: true, message: 'Ordem de saída atualizada' };
          }}
          onDeleteVehicleExitOrder={async (id) => {
            console.log("Deleting vehicle exit order (JulioDashboard) with ID:", id);
            await remove(child(vehicleExitOrdersRef, id));
            return { success: true, message: 'Ordem de saída excluída' };
          }}
          onRegisterDriverAsset={async (s) => {
            const r = push(driverAssetsRef);
            await set(r, { ...s, id: r.key });
            return { success: true, message: 'Servidor registrado' };
          }}
          onUpdateDriverAsset={async (s) => {
            await set(child(driverAssetsRef, s.id), s);
            return { success: true, message: 'Servidor atualizado' };
          }}
          onDeleteDriverAsset={async (id) => {
            await remove(child(driverAssetsRef, id));
            return { success: true, message: 'Servidor excluído' };
          }}
          onRegisterVehicleAsset={async (v) => {
            const r = push(vehicleAssetsRef);
            await set(r, { ...v, id: r.key });
            return { success: true, message: 'Veículo registrado' };
          }}
          onUpdateVehicleAsset={async (v) => {
            await set(child(vehicleAssetsRef, v.id), v);
            return { success: true, message: 'Veículo atualizado' };
          }}
          onDeleteVehicleAsset={async (id) => {
            await remove(child(vehicleAssetsRef, id));
            return { success: true, message: 'Veículo excluído' };
          }}
          onRegisterValidationRole={async (vr) => {
            const r = push(validationRolesRef);
            await set(r, { ...vr, id: r.key });
            return { success: true, message: 'Cargo de validação registrado' };
          }}
          onUpdateValidationRole={async (vr) => {
            await set(child(validationRolesRef, vr.id), vr);
            return { success: true, message: 'Cargo de validação atualizado' };
          }}
          onDeleteValidationRole={async (id) => {
            await remove(child(validationRolesRef, id));
            return { success: true, message: 'Cargo excluído' };
          }}
          onRegisterVehicleInspection={async (inspection) => {
            const r = push(vehicleInspectionsRef);
            await set(r, { ...inspection, id: r.key });
            return { success: true, message: 'Inspeção registrada' };
          }}
          onUpdateVehicleInspection={async (inspection) => {
            await set(child(vehicleInspectionsRef, inspection.id), inspection);
            return { success: true, message: 'Inspeção atualizada' };
          }}
          onDeleteVehicleInspection={async (id) => {
            await remove(child(vehicleInspectionsRef, id));
            return { success: true, message: 'Inspeção excluída' };
          }}
        />
      );
    }

    if (user.role === 'itesp') {
      return <ItespDashboard suppliers={combinedSuppliers} warehouseLog={warehouseLog} perCapitaConfig={perCapitaConfig} onLogout={handleLogout} />;
    }

    if (user.role === 'subportaria') {
      return (
        <SubportariaDashboard 
          suppliers={combinedSuppliers} 
          perCapitaConfig={perCapitaConfig}
          thirdPartyEntries={thirdPartyEntries}
          maintenanceSchedules={maintenanceSchedules}
          serviceOrders={serviceOrders}
          publicInfoList={publicInfo}
          onUpdateMaintenanceSchedule={async (id, updates) => {
            return await handleUpdateMaintenanceSchedule(id, updates);
          }}
          onUpdateThirdPartyEntry={async (log) => {
            await set(child(thirdPartyEntriesRef, log.id), log);
            return { success: true, message: 'Atualizado' };
          }}
          onLogout={handleLogout} 
          vehicleExitOrders={vehicleExitOrders}
          vehicleAssets={vehicleAssets}
          driverAssets={driverAssets}
          validationRoles={validationRoles}
          onUpdateVehicleExitOrder={async (order) => {
            await set(child(vehicleExitOrdersRef, order.id), order);
            return { success: true, message: 'Atualizado' };
          }}
          onDeleteThirdPartyEntry={async (id) => {
            await remove(child(thirdPartyEntriesRef, id));
            return { success: true, message: 'Excluído' };
          }}
          systemPasswords={systemPasswords}
          onUpdateSystemPassword={async (key: string, value: string) => {
            await update(systemPasswordsRef, { [key]: value });
          }}
        />
      );
    }

    if (user.role === 'ordem_servico') {
      return (
        <ServiceOrderDashboard
          serviceOrders={serviceOrders}
          maintenanceSchedules={maintenanceSchedules}
          publicInfoList={publicInfo}
          onRegisterServiceOrder={handleRegisterServiceOrder}
          onLogout={handleLogout}
        />
      );
    }

    if (user.role === 'infraestrutura' || user.role === 'ordem_saida') {
      return (
        <VehicleOrderDashboard 
          orders={vehicleExitOrders}
          vehicleAssets={vehicleAssets}
          driverAssets={driverAssets}
          validationRoles={validationRoles}
          serviceOrders={serviceOrders}
          maintenanceSchedules={maintenanceSchedules}
          vehicleInspections={vehicleInspections}
          onUpdateServiceOrder={handleUpdateServiceOrder}
          onDeleteServiceOrder={handleDeleteServiceOrder}
          onRegisterMaintenanceSchedule={handleRegisterMaintenanceSchedule}
          onUpdateMaintenanceSchedule={handleUpdateMaintenanceSchedule}
          onDeleteMaintenanceSchedule={handleDeleteMaintenanceSchedule}
          onRegister={async (order) => {
            const r = push(vehicleExitOrdersRef);
            const id = r.key || `order-${Date.now()}`;
            await set(r, { ...order, id });
            return { success: true, message: 'Ok', id };
          }}
          onUpdate={async (order) => {
            await set(child(vehicleExitOrdersRef, order.id), order);
            return { success: true, message: 'Atualizado' };
          }}
          onDelete={async (id) => {
            await remove(child(vehicleExitOrdersRef, id));
            return { success: true, message: 'Ordem excluída' };
          }}
          onRegisterVehicleAsset={async (v) => {
            const r = push(vehicleAssetsRef);
            await set(r, { ...v, id: r.key });
            return { success: true, message: 'Ok' };
          }}
          onUpdateVehicleAsset={async (v) => {
            await set(child(vehicleAssetsRef, v.id), v);
            return { success: true, message: 'Atualizado' };
          }}
          onDeleteVehicleAsset={async (id) => {
            await remove(child(vehicleAssetsRef, id));
            return { success: true, message: 'Veículo excluído' };
          }}
          onRegisterDriverAsset={async (d) => {
            const r = push(driverAssetsRef);
            await set(r, { ...d, id: r.key });
            return { success: true, message: 'Ok' };
          }}
          onUpdateDriverAsset={async (d) => {
            await set(child(driverAssetsRef, d.id), d);
            return { success: true, message: 'Atualizado' };
          }}
          onDeleteDriverAsset={async (id) => {
            await remove(child(driverAssetsRef, id));
            return { success: true, message: 'Servidor excluído' };
          }}
          onRegisterVehicleInspection={async (inspection) => {
            const r = push(vehicleInspectionsRef);
            await set(r, { ...inspection, id: r.key });
            return { success: true, message: 'Inspeção registrada' };
          }}
          onUpdateVehicleInspection={async (inspection) => {
            await set(child(vehicleInspectionsRef, inspection.id), inspection);
            return { success: true, message: 'Inspeção atualizada' };
          }}
          onDeleteVehicleInspection={async (id) => {
            await remove(child(vehicleInspectionsRef, id));
            return { success: true, message: 'Inspeção excluída' };
          }}
          onValidateOrder={async (orderId, validatedBy, validationRole) => {
            const timestamp = new Date().toISOString();
            await update(child(vehicleExitOrdersRef, orderId), {
              validatedBy,
              validationRole,
              validationTimestamp: timestamp
            });
            return { success: true, message: 'Ordem validada' };
          }}
          onLogout={handleLogout}
          publicInfoList={publicInfo}
          role={user.role}
        />
      );
    }

    if (user.role === 'supplier') {
      const currentMonth = new Date().getMonth();
      const isMayOrLater = currentMonth >= 4; // 0-indexed, 4 is May
      
      const ppaisList = ensureArray<any>(perCapitaConfig?.ppaisProducers);
      const pereciveisList = ensureArray<any>(perCapitaConfig?.pereciveisSuppliers);
      const estocaveisList = ensureArray<any>(perCapitaConfig?.estocaveisSuppliers);
      
      // Try searching for the user in the per-capita lists
      const ppaisEntry = ppaisList.find((p: any) => p && p.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''));
      const pereciveisEntry = pereciveisList.find((p: any) => p && p.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''));
      const estocaveisEntry = estocaveisList.find((p: any) => p && p.cpfCnpj && String(p.cpfCnpj).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''));
      
      // Also check if they are in the main suppliers list
      const currentSupplier = suppliers.find(s => s && s.cpf && String(s.cpf).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''));
      
      const perCapitaEntry: any = ppaisEntry || pereciveisEntry || estocaveisEntry;
      const isRegisteredForNextPeriod = !!perCapitaEntry || !!currentSupplier;

      if (isMayOrLater && !isRegisteredForNextPeriod) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center max-w-md">
              <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Contrato Finalizado</h2>
              <p className="text-gray-500 text-sm font-medium">Seu contrato foi finalizado em Abril de 2026. Esta aba foi desativada conforme o novo planejamento.</p>
              <button onClick={handleLogout} className="mt-6 bg-red-600 text-white font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all">Sair do Sistema</button>
            </div>
          </div>
        );
      }

      if (currentSupplier) {
        // Calculate weeks from Per Capita if registered
        let finalWeeks = ensureArray<number>(currentSupplier.allowedWeeks).filter(w => w <= 18);
        
        console.log('--- Debug: PerCapitaEntry in scheduling ---', perCapitaEntry);
        if (isRegisteredForNextPeriod && perCapitaEntry?.monthlySchedule) {
            const year = 2026;
            const monthNames = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            const extraWeeks = new Set<number>();
            const schedule = perCapitaEntry.monthlySchedule || {};
            Object.entries(schedule).forEach(([monthName, weekOfMonthList]) => {
                const monthIndex = monthNames.indexOf(monthName.toLowerCase());
                if (monthIndex === -1) return;
                
                const weeksList = ensureArray<any>(weekOfMonthList);
                if (weeksList.length > 0) {
                    const firstDayOfMonth = new Date(year, monthIndex, 1);
                    const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                    
                    weeksList.forEach((weekIdx: any) => {
                        extraWeeks.add(firstWeekOfYear + (Number(weekIdx) - 1));
                    });
                }
            });
            finalWeeks = Array.from(new Set([...finalWeeks, ...Array.from(extraWeeks)])).sort((a, b) => a - b);
        }

        const pDeliveriesRaw = ensureArray<any>(perCapitaEntry?.deliveries);
        const extDeliveriesRaw = ensureArray<any>(currentSupplier.deliveries);
        const mergedDeliveries = Array.from(
          new Map<string, any>(
            [...pDeliveriesRaw, ...extDeliveriesRaw]
              .filter(d => d && d.id)
              .map(d => [String(d.id), d])
          ).values()
        );

         const supplierWithUpdatedData = {
          ...currentSupplier,
          deliveries: mergedDeliveries,
          allowedWeeks: finalWeeks,
          contractItems: perCapitaEntry?.contractItems || currentSupplier.contractItems || [],
          address: perCapitaEntry?.address || currentSupplier.address || '',
          city: perCapitaEntry?.city || currentSupplier.city || '',
          processNumber: perCapitaEntry?.processNumber || currentSupplier.processNumber || ''
        };

        return (
          <Dashboard 
            supplier={supplierWithUpdatedData} 
            isRegisteredForNextPeriod={isRegisteredForNextPeriod}
            monthlySchedule={perCapitaEntry?.monthlySchedule}
            onUpdateInvoiceUrl={handleUpdateInvoiceUrl}
            onLogout={handleLogout} 
            onScheduleDelivery={handleScheduleDelivery}
            onCancelDeliveries={handleCancelDeliveries}
            onSaveInvoice={handleSaveInvoice}
            emailModalData={null}
            onCloseEmailModal={() => {}}
          />
        );
      }
    }

    if (['producer', 'supplier', 'pereciveis_supplier', 'estocaveis_supplier', 'supplier_estocavel'].includes(user.role)) {
      const allPC = [
        ...ensureArray(perCapitaConfig?.ppaisProducers),
        ...ensureArray(perCapitaConfig?.pereciveisSuppliers),
        ...ensureArray(perCapitaConfig?.estocaveisSuppliers)
      ];
      
      const p = allPC.find(s => s && s.cpfCnpj && String(s.cpfCnpj).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''))
               || suppliers.find(s => s && s.cpf && String(s.cpf).replace(/\D/g, '') === String(user.cpf).replace(/\D/g, ''));

      if (p) {
        const pCpf = (p as any).cpfCnpj || (p as any).cpf || '';
        const existingSupplier = suppliers.find(s => s && s.cpf && String(s.cpf).replace(/\D/g, '') === String(pCpf).replace(/\D/g, ''));
        const q1Weeks = ensureArray<number>(existingSupplier?.allowedWeeks).filter(w => w <= 18);
        
        const weeks: number[] = [...q1Weeks];
        const year = 2026;
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        try {
          const schedule = p.monthlySchedule || {};
          Object.entries(schedule).forEach(([monthName, weekOfMonthList]) => {
              const monthIndex = monthNames.indexOf(monthName.toLowerCase());
              if (monthIndex === -1) return;

              const weeksList = ensureArray<any>(weekOfMonthList);
              if (weeksList.length > 0) {
                  const firstDayOfMonth = new Date(year, monthIndex, 1);
                  const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                  
                  weeksList.forEach((weekIdx: any) => {
                      const wVal = Number(String(weekIdx).replace(/\D/g, '')) || 0;
                      if (wVal > 0) {
                        weeks.push(firstWeekOfYear + (wVal - 1));
                      }
                  });
              }
          });
        } catch (err) {
          console.error("Error processing perCapita schedule for mapping:", err);
        }

        const finalWeeks = Array.from(new Set(weeks)).sort((a, b) => a - b);
        
        const pDeliveriesRaw = ensureArray<any>(p.deliveries);
        const extDeliveriesRaw = ensureArray<any>(existingSupplier?.deliveries);

        const safeParseNum = (val: any) => {
            if (typeof val === 'number') return val;
            const str = String(val || '0').replace(',', '.');
            const parsed = parseFloat(str);
            return isNaN(parsed) ? 0 : parsed;
        };

        const mappedSupplier: Supplier = {
          ...p,
          name: p.name || 'Produtor',
          cpf: pCpf,
          initialValue: ensureArray<any>(p.contractItems).reduce((acc: number, curr: any) => acc + (safeParseNum(curr.totalKg) * safeParseNum(curr.valuePerKg)), 0),
          contractItems: ensureArray<any>(p.contractItems),
          deliveries: Array.from(new Map<string, any>([...pDeliveriesRaw, ...extDeliveriesRaw].filter(d => d && d.id).map(d => [String(d.id), d])).values()),
          allowedWeeks: finalWeeks.length > 0 ? finalWeeks : [1, 2, 3, 4, 5],
          address: p.address || '',
          city: p.city || '',
          processNumber: p.processNumber || ''
        };
        return (
          <Dashboard 
            supplier={mappedSupplier} 
            type={(user.role === 'producer' || (p as any).type === 'PRODUTOR') ? 'PRODUTOR' : 'FORNECEDOR'}
            monthlySchedule={p.monthlySchedule}
            isRegisteredForNextPeriod={true}
            onUpdateInvoiceUrl={handleUpdateInvoiceUrl}
            onLogout={handleLogout} 
            onScheduleDelivery={handleScheduleDelivery}
            onCancelDeliveries={handleCancelDeliveries}
            onSaveInvoice={handleSaveInvoice}
            emailModalData={null}
            onCloseEmailModal={() => {}}
          />
        );
      }
    }
 else {
      // Role not recognized or not handled above
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">Módulo Indisponível</h2>
            <button onClick={handleLogout} className="bg-zinc-900 text-white px-6 py-2 rounded-lg">Voltar ao Login</button>
          </div>
        </div>
      );
    }

    const currentMonth = new Date().getMonth();
    const isMayOrLater = currentMonth >= 4;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-zinc-200 text-center max-w-md">
          <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </div>
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
            {isMayOrLater ? 'Acesso Encerrado' : 'Usuário não encontrado'}
          </h2>
          <p className="text-gray-500 text-sm font-medium">
            {isMayOrLater 
              ? 'Seu contrato foi finalizado em Abril de 2026 ou você não está na lista de cadastro vigente para o novo período.' 
              : 'Não foi possível localizar seu cadastro ou você não possui permissões para acessar esta área.'}
          </p>
          <button onClick={handleLogout} className="mt-6 bg-zinc-900 text-white font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest hover:bg-black transition-all">Voltar ao Início</button>
        </div>
      </div>
    );
    } catch (e: any) {
      console.error("RenderContent error:", e);
      if (!hasError) {
        setHasError(true);
        setErrorDetails(e?.message || String(e));
      }
      const errorDisplay = (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-red-200 text-center max-w-md">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Erro Inesperado</h2>
            <p className="text-gray-500 text-sm font-medium mb-4">Não foi possível processar a sua solicitação. Por favor, tente recarregar.</p>
            <button 
              onClick={() => { setHasError(false); window.location.reload(); }} 
              className="bg-zinc-900 text-white font-black py-3 px-8 rounded-xl text-[10px] uppercase tracking-widest hover:bg-black transition-all"
            >
              Recarregar Sistema
            </button>
          </div>
        </div>
      );

      return errorDisplay;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" richColors />
      {user && (
        <InfobarTicker 
          items={publicInfo.filter(info => !info.isConfidential)} 
          variant="light"
          label="Comunicados:"
        />
      )}
      <div className="flex-1 overflow-auto">
        {(() => {
          try {
            return renderContent();
          } catch (e: any) {
            console.error("Render error caught:", e);
            if (!hasError) {
              setHasError(true);
              setErrorDetails(e?.message || String(e));
            }
            return null;
          }
        })()}
      </div>
    </div>
  );
};

export default App;
