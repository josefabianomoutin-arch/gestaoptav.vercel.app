
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { Supplier, Delivery, WarehouseMovement, PerCapitaConfig, CleaningLog, DirectorPerCapitaLog, StandardMenu, DailyMenus, MenuRow, ContractItem, FinancialRecord, UserRole, ThirdPartyEntryLog, AcquisitionItem, VehicleExitOrder, VehicleAsset, DriverAsset, DailyAllowance, Staff, ValidationRole, VehicleInspection, ServiceOrder, MaintenanceSchedule, PublicInfo } from './types';
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
import { getDatabase, ref, onValue, set, runTransaction, push, child, update, remove, get } from 'firebase/database';
import { ref as storageRef, uploadString, getDownloadURL, uploadBytes } from 'firebase/storage';
import { app, storage } from './firebaseConfig';

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
  const [dailyAllowances, setDailyAllowances] = useState<DailyAllowance[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [validationRoles, setValidationRoles] = useState<ValidationRole[]>([]);
  const [systemPasswords, setSystemPasswords] = useState<Record<string, string>>({});
  const [maintenanceSchedules, setMaintenanceSchedules] = useState<MaintenanceSchedule[]>([]);
  const [publicInfo, setPublicInfo] = useState<PublicInfo[]>([]);

  useEffect(() => {
    if (!database) return;

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
      setSuppliers(data ? Object.values(data) : []);
    });
    onValue(warehouseLogRef, (snapshot) => {
      const data = snapshot.val();
      setWarehouseLog(data ? Object.values(data) : []);
    });
    onValue(perCapitaConfigRef, (snapshot) => {
      setPerCapitaConfig(snapshot.val() || {});
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
      setThirdPartyEntries(data ? Object.values(data) : []);
    });
    onValue(acquisitionItemsRef, (snapshot) => {
      const data = snapshot.val();
      setAcquisitionItems(data ? Object.values(data) : []);
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
    } catch (error) {
      console.error('Erro ao registrar agendamento:', error);
      toast.error('Erro ao registrar agendamento.');
    }
  };

  const handleUpdateMaintenanceSchedule = async (id: string, updates: Partial<MaintenanceSchedule>) => {
    try {
      const scheduleRef = child(maintenanceSchedulesRef, id);
      await update(scheduleRef, updates);
      toast.success('Agendamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error);
      toast.error('Erro ao atualizar agendamento.');
    }
  };

  const handleDeleteMaintenanceSchedule = async (id: string) => {
    try {
      const scheduleRef = child(maintenanceSchedulesRef, id);
      await remove(scheduleRef);
      toast.success('Agendamento removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover agendamento:', error);
      toast.error('Erro ao remover agendamento.');
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
    const supplier = suppliers.find(s => s.cpf.replace(/\D/g, '') === numericPass);
    if (supplier) {
      setUser({ name: supplier.name, cpf: supplier.cpf, role: 'supplier' });
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
    
    return false;
  };

  const handleUpdateSystemPassword = async (key: string, newPassword: string) => {
    try {
      await set(child(systemPasswordsRef, key), newPassword);
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return { success: false, message: String(error) };
    }
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
    if (producers.length === 0) {
      toast.error('Nenhum produtor PPAIS cadastrado.');
      return;
    }

    const year = 2026;
    const monthNames = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];

    try {
      for (const producer of producers) {
        // Calculate weeks for May-Dec
        const newWeeks: number[] = [];
        for (let m = 4; m <= 11; m++) { // May (index 4) to Dec (index 11)
          const monthName = monthNames[m];
          const weekOfMonthList = producer.monthlySchedule?.[monthName.charAt(0).toUpperCase() + monthName.slice(1)] || producer.monthlySchedule?.[monthName] || [];
          
          const daysInMonth = new Date(year, m + 1, 0).getDate();
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, m, day);
            const weekOfYear = getWeekNumber(date);
            const weekOfMonth = Math.ceil(day / 7);
            if ((weekOfMonthList as any).includes(weekOfMonth)) {
              newWeeks.push(weekOfYear);
            }
          }
        }
        const uniqueNewWeeks = Array.from(new Set(newWeeks));

        const supplierRef = child(suppliersRef, producer.cpfCnpj);
        const snapshot = await get(supplierRef);
        const existingSupplier = snapshot.val() as Supplier | null;

        if (existingSupplier) {
          // Update existing: keep Jan-Apr weeks, replace May-Dec
          const janAprWeeks: number[] = [];
          for (let m = 0; m <= 3; m++) {
             const daysInMonth = new Date(year, m + 1, 0).getDate();
             for (let day = 1; day <= daysInMonth; day++) {
               janAprWeeks.push(getWeekNumber(new Date(year, m, day)));
             }
          }
          const janAprWeeksSet = new Set(janAprWeeks);
          
          const currentJanAprWeeks = (existingSupplier.allowedWeeks || []).filter(w => janAprWeeksSet.has(w));
          const updatedWeeks = Array.from(new Set([...currentJanAprWeeks, ...uniqueNewWeeks]));
          
          await update(supplierRef, { allowedWeeks: updatedWeeks });
        } else {
          // New producer
          const newSupplier: Supplier = {
            name: producer.name,
            cpf: producer.cpfCnpj,
            initialValue: 0,
            contractItems: producer.contractItems || [],
            deliveries: [],
            allowedWeeks: uniqueNewWeeks,
            address: producer.address || '',
            city: producer.city || '',
            processNumber: producer.processNumber || ''
          };
          await set(supplierRef, newSupplier);
        }
      }
      toast.success('Agenda sincronizada com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar agenda:', error);
      toast.error('Erro ao sincronizar agenda.');
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
      // Check main suppliers
      const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
      if (isMainSupplier) {
        const supplierRef = child(suppliersRef, supplierCpf);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao agendar entrega')), 10000));
        
        await Promise.race([
          runTransaction(supplierRef, (currentData: Supplier) => {
            if (currentData) {
              const deliveries = currentData.deliveries || [];
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

      // Check Per Capita suppliers
      const timeoutPromisePC = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao agendar entrega Per Capita')), 10000));
      await Promise.race([
        runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
          if (currentData) {
            const findAndAdd = (list: any[] | undefined) => {
              const s = list?.find(p => p.cpfCnpj === supplierCpf);
              if (s) {
                const deliveries = s.deliveries || [];
                deliveries.push({
                  id: `del-${Date.now()}`,
                  date,
                  time,
                  item: 'AGENDAMENTO PENDENTE',
                  invoiceUploaded: false
                });
                s.deliveries = deliveries;
                return true;
              }
              return false;
            };
            if (!findAndAdd(currentData.ppaisProducers)) {
              findAndAdd(currentData.pereciveisSuppliers);
            }
          }
          return currentData;
        }),
        timeoutPromisePC
      ]);
    } catch (error) {
      console.error('Erro ao agendar entrega:', error);
      // alert is not allowed, but this function doesn't return anything to the UI easily
      // We'll just log it for now.
    }
  };

  const handleCancelDeliveries = useCallback(async (supplierCpf: string, deliveryIds: string[]) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      await runTransaction(supplierRef, (currentData: Supplier) => {
        if (currentData) {
          currentData.deliveries = (currentData.deliveries || []).filter(d => !deliveryIds.includes(d.id));
        }
        return currentData;
      });
      return;
    }

    await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
      if (currentData) {
        const findAndCancel = (list: any[] | undefined) => {
          const s = list?.find(p => p.cpfCnpj === supplierCpf);
          if (s) {
            s.deliveries = (s.deliveries || []).filter((d: any) => !deliveryIds.includes(d.id));
            return true;
          }
          return false;
        };
        if (!findAndCancel(currentData.ppaisProducers)) {
          findAndCancel(currentData.pereciveisSuppliers);
        }
      }
      return currentData;
    });
  }, [suppliers]);

  const handleSaveInvoice = useCallback(async (supplierCpf: string, deliveryIds: string[], invoiceNumber: string, invoiceUrl: string, updatedDeliveries: Delivery[], invoiceDate?: string) => {
    const toastId = toast.loading('Enviando nota fiscal...');
    try {
      console.log('Iniciando handleSaveInvoice:', { supplierCpf, deliveryIds, invoiceNumber, updatedDeliveries });
      let finalInvoiceUrl = invoiceUrl;

      // 1. Upload do Arquivo
      if (invoiceUrl.startsWith('data:')) {
        try {
          const invoiceId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}.pdf`;
          const fileRef = storageRef(storage, `invoices/${invoiceId}`);
          
          // Converter base64 para Blob para um upload mais estável
          const base64Data = invoiceUrl.split(',')[1];
          const contentType = invoiceUrl.split(',')[0].split(':')[1].split(';')[0];
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: contentType });
          
          console.log('Fazendo upload para o Storage (Blob)...', blob.size);
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
          
          // Se o storage falhar, tentamos salvar no RTDB apenas se o arquivo não for gigante
          if (invoiceUrl.length > 500000) { // ~500KB limit for RTDB strings to avoid hanging
             throw new Error("O arquivo é muito grande para o servidor de backup. Tente um arquivo menor ou verifique sua conexão.");
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
          let deliveries = [...(currentData.deliveries || [])];
          let updated = false;
          
          // 1. Update existing deliveries
          deliveries.forEach(d => {
            if (deliveryIds.includes(d.id)) {
              const updatedDelivery = updatedDeliveries.find(ud => ud.id === d.id);
              d.invoiceUploaded = true;
              d.invoiceNumber = invoiceNumber;
              if (invoiceDate) d.invoiceDate = invoiceDate;
              if (finalInvoiceUrl !== undefined) d.invoiceUrl = finalInvoiceUrl;
              if (updatedDelivery) {
                d.item = updatedDelivery.item;
                d.kg = updatedDelivery.kg;
                d.value = updatedDelivery.value;
                d.lots = updatedDelivery.lots;
              }
              updated = true;
            }
          });

          // 2. Add new deliveries (items added manually in the modal)
          const newItems = updatedDeliveries.filter(ud => ud.id.startsWith('new_'));
          if (newItems.length > 0) {
            newItems.forEach(ni => {
              const newDelivery: Delivery = {
                ...ni,
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
            let deliveries = [...(list[index].deliveries || [])];
            let updated = false;
            
            deliveries.forEach((d: any) => {
              if (deliveryIds.includes(d.id)) {
                const updatedDelivery = updatedDeliveries.find(ud => ud.id === d.id);
                d.invoiceUploaded = true;
                d.invoiceNumber = invoiceNumber;
                if (invoiceDate) d.invoiceDate = invoiceDate;
                if (finalInvoiceUrl !== undefined) d.invoiceUrl = finalInvoiceUrl;
                if (updatedDelivery) {
                  d.item = updatedDelivery.item;
                  d.kg = updatedDelivery.kg;
                  d.value = updatedDelivery.value;
                  d.lots = updatedDelivery.lots;
                }
                updated = true;
              }
            });

            const newItems = updatedDeliveries.filter(ud => ud.id.startsWith('new_'));
            if (newItems.length > 0) {
              newItems.forEach(ni => {
                const newDelivery: Delivery = {
                  ...ni,
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
              found = true;
              return true;
            }
          }
          return false;
        };

        if (!(await updateList(currentPC.ppaisProducers, 'ppaisProducers'))) {
          await updateList(currentPC.pereciveisSuppliers, 'pereciveisSuppliers');
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

  const handleMarkArrival = async (supplierCpf: string, deliveryId: string) => {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      await runTransaction(supplierRef, (currentData: Supplier) => {
        if (currentData && currentData.deliveries) {
          currentData.deliveries = currentData.deliveries.map(d => {
            if (d.id === deliveryId) {
              return { ...d, arrivalTime: currentTime };
            }
            return d;
          });
        }
        return currentData;
      });
      return;
    }

    await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
      if (currentData) {
        const findAndMark = (list: any[] | undefined) => {
          const s = list?.find(p => p.cpfCnpj === supplierCpf);
          if (s && s.deliveries) {
            s.deliveries = s.deliveries.map((d: any) => {
              if (d.id === deliveryId) {
                return { ...d, arrivalTime: currentTime };
              }
              return d;
            });
            return true;
          }
          return false;
        };
        if (!findAndMark(currentData.ppaisProducers)) {
          findAndMark(currentData.pereciveisSuppliers);
        }
      }
      return currentData;
    });
  };

  // --- GERENCIAMENTO DE NOTAS FISCAIS (ADMIN) ---

  const handleUpdateInvoiceItems = async (supplierCpf: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], barcode?: string, newInvoiceNumber?: string, newDate?: string, receiptTermNumber?: string, invoiceDate?: string, nl?: string, pd?: string) => {
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
            const finalNl = nl !== undefined ? nl : existingForNf[0].nl;
            const finalPd = pd !== undefined ? pd : existingForNf[0].pd;
            const existingInvoiceUrl = existingForNf.find(d => d.invoiceUrl)?.invoiceUrl;

            // Remove itens antigos daquela nota
            currentData.deliveries = currentData.deliveries.filter(d => d.invoiceNumber !== invoiceNumber);

            // Insere novos itens editados
            items.forEach((item, idx) => {
              const newDelivery: any = {
                id: `inv-edit-${Date.now()}-${idx}`,
                date: baseDate,
                time: baseTime,
                item: item.name,
                kg: item.kg,
                value: item.value,
                invoiceUploaded: true,
                invoiceNumber: String(finalInvoiceNumber || '').trim(),
                lots: [{
                  id: `lot-edit-${Date.now()}-${idx}`,
                  lotNumber: item.lotNumber || 'EDITADO',
                  initialQuantity: item.kg,
                  remainingQuantity: item.kg
                }]
              };

              if (existingInvoiceUrl !== undefined) newDelivery.invoiceUrl = existingInvoiceUrl;
              if (finalInvoiceDate !== undefined) newDelivery.invoiceDate = finalInvoiceDate;
              if (barcode !== undefined) newDelivery.barcode = barcode;
              if (finalReceiptTerm !== undefined) newDelivery.receiptTermNumber = finalReceiptTerm;
              if (finalNl !== undefined) newDelivery.nl = finalNl;
              if (finalPd !== undefined) newDelivery.pd = finalPd;
              if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

              currentData.deliveries.push(newDelivery);
            });
          }
          return currentData;
        });
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
              const finalNl = nl !== undefined ? nl : existingForNf[0].nl;
              const finalPd = pd !== undefined ? pd : existingForNf[0].pd;
              const existingInvoiceUrl = existingForNf.find((d: any) => d.invoiceUrl)?.invoiceUrl;

              s.deliveries = s.deliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);

              items.forEach((item, idx) => {
                const newDelivery: any = {
                  id: `inv-edit-${Date.now()}-${idx}`,
                  date: baseDate,
                  time: baseTime,
                  item: item.name,
                  kg: item.kg,
                  value: item.value,
                  invoiceUploaded: true,
                  invoiceNumber: String(finalInvoiceNumber || '').trim(),
                  lots: [{
                    id: `lot-edit-${Date.now()}-${idx}`,
                    lotNumber: item.lotNumber || 'EDITADO',
                    initialQuantity: item.kg,
                    remainingQuantity: item.kg
                  }]
                };

                if (existingInvoiceUrl !== undefined) newDelivery.invoiceUrl = existingInvoiceUrl;
                if (finalInvoiceDate !== undefined) newDelivery.invoiceDate = finalInvoiceDate;
                if (barcode !== undefined) newDelivery.barcode = barcode;
                if (finalReceiptTerm !== undefined) newDelivery.receiptTermNumber = finalReceiptTerm;
                if (finalNl !== undefined) newDelivery.nl = finalNl;
                if (finalPd !== undefined) newDelivery.pd = finalPd;
                if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

                s.deliveries.push(newDelivery);
              });
              return true;
            }
            return false;
          };
          if (!findAndUpdate(currentData.ppaisProducers)) {
            findAndUpdate(currentData.pereciveisSuppliers);
          }
        }
        return currentData;
      });
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
        
        // Converter base64 para Blob para um upload mais estável
        const base64Data = invoiceUrl.split(',')[1];
        const contentType = invoiceUrl.split(',')[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });

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
             throw new Error("O arquivo é muito grande para o servidor de backup. Tente um arquivo menor ou verifique sua conexão.");
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
            found = true;
            return true;
          }
          return false;
        };

        if (!(await updateList(currentData.ppaisProducers, 'ppaisProducers'))) {
          await updateList(currentData.pereciveisSuppliers, 'pereciveisSuppliers');
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
  }, [suppliers, suppliersRef, perCapitaConfigRef]);

  const handleMarkInvoiceAsOpened = useCallback(async (supplierCpf: string, invoiceNumber: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      try {
        await runTransaction(supplierRef, (currentData: Supplier) => {
          if (currentData && currentData.deliveries) {
            currentData.deliveries = currentData.deliveries.map(d => {
              if (d.invoiceNumber === invoiceNumber && !d.opened) {
                return { ...d, opened: true };
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
                if (d.invoiceNumber === invoiceNumber && !d.opened) {
                  return { ...d, opened: true };
                }
                return d;
              });
              return true;
            }
            return false;
          };
          if (!findAndMark(currentData.ppaisProducers)) {
            findAndMark(currentData.pereciveisSuppliers);
          }
        }
        return currentData;
      });
      return { success: true };
    } catch (e) {
      console.error("Error marking per capita invoice as opened:", e);
      return { success: false };
    }
  }, [suppliers, suppliersRef, perCapitaConfigRef]);

  const handleReopenInvoice = async (supplierCpf: string, invoiceNumber: string) => {
    const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
    if (isMainSupplier) {
      const supplierRef = child(suppliersRef, supplierCpf);
      await runTransaction(supplierRef, (currentData: Supplier) => {
        if (currentData && currentData.deliveries) {
          const entriesForNf = currentData.deliveries.filter(d => d.invoiceNumber === invoiceNumber);
          if (entriesForNf.length === 0) return currentData;

          const baseDate = entriesForNf[0].date;
          const baseTime = entriesForNf[0].time;

          // Remove itens faturados
          currentData.deliveries = currentData.deliveries.filter(d => d.invoiceNumber !== invoiceNumber);

          // Volta para um agendamento pendente
          currentData.deliveries.push({
            id: `reopen-${Date.now()}`,
            date: baseDate,
            time: baseTime,
            item: 'AGENDAMENTO PENDENTE',
            invoiceUploaded: false
          });
        }
        return currentData;
      });
      return;
    }

    await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
      if (currentData) {
        const findAndReopen = (list: any[] | undefined) => {
          const s = list?.find(p => p.cpfCnpj === supplierCpf);
          if (s && s.deliveries) {
            const entriesForNf = s.deliveries.filter((d: any) => d.invoiceNumber === invoiceNumber);
            if (entriesForNf.length === 0) return false;

            const baseDate = entriesForNf[0].date;
            const baseTime = entriesForNf[0].time;

            s.deliveries = s.deliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);

            s.deliveries.push({
              id: `reopen-${Date.now()}`,
              date: baseDate,
              time: baseTime,
              item: 'AGENDAMENTO PENDENTE',
              invoiceUploaded: false
            });
            return true;
          }
          return false;
        };
        if (!findAndReopen(currentData.ppaisProducers)) {
          findAndReopen(currentData.pereciveisSuppliers);
        }
      }
      return currentData;
    });
  };

  const handleDeleteInvoice = async (supplierCpf: string, invoiceNumber: string, retries = 5) => {
    console.log('handleDeleteInvoice chamado:', supplierCpf, invoiceNumber);
    for (let i = 0; i < retries; i++) {
      try {
        const isMainSupplier = suppliers.some(s => s.cpf === supplierCpf);
        if (isMainSupplier) {
          const supplierRef = child(suppliersRef, supplierCpf);
          console.log(`Iniciando transação MainSupplier (tentativa ${i + 1}):`, supplierCpf);
          await runTransaction(supplierRef, (currentData: Supplier) => {
            if (currentData && currentData.deliveries) {
              console.log('MainSupplier - deliveries antes:', currentData.deliveries.length);
              currentData.deliveries = currentData.deliveries.filter(d => d.invoiceNumber !== invoiceNumber);
              console.log('MainSupplier - deliveries depois:', currentData.deliveries.length);
            }
            return currentData;
          });
          console.log('Transação de exclusão concluída para MainSupplier');
          return { success: true };
        }

        console.log(`Iniciando transação PerCapita (tentativa ${i + 1})`);
        await runTransaction(perCapitaConfigRef, (currentData: PerCapitaConfig) => {
          if (currentData) {
            const findAndDelete = (list: any[] | undefined) => {
              const s = list?.find(p => p.cpfCnpj === supplierCpf);
              if (s && s.deliveries) {
                console.log('PerCapita - deliveries antes:', s.deliveries.length);
                s.deliveries = s.deliveries.filter((d: any) => d.invoiceNumber !== invoiceNumber);
                console.log('PerCapita - deliveries depois:', s.deliveries.length);
                return true;
              }
              return false;
            };
            if (!findAndDelete(currentData.ppaisProducers)) {
              findAndDelete(currentData.pereciveisSuppliers);
            }
          }
          return currentData;
        });
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

  const handleManualInvoiceEntry = async (supplierCpf: string, date: string, invoiceNumber: string, items: { name: string; kg: number; value: number; lotNumber?: string; expirationDate?: string }[], barcode?: string, receiptTermNumber?: string, invoiceDate?: string, nl?: string, pd?: string) => {
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
            type: 'entrada',
            timestamp: new Date().toISOString(),
            date: invoiceDate || date,
            itemName: item.name,
            supplierName: supplierName,
            lotNumber: item.lotNumber || 'MANUAL',
            quantity: item.kg,
            inboundInvoice: String(invoiceNumber || '').trim(),
            barcode: barcode || '',
            lotId: lotId,
            deliveryId: ''
        };
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
            const deliveries = currentData.deliveries || [];
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
                lots: [{
                  id: le.lotId,
                  lotNumber: item.lotNumber || 'MANUAL',
                  initialQuantity: item.kg,
                  remainingQuantity: item.kg
                }]
              };

              if (invoiceDate !== undefined) newDelivery.invoiceDate = invoiceDate;
              if (barcode !== undefined) newDelivery.barcode = barcode;
              if (receiptTermNumber !== undefined) newDelivery.receiptTermNumber = receiptTermNumber;
              if (nl !== undefined) newDelivery.nl = nl;
              if (pd !== undefined) newDelivery.pd = pd;
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
                const deliveries = s.deliveries || [];
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
                    lots: [{
                      id: le.lotId,
                      lotNumber: item.lotNumber || 'MANUAL',
                      initialQuantity: item.kg,
                      remainingQuantity: item.kg
                    }]
                  };

                  if (invoiceDate !== undefined) newDelivery.invoiceDate = invoiceDate;
                  if (barcode !== undefined) newDelivery.barcode = barcode;
                  if (receiptTermNumber !== undefined) newDelivery.receiptTermNumber = receiptTermNumber;
                  if (nl !== undefined) newDelivery.nl = nl;
                  if (pd !== undefined) newDelivery.pd = pd;
                  if (item.expirationDate !== undefined) newDelivery.lots[0].expirationDate = item.expirationDate;

                  deliveries.push(newDelivery);
                });
                s.deliveries = deliveries;
                return true;
              }
              return false;
            };
            if (!findAndAdd(currentData.ppaisProducers)) {
              findAndAdd(currentData.pereciveisSuppliers);
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
              becCode: assignment.becCode || ''
            });
          }
          
          data.contractItems = otherItems;
          // Recalcula o valor inicial do contrato
          data.initialValue = otherItems.reduce((acc, curr) => acc + (Number(curr.totalKg || 0) * Number(curr.valuePerKg || 0)), 0);
          
          return data;
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
    const itemRef = child(acquisitionItemsRef, item.id);
    await set(itemRef, item);
  };

  const handleDeleteAcquisitionItem = async (id: string) => {
    const itemRef = child(acquisitionItemsRef, id);
    await remove(itemRef);
  };

  const handleRegisterWarehouseEntry = async (payload: any) => {
    try {
        const newRef = push(warehouseLogRef);
        const supplier = suppliers.find(s => s.cpf === payload.supplierCpf);
        const lotId = `lot-${Date.now()}`;
        const entry: any = {
            id: newRef.key || `ent-${Date.now()}`,
            type: 'entrada',
            timestamp: new Date().toISOString(),
            date: payload.invoiceDate || new Date().toISOString().split('T')[0],
            itemName: payload.itemName,
            supplierName: supplier?.name || 'Desconhecido',
            lotNumber: payload.lotNumber,
            quantity: payload.quantity,
            barcode: payload.barcode || '',
            lotId: lotId,
            deliveryId: ''
        };
        if (payload.invoiceNumber !== undefined) entry.inboundInvoice = payload.invoiceNumber;
        if (payload.expirationDate !== undefined) entry.expirationDate = payload.expirationDate;

        await set(newRef, entry);

        // Sincronizar com as entregas do fornecedor para aparecer na Consulta de Notas Fiscais
        if (supplier) {
            const sRef = child(suppliersRef, supplier.cpf);
            await runTransaction(sRef, (currentData: Supplier) => {
                if (currentData) {
                    const deliveries = currentData.deliveries || [];
                    const contract = currentData.contractItems.find(ci => ci.name === payload.itemName);
                    const value = contract ? (payload.quantity * contract.valuePerKg) : 0;
                    
                    deliveries.push({
                        id: `sync-${Date.now()}`,
                        date: payload.invoiceDate || new Date().toISOString().split('T')[0],
                        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
                        item: payload.itemName,
                        kg: payload.quantity,
                        value: value,
                        invoiceUploaded: true,
                        invoiceNumber: String(payload.invoiceNumber || '').trim(),
                        barcode: payload.barcode || '',
                        lots: [{
                            id: lotId,
                            lotNumber: payload.lotNumber,
                            initialQuantity: payload.quantity,
                            remainingQuantity: payload.quantity,
                            expirationDate: payload.expirationDate
                        }]
                    });
                    currentData.deliveries = deliveries;
                }
                return currentData;
            });
        }

        return { success: true, message: 'Entrada registrada' };
    } catch (e) {
        console.error('Erro ao registrar entrada:', e);
        return { success: false, message: 'Falha na conexão: ' + (e instanceof Error ? e.message : String(e)) };
    }
  };

  const handleRegisterWarehouseWithdrawal = async (payload: any) => {
    try {
        const newRef = push(warehouseLogRef);
        const supplier = suppliers.find(s => s.cpf === payload.supplierCpf);
        
        // --- Atualiza o saldo no lote do fornecedor ---
        if (supplier) {
            const sRef = child(suppliersRef, supplier.cpf);
            await runTransaction(sRef, (currentData: Supplier) => {
                if (currentData && currentData.deliveries) {
                    const delivery = currentData.deliveries.find(d => 
                        d.item === payload.itemName && 
                        d.invoiceNumber === payload.inboundInvoice
                    );
                    if (delivery && delivery.lots) {
                        const lot = delivery.lots.find(l => l.lotNumber === payload.lotNumber);
                        if (lot) {
                            lot.remainingQuantity = (lot.remainingQuantity || 0) - payload.quantity;
                        }
                    }
                }
                return currentData;
            });
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
        return { success: true, message: 'Saída registrada' };
    } catch (e) {
        console.error('Erro ao registrar saída:', e);
        return { success: false, message: 'Falha na conexão: ' + (e instanceof Error ? e.message : String(e)) };
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
    } catch (e) {
      return { success: false, message: 'Falha ao zerar registros de saída.' };
    }
  };

  const renderContent = () => {
    if (!user) {
      return <LoginScreen onLogin={handleLogin} publicInfoList={publicInfo} />;
    }

    if (user.role === 'admin') {
      return (
        <AdminDashboard 
          user={user}
          suppliers={suppliers} 
          onRegister={handleRegisterSupplier}
          onSyncPPAISToAgenda={handleSyncPPAISToAgenda}
          onUpdateSupplier={handleUpdateSupplier}
          onUpdateSupplierObservations={handleUpdateSupplierObservations}
          onLogout={handleLogout}
          warehouseLog={warehouseLog}
          perCapitaConfig={perCapitaConfig}
          onUpdatePerCapitaConfig={(c) => set(perCapitaConfigRef, c)}
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
          onRegisterMaintenanceSchedule={handleRegisterMaintenanceSchedule}
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
          onDeleteInvoice={handleDeleteInvoice}
          onUpdateInvoiceItems={handleUpdateInvoiceItems}
          onUpdateInvoiceUrl={handleUpdateInvoiceUrl}
          onManualInvoiceEntry={handleManualInvoiceEntry}
          onMarkInvoiceAsOpened={handleMarkInvoiceAsOpened}
          onDeleteWarehouseEntry={async (l) => {
              // Se for saída, devolve a quantidade para o saldo do lote
              if (l.type === 'saída') {
                  const supplier = suppliers.find(s => s.name === l.supplierName);
                  if (supplier) {
                      const sRef = child(suppliersRef, supplier.cpf);
                      await runTransaction(sRef, (currentData: Supplier) => {
                          if (currentData && currentData.deliveries) {
                              const delivery = currentData.deliveries.find(d => 
                                  d.item === l.itemName && 
                                  d.invoiceNumber === l.inboundInvoice
                              );
                              if (delivery && delivery.lots) {
                                  const lot = delivery.lots.find(lotItem => lotItem.lotNumber === l.lotNumber);
                                  if (lot) {
                                      lot.remainingQuantity = (lot.remainingQuantity || 0) + l.quantity;
                                  }
                              }
                          }
                          return currentData;
                      });
                  }
              } else if (l.type === 'entrada') {
                  // Se for entrada, remove a entrega correspondente do fornecedor
                  const supplier = suppliers.find(s => s.name === l.supplierName);
                  if (supplier) {
                      const sRef = child(suppliersRef, supplier.cpf);
                      await runTransaction(sRef, (currentData: Supplier) => {
                          if (currentData && currentData.deliveries) {
                              currentData.deliveries = currentData.deliveries.filter(d => 
                                  !(d.item === l.itemName && d.invoiceNumber === l.inboundInvoice && d.barcode === l.barcode)
                              );
                          }
                          return currentData;
                      });
                  }
              }
              await remove(child(warehouseLogRef, l.id));
              return { success: true, message: 'Excluído e saldo atualizado' };
          }}
          onUpdateWarehouseEntry={async (l) => {
              await set(child(warehouseLogRef, l.id), l);
              return { success: true, message: 'Atualizado' };
          }}
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
               suppliers={suppliers}
               thirdPartyEntries={thirdPartyEntries}
               vehicleExitOrders={vehicleExitOrders}
               vehicleAssets={vehicleAssets}
               driverAssets={driverAssets}
               validationRoles={validationRoles}
             />;
    }

    if (user.role === 'cardapio') {
      return <MenuDashboard standardMenu={standardMenu} dailyMenus={dailyMenus} suppliers={suppliers} onLogout={handleLogout} />;
    }

    if (user.role === 'almoxarifado') {
      return <AlmoxarifadoDashboard 
               suppliers={suppliers} 
               warehouseLog={warehouseLog} 
               onLogout={handleLogout} 
               onRegisterEntry={handleRegisterWarehouseEntry} 
               onRegisterWithdrawal={handleRegisterWarehouseWithdrawal} 
               onResetExits={handleResetWarehouseExits}
               onReopenInvoice={handleReopenInvoice}
               onDeleteInvoice={handleDeleteInvoice}
               onUpdateInvoiceItems={handleUpdateInvoiceItems}
               onManualInvoiceEntry={handleManualInvoiceEntry}
               onMarkInvoiceAsOpened={handleMarkInvoiceAsOpened}
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
            return remove(child(vehicleExitOrdersRef, id));
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
          onDeleteDriverAsset={async (id) => remove(child(driverAssetsRef, id))}
          onRegisterVehicleAsset={async (v) => {
            const r = push(vehicleAssetsRef);
            await set(r, { ...v, id: r.key });
            return { success: true, message: 'Veículo registrado' };
          }}
          onUpdateVehicleAsset={async (v) => {
            await set(child(vehicleAssetsRef, v.id), v);
            return { success: true, message: 'Veículo atualizado' };
          }}
          onDeleteVehicleAsset={async (id) => remove(child(vehicleAssetsRef, id))}
          onRegisterValidationRole={async (vr) => {
            const r = push(validationRolesRef);
            await set(r, { ...vr, id: r.key });
            return { success: true, message: 'Cargo de validação registrado' };
          }}
          onUpdateValidationRole={async (vr) => {
            await set(child(validationRolesRef, vr.id), vr);
            return { success: true, message: 'Cargo de validação atualizado' };
          }}
          onDeleteValidationRole={async (id) => remove(child(validationRolesRef, id))}
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
        />
      );
    }

    if (user.role === 'itesp') {
      return <ItespDashboard suppliers={suppliers} warehouseLog={warehouseLog} perCapitaConfig={perCapitaConfig} onLogout={handleLogout} />;
    }

    if (user.role === 'subportaria') {
      return (
        <SubportariaDashboard 
          suppliers={suppliers} 
          thirdPartyEntries={thirdPartyEntries}
          maintenanceSchedules={maintenanceSchedules}
          serviceOrders={serviceOrders}
          onUpdateMaintenanceSchedule={handleUpdateMaintenanceSchedule}
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
          onDeleteThirdPartyEntry={async (id) => remove(child(thirdPartyEntriesRef, id))}
        />
      );
    }

    if (user.role === 'ordem_servico') {
      return (
        <ServiceOrderDashboard
          serviceOrders={serviceOrders}
          maintenanceSchedules={maintenanceSchedules}
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
            console.log("Deleting vehicle exit order (VehicleOrderDashboard) with ID:", id);
            return remove(child(vehicleExitOrdersRef, id));
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
          onDeleteVehicleAsset={async (id) => remove(child(vehicleAssetsRef, id))}
          onRegisterDriverAsset={async (d) => {
            const r = push(driverAssetsRef);
            await set(r, { ...d, id: r.key });
            return { success: true, message: 'Ok' };
          }}
          onUpdateDriverAsset={async (d) => {
            await set(child(driverAssetsRef, d.id), d);
            return { success: true, message: 'Atualizado' };
          }}
          onDeleteDriverAsset={async (id) => remove(child(driverAssetsRef, id))}
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
          role={user.role}
        />
      );
    }

    if (user.role === 'supplier') {
      const currentMonth = new Date().getMonth();
      const isMayOrLater = currentMonth >= 4; // 0-indexed, 4 is May
      
      if (isMayOrLater) {
        // Check if they are in the new lists
        const inPpais = perCapitaConfig.ppaisProducers?.some(p => p.cpfCnpj === user.cpf);
        const inPereciveis = perCapitaConfig.pereciveisSuppliers?.some(p => p.cpfCnpj === user.cpf);
        
        if (!inPpais && !inPereciveis) {
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
      }

      const currentSupplier = suppliers.find(s => s.cpf === user.cpf);
      if (currentSupplier) {
        return (
          <Dashboard 
            supplier={currentSupplier} 
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

    if (user.role === 'producer' || user.role === 'pereciveis_supplier') {
      const list = user.role === 'producer' ? perCapitaConfig.ppaisProducers : perCapitaConfig.pereciveisSuppliers;
      const p = list?.find(s => s.cpfCnpj === user.cpf);
      if (p) {
        const weeks: number[] = [];
        const year = 2026;
        const monthNames = [
            'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
            'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
        ];

        Object.entries(p.monthlySchedule || {}).forEach(([monthName, weekOfMonthList]) => {
            const monthIndex = monthNames.indexOf(monthName.toLowerCase());
            if (monthIndex === -1) return;

            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const monthWeeks = new Set<number>();
            for (let day = 1; day <= daysInMonth; day++) {
                const date = new Date(year, monthIndex, day);
                const weekOfYear = getWeekNumber(date);
                const weekOfMonth = Math.ceil(day / 7);
                if ((weekOfMonthList as number[]).includes(weekOfMonth)) {
                    monthWeeks.add(weekOfYear);
                }
            }
            weeks.push(...Array.from(monthWeeks));
        });

        const mappedSupplier: Supplier = {
          name: p.name,
          cpf: p.cpfCnpj,
          initialValue: (p.contractItems || []).reduce((acc: number, curr: any) => acc + (curr.totalKg * (curr.valuePerKg || 0)), 0),
          contractItems: p.contractItems || [],
          deliveries: p.deliveries || [],
          allowedWeeks: Array.from(new Set(weeks))
        };
        return (
          <Dashboard 
            supplier={mappedSupplier} 
            type={user.role === 'producer' ? 'PRODUTOR' : 'FORNECEDOR'}
            monthlySchedule={p.monthlySchedule}
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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" richColors />
      {renderContent()}
    </div>
  );
};

export default App;
