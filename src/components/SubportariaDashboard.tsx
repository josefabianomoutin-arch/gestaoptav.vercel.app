import React, { useState } from 'react';
import type { Supplier, ThirdPartyEntryLog, VehicleExitOrder, VehicleAsset, DriverAsset, ValidationRole, MaintenanceSchedule } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import AgendaChegadas from './AgendaChegadas';
import RondaRegistroForm from './RondaRegistroForm';
import AdminPasswordManager from './AdminPasswordManager';
import { ClipboardList, Wrench, Calendar, Car } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCombinedSuppliers } from '../lib/supplierUtils';

interface SubportariaDashboardProps {
  suppliers: Supplier[];
  perCapitaConfig?: any;
  thirdPartyEntries: ThirdPartyEntryLog[];
  maintenanceSchedules: MaintenanceSchedule[];
  onLogout: () => void;
  vehicleExitOrders: VehicleExitOrder[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  validationRoles: ValidationRole[];
  onRegisterVehicleExitOrder?: (order: Omit<VehicleExitOrder, 'id'>) => Promise<{ success: boolean; message: string; id?: string }>;
  onUpdateVehicleExitOrder: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleExitOrder: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterVehicleAsset?: (asset: Omit<VehicleAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateVehicleAsset?: (asset: VehicleAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteVehicleAsset?: (id: string) => Promise<{ success: boolean; message: string }>;
  onRegisterDriverAsset?: (asset: Omit<DriverAsset, 'id'>) => Promise<{ success: boolean; message: string }>;
  onUpdateDriverAsset?: (asset: DriverAsset) => Promise<{ success: boolean; message: string }>;
  onDeleteDriverAsset?: (id: string) => Promise<{ success: boolean; message: string }>;
  systemPasswords?: Record<string, string>;
  onUpdateSystemPassword?: (key: string, value: string) => Promise<void>;
  [key: string]: any;
}

const SubportariaDashboard: React.FC<SubportariaDashboardProps> = ({ 
    suppliers,
    perCapitaConfig,
    thirdPartyEntries,
    maintenanceSchedules,
    onLogout,
    vehicleExitOrders,
    vehicleAssets,
    driverAssets,
    validationRoles,
    onRegisterVehicleExitOrder,
    onUpdateVehicleExitOrder,
    onDeleteVehicleExitOrder,
    onRegisterVehicleAsset,
    onUpdateVehicleAsset,
    onDeleteVehicleAsset,
    onRegisterDriverAsset,
    onUpdateDriverAsset,
    onDeleteDriverAsset,
    systemPasswords = {},
    onUpdateSystemPassword = async () => {},
    onUpdateDelivery,
    onUpdateThirdPartyEntry
}) => {
    const [activeTab, setActiveTab] = useState<'agenda' | 'vehicles' | 'seguranca' | 'rondas'>('agenda');
    const [activeSubTab, setActiveSubTab] = useState<'registro' | 'cadastro'>('registro');

    const combinedSuppliers = React.useMemo(() => {
        return getCombinedSuppliers(suppliers, perCapitaConfig);
    }, [suppliers, perCapitaConfig]);

    return (
        <div className="min-h-screen text-slate-900 font-sans pb-10 bg-slate-50">
            <header className="p-4 shadow-xl flex justify-between items-center sticky top-0 z-50 border-b bg-indigo-950 border-indigo-900 text-white print:hidden">
                <h1 className="text-lg font-black uppercase italic tracking-tighter leading-none">Segurança Externa</h1>
                <div className="flex flex-wrap items-center gap-1">
                    {[
                        { id: 'agenda', label: 'Agenda', icon: Calendar },
                        { id: 'vehicles', label: 'Veículos', icon: Car },
                        { id: 'seguranca', label: 'Manutenção', icon: Wrench },
                        { id: 'rondas', label: 'Rondas', icon: ClipboardList }
                    ].map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:bg-white/10'}`}
                        >
                            <tab.icon className="w-3 h-3" />
                            {tab.label}
                        </button>
                    ))}
                    <button onClick={onLogout} className="bg-red-900/50 hover:bg-red-700 text-red-300 hover:text-white font-black py-2 px-3 rounded-xl text-[10px] uppercase transition-all border border-red-800 ml-2">Sair</button>
                </div>
            </header>

            <main className="p-4 space-y-6 max-w-7xl mx-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'agenda' ? (
                        <motion.div 
                            key="agenda"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                        >
                            <AgendaChegadas 
                                suppliers={combinedSuppliers} 
                                thirdPartyEntries={thirdPartyEntries}
                                embedded
                                onUpdateDelivery={onUpdateDelivery}
                                onUpdateThirdPartyEntry={onUpdateThirdPartyEntry}
                                perCapitaConfig={perCapitaConfig}
                            />
                        </motion.div>
                    ) : activeTab === 'vehicles' ? (
                        <motion.div 
                            key="vehicles"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="animate-fade-in bg-white p-5 rounded-[2rem] shadow-lg border border-slate-200"
                        >
                            <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic mb-4">Gestão de Saída de Veículos</h2>
                            <AdminVehicleExitOrder 
                                orders={vehicleExitOrders} 
                                onRegister={onRegisterVehicleExitOrder || (async () => ({ success: false, message: 'Função de registro não fornecida' }))}
                                onUpdate={onUpdateVehicleExitOrder} 
                                onDelete={onDeleteVehicleExitOrder}
                                allowDelete={true}
                                vehicleAssets={vehicleAssets}
                                onRegisterVehicleAsset={onRegisterVehicleAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                onUpdateVehicleAsset={onUpdateVehicleAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                onDeleteVehicleAsset={onDeleteVehicleAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                driverAssets={driverAssets}
                                onRegisterDriverAsset={onRegisterDriverAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                onUpdateDriverAsset={onUpdateDriverAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                onDeleteDriverAsset={onDeleteDriverAsset || (async () => ({ success: false, message: 'Não permitido' }))}
                                validationRoles={validationRoles}
                            />
                        </motion.div>
                    ) : activeTab === 'seguranca' ? (
                        <motion.div 
                            key="seguranca"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="animate-fade-in bg-white p-8 rounded-[2rem] shadow-lg border border-indigo-100"
                        >
                            <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic mb-6">Manutenção e Segurança</h2>
                            <div className="text-xs text-gray-500 mb-4">{maintenanceSchedules.length} agendamentos de manutenção.</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {maintenanceSchedules.map(m => (
                                    <div key={m.id} className="p-4 border rounded-xl bg-slate-50">
                                        <div className="font-bold text-sm">{m.description}</div>
                                        <div className="text-xs text-slate-500 uppercase">{m.date} - {m.status}</div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    ) : activeTab === 'rondas' ? (
                        <motion.div 
                            key="rondas"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="animate-fade-in space-y-6"
                        >
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic">Registro de Rondas</h2>
                                <div className="flex gap-1 bg-slate-200 p-1 rounded-2xl">
                                    <button 
                                        onClick={() => setActiveSubTab('registro')} 
                                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSubTab === 'registro' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Registro
                                    </button>
                                    <button 
                                        onClick={() => setActiveSubTab('cadastro')} 
                                        className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${activeSubTab === 'cadastro' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Cadastro
                                    </button>
                                </div>
                            </div>
                            
                            {activeSubTab === 'registro' ? (
                                <RondaRegistroForm systemPasswords={systemPasswords} />
                            ) : (
                                <AdminPasswordManager 
                                    passwords={systemPasswords} 
                                    onUpdatePassword={onUpdateSystemPassword} 
                                />
                            )}
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </main>
        </div>
    );
};

export default SubportariaDashboard;
