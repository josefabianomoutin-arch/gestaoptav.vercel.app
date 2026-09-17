
import React, { useState, useMemo } from 'react';
import type { 
  VehicleExitOrder, 
  VehicleAsset, 
  DriverAsset, 
  ValidationRole, 
  VehicleInspection, 
  PublicInfo, 
  ServiceOrder, 
  MaintenanceSchedule, 
  EnergyAccountingRecord,
  WarehouseMovement,
  Supplier
} from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import AdminServiceOrder from './AdminServiceOrder';
import AdminTaiuvaEnergyAccounting from './AdminTaiuvaEnergyAccounting';
import AdminWarehouseLog from './AdminWarehouseLog';
import { PoliciaPenalLogo } from './PoliciaPenalLogo';
import { Car, Wrench, Zap, Package, Layers } from 'lucide-react';

interface VehicleOrderDashboardProps {
  orders: VehicleExitOrder[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  validationRoles: ValidationRole[];
  vehicleInspections?: VehicleInspection[];
  serviceOrders?: ServiceOrder[];
  maintenanceSchedules?: MaintenanceSchedule[];
  energyAccountingRecords?: Record<string, EnergyAccountingRecord>;
  warehouseLog?: WarehouseMovement[];
  suppliers?: Supplier[];
  perCapitaConfig?: any;
  onSaveEnergyAccountingRecord?: (record: EnergyAccountingRecord) => Promise<{ success: boolean; message: string }>;
  onDeleteEnergyAccountingRecord?: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegister: (order: Omit<VehicleExitOrder, 'id'>) => Promise<{ success: boolean; message: string; id?: string }>;
  onUpdate: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleAsset: (asset: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset: (asset: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterDriverAsset: (asset: Omit<DriverAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDriverAsset: (asset: DriverAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteDriverAsset: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleInspection?: (inspection: Omit<VehicleInspection, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleInspection?: (inspection: VehicleInspection) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleInspection?: (id: string) => Promise<{ success: boolean; message: string }>;
  onUpdateServiceOrder?: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteServiceOrder?: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterMaintenanceSchedule?: (schedule: Omit<MaintenanceSchedule, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateMaintenanceSchedule?: (idOrSchedule: string | MaintenanceSchedule, updates?: Partial<MaintenanceSchedule>) => Promise<{ success: boolean; message: string }>;
  onDeleteMaintenanceSchedule?: (id: string) => Promise<{ success: boolean; message: string }>;
  systemPasswords?: Record<string, string>;
  onLogout: () => void;
  role?: 'infraestrutura' | 'ordem_saida';
  [key: string]: any;
}

const EMPTY_ENERGY_RECORDS: Record<string, EnergyAccountingRecord> = {};

const VehicleOrderDashboard: React.FC<VehicleOrderDashboardProps> = ({
  orders = [],
  vehicleAssets = [],
  driverAssets = [],
  validationRoles = [],
  vehicleInspections = [],
  serviceOrders = [],
  maintenanceSchedules = [],
  energyAccountingRecords = EMPTY_ENERGY_RECORDS,
  warehouseLog = [],
  suppliers = [],
  perCapitaConfig,
  onSaveEnergyAccountingRecord,
  onDeleteEnergyAccountingRecord,
  onRegister,
  onUpdate,
  onDelete,
  onRegisterVehicleAsset,
  onUpdateVehicleAsset,
  onDeleteVehicleAsset,
  onRegisterDriverAsset,
  onUpdateDriverAsset,
  onDeleteDriverAsset,
  onRegisterVehicleInspection,
  onUpdateVehicleInspection,
  onDeleteVehicleInspection,
  onUpdateServiceOrder,
  onDeleteServiceOrder,
  onRegisterMaintenanceSchedule,
  onUpdateMaintenanceSchedule,
  onDeleteMaintenanceSchedule,
  systemPasswords = {},
  onLogout,
  role
}) => {
  const [activeTab, setActiveTab] = useState<'veiculos' | 'servicos' | 'energia' | 'estoque'>('veiculos');
  const [estoqueSubTab, setEstoqueSubTab] = useState<'history' | 'invoice_deduction' | 'invoice_lookup'>('history');
  const filteredOrders = orders;

  // Fallbacks with local storage cache to ensure instant consultation
  const effectiveWarehouseLog = useMemo(() => {
    if (warehouseLog && warehouseLog.length > 0) return warehouseLog;
    try {
      const saved = localStorage.getItem('cached_warehouseLog');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [warehouseLog]);

  const effectiveSuppliers = useMemo(() => {
    if (suppliers && suppliers.length > 0) return suppliers;
    try {
      const saved = localStorage.getItem('cached_suppliers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }, [suppliers]);

  const effectivePerCapitaConfig = useMemo(() => {
    if (perCapitaConfig) return perCapitaConfig;
    try {
      const saved = localStorage.getItem('cached_perCapitaConfig');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  }, [perCapitaConfig]);

  const handleRegister = async (order: Omit<VehicleExitOrder, 'id'>) => {
    return await onRegister(order);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white text-indigo-950 p-4 shadow-sm flex flex-col md:flex-row justify-between items-center sticky top-0 z-50 border-b border-gray-200 gap-4">
        <div className="flex flex-wrap items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50/80 p-1 rounded-2xl border border-indigo-100 shadow-xs flex items-center justify-center">
              <PoliciaPenalLogo className="h-9 w-auto object-contain max-w-[36px]" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none text-indigo-950">
                {role === 'infraestrutura' ? 'Infraestrutura' : 'Ordem de Saída'}
              </h1>
              <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest mt-0.5">
                Unidade de Taiúva • infra2026
              </p>
            </div>
          </div>

          {/* Logout button on mobile */}
          <button 
            onClick={onLogout} 
            className="md:hidden bg-red-50 hover:bg-red-100 text-red-600 font-black py-2 px-4 rounded-xl text-[10px] uppercase transition-all border border-red-200"
          >
            Sair
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('veiculos')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'veiculos'
                ? 'bg-white text-indigo-950 shadow-sm border border-gray-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
            }`}
          >
            <Car className="h-4 w-4 text-indigo-600" />
            Ordens de Saída / Frota
          </button>

          {role === 'infraestrutura' && (
            <>
              <button
                onClick={() => setActiveTab('servicos')}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'servicos'
                    ? 'bg-white text-indigo-950 shadow-sm border border-gray-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Wrench className="h-4 w-4 text-indigo-600" />
                Ordens de Serviço
              </button>

              <button
                onClick={() => setActiveTab('energia')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'energia'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md border border-amber-400 font-black'
                    : 'text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100/80 border border-amber-200'
                }`}
              >
                <Zap className={`h-4 w-4 ${activeTab === 'energia' ? 'fill-current text-slate-950' : 'text-amber-600'}`} />
                Consumo de Energia (Taiúva)
              </button>

              <button
                onClick={() => {
                  setActiveTab('estoque');
                  setEstoqueSubTab('history');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'estoque' && estoqueSubTab === 'history'
                    ? 'bg-white text-indigo-950 shadow-sm border border-gray-200 font-black'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <Package className="h-4 w-4 text-indigo-600" />
                Estoque (Consulta)
              </button>

              <button
                onClick={() => {
                  setActiveTab('estoque');
                  setEstoqueSubTab('invoice_deduction');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 whitespace-nowrap ${
                  activeTab === 'estoque' && estoqueSubTab === 'invoice_deduction'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md border border-amber-400 font-black'
                    : 'text-amber-800 hover:text-amber-950 bg-amber-50/80 hover:bg-amber-100 border border-amber-200/80'
                }`}
              >
                <Layers className={`h-4 w-4 ${activeTab === 'estoque' && estoqueSubTab === 'invoice_deduction' ? 'fill-current text-slate-950' : 'text-amber-600'}`} />
                Mapa de NFs & Dedução
              </button>
            </>
          )}
        </div>

        {/* Desktop logout */}
        <button 
          onClick={onLogout} 
          className="hidden md:block bg-red-50 hover:bg-red-100 text-red-600 font-black py-2 px-4 rounded-xl text-[10px] uppercase transition-all border border-red-200 active:scale-95"
        >
          Sair
        </button>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {activeTab === 'veiculos' && (
          <AdminVehicleExitOrder 
            orders={filteredOrders}
            vehicleAssets={vehicleAssets}
            driverAssets={driverAssets}
            validationRoles={validationRoles}
            inspections={vehicleInspections}
            onRegister={handleRegister}
            onUpdate={onUpdate}
            onDelete={onDelete}
            onRegisterVehicleAsset={onRegisterVehicleAsset}
            onUpdateVehicleAsset={onUpdateVehicleAsset}
            onDeleteVehicleAsset={onDeleteVehicleAsset}
            onRegisterDriverAsset={onRegisterDriverAsset}
            onUpdateDriverAsset={onUpdateDriverAsset}
            onDeleteDriverAsset={onDeleteDriverAsset}
            onRegisterInspection={onRegisterVehicleInspection}
            onUpdateInspection={onUpdateVehicleInspection}
            onDeleteInspection={onDeleteVehicleInspection}
            readOnly={false}
            hideAssets={true}
            hideEdit={false}
            showGateTab={true}
            allowDelete={true}
            userRole={role}
          />
        )}

        {activeTab === 'servicos' && onUpdateServiceOrder && onDeleteServiceOrder && (
          <AdminServiceOrder
            orders={serviceOrders}
            onUpdate={onUpdateServiceOrder}
            onDelete={onDeleteServiceOrder}
            maintenanceSchedules={maintenanceSchedules}
            onRegisterMaintenanceSchedule={onRegisterMaintenanceSchedule}
            onUpdateMaintenanceSchedule={onUpdateMaintenanceSchedule}
            onDeleteMaintenanceSchedule={onDeleteMaintenanceSchedule}
            systemPasswords={systemPasswords}
          />
        )}

        {activeTab === 'energia' && (
          <AdminTaiuvaEnergyAccounting
            records={energyAccountingRecords}
            onSaveRecord={onSaveEnergyAccountingRecord}
            onDeleteRecord={onDeleteEnergyAccountingRecord}
            userRole={role}
            onNavigateToDeductionMap={() => {
              setActiveTab('estoque');
              setEstoqueSubTab('invoice_deduction');
            }}
            onNavigateToEstoque={() => {
              setActiveTab('estoque');
              setEstoqueSubTab('history');
            }}
          />
        )}

        {activeTab === 'estoque' && (
          <div className="space-y-4">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl border border-indigo-100">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs md:text-sm font-black uppercase tracking-tight text-indigo-950 leading-none">
                    Módulo de Estoque e Almoxarifado • Consulta
                  </h3>
                  <p className="text-[10px] md:text-xs text-gray-500 font-medium mt-1">
                    Visualização de movimentações, histórico de estoque e Mapa de NFs & Dedução Contratual em tempo real
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Modo Consulta Ativo
                </span>
              </div>
            </div>

            <AdminWarehouseLog
              warehouseLog={effectiveWarehouseLog}
              suppliers={effectiveSuppliers}
              perCapitaConfig={effectivePerCapitaConfig}
              activeSubTab={estoqueSubTab}
              onSubTabChange={(tab) => setEstoqueSubTab(tab)}
              initialSubTab={estoqueSubTab}
              readOnly={true}
            />
          </div>
        )}
      </main>
    </div>
  );
};

export default VehicleOrderDashboard;

