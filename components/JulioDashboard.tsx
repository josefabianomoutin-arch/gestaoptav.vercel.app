
import React, { useMemo } from 'react';
import { Truck } from 'lucide-react';
import { VehicleExitOrder, DriverAsset, VehicleAsset, ValidationRole, VehicleInspection, ServiceOrder } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import AdminServiceOrder from './AdminServiceOrder';

interface JulioDashboardProps {
  vehicleExitOrders: VehicleExitOrder[];
  vehicleInspections: VehicleInspection[];
  driverAssets: DriverAsset[];
  vehicleAssets: VehicleAsset[];
  validationRoles: ValidationRole[];
  serviceOrders: ServiceOrder[];
  onLogout: () => void;
  onRegisterServiceOrder?: (order: Omit<ServiceOrder, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateServiceOrder: (order: ServiceOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteServiceOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleExitOrder: (order: Omit<VehicleExitOrder, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleExitOrder: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleExitOrder: (id: string) => Promise<void>;
  onRegisterDriverAsset: (s: Omit<DriverAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDriverAsset: (s: DriverAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteDriverAsset: (id: string) => Promise<void>;
  onRegisterVehicleAsset: (v: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset: (v: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset: (id: string) => Promise<void>;
  onRegisterValidationRole: (vr: Omit<ValidationRole, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateValidationRole: (vr: ValidationRole) => Promise<{ success: boolean; message: string }>;
  onDeleteValidationRole: (id: string) => Promise<void>;
  onRegisterVehicleInspection: (inspection: Omit<VehicleInspection, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleInspection: (inspection: VehicleInspection) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleInspection: (id: string) => Promise<void>;
}

const JulioDashboard: React.FC<JulioDashboardProps> = ({
  vehicleExitOrders,
  vehicleInspections,
  driverAssets,
  vehicleAssets,
  validationRoles,
  serviceOrders,
  onLogout,
  onUpdateServiceOrder,
  onDeleteServiceOrder,
  onRegisterVehicleExitOrder,
  onUpdateVehicleExitOrder,
  onDeleteVehicleExitOrder,
  onRegisterDriverAsset,
  onUpdateDriverAsset,
  onDeleteDriverAsset,
  onRegisterVehicleAsset,
  onUpdateVehicleAsset,
  onDeleteVehicleAsset,
  onRegisterValidationRole,
  onUpdateValidationRole,
  onDeleteValidationRole,
  onRegisterVehicleInspection,
  onUpdateVehicleInspection,
  onDeleteVehicleInspection,
}) => {
  const [activeTab, setActiveTab] = React.useState<'veiculos' | 'servicos'>('veiculos');

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'BOM DIA';
    if (hour >= 12 && hour < 18) return 'BOA TARDE';
    return 'BOA NOITE';
  }, []);

  const todayStr = new Date().toISOString().split('T')[0];

  const vehiclesOutside = useMemo(() => {
    return vehicleExitOrders.filter(o => o.exitTime && !o.returnTime);
  }, [vehicleExitOrders]);

  const availableVehicles = useMemo(() => {
    const outsidePlates = vehiclesOutside.map(o => o.plate);
    return vehicleAssets.filter(v => !outsidePlates.includes(v.plate));
  }, [vehicleAssets, vehiclesOutside]);

  const vehiclesPendingInspection = useMemo(() => {
    const inspectedVehicleIds = vehicleInspections
      .filter(i => i.date.startsWith(todayStr))
      .map(i => i.vehicleId);
    
    return vehicleAssets.filter(v => !inspectedVehicleIds.includes(v.id));
  }, [vehicleAssets, vehicleInspections, todayStr]);

  const marqueeMessage = `${greeting}, JULIO E FARLEY: ` +
    `VEÍCULOS FORA DA UNIDADE: ${vehiclesOutside.length > 0 ? vehiclesOutside.map(o => `${o.vehicle} (${o.plate}) - MOT: ${o.responsibleServer} - DEST: ${o.destination}`).join(' • ') : 'NENHUM'} | ` +
    `VEÍCULOS DISPONÍVEIS: ${availableVehicles.length > 0 ? availableVehicles.map(v => `${v.model} (${v.plate})`).join(' • ') : 'NENHUM'} | ` +
    `VEÍCULOS AGUARDANDO INSPEÇÃO HOJE: ${vehiclesPendingInspection.length > 0 ? vehiclesPendingInspection.map(v => `${v.model} (${v.plate})`).join(' • ') : 'NENHUM'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-950 text-white p-4 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b border-indigo-800">
        <div className="flex items-center gap-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-inner">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none whitespace-nowrap">
                SEÇÃO DE INFRAESTRUTURA E LOGÍSTICA
              </h1>
              <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">Gestão de Ordem de Saída</p>
            </div>
          </div>

          <nav className="flex gap-2">
            <button
              onClick={() => setActiveTab('veiculos')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                activeTab === 'veiculos'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-indigo-300 hover:bg-indigo-900/50'
              }`}
            >
              Veículos
            </button>
            <button
              onClick={() => setActiveTab('servicos')}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${
                activeTab === 'servicos'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'text-indigo-300 hover:bg-indigo-900/50'
              }`}
            >
              Ordens de Serviço
            </button>
          </nav>
        </div>

        {/* MENSAGEM DINÂMICA DE SAUDAÇÃO E VEÍCULOS */}
        <div className="flex-1 mx-4 md:mx-10 bg-blue-50 border-2 border-blue-200 rounded-2xl p-2 overflow-hidden whitespace-nowrap relative h-12 flex items-center shadow-inner">
            <div className="animate-marquee inline-block text-blue-900 font-black text-xs md:text-sm uppercase italic tracking-tight">
                {marqueeMessage}
            </div>
        </div>

        <button onClick={onLogout} className="flex-shrink-0 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-black py-2 px-4 rounded-xl text-[10px] uppercase transition-all border border-red-900/50">Sair</button>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {activeTab === 'veiculos' ? (
          <AdminVehicleExitOrder 
            orders={vehicleExitOrders}
            inspections={vehicleInspections}
            vehicleAssets={vehicleAssets}
            driverAssets={driverAssets}
            validationRoles={validationRoles}
            onRegister={onRegisterVehicleExitOrder}
            onUpdate={onUpdateVehicleExitOrder}
            onDelete={onDeleteVehicleExitOrder}
            onRegisterVehicleAsset={onRegisterVehicleAsset}
            onUpdateVehicleAsset={onUpdateVehicleAsset}
            onDeleteVehicleAsset={onDeleteVehicleAsset}
            onRegisterDriverAsset={onRegisterDriverAsset}
            onUpdateDriverAsset={onUpdateDriverAsset}
            onDeleteDriverAsset={onDeleteDriverAsset}
            onRegisterValidationRole={onRegisterValidationRole}
            onUpdateValidationRole={onUpdateValidationRole}
            onDeleteValidationRole={onDeleteValidationRole}
            onRegisterInspection={onRegisterVehicleInspection}
            onUpdateInspection={onUpdateVehicleInspection}
            onDeleteInspection={onDeleteVehicleInspection}
            hideAssets={false}
            securityMode={false}
            showGateTab={true}
          />
        ) : (
          <AdminServiceOrder
            orders={serviceOrders}
            onUpdate={onUpdateServiceOrder}
            onDelete={async (id) => {
              await onDeleteServiceOrder(id);
            }}
          />
        )}
      </main>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          display: inline-block;
          white-space: nowrap;
          animation: marquee 150s linear infinite;
          padding-left: 100%;
        }
      `}</style>
    </div>
  );
};

export default JulioDashboard;
