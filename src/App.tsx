
import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { Supplier, Delivery, WarehouseMovement, PerCapitaConfig, CleaningLog, DirectorPerCapitaLog, StandardMenu, DailyMenus, FinancialRecord, UserRole, ThirdPartyEntryLog, AcquisitionItem, VehicleExitOrder, VehicleAsset, DriverAsset, VehicleInspection, ServiceOrder, MaintenanceSchedule, PublicInfo, ValidationRole } from './types';
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
import { getDatabase, ref, onValue, set, runTransaction, push, child, update, remove, get, query, orderByChild, equalTo } from 'firebase/database';
import { ref as storageRef, getDownloadURL, uploadBytes } from 'firebase/storage';
import { app, storage } from './firebaseConfig';
import { getCombinedSuppliers } from './lib/supplierUtils';

let database: any;
let rootRef: any;
let suppliersRef: any;
let warehouseLogRef: any;
let perCapitaConfigRef: any;
let cleaningLogsRef: any;
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

try {
  database = getDatabase(app);
  rootRef = ref(database);
  suppliersRef = ref(database, 'suppliers');
  warehouseLogRef = ref(database, 'warehouseLog');
  perCapitaConfigRef = ref(database, 'perCapitaConfig');
  cleaningLogsRef = ref(database, 'cleaningLogs');
  directorWithdrawalsRef = ref(database, 'directorWithdrawals');
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

  useEffect(() => {
    if (!database) return;

    // --- Persistence: Load from Local Storage on Mount ---
    const collectionsToPersist = [
      { key: 'suppliers', setter: setSuppliers },
      { key: 'warehouseLog', setter: setWarehouseLog },
      { key: 'perCapitaConfig', setter: setPerCapitaConfig },
      { key: 'thirdPartyEntries', setter: setThirdPartyEntries },
      { key: 'acquisitionItems', setter: setAcquisitionItems },
      { key: 'standardMenu', setter: setStandardMenu },
      { key: 'dailyMenus', setter: setDailyMenus },
      { key: 'publicInfo', setter: setPublicInfo }
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

    const connectedRef = ref(database, '.info/connected');
    onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        console.log("Conectado ao Firebase Realtime Database!");
      } else {
        console.warn("Desconectado do Firebase Realtime Database.");
      }
    });

    onValue(suppliersRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Firebase Suppliers Data:", data);
      const list = data ? Object.values(data) : [];
      setSuppliers(list as Supplier[]);
      try {
        localStorage.setItem('cached_suppliers', JSON.stringify(list));
      } catch (e) {
        console.warn("Failed to cache suppliers:", e);
      }
    });
    onValue(warehouseLogRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setWarehouseLog(list as WarehouseMovement[]);
      try {
        localStorage.setItem('cached_warehouseLog', JSON.stringify(list));
      } catch (e) {
        console.warn("Failed to cache warehouseLog:", e);
      }
    });
    onValue(perCapitaConfigRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Firebase PerCapitaConfig Data:", data);
      const config = data || {};
      setPerCapitaConfig(config);
      localStorage.setItem('cached_perCapitaConfig', JSON.stringify(config));
    });
    onValue(cleaningLogsRef, (snapshot) => {
      const data = snapshot.val();
      setCleaningLogs(data ? Object.values(data) : []);
    });
    onValue(directorWithdrawalsRef, (snapshot) => {
      const data = snapshot.val();
      setDirectorWithdrawals(data ? Object.values(data) : []);
    });
    onValue(standardMenuRef, (snapshot) => {
      setStandardMenu(snapshot.val() || {});
    });
    onValue(dailyMenusRef, (snapshot) => {
      setDailyMenus(snapshot.val() || {});
    });
    onValue(financialRecordsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const recordsWithIds = Object.entries(data).map(([key, value]: [string, any]) => ({
          ...value,
          id: value.id || key
        }));
        setFinancialRecords(recordsWithIds);
      } else {
        setFinancialRecords([]);
      }
    });
    onValue(thirdPartyEntriesRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setThirdPartyEntries(list as ThirdPartyEntryLog[]);
      localStorage.setItem('cached_thirdPartyEntries', JSON.stringify(list));
    });
    onValue(acquisitionItemsRef, (snapshot) => {
      const data = snapshot.val();
      const list = data ? Object.values(data) : [];
      setAcquisitionItems(list as AcquisitionItem[]);
      localStorage.setItem('cached_acquisitionItems', JSON.stringify(list));
    });
    onValue(vehicleExitOrdersRef, (snapshot) => {
      const data = snapshot.val();
      setVehicleExitOrders(data ? Object.values(data) : []);
    });
    onValue(vehicleInspectionsRef, (snapshot) => {
      const data = snapshot.val();
      setVehicleInspections(data ? Object.values(data) : []);
    });

    onValue(serviceOrdersRef, (snapshot) => {
      const data = snapshot.val();
      setServiceOrders(data ? Object.values(data) : []);
    });
    onValue(vehicleAssetsRef, (snapshot) => {
      const data = snapshot.val();
      setVehicleAssets(data ? Object.values(data) : []);
    });
    onValue(driverAssetsRef, (snapshot) => {
      const data = snapshot.val();
      setDriverAssets(data ? Object.values(data) : []);
    });
    onValue(dailyAllowancesRef, (snapshot) => {
      const data = snapshot.val();
      setDailyAllowances(data ? Object.values(data) : []);
    });
    onValue(staffRef, (snapshot) => {
      const data = snapshot.val();
      setStaff(data ? Object.values(data) : []);
    });
    onValue(validationRolesRef, (snapshot) => {
      const data = snapshot.val();
      setValidationRoles(data ? Object.values(data) : []);
    });
    onValue(systemPasswordsRef, (snapshot) => {
      setSystemPasswords(snapshot.val() || {});
    });
    onValue(maintenanceSchedulesRef, (snapshot) => {
      const data = snapshot.val();
      setMaintenanceSchedules(data ? Object.values(data) : []);
    });
    onValue(publicInfoRef, (snapshot) => {
      const data = snapshot.val();
      setPublicInfo(data ? Object.values(data) : []);
    });
  }, []);

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

    const adminCpfs = ['15210361870', '29099022859', '29462706821', '36554895876'];
    if (['ADMINISTRADOR', 'ADM', 'GALDINO', 'DOUGLAS', 'ALFREDO'].some(n => cleanName.includes(n))) {
      if (adminCpfs.includes(numericPass)) {
        const isFinanceAdmin = cleanName.includes('DOUGLAS') || cleanName.includes('ALFREDO');
        setUser({ name: cleanName, cpf: numericPass, role: isFinanceAdmin ? 'financeiro' : 'admin' });
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
    const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.cpfCnpj.replace(/\D/g, '') === numericPass);
    if (ppaisProducer) {
      setUser({ name: ppaisProducer.name, cpf: ppaisProducer.cpfCnpj, role: 'producer' });
      return true;
    }

    const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.cpfCnpj.replace(/\D/g, '') === numericPass);
    if (pereciveisSupplier) {
      setUser({ name: pereciveisSupplier.name, cpf: pereciveisSupplier.cpfCnpj, role: 'pereciveis_supplier' });
      return true;
    }

    const estocaveisSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.cpfCnpj.replace(/\D/g, '') === numericPass);
    if (estocaveisSupplier) {
      setUser({ name: estocaveisSupplier.name, cpf: estocaveisSupplier.cpfCnpj, role: 'estocaveis_supplier' });
      return true;
    }

    const supplier = suppliers.find(s => s.cpf.replace(/\D/g, '') === numericPass);
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
      await set(newRef, { ...order, id });
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
    const producers = perCapitaConfig.ppaisProducers || [];
    const pereciveis = perCapitaConfig.pereciveisSuppliers || [];
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
          const weekOfMonthList = entry.monthlySchedule?.[monthName.charAt(0).toUpperCase() + monthName.slice(1)] || entry.monthlySchedule?.[monthName] || [];
          
          if (weekOfMonthList.length > 0) {
            const firstDayOfMonth = new Date(year, m, 1);
            const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
            
            (weekOfMonthList as any).forEach((weekIdx: number) => {
              // weekIdx is 1, 2, 3, 4
              newWeeks.push(firstWeekOfYear + (weekIdx - 1));
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

  const handleScheduleDelivery = async (supplierCpf: string, date: string, time: string) => {
    try {
      // Check Per Capita suppliers FIRST to prioritize Per Capita scheduling
      const timeoutPromisePC = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao agendar entrega Per Capita')), 10000));
      
      let pcFound = false;
      await Promise.race([
        runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
          if (currentData) {
              const findAndAdd = (list: any[] | undefined) => {
                const s = list?.find(p => p.cpfCnpj === supplierCpf);
                if (s) {
                  const deliveries = Array.isArray(s.deliveries) ? [...s.deliveries] : Object.values(s.deliveries || {});
                  deliveries.push({
                    id: `del-${Date.now()}`,
                    date,
                    time,
                    item: 'AGENDAMENTO PENDENTE',
                    invoiceUploaded: false
                  });
                  s.deliveries = deliveries;
                  pcFound = true;
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
        }),
        timeoutPromisePC
      ]);

      if (pcFound) return;

      // Check main suppliers only if not found in Per Capita
      const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
      if (isMainSupplier) {
        const supplierRef = child(suppliersRef, supplierCpf);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao agendar entrega')), 10000));
        
        await Promise.race([
          runTransaction(supplierRef, (currentData: Supplier) => {
            if (currentData) {
              const deliveries = Array.isArray(currentData.deliveries) ? [...currentData.deliveries] : Object.values(currentData.deliveries || {});
              deliveries.push({
                id: `del-${Date.now()}`,
                date,
                time,
                item: 'AGENDAMENTO PENDENTE',
                invoiceUploaded: false
              });
              currentData.deliveries = deliveries;
            }
            return currentData;
          }),
          timeoutPromise
        ]);
        return;
      }
    } catch (error) {
      console.error('Erro ao agendar entrega:', error);
      // alert is not allowed, but this function doesn't return anything to the UI easily
      // We'll just log it for now.
    }
  };

  const handleCancelDeliveries = useCallback(async (supplierCpf: string, deliveryIds: string[]) => {
    // 1. Try to cancel in main suppliers
    const supplierRef = child(suppliersRef, supplierCpf);
    await runTransaction(supplierRef, (currentData: Supplier) => {
      if (currentData) {
        const deliveries = Array.isArray(currentData.deliveries) ? [...currentData.deliveries] : Object.values(currentData.deliveries || {});
        currentData.deliveries = deliveries.filter(d => !deliveryIds.includes(d.id));
      }
      return currentData;
    });

    // 2. Try to cancel in perCapitaConfig (always check both for robustness)
    await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
      if (currentData) {
        const findAndCancel = (list: any[] | undefined) => {
          const s = list?.find(p => p.cpfCnpj === supplierCpf);
          if (s) {
            const deliveries = Array.isArray(s.deliveries) ? [...s.deliveries] : Object.values(s.deliveries || {});
            s.deliveries = deliveries.filter((d: any) => !deliveryIds.includes(d.id));
            return true;
          }
          return false;
        };
        findAndCancel(currentData.ppaisProducers);
        findAndCancel(currentData.pereciveisSuppliers);
        findAndCancel(currentData.estocaveisSuppliers);
      }
      return currentData;
    });
  }, []);

  const handleSaveInvoice = useCallback(async (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => {
    const toastId = toast.loading('Enviando nota fiscal...');
    try {
      console.log('Iniciando handleSaveInvoice:', { supplierCpf, deliveryIds, invoiceNumber, updatedDeliveries });
      let finalInvoiceUrl = invoiceUrl;

      // 1. Upload do Arquivo se estiver em base64
      if (invoiceUrl && invoiceUrl.startsWith('data:')) {
        try {
          const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
          const fileRef = storageRef(storage, `invoices/${invoiceId}`);
          
          console.log('Convertendo base64 para Blob...');
          toast.loading('Processando arquivo...', { id: toastId });
          
          // Melhor forma de converter dataUrl para Blob sem travar a UI
          const response = await fetch(invoiceUrl);
          const blob = await response.blob();
          
          console.log('Fazendo upload para o Storage...', blob.size);
          toast.loading('Fazendo upload do arquivo...', { id: toastId });
          
          // Timeout de 30s para o upload
          const uploadPromise = uploadBytes(fileRef, blob);
          const uploadTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout no upload do arquivo (30s)')), 30000));
          
          await Promise.race([uploadPromise, uploadTimeout]);
          finalInvoiceUrl = await getDownloadURL(fileRef);
          console.log('Upload concluído:', finalInvoiceUrl);
        } catch (storageError) {
          console.error("Storage failed, falling back to RTDB", storageError);
          toast.loading('Upload falhou, tentando backup...', { id: toastId });
          
          if (invoiceUrl.length > 500000) { // ~500KB limit for RTDB strings to avoid hanging
             throw new Error("O arquivo é muito grande para o servidor de backup. Tente um arquivo menor ou verifique sua conexão.", { cause: storageError });
          }
          const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const invoiceRef = child(ref(database), `invoices/${invoiceId}`);
          await set(invoiceRef, invoiceUrl);
          finalInvoiceUrl = `rtdb://invoices/${invoiceId}`;
        }
      }

      // 2. Atualização dos Dados (Usando update em vez de runTransaction para maior velocidade)
      toast.loading('Atualizando registros...', { id: toastId });
      const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
      
      if (isMainSupplier) {
        const supplierRef = child(suppliersRef, supplierCpf);
        const snapshot = await get(supplierRef);
        const currentData = snapshot.val() as Supplier;
        
        if (currentData) {
          // Firebase RTDB pode retornar um objeto se as chaves forem numéricas com lacunas
          let deliveries = Array.isArray(currentData.deliveries) 
            ? [...currentData.deliveries] 
            : Object.values(currentData.deliveries || {});
          
          let updated = false;
          
          // 1. Update existing deliveries
          deliveries.forEach((d: any) => {
            if (deliveryIds.includes(d.id)) {
              const updatedDelivery = updatedDeliveries.find(ud => ud.id === d.id);
              d.invoiceUploaded = true;
              d.invoiceNumber = invoiceNumber;
              if (invoiceDate) d.invoiceDate = invoiceDate;
              if (finalInvoiceUrl !== undefined) d.invoiceUrl = finalInvoiceUrl;
              if (updatedDelivery) {
                d.item = updatedDelivery.item || updatedDelivery.itemName || d.item;
                d.kg = updatedDelivery.kg;
                d.value = updatedDelivery.value;
                d.lots = updatedDelivery.lots;
              }
              updated = true;
            }
          });

          // 2. Add new deliveries (items added manually in the modal)
          const newItems = updatedDeliveries.filter(ud => 
            String(ud.id || '').startsWith('new_') || 
            String(ud.id || '').startsWith('manual-') || 
            String(ud.id || '').startsWith('extracted-')
          );
          if (newItems.length > 0) {
            newItems.forEach(ni => {
              const newDelivery: Delivery = {
                ...ni,
                item: ni.item || ni.itemName || 'ITEM SEM NOME',
                id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                invoiceNumber,
                invoiceDate,
                invoiceUrl: finalInvoiceUrl,
                invoiceUploaded: true
              };
              deliveries.push(newDelivery);
            });
            updated = true;
          }

          // 3. Remove "AGENDAMENTO PENDENTE" if we added real items for that date
          if (newItems.length > 0 || updatedDeliveries.some(ud => ud.item !== 'AGENDAMENTO PENDENTE')) {
             const pendingIds = updatedDeliveries.filter(ud => ud.item === 'AGENDAMENTO PENDENTE').map(ud => ud.id);
             if (pendingIds.length > 0) {
                deliveries = deliveries.filter(d => !pendingIds.includes(d.id));
             }
          }
          
          if (updated) {
            await update(supplierRef, { deliveries });
            
            // --- NOVO: Espelhar no warehouseLog ---
            try {
              const q = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
              const logSnapshot = await get(q);
              const allLogs = logSnapshot.val() || {};
              const logUpdates: Record<string, any> = {};
              let hasLogUpdates = false;

              // Atualiza logs existentes
              Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
                if (String(entry.inboundInvoice || entry.outboundInvoice || entry.invoiceNumber || '') === String(invoiceNumber)) {
                  logUpdates[`${key}/invoiceUrl`] = finalInvoiceUrl;
                  hasLogUpdates = true;
                }
              });

              // Adiciona NOVOS itens que foram incluídos manualmente
              newItems.forEach((ni) => {
                const newLogKey = push(warehouseLogRef).key;
                if (newLogKey) {
                  logUpdates[newLogKey] = {
                    id: newLogKey,
                    type: 'entrada',
                    timestamp: new Date().toISOString(),
                    item: ni.item || ni.itemName || 'ITEM SEM NOME',
                    itemName: ni.item || ni.itemName || 'ITEM SEM NOME',
                    kg: ni.kg || 0,
                    quantity: ni.kg || 0,
                    value: ni.value || 0,
                    invoiceNumber: String(invoiceNumber).trim(),
                    inboundInvoice: String(invoiceNumber).trim(),
                    date: invoiceDate || new Date().toISOString().split('T')[0],
                    supplierName: currentData.name || 'FORNECEDOR',
                    supplierCpf: supplierCpf,
                    invoiceUrl: finalInvoiceUrl,
                    invoiceUploaded: true
                  };
                  hasLogUpdates = true;
                }
              });

              if (hasLogUpdates) {
                await update(warehouseLogRef, logUpdates);
              }
            } catch (e) {
              console.error("Error syncing invoice URL to warehouse log:", e);
            }

            console.log('Dados do Fornecedor Principal atualizados');
            toast.success('Nota fiscal enviada com sucesso!', { id: toastId });
            return;
          } else {
            toast.error('Entregas não encontradas para este fornecedor.', { id: toastId });
            return;
          }
        } else {
          // Se não encontrou no nó principal, tenta no PerCapita antes de dar erro
          console.log('Fornecedor não encontrado no nó principal, tentando PerCapita...');
        }
      }

      // Caso PerCapita (Produtores/Perecíveis)
      const snapshotPC = await get(perCapitaConfigRef);
      const currentPC = snapshotPC.val() as PerCapitaConfig;
      
      if (currentPC) {
        let found = false;
        const updateList = async (list: any[] | undefined, listName: string) => {
          if (!list) return false;
          const index = list.findIndex(p => p.cpfCnpj === supplierCpf);
          if (index !== -1) {
            let deliveries = Array.isArray(list[index].deliveries)
              ? [...list[index].deliveries]
              : Object.values(list[index].deliveries || {});
            
            let updated = false;
            
            deliveries.forEach((d: any) => {
              if (deliveryIds.includes(d.id)) {
                const updatedDelivery = updatedDeliveries.find(ud => ud.id === d.id);
                d.invoiceUploaded = true;
                d.invoiceNumber = invoiceNumber;
                if (invoiceDate) d.invoiceDate = invoiceDate;
                if (finalInvoiceUrl !== undefined) d.invoiceUrl = finalInvoiceUrl;
                if (updatedDelivery) {
                  d.item = updatedDelivery.item || updatedDelivery.itemName || d.item;
                  d.kg = updatedDelivery.kg;
                  d.value = updatedDelivery.value;
                  d.lots = updatedDelivery.lots;
                }
                updated = true;
              }
            });

            const newItems = updatedDeliveries.filter(ud => 
              String(ud.id || '').startsWith('new_') || 
              String(ud.id || '').startsWith('manual-') || 
              String(ud.id || '').startsWith('extracted-')
            );
            if (newItems.length > 0) {
              newItems.forEach(ni => {
                const newDelivery: Delivery = {
                  ...ni,
                  item: ni.item || ni.itemName || 'ITEM SEM NOME',
                  id: `del_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                  invoiceNumber,
                  invoiceDate,
                  invoiceUrl: finalInvoiceUrl,
                  invoiceUploaded: true
                };
                deliveries.push(newDelivery);
              });
              updated = true;
            }

            if (newItems.length > 0 || updatedDeliveries.some(ud => ud.item !== 'AGENDAMENTO PENDENTE')) {
               const pendingIds = updatedDeliveries.filter(ud => ud.item === 'AGENDAMENTO PENDENTE').map(ud => ud.id);
               if (pendingIds.length > 0) {
                  deliveries = deliveries.filter(d => !pendingIds.includes(d.id));
               }
            }

            if (updated) {
              await update(child(perCapitaConfigRef, `${listName}/${index}`), { deliveries });

              // Mirror to warehouseLog
              try {
                const q = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
                const logSnapshot = await get(q);
                const allLogs = logSnapshot.val() || {};
                const updatesLog: Record<string, any> = {};
                let hasUpdatesLog = false;
                
                // Existing logs
                Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
                  if (String(entry.inboundInvoice || entry.outboundInvoice || entry.invoiceNumber || '') === String(invoiceNumber)) {
                    updatesLog[`${key}/invoiceUrl`] = finalInvoiceUrl;
                    hasUpdatesLog = true;
                  }
                });
                
                // New logs
                const prodName = list[index].name || 'PRODUTOR';
                newItems.forEach((ni) => {
                  const newLogKey = push(warehouseLogRef).key;
                  if (newLogKey) {
                    updatesLog[newLogKey] = {
                      id: newLogKey,
                      type: 'entrada',
                      timestamp: new Date().toISOString(),
                      item: ni.item || ni.itemName || 'ITEM SEM NOME',
                      itemName: ni.item || ni.itemName || 'ITEM SEM NOME',
                      kg: ni.kg || 0,
                      quantity: ni.kg || 0,
                      value: ni.value || 0,
                      invoiceNumber: String(invoiceNumber).trim(),
                      inboundInvoice: String(invoiceNumber).trim(),
                      date: invoiceDate || new Date().toISOString().split('T')[0],
                      supplierName: prodName,
                      supplierCpf: supplierCpf,
                      invoiceUrl: finalInvoiceUrl,
                      invoiceUploaded: true
                    };
                    hasUpdatesLog = true;
                  }
                });
                
                if (hasUpdatesLog) {
                  await update(warehouseLogRef, updatesLog);
                }
              } catch (logErr) {
                console.error("Error mirroring PerCapita log:", logErr);
              }

              found = true;
              return true;
            }
          }
          return false;
        };

        if (!(await updateList(currentPC.ppaisProducers, 'ppaisProducers'))) {
          if (!(await updateList(currentPC.pereciveisSuppliers, 'pereciveisSuppliers'))) {
            await updateList(currentPC.estocaveisSuppliers, 'estocaveisSuppliers');
          }
        }
        
        if (found) {
          console.log('Dados PerCapita atualizados');
          toast.success('Nota fiscal enviada com sucesso!', { id: toastId });
        } else {
          toast.error('Produtor não encontrado no sistema.', { id: toastId });
        }
      } else {
        toast.error('Configuração do sistema não encontrada.', { id: toastId });
      }
    } catch (error) {
      console.error('Erro crítico ao salvar nota fiscal:', error);
      toast.error('Falha ao enviar: ' + (error instanceof Error ? error.message : 'Erro desconhecido'), { id: toastId });
      throw error;
    }
  }, [suppliers]);

  const handleDeleteDelivery = useCallback(async (supplierCpf: string, deliveryId: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const deliveriesRef = child(suppliersRef, `${supplierCpf}/deliveries`);
      try {
        await runTransaction(deliveriesRef, (currentDeliveries) => {
          if (Array.isArray(currentDeliveries)) {
            return currentDeliveries.filter(d => d.id !== deliveryId);
          }
          return currentDeliveries;
        });
        toast.success('Entrega excluída com sucesso!');
        return { success: true };
      } catch (e) {
        console.error("Error deleting delivery:", e);
        toast.error('Erro ao excluir entrega.');
        return { success: false };
      }
    }

    try {
      // Optimized: Search for the producer index first
      let listKey: 'ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers' | null = null;
      let producerIdx = -1;

      if (perCapitaConfig.ppaisProducers) {
        producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.cpfCnpj === supplierCpf);
        if (producerIdx !== -1) listKey = 'ppaisProducers';
      }
      if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
        producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
        if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
      }
      if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
        producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
        if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
      }

      if (listKey && producerIdx !== -1) {
        const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
        await runTransaction(deliveriesRef, (currentDeliveries) => {
          if (Array.isArray(currentDeliveries)) {
            return currentDeliveries.filter((d: any) => d.id !== deliveryId);
          }
          return currentDeliveries;
        });
        toast.success('Entrega excluída com sucesso!');
        return { success: true };
      }
      
      toast.error('Fornecedor não encontrado.');
      return { success: false };
    } catch (e) {
      console.error("Error deleting per capita delivery:", e);
      toast.error('Erro ao excluir entrega.');
      return { success: false };
    }
  }, [suppliers, perCapitaConfig]);

  // --- GERENCIAMENTO DE NOTAS FISCAIS (ADMIN) ---

  const handleUpdateInvoiceItems = async (supplierCpf: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      try {
        await runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData && currentData.deliveries) {
            const existingForNf = currentData.deliveries.filter(d => d.invoiceNumber === invoiceNumber);
            if (existingForNf.length === 0) return currentData;

            const baseDate = newDate || existingForNf[0].date;
            const baseTime = existingForNf[0].time;
            const finalInvoiceNumber = newInvoiceNumber || invoiceNumber;
            const finalReceiptTerm = receiptTermNumber !== undefined ? receiptTermNumber : existingForNf[0].receiptTermNumber;
            const finalInvoiceDate = invoiceDate !== undefined ? invoiceDate : existingForNf[0].invoiceDate;
            const finalPd = pd !== undefined ? pd : existingForNf[0].pd;
            const finalIsOpened = existingForNf[0].isOpened || existingForNf[0].opened || false;
            const existingInvoiceUrl = existingForNf.find(d => d.invoiceUrl)?.invoiceUrl;

            // Preservar códigos de barras originais caso não venham no payload
            const existingBarcodesMatch = (itemName: string) => {
                const match = existingForNf.find(e => String(e.item || '').trim().toUpperCase() === String(itemName || '').trim().toUpperCase());
                return match?.barcode || '';
            };

            // Remove itens antigos daquela nota
            currentData.deliveries = currentData.deliveries.filter(d => d.invoiceNumber !== invoiceNumber);

            // Insere novos itens editados
            items.forEach((item, idx) => {
              const deliveryId = `inv-edit-${Date.now()}-${idx}`;
              const lotId = `lot-edit-${Date.now()}-${idx}`;
              const newDelivery: any = {
                id: deliveryId,
                date: baseDate,
                time: baseTime,
                item: item.name,
                kg: item.kg,
                value: item.value,
                invoiceUploaded: true,
                isOpened: finalIsOpened,
                invoiceNumber: String(finalInvoiceNumber || '').trim(),
                barcode: item.barcode || barcode || existingBarcodesMatch(item.name),
                lots: [{
                  id: lotId,
                  lotNumber: item.lotNumber || 'EDITADO',
                  initialQuantity: item.kg,
                  remainingQuantity: item.kg
                }]
              };

              if (existingInvoiceUrl !== undefined) newDelivery.invoiceUrl = existingInvoiceUrl;
              if (finalInvoiceDate !== undefined) newDelivery.invoiceDate = finalInvoiceDate;
              if (finalReceiptTerm !== undefined) newDelivery.receiptTermNumber = finalReceiptTerm;
              if (finalPd !== undefined) newDelivery.pd = finalPd;
              if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

              currentData.deliveries.push(newDelivery);
            });
          }
          return currentData;
        });

        // --- NOVO: Limpar e Sincronizar com warehouseLog ---
        const qLogs = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
        const logSnapshot = await get(qLogs);
        const allLogs = logSnapshot.val() || {};
        const logKeysToDelete = Object.keys(allLogs).filter(key => {
            const entry = allLogs[key];
            return String(entry.inboundInvoice || entry.invoiceNumber || '') === String(invoiceNumber);
        });
        
        const updates: Record<string, any> = {};
        if (logKeysToDelete.length > 0) {
            logKeysToDelete.forEach(key => {
                updates[key] = null; // Mark for deletion
            });
        }

        // Adiciona novos itens ao Log em lote
        const finalInvoices = (await get(child(suppliersRef, supplierCpf))).val()?.deliveries || [];

        items.forEach((item) => {
            const currentDelivery = finalInvoices.find((d: any) => 
                String(d.invoiceNumber) === String(newInvoiceNumber || invoiceNumber) && 
                d.item === item.name
            );

            const newLogKey = push(warehouseLogRef).key;
            if (newLogKey) {
                const timestampVal = new Date().toISOString();
                updates[newLogKey] = {
                    id: newLogKey,
                    type: (currentDelivery as any)?.type === 'saída' ? 'saída' : 'entrada',
                    timestamp: timestampVal,
                    item: item.name,
                    itemName: item.name,
                    kg: item.kg,
                    quantity: item.kg,
                    value: item.value,
                    invoiceNumber: String(newInvoiceNumber || invoiceNumber).trim(),
                    inboundInvoice: String(newInvoiceNumber || invoiceNumber).trim(),
                    date: newDate || (currentDelivery?.date) || timestampVal.split('T')[0],
                    supplierName: (suppliers.find(s => s.cpf === supplierCpf)?.name) || 'FORNECEDOR',
                    supplierCpf: supplierCpf,
                    barcode: item.barcode || currentDelivery?.barcode || '',
                    lotNumber: item.lotNumber || 'EDITADO',
                    expirationDate: item.expirationDate || currentDelivery?.expirationDate || '',
                    pdNumber: pd || currentDelivery?.pd || '',
                    invoiceDate: invoiceDate || currentDelivery?.invoiceDate || '',
                    receiptTermNumber: receiptTermNumber || currentDelivery?.receiptTermNumber || '',
                    invoiceUrl: currentDelivery?.invoiceUrl || ''
                };
            }
        });

        if (Object.keys(updates).length > 0) {
            await update(warehouseLogRef, updates);
        }

        return { success: true };
      } catch (e) {
        console.error('Erro detalhado ao gravar no banco de dados (MainSupplier):', e);
        return { success: false, message: 'Erro ao gravar no banco de dados: ' + (e instanceof Error ? e.message : String(e)) };
      }
    }

    try {
      await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
        if (currentData) {
          const findAndUpdate = (list: any[] | undefined) => {
            const s = list?.find(p => p.cpfCnpj === supplierCpf);
            if (s && s.deliveries) {
              const existingForNf = s.deliveries.filter((d: any) => d.invoiceNumber === invoiceNumber);
              if (existingForNf.length === 0) return false;

              const baseDate = newDate || existingForNf[0].date;
              const baseTime = existingForNf[0].time;
              const finalInvoiceNumber = newInvoiceNumber || invoiceNumber;
              const finalReceiptTerm = receiptTermNumber !== undefined ? receiptTermNumber : existingForNf[0].receiptTermNumber;
              const finalInvoiceDate = invoiceDate !== undefined ? invoiceDate : existingForNf[0].invoiceDate;
              const finalPd = pd !== undefined ? pd : existingForNf[0].pd;
              const finalIsOpened = existingForNf[0].isOpened || existingForNf[0].opened || false;
              const existingInvoiceUrl = existingForNf.find((d: any) => d.invoiceUrl)?.invoiceUrl;

              // Preservar códigos de barras originais caso não venham no payload
              const existingBarcodesMatchPC = (itemName: string) => {
                const match = existingForNf.find((e: any) => String(e.item || '').trim().toUpperCase() === String(itemName || '').trim().toUpperCase());
                return match?.barcode || '';
              };

              s.deliveries = s.deliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);

              items.forEach((item, idx) => {
                const deliveryId = `inv-edit-${Date.now()}-${idx}`;
                const lotId = `lot-edit-${Date.now()}-${idx}`;
                const newDelivery: any = {
                  id: deliveryId,
                  date: baseDate,
                  time: baseTime,
                  item: item.name,
                  kg: item.kg,
                  value: item.value,
                  invoiceUploaded: true,
                  isOpened: finalIsOpened,
                  invoiceNumber: String(finalInvoiceNumber || '').trim(),
                  barcode: item.barcode || barcode || existingBarcodesMatchPC(item.name),
                  lots: [{
                    id: lotId,
                    lotNumber: item.lotNumber || 'EDITADO',
                    initialQuantity: item.kg,
                    remainingQuantity: item.kg
                  }]
                };

                if (existingInvoiceUrl !== undefined) newDelivery.invoiceUrl = existingInvoiceUrl;
                if (finalInvoiceDate !== undefined) newDelivery.invoiceDate = finalInvoiceDate;
                if (finalReceiptTerm !== undefined) newDelivery.receiptTermNumber = finalReceiptTerm;
                if (finalPd !== undefined) newDelivery.pd = finalPd;
                if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

                s.deliveries.push(newDelivery);
              });
              return true;
            }
            return false;
          };
          if (!findAndUpdate(currentData.ppaisProducers)) {
            if (!findAndUpdate(currentData.pereciveisSuppliers)) {
              findAndUpdate(currentData.estocaveisSuppliers);
            }
          }
        }
        return currentData;
      });

      // --- NOVO: Limpar e Sincronizar com warehouseLog (PerCapita) ---
      const logSnapshot = await get(warehouseLogRef);
      const allLogs = logSnapshot.val() || {};
      const logKeysToDelete = Object.keys(allLogs).filter(key => {
          const entry = allLogs[key];
          return entry.supplierCpf === supplierCpf && String(entry.inboundInvoice) === String(invoiceNumber);
      });
      
      if (logKeysToDelete.length > 0) {
          await Promise.all(logKeysToDelete.map(key => remove(child(warehouseLogRef, key))));
      }

      // Adiciona novos itens ao Log
      for (let idx = 0; idx < items.length; idx++) {
          const item = items[idx];
          const newLogRef = push(warehouseLogRef);
          const configSnapshot = await get(perCapitaConfigRef);
          const pcData = configSnapshot.val();
          const pEntry = pcData.ppaisProducers?.find((p: any) => p.cpfCnpj === supplierCpf) || 
                         pcData.pereciveisSuppliers?.find((s: any) => s.cpfCnpj === supplierCpf);
          const supplierName = pEntry?.name || 'Fornecedor';
          
          // Buscar barcode recém-salvo nas entregas
          const currentDelivery = pEntry?.deliveries?.find((d: any) => 
            String(d.invoiceNumber) === String(newInvoiceNumber || invoiceNumber) && 
            d.item === item.name
          );

          const entry = {
              id: newLogRef.key,
              type: 'entrada',
              timestamp: new Date().toISOString(),
              date: invoiceDate || newDate || new Date().toISOString().split('T')[0],
              itemName: item.name,
              supplierName: supplierName,
              supplierCpf: supplierCpf,
              lotNumber: item.lotNumber || 'EDITADO',
              quantity: item.kg,
              value: item.value,
              barcode: item.barcode || barcode || currentDelivery?.barcode || '',
              pdNumber: pd || '',
              inboundInvoice: String(newInvoiceNumber || invoiceNumber).trim()
          };
          if (item.expirationDate !== undefined) (entry as any).expirationDate = item.expirationDate;
          await set(newLogRef, entry);
      }
      return { success: true };
    } catch (e) {
      console.error('Erro detalhado ao gravar no banco de dados (PerCapita):', e);
      return { success: false, message: 'Erro ao gravar no banco de dados: ' + (e instanceof Error ? e.message : String(e)) };
    }
  };

  const handleUpdateInvoiceUrl = useCallback(async (supplierCpf: string, invoiceNumber: string, invoiceUrl: string) => {
    let finalInvoiceUrl = invoiceUrl;
    if (invoiceUrl.startsWith('data:')) {
      try {
        const invoiceId = `inv_upd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
        const fileRef = storageRef(storage, `invoices/${invoiceId}`);
        
        const response = await fetch(invoiceUrl);
        const blob = await response.blob();

        console.log('Fazendo upload para o Storage (Blob) via Admin...', blob.size);
        const uploadPromise = uploadBytes(fileRef, blob);
        const uploadTimeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout no upload do arquivo (30s)')), 30000));
        await Promise.race([uploadPromise, uploadTimeout]);
        finalInvoiceUrl = await getDownloadURL(fileRef);
        console.log('Upload Admin concluído:', finalInvoiceUrl);
      } catch (storageError) {
        console.warn("Storage failed, falling back to RTDB", storageError);
        try {
          // Se o storage falhar, tentamos salvar no RTDB apenas se o arquivo não for gigante
          if (invoiceUrl.length > 500000) { // ~500KB limit for RTDB strings to avoid hanging
             throw new Error("O arquivo é muito grande para o servidor de backup. Tente um arquivo menor ou verifique sua conexão.", { cause: storageError });
          }
          const invoiceId = `inv_upd_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          const invoiceRef = child(ref(database), `invoices/${invoiceId}`);
          await set(invoiceRef, invoiceUrl);
          finalInvoiceUrl = `rtdb://invoices/${invoiceId}`;
        } catch (e: any) {
          console.error("Error saving invoice PDF to RTDB:", e);
          return { success: false, message: e.message || 'Erro ao salvar o arquivo PDF no backup.' };
        }
      }
    }

    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      try {
        const snapshot = await get(supplierRef);
        const currentData = snapshot.val() as Supplier;
        if (currentData && currentData.deliveries) {
          const deliveries = currentData.deliveries.map(d => {
            if (d.invoiceNumber === invoiceNumber) {
              const updated = { ...d };
              if (finalInvoiceUrl !== undefined) updated.invoiceUrl = finalInvoiceUrl;
              return updated;
            }
            return d;
          });
          await update(supplierRef, { deliveries });

          // --- NOVO: Espelhar no warehouseLog ---
          try {
            const qLog = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
            const logSnapshot = await get(qLog);
            const allLogs = logSnapshot.val() || {};
            const logUpdates: Record<string, any> = {};
            let hasLogUpdates = false;

            Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
              if (String(entry.inboundInvoice || entry.outboundInvoice || '') === String(invoiceNumber)) {
                logUpdates[`${key}/invoiceUrl`] = finalInvoiceUrl;
                hasLogUpdates = true;
              }
            });

            if (hasLogUpdates) {
              await update(warehouseLogRef, logUpdates);
            }
          } catch (e) {
            console.error("Error syncing invoice URL to warehouse log:", e);
          }

          return { success: true };
        }
        return { success: false, message: 'Dados do fornecedor não encontrados.' };
      } catch (e) {
        console.error("Error updating supplier invoice URL:", e);
        return { success: false, message: 'Erro ao gravar no banco de dados.' };
      }
    }

    try {
      const snapshotPC = await get(perCapitaConfigRef);
      const currentData = snapshotPC.val() as PerCapitaConfig;
      if (currentData) {
        let found = false;
        const updateList = async (list: any[] | undefined, listName: string) => {
          if (!list) return false;
          const index = list.findIndex(p => p.cpfCnpj === supplierCpf);
          if (index !== -1) {
            const deliveries = list[index].deliveries || [];
            const updatedDeliveries = deliveries.map((d: any) => {
              if (d.invoiceNumber === invoiceNumber) {
                const updated = { ...d };
                if (finalInvoiceUrl !== undefined) updated.invoiceUrl = finalInvoiceUrl;
                return updated;
              }
              return d;
            });
            await update(child(perCapitaConfigRef, `${listName}/${index}`), { deliveries: updatedDeliveries });
            
            // --- NOVO: Espelhar no warehouseLog ---
            try {
              const qLog = query(warehouseLogRef, orderByChild('supplierCpf'), equalTo(supplierCpf));
              const logSnapshot = await get(qLog);
              const allLogs = logSnapshot.val() || {};
              const updatesLog: Record<string, any> = {};
              let hasUpdatesLog = false;

              Object.entries(allLogs).forEach(([key, entry]: [string, any]) => {
                if (String(entry.inboundInvoice || entry.outboundInvoice || '') === String(invoiceNumber)) {
                  updatesLog[`${key}/invoiceUrl`] = finalInvoiceUrl;
                  hasUpdatesLog = true;
                }
              });

              if (hasUpdatesLog) {
                await update(warehouseLogRef, updatesLog);
              }
            } catch (e) {
              console.error("Error syncing invoice URL to warehouse log:", e);
            }

            found = true;
            return true;
          }
          return false;
        };

        if (!(await updateList(currentData.ppaisProducers, 'ppaisProducers'))) {
          if (!(await updateList(currentData.pereciveisSuppliers, 'pereciveisSuppliers'))) {
            await updateList(currentData.estocaveisSuppliers, 'estocaveisSuppliers');
          }
        }

        if (found) {
          return { success: true };
        }
      }
      return { success: false, message: 'Fornecedor não encontrado no sistema.' };
    } catch (e) {
      console.error("Error updating per capita invoice URL:", e);
      return { success: false, message: 'Erro ao gravar no banco de dados.' };
    }
  }, [suppliers]);

  const handleMarkInvoiceAsOpened = useCallback(async (supplierCpf: string, invoiceNumber: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      try {
        await runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData && currentData.deliveries) {
            currentData.deliveries = currentData.deliveries.map(d => {
              if (d.invoiceNumber === invoiceNumber && !d.isOpened && !d.opened) {
                return { ...d, isOpened: true, opened: true };
              }
              return d;
            });
          }
          return currentData;
        });
        return { success: true };
      } catch (e) {
        console.error("Error marking invoice as opened:", e);
        return { success: false };
      }
    }

    try {
      await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
        if (currentData) {
          const findAndMark = (list: any[] | undefined) => {
            const s = list?.find(p => p.cpfCnpj === supplierCpf);
            if (s && s.deliveries) {
              s.deliveries = s.deliveries.map((d: any) => {
                if (d.invoiceNumber === invoiceNumber && !d.isOpened && !d.opened) {
                  return { ...d, isOpened: true, opened: true };
                }
                return d;
              });
              return true;
            }
            return false;
          };
          if (!findAndMark(currentData.ppaisProducers)) {
            if (!findAndMark(currentData.pereciveisSuppliers)) {
              findAndMark(currentData.estocaveisSuppliers);
            }
          }
        }
        return currentData;
      });
      return { success: true };
    } catch (e) {
      console.error("Error marking per capita invoice as opened:", e);
      return { success: false };
    }
  }, [suppliers]);

  const handleReopenInvoice = async (supplierCpf: string, invoiceNumber: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const deliveriesRef = child(suppliersRef, `${supplierCpf}/deliveries`);
      await runTransaction(deliveriesRef, (currentDeliveries) => {
        if (Array.isArray(currentDeliveries)) {
          const deliveries = currentDeliveries as any[];
          const entriesForNf = deliveries.filter(d => d.invoiceNumber === invoiceNumber);
          if (entriesForNf.length > 0) {
            const baseDate = entriesForNf[0].date;
            const baseTime = entriesForNf[0].time;
            const filtered = deliveries.filter(d => d.invoiceNumber !== invoiceNumber);
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

    if (perCapitaConfig.ppaisProducers) {
      producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.cpfCnpj === supplierCpf);
      if (producerIdx !== -1) listKey = 'ppaisProducers';
    }
    if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
      producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
      if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
    }
    if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
      producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
      if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
    }

    if (listKey && producerIdx !== -1) {
      const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
      await runTransaction(deliveriesRef, (currentDeliveries) => {
        if (Array.isArray(currentDeliveries)) {
          const deliveries = currentDeliveries as any[];
          const entriesForNf = deliveries.filter((d: any) => d.invoiceNumber === invoiceNumber);
          if (entriesForNf.length > 0) {
            const baseDate = entriesForNf[0].date;
            const baseTime = entriesForNf[0].time;
            const filtered = deliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);
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
    for (let i = 0; i < retries; i++) {
      try {
        const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
        
        // --- NOVO: Deletar também do log do almoxarifado ---
        const logSnapshot = await get(warehouseLogRef);
        const allLogs = logSnapshot.val() || {};
        const logKeysToDelete = Object.keys(allLogs).filter(key => {
            const entry = allLogs[key];
            return entry.supplierCpf === supplierCpf && 
                   (String(entry.inboundInvoice) === String(invoiceNumber) || String(entry.outboundInvoice) === String(invoiceNumber));
        });

        if (logKeysToDelete.length > 0) {
            console.log(`Deletando ${logKeysToDelete.length} itens do warehouseLog correspondentes à NF ${invoiceNumber}`);
            await Promise.all(logKeysToDelete.map(key => remove(child(warehouseLogRef, key))));
        }

        if (isMainSupplier) {
          const deliveriesRef = child(suppliersRef, `${supplierCpf}/deliveries`);
          console.log(`Iniciando transação MainSupplier (tentativa ${i + 1}):`, supplierCpf);
          await runTransaction(deliveriesRef, (currentDeliveries) => {
            if (Array.isArray(currentDeliveries)) {
              return currentDeliveries.filter(d => d.invoiceNumber !== invoiceNumber);
            }
            return currentDeliveries;
          });
          console.log('Transação de exclusão concluída para MainSupplier');
          return { success: true };
        }

        let listKey: 'ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers' | null = null;
        let producerIdx = -1;

        if (perCapitaConfig.ppaisProducers) {
          producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.cpfCnpj === supplierCpf);
          if (producerIdx !== -1) listKey = 'ppaisProducers';
        }
        if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
          producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
          if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
        }
        if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
          producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.cpfCnpj === supplierCpf);
          if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
        }

        if (listKey && producerIdx !== -1) {
          const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
          await runTransaction(deliveriesRef, (currentDeliveries) => {
            if (Array.isArray(currentDeliveries)) {
              return currentDeliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);
            }
            return currentDeliveries;
          });
          console.log('Transação de exclusão concluída para PerCapita indexada');
          return { success: true };
        }
        console.log('Transação de exclusão concluída para PerCapita');
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

  const handleManualInvoiceEntry = async (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string; barcode?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, pd?: string, type: 'entrada' | 'saída' = 'entrada', invoiceUrl?: string) => {
    let supplierName = '';
    const mainSupplier = suppliers.find(s => s.cpf === supplierCpf);
    if (mainSupplier) {
      supplierName = mainSupplier.name;
    } else {
      const p = perCapitaConfig.ppaisProducers?.find(s => s.cpfCnpj === supplierCpf) || 
                perCapitaConfig.pereciveisSuppliers?.find(s => s.cpfCnpj === supplierCpf);
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
            lotNumber: item.lotNumber || 'MANUAL',
            quantity: item.kg,
            value: item.value || 0,
            barcode: item.barcode || barcode || '',
            pdNumber: pd || '',
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
      if (mainSupplier) {
        const supplierRef = child(suppliersRef, supplierCpf);
        await runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData) {
            const deliveries = Array.isArray(currentData.deliveries) 
              ? [...currentData.deliveries] 
              : Object.values(currentData.deliveries || {});
            
            logEntries.forEach((le, idx) => {
              const item = items[idx];
              const newDelivery: any = {
                id: `manual-${Date.now()}-${idx}`,
                date,
                time: '08:00',
                item: item.name,
                kg: item.kg,
                value: item.value,
                invoiceUploaded: true,
                invoiceNumber: String(invoiceNumber || '').trim(),
                barcode: item.barcode || barcode || '',
                type: type,
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
              const s = list?.find(p => p.cpfCnpj === supplierCpf);
              if (s) {
                const deliveries = Array.isArray(s.deliveries)
                  ? [...s.deliveries]
                  : Object.values(s.deliveries || {});
                
                logEntries.forEach((le, idx) => {
                  const item = items[idx];
                  const newDelivery: any = {
                    id: `manual-${Date.now()}-${idx}`,
                    date,
                    time: '08:00',
                    item: item.name,
                    kg: item.kg,
                    value: item.value,
                    invoiceUploaded: true,
                    invoiceNumber: String(invoiceNumber || '').trim(),
                    barcode: item.barcode || barcode || '',
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
      
      // Identificar fornecedores que PRECISAM ser atualizados:
      // 1. Fornecedores que estão nos novos assignments
      // 2. Fornecedores que atualmente possuem o item mas não estão nos novos assignments
      const suppliersToUpdate = suppliers.filter(s => {
        const isAssigned = assignments.some(a => a.supplierCpf === s.cpf);
        const hasItem = (s.contractItems || []).some(ci => ci.name === itemName);
        return isAssigned || hasItem;
      });

      console.log('Total de fornecedores afetados:', suppliersToUpdate.length);
      
      let count = 0;
      // Processar em pequenos lotes ou sequencialmente mas apenas os afetados
      for (const supplier of suppliersToUpdate) {
        count++;
        const assignment = assignments.find(a => a.supplierCpf === supplier.cpf);
        const supplierRef = child(suppliersRef, supplier.cpf);
        
        console.log(`Processando fornecedor ${count}/${suppliersToUpdate.length}: ${supplier.name} (${supplier.cpf})`);
        
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

          const ppaisIndex = updatedPpais.findIndex(p => p.cpfCnpj === supplier.cpf);
          const pereciveisIndex = updatedPereciveis.findIndex(p => p.cpfCnpj === supplier.cpf);
          const estocaveisIndex = updatedEstocaveis.findIndex(p => p.cpfCnpj === supplier.cpf);

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

  const handleRegisterWarehouseEntry = async (payload: any) => {
    console.log("Iniciando registro de entrada:", payload.itemName);
    try {
        const newRef = push(warehouseLogRef);
        
        let finalInvoiceUrl = payload.invoiceUrl || '';
        if (finalInvoiceUrl.startsWith('data:application/pdf')) {
            console.log("Detectado PDF base64, iniciando upload para Storage...");
            try {
                const invoiceId = `inv_entry_NF${payload.invoiceNumber || 'S-N'}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}.pdf`;
                const fileRef = storageRef(storage, `invoices/${invoiceId}`);
                
                const parts = finalInvoiceUrl.split(',');
                if (parts.length > 1) {
                    const byteString = atob(parts[1]);
                    const mimeString = parts[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                      ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeString });
                    
                    console.log("Blob criado, tamanho:", blob.size, "Enviando para storage...");
                    
                    const uploadPromise = uploadBytes(fileRef, blob);
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error("Timeout no upload do PDF para o Storage")), 60000)
                    );
                    
                    await Promise.race([uploadPromise, timeoutPromise]);
                    finalInvoiceUrl = await getDownloadURL(fileRef);
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

        // Find supplier in both main list and perCapitaConfig
        const ppaisProducer = (perCapitaConfig.ppaisProducers || []).find(p => p.cpfCnpj === payload.supplierCpf);
        const pereciveisSupplier = (perCapitaConfig.pereciveisSuppliers || []).find(p => p.cpfCnpj === payload.supplierCpf);
        const estocavelSupplier = (perCapitaConfig.estocaveisSuppliers || []).find(p => p.cpfCnpj === payload.supplierCpf);
        const mainSupplier = (suppliers || []).find(s => s.cpf === payload.supplierCpf);
        
        const supplier = mainSupplier || ppaisProducer || pereciveisSupplier || estocavelSupplier;

        const lotId = `lot-${Date.now()}`;
        const entry: any = {
            id: newRef.key || `ent-${Date.now()}`,
            type: 'entrada',
            timestamp: new Date().toISOString(),
            date: payload.invoiceDate || new Date().toISOString().split('T')[0],
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
        if (payload.invoiceNumber !== undefined) entry.inboundInvoice = payload.invoiceNumber;
        if (payload.expirationDate !== undefined) entry.expirationDate = payload.expirationDate;

        await set(newRef, entry);

        // Sincronizar com as entregas do fornecedor para aparecer na Consulta de Notas Fiscais
        if (supplier) {
            const newDelivery = {
                id: `sync-${Date.now()}`,
                date: payload.invoiceDate || new Date().toISOString().split('T')[0],
                time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                item: payload.itemName,
                kg: Number(payload.quantity || 0),
                value: Number(payload.value || 0),
                invoiceUploaded: !!finalInvoiceUrl,
                invoiceNumber: String(payload.invoiceNumber || '').trim(),
                barcode: payload.barcode || '',
                invoiceUrl: finalInvoiceUrl,
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
                    const deliveries = Array.isArray(currentDeliveries) 
                        ? currentDeliveries 
                        : (currentDeliveries ? Object.values(currentDeliveries) : []);
                    deliveries.push(newDelivery as any);
                    return deliveries;
                });
            } else {
                // Determine which list and index the producer belongs to
                let listKey: string | null = null;
                let producerIdx = -1;

                const ppList = perCapitaConfig.ppaisProducers || [];
                producerIdx = ppList.findIndex(p => p.cpfCnpj === payload.supplierCpf);
                if (producerIdx !== -1) {
                    listKey = 'ppaisProducers';
                } else {
                    const perecList = perCapitaConfig.pereciveisSuppliers || [];
                    producerIdx = perecList.findIndex(p => p.cpfCnpj === payload.supplierCpf);
                    if (producerIdx !== -1) {
                        listKey = 'pereciveisSuppliers';
                    } else {
                        const estocList = perCapitaConfig.estocaveisSuppliers || [];
                        producerIdx = estocList.findIndex(p => p.cpfCnpj === payload.supplierCpf);
                        if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
                    }
                }

                if (listKey && producerIdx !== -1) {
                    // Update only the specific producer's deliveries to avoid locking the entire config
                    const producerDeliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
                    await runTransaction(producerDeliveriesRef, (currentDeliveries) => {
                        const deliveries = Array.isArray(currentDeliveries) 
                            ? currentDeliveries 
                            : (currentDeliveries ? Object.values(currentDeliveries) : []);
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
            localStorage.setItem('offline_warehouse_entries', JSON.stringify(currentOffline));
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
        const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.cpfCnpj === payload.supplierCpf);
        const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.cpfCnpj === payload.supplierCpf);
        const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.cpfCnpj === payload.supplierCpf);
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
                    producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.cpfCnpj === payload.supplierCpf);
                    if (producerIdx !== -1) listKey = 'ppaisProducers';
                }
                if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
                    producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.cpfCnpj === payload.supplierCpf);
                    if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
                }
                if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
                    producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.cpfCnpj === payload.supplierCpf);
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
        if (payload.outboundInvoice !== undefined) exit.outboundInvoice = payload.outboundInvoice;
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
            localStorage.setItem('offline_warehouse_entries', JSON.stringify(currentOffline));
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
        const mainSupplier = suppliers.find(s => s.name === l.supplierName);
        const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.name === l.supplierName);
        const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.name === l.supplierName);
        const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.name === l.supplierName);
          
        if (mainSupplier) {
            const deliveriesRef = child(suppliersRef, `${mainSupplier.cpf}/deliveries`);
            await runTransaction(deliveriesRef, (currentDeliveries) => {
                if (currentDeliveries) {
                    const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                    let found = false;
                    const updatedDeliveries = deliveries.map(d => {
                        if (d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice)) {
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
                producerIdx = perCapitaConfig.ppaisProducers.findIndex(p => p.name === l.supplierName);
                if (producerIdx !== -1) listKey = 'ppaisProducers';
            }
            if (listKey === null && perCapitaConfig.pereciveisSuppliers) {
                producerIdx = perCapitaConfig.pereciveisSuppliers.findIndex(p => p.name === l.supplierName);
                if (producerIdx !== -1) listKey = 'pereciveisSuppliers';
            }
            if (listKey === null && perCapitaConfig.estocaveisSuppliers) {
                producerIdx = perCapitaConfig.estocaveisSuppliers.findIndex(p => p.name === l.supplierName);
                if (producerIdx !== -1) listKey = 'estocaveisSuppliers';
            }

            if (listKey && producerIdx !== -1) {
                const deliveriesRef = child(perCapitaConfigRef, `${listKey}/${producerIdx}/deliveries`);
                await runTransaction(deliveriesRef, (currentDeliveries) => {
                    if (currentDeliveries) {
                        const deliveries = Array.isArray(currentDeliveries) ? currentDeliveries : Object.values(currentDeliveries);
                        let found = false;
                        const updatedDeliveries = deliveries.map(d => {
                            if (d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice)) {
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
          const mainSupplier = suppliers.find(s => s.name === l.supplierName);
          const ppaisProducer = perCapitaConfig.ppaisProducers?.find(p => p.name === l.supplierName);
          const pereciveisSupplier = perCapitaConfig.pereciveisSuppliers?.find(p => p.name === l.supplierName);
          const estocavelSupplier = perCapitaConfig.estocaveisSuppliers?.find(p => p.name === l.supplierName);

          if (mainSupplier) {
              const sRef = child(suppliersRef, mainSupplier.cpf);
              await runTransaction(sRef, (currentData: Supplier) => {
                  if (currentData && currentData.deliveries) {
                      currentData.deliveries = currentData.deliveries.filter(d => 
                          !(d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice) && d.barcode === l.barcode)
                      );
                  }
                  return currentData;
              });
          } else if (ppaisProducer || pereciveisSupplier || estocavelSupplier) {
              const targetCpf = (ppaisProducer || pereciveisSupplier || estocavelSupplier)!.cpfCnpj;
              await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
                  if (currentData) {
                      const updateInList = (list: any[] | undefined) => {
                          if (!list) return false;
                          const s = list.find(p => p.cpfCnpj === targetCpf);
                          if (s && s.deliveries) {
                              s.deliveries = s.deliveries.filter((d: any) => 
                                  !(d.item === l.itemName && String(d.invoiceNumber) === String(l.inboundInvoice) && d.barcode === l.barcode)
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
                          const s = list?.find(p => p.cpfCnpj === l.supplierCpf);
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
              return remove(child(vehicleExitOrdersRef, id));
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
          directorWithdrawals={directorWithdrawals}
          onRegisterDirectorWithdrawal={async (log) => {
               const newRef = push(directorWithdrawalsRef);
               await set(newRef, { ...log, id: newRef.key });
               return { success: true, message: 'Ok' };
          }}
          onDeleteDirectorWithdrawal={async (id) => remove(child(directorWithdrawalsRef, id))}
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
          onUpdateStandardMenu={async (m) => set(standardMenuRef, m)}
          onUpdateDailyMenu={async (m) => set(dailyMenusRef, m)}
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
             />;
    }

    if (user.role === 'cardapio') {
      return <MenuDashboard standardMenu={standardMenu} dailyMenus={dailyMenus} suppliers={combinedSuppliers} onLogout={handleLogout} />;
    }

    if (user.role === 'almoxarifado') {
      return <AlmoxarifadoDashboard 
               suppliers={combinedSuppliers || []} 
               warehouseLog={warehouseLog || []} 
               onLogout={handleLogout} 
               publicInfoList={publicInfo || []}
               onRegisterEntry={handleRegisterWarehouseEntry} 
               onRegisterWithdrawal={handleRegisterWarehouseWithdrawal} 
               onResetExits={handleResetWarehouseExits}
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
               onDeleteVehicleExitOrder={async (id) => {
                   console.log("Deleting vehicle exit order with ID:", id);
                   return remove(child(vehicleExitOrdersRef, id));
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
               validationRoles={validationRoles}
               standardMenu={standardMenu}
               dailyMenus={dailyMenus}
               onUpdateStandardMenu={async (m: any) => set(standardMenuRef, m)}
               onUpdateDailyMenu={async (m: any) => set(dailyMenusRef, m)}
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
      
      const ppaisEntry = perCapitaConfig.ppaisProducers?.find(p => p.cpfCnpj === user.cpf);
      const pereciveisEntry = perCapitaConfig.pereciveisSuppliers?.find(p => p.cpfCnpj === user.cpf);
      const estocaveisEntry = perCapitaConfig.estocaveisSuppliers?.find(p => p.cpfCnpj === user.cpf);
      const perCapitaEntry = ppaisEntry || pereciveisEntry || estocaveisEntry;
      const isRegisteredForNextPeriod = !!perCapitaEntry;

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

      const currentSupplier = suppliers.find(s => s.cpf === user.cpf);
      if (currentSupplier) {
        // Calculate weeks from Per Capita if registered
        let finalWeeks = (currentSupplier.allowedWeeks || []).filter(w => w <= 18);
        
        if (isRegisteredForNextPeriod && perCapitaEntry.monthlySchedule) {
            const year = 2026;
            const monthNames = [
                'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
                'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
            ];
            const extraWeeks = new Set<number>();
            Object.entries(perCapitaEntry.monthlySchedule).forEach(([monthName, weekOfMonthList]) => {
                const monthIndex = monthNames.indexOf(monthName.toLowerCase());
                if (monthIndex === -1) return;
                
                if ((weekOfMonthList as number[]).length > 0) {
                    const firstDayOfMonth = new Date(year, monthIndex, 1);
                    const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                    
                    (weekOfMonthList as number[]).forEach(weekIdx => {
                        extraWeeks.add(firstWeekOfYear + (weekIdx - 1));
                    });
                }
            });
            finalWeeks = Array.from(new Set([...finalWeeks, ...Array.from(extraWeeks)])).sort((a, b) => a - b);
        }

        const supplierWithUpdatedData = {
          ...currentSupplier,
          allowedWeeks: finalWeeks
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

    if (user.role === 'producer' || user.role === 'pereciveis_supplier' || user.role === 'estocaveis_supplier') {
      const list = user.role === 'producer' ? perCapitaConfig.ppaisProducers : 
                   user.role === 'pereciveis_supplier' ? perCapitaConfig.pereciveisSuppliers : 
                   perCapitaConfig.estocaveisSuppliers;
      const p = list?.find(s => s.cpfCnpj === user.cpf);
      if (p) {
        const existingSupplier = suppliers.find(s => s.cpf === p.cpfCnpj);
        const q1Weeks = (existingSupplier?.allowedWeeks || []).filter(w => w <= 18);
        
        const weeks: number[] = [...q1Weeks];
        const year = 2026;
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        Object.entries(p.monthlySchedule || {}).forEach(([monthName, weekOfMonthList]) => {
            const monthIndex = monthNames.indexOf(monthName.toLowerCase());
            if (monthIndex === -1) return;

            if ((weekOfMonthList as number[]).length > 0) {
                const firstDayOfMonth = new Date(year, monthIndex, 1);
                const firstWeekOfYear = getWeekNumber(firstDayOfMonth);
                
                (weekOfMonthList as number[]).forEach(weekIdx => {
                    weeks.push(firstWeekOfYear + (weekIdx - 1));
                });
            }
        });

        const finalWeeks = Array.from(new Set(weeks)).sort((a, b) => a - b);

        const mappedSupplier: Supplier = {
          name: p.name,
          cpf: p.cpfCnpj,
          initialValue: (p.contractItems || []).reduce((acc: number, curr: any) => acc + (curr.totalKg * (curr.valuePerKg || 0)), 0),
          contractItems: p.contractItems || [],
          deliveries: Array.from(new Map([...(p.deliveries || []), ...(existingSupplier?.deliveries || [])].filter(d => d && d.id).map(d => [d.id, d])).values()),
          allowedWeeks: finalWeeks,
          address: p.address || '',
          city: p.city || '',
          processNumber: p.processNumber || ''
        };
        return (
          <Dashboard 
            supplier={mappedSupplier} 
            type={user.role === 'producer' ? 'PRODUTOR' : 'FORNECEDOR'}
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
      return null;
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
