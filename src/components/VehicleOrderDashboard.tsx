
import React, { useState } from 'react';
import { motion } from 'motion/react';
import type { VehicleExitOrder, VehicleAsset, DriverAsset, ValidationRole, ServiceOrder, VehicleInspection, MaintenanceSchedule, PublicInfo } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import AdminServiceOrder from './AdminServiceOrder';

interface VehicleOrderDashboardProps {
  orders: VehicleExitOrder[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  validationRoles: ValidationRole[];
  serviceOrders: ServiceOrder[];
  maintenanceSchedules: MaintenanceSchedule[];
  vehicleInspections?: VehicleInspection[];
  publicInfoList: PublicInfo[];
  onUpdateServiceOrder: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteServiceOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterMaintenanceSchedule: (schedule: Omit<MaintenanceSchedule, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateMaintenanceSchedule: (idOrSchedule: string | MaintenanceSchedule, updates?: Partial<MaintenanceSchedule>) => Promise<{ success: boolean; message: string }>;
  onDeleteMaintenanceSchedule: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegister: (order: Omit<VehicleExitOrder, 'id'>) => Promise<{ success: boolean; message: string; id?: string }>;
  onUpdate: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; message: string }>;
  onValidateOrder?: (id: string, validatedBy: string, validationRole: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleAsset: (asset: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset: (asset: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterDriverAsset: (asset: Omit<DriverAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDriverAsset: (asset: DriverAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteDriverAsset: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleInspection?: (inspection: Omit<VehicleInspection, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleInspection?: (inspection: VehicleInspection) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleInspection?: (id: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  role?: 'infraestrutura' | 'ordem_saida';
}

const VehicleOrderDashboard: React.FC<VehicleOrderDashboardProps> = ({
  orders = [],
  vehicleAssets = [],
  driverAssets = [],
  validationRoles = [],
  serviceOrders = [],
  maintenanceSchedules = [],
  vehicleInspections = [],
  publicInfoList = [],
  onUpdateServiceOrder,
  onDeleteServiceOrder,
  onRegisterMaintenanceSchedule,
  onUpdateMaintenanceSchedule,
  onDeleteMaintenanceSchedule,
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
  onLogout,
  role
}) => {
  const [activeTab, setActiveTab] = useState<'veiculos' | 'servicos'>('veiculos');

  const filteredOrders = orders;

  const handleRegister = async (order: Omit<VehicleExitOrder, 'id'>) => {
    return await onRegister(order);
  };

  return (
    <div className="min-h-screen bg-gray-50">
       {/* Infobar */}
       <div className="bg-blue-50 border-b border-blue-100 overflow-hidden py-2">
         <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
            <span className="text-[10px] whitespace-nowrap font-black uppercase text-blue-800 bg-blue-100 px-3 py-1 rounded-full">Comunicados:</span>
            <div className="w-full overflow-hidden">
                <motion.div 
                    className="flex gap-8 whitespace-nowrap"
                    animate={{ x: ["100%", "-100%"] }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                >
                    {publicInfoList.map(info => (
                        <p key={info.id} className="text-xs font-bold text-blue-900">
                             <span className="uppercase text-blue-600">{info.sector}:</span> {info.title}
                        </p>
                    ))}
                </motion.div>
            </div>
         </div>
       </div>

      <header className="bg-white text-indigo-950 p-4 shadow-sm flex justify-between items-center sticky top-0 z-50 border-b border-gray-200">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none text-indigo-950">
                {role === 'infraestrutura' ? 'Infraestrutura' : 'Ordem de Saída'}
              </h1>
              <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-widest">Gestão de Veículos</p>
            </div>
          </div>

          <nav className="flex gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
            <button
              onClick={() => setActiveTab('veiculos')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                activeTab === 'veiculos'
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Veículos
            </button>
            <button
              onClick={() => setActiveTab('servicos')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                activeTab === 'servicos'
                  ? 'bg-white text-indigo-600 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              Ordens de Serviço
            </button>
          </nav>
        </div>

        <button onClick={onLogout} className="bg-red-50 hover:bg-red-100 text-red-600 font-black py-2 px-4 rounded-xl text-[10px] uppercase transition-all border border-red-200">Sair</button>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {activeTab === 'veiculos' ? (
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
            userRole={role}
          />
        ) : (
          <AdminServiceOrder
            orders={serviceOrders}
            maintenanceSchedules={maintenanceSchedules}
            onUpdate={onUpdateServiceOrder}
            onDelete={onDeleteServiceOrder}
            onRegisterMaintenanceSchedule={onRegisterMaintenanceSchedule}
            onUpdateMaintenanceSchedule={onUpdateMaintenanceSchedule}
            onDeleteMaintenanceSchedule={onDeleteMaintenanceSchedule}
          />
        )}
      </main>
    </div>
  );
};

export default VehicleOrderDashboard;
