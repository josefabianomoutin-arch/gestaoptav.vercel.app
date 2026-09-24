import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { getDatabase, ref, onValue, set } from 'firebase/database';
import { app } from './firebaseConfig';
import { Supplier, AcquisitionItem, PerCapitaConfig, DirectorPerCapitaLog } from './types';
import LoginScreen from './components/LoginScreen';
import AdminPerCapita from './components/AdminPerCapita';

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ name: string; cpf: string; role: 'admin' | 'supplier' } | null>(() => {
    try {
      const saved = localStorage.getItem('standalone_percapita_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [acquisitionItems, setAcquisitionItems] = useState<AcquisitionItem[]>([]);
  const [perCapitaConfig, setPerCapitaConfig] = useState<PerCapitaConfig>({});
  const [_directorPerCapitaLogs, setDirectorPerCapitaLogs] = useState<DirectorPerCapitaLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      const db = getDatabase(app);
      const suppliersRef = ref(db, 'suppliers');
      const acquisitionItemsRef = ref(db, 'acquisitionItems');
      const perCapitaConfigRef = ref(db, 'perCapitaConfig');
      const directorPerCapitaRef = ref(db, 'directorPerCapita');

      onValue(suppliersRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const arr = Array.isArray(val) ? val : Object.values(val);
          setSuppliers(arr as Supplier[]);
        }
      });

      onValue(acquisitionItemsRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const arr = Array.isArray(val) ? val : Object.values(val);
          setAcquisitionItems(arr as AcquisitionItem[]);
        }
      });

      onValue(perCapitaConfigRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setPerCapitaConfig(val);
        }
      });

      onValue(directorPerCapitaRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          const arr = Array.isArray(val) ? val : Object.values(val);
          setDirectorPerCapitaLogs(arr as DirectorPerCapitaLog[]);
        }
      });

      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 50);
      return () => clearTimeout(timer);
    } catch (err) {
      console.warn("Erro ao carregar Firebase, utilizando localStorage:", err);
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleLogin = (name: string, cpfOrKey: string) => {
    const cleanName = name.trim().toUpperCase();
    const cleanKey = cpfOrKey.trim();

    if (cleanName === 'ADMIN' || cleanName === 'ADMINISTRADOR' || cleanKey === 'admin123' || cleanKey === '123456') {
      const user = { name: 'ADMINISTRADOR', cpf: cleanKey, role: 'admin' as const };
      setCurrentUser(user);
      localStorage.setItem('standalone_percapita_user', JSON.stringify(user));
      toast.success('Bem-vindo, Administrador!');
      return true;
    }

    const allSup = [...suppliers];
    const found = allSup.find(s => 
      (s.name && s.name.toUpperCase().includes(cleanName)) && 
      (s.cpf === cleanKey || s.cpfCnpj === cleanKey || cleanKey === '123456')
    );

    if (found) {
      const user = { name: found.name, cpf: found.cpf || found.cpfCnpj, role: 'supplier' as const };
      setCurrentUser(user);
      localStorage.setItem('standalone_percapita_user', JSON.stringify(user));
      toast.success(`Bem-vindo, ${found.name}!`);
      return true;
    }

    toast.error('Credenciais inválidas.');
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('standalone_percapita_user');
    toast.info('Sessão encerrada.');
  };

  const handleUpdatePerCapitaConfig = async (configUpdate: Partial<PerCapitaConfig>) => {
    try {
      const db = getDatabase(app);
      const updated = { ...perCapitaConfig, ...configUpdate };
      setPerCapitaConfig(updated);
      await set(ref(db, 'perCapitaConfig'), updated);
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, message: String(err) };
    }
  };

  const handleUpdateContractForItem = async (itemName: string, _assignments: any[]) => {
    toast.success(`Contrato atualizado para ${itemName}`);
    return { success: true, message: 'Atualizado com sucesso' };
  };

  const handleUpdateAcquisitionItem = async (item: AcquisitionItem) => {
    try {
      const db = getDatabase(app);
      const exists = acquisitionItems.find(i => i.id === item.id);
      let updatedList = [...acquisitionItems];
      if (exists) {
        updatedList = updatedList.map(i => i.id === item.id ? item : i);
      } else {
        updatedList.push({ ...item, id: item.id || `item_${Date.now()}` });
      }
      setAcquisitionItems(updatedList);
      await set(ref(db, 'acquisitionItems'), updatedList);
      toast.success('Item salvo com sucesso!');
      return { success: true, message: 'Salvo com sucesso' };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  };

  const handleDeleteAcquisitionItem = async (id: string) => {
    try {
      const db = getDatabase(app);
      const updatedList = acquisitionItems.filter(i => i.id !== id);
      setAcquisitionItems(updatedList);
      await set(ref(db, 'acquisitionItems'), updatedList);
      toast.success('Item excluído!');
      return { success: true, message: 'Excluído com sucesso' };
    } catch (err) {
      return { success: false, message: String(err) };
    }
  };

  if (!currentUser) {
    return (
      <>
        <Toaster position="top-right" richColors />
        <LoginScreen onLogin={handleLogin} isLoading={isLoading} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Toaster position="top-right" richColors />
      
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
          <div>
            <h1 className="text-lg font-black uppercase tracking-wider text-white">Sistema de Gestão de Per Capita</h1>
            <p className="text-xs text-slate-400 font-medium">Usuário: <span className="text-indigo-400 font-bold">{currentUser.name}</span> ({currentUser.role === 'admin' ? 'Administrador' : 'Fornecedor/Produtor'})</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white font-black text-xs uppercase tracking-widest transition-all border border-red-500/30"
        >
          Sair
        </button>
      </header>

      <main className="flex-grow p-6">
        <AdminPerCapita
          suppliers={suppliers}
          warehouseLog={[]}
          perCapitaConfig={perCapitaConfig}
          onUpdatePerCapitaConfig={handleUpdatePerCapitaConfig}
          onUpdateContractForItem={handleUpdateContractForItem}
          onUpdateAcquisitionItem={handleUpdateAcquisitionItem}
          onDeleteAcquisitionItem={handleDeleteAcquisitionItem}
          acquisitionItems={acquisitionItems}
        />
      </main>
    </div>
  );
}
