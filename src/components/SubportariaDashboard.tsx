import React, { useState } from 'react';
import type { Supplier, ThirdPartyEntryLog, VehicleExitOrder, VehicleAsset, DriverAsset, ValidationRole, MaintenanceSchedule, ServiceOrder, PublicInfo } from '../types';
import AdminVehicleExitOrder from './AdminVehicleExitOrder';
import { ClipboardList, Wrench, Calendar, Car } from 'lucide-react';

interface SubportariaDashboardProps {
  suppliers: Supplier[];
  thirdPartyEntries: ThirdPartyEntryLog[];
  maintenanceSchedules: MaintenanceSchedule[];
  serviceOrders: ServiceOrder[];
  publicInfoList: PublicInfo[];
  onUpdateMaintenanceSchedule: (id: string, updates: Partial<MaintenanceSchedule>) => Promise<{ success: boolean; message: string }>;
  onUpdateThirdPartyEntry: (log: ThirdPartyEntryLog) => Promise<{ success: boolean; message: string }>;
  onDeleteThirdPartyEntry: (id: string) => Promise<{ success: boolean; message: string }>;
  onLogout: () => void;
  vehicleExitOrders: VehicleExitOrder[];
  vehicleAssets: VehicleAsset[];
  driverAssets: DriverAsset[];
  validationRoles: ValidationRole[];
  onUpdateVehicleExitOrder: (order: VehicleExitOrder) => Promise<{ success: boolean; message: string }>;
}

const SubportariaDashboard: React.FC<SubportariaDashboardProps> = ({ 
    onLogout,
    vehicleExitOrders,
    vehicleAssets,
    driverAssets,
    validationRoles,
    maintenanceSchedules,
    onUpdateVehicleExitOrder
}) => {
    const [activeTab, setActiveTab] = useState<'agenda' | 'vehicles' | 'seguranca' | 'rondas'>('agenda');
    const [activeSubTab, setActiveSubTab] = useState<'registro' | 'cadastro'>('registro');

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
                {activeTab === 'agenda' ? (
                    <div className="bg-white p-5 rounded-[2rem] shadow-lg border border-slate-200">
                        <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic mb-4">Agenda de Chegadas e Entradas</h2>
                        <div className="space-y-2">
                             {thirdPartyEntries.length === 0 ? <p className="text-xs text-gray-500">Nenhum registro encontrado.</p> : thirdPartyEntries.map(entry => (
                                 <div key={entry.id} className="p-3 border-b border-slate-100 flex justify-between text-xs">
                                     <span>{entry.driverName}</span>
                                     <span className="font-bold">{entry.company}</span>
                                 </div>
                             ))}
                        </div>
                    </div>
                ) : activeTab === 'vehicles' ? (
                    <div className="animate-fade-in bg-white p-5 rounded-[2rem] shadow-lg border border-slate-200">
                        <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic mb-4">Gestão de Saída de Veículos</h2>
                        <AdminVehicleExitOrder 
                            orders={vehicleExitOrders} 
                            onRegister={async () => ({ success: true, message: 'OK' })}
                            onUpdate={onUpdateVehicleExitOrder} 
                            onDelete={async () => ({ success: true, message: 'OK' })}
                            vehicleAssets={vehicleAssets}
                            onRegisterVehicleAsset={async () => ({ success: true, message: 'OK' })}
                            onUpdateVehicleAsset={async () => ({ success: true, message: 'OK' })}
                            onDeleteVehicleAsset={async () => ({ success: true, message: 'OK' })}
                            driverAssets={driverAssets}
                            onRegisterDriverAsset={async () => ({ success: true, message: 'OK' })}
                            onUpdateDriverAsset={async () => ({ success: true, message: 'OK' })}
                            onDeleteDriverAsset={async () => ({ success: true, message: 'OK' })}
                            validationRoles={validationRoles}
                        />
                    </div>
                ) : activeTab === 'seguranca' ? (
                    <div className="animate-fade-in bg-white p-8 rounded-[2rem] shadow-lg border border-indigo-100">
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
                    </div>
                ) : activeTab === 'rondas' ? (
                    <div className="animate-fade-in space-y-6">
                        <h2 className="text-xl font-black text-indigo-950 uppercase tracking-tighter italic">Registro de Rondas</h2>
                        
                        <div className="flex gap-2">
                             <button onClick={() => setActiveSubTab('registro')} className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${activeSubTab === 'registro' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>Registro</button>
                             <button onClick={() => setActiveSubTab('cadastro')} className={`px-4 py-2 rounded-xl font-black uppercase text-[10px] ${activeSubTab === 'cadastro' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>Cadastro</button>
                        </div>

                        <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-indigo-100">
                                 <h3 className="font-black text-lg text-indigo-950 mb-4">{activeSubTab === 'registro' ? 'Formulário de Registro de Ronda' : 'Cadastro de Senhas'}</h3>
                                 <p className="text-gray-500 text-xs">Página de {activeSubTab} acessada.</p>
                            </div>
                    </div>
                ) : null}
            </main>
        </div>
    );
};

export default SubportariaDashboard;
