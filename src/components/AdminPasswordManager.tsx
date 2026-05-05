
import React, { useState } from 'react';

interface AdminPasswordManagerProps {
  passwords: Record<string, string>;
  onUpdatePassword: (key: string, newPassword: string) => Promise<void>;
}

const AdminPasswordManager: React.FC<AdminPasswordManagerProps> = ({ passwords, onUpdatePassword }) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [newKey, setNewKey] = useState('');
  const [newKeyPassword, setNewKeyPassword] = useState('');

  const handleSave = async (key: string) => {
    await onUpdatePassword(key, newPassword);
    setEditingKey(null);
    setNewPassword('');
  };

  const handleAddKey = async () => {
    if (!newKey.trim() || !newKeyPassword.trim()) return;
    await onUpdatePassword(newKey.trim(), newKeyPassword.trim());
    setNewKey('');
    setNewKeyPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-4 md:p-0 pb-16">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border-t-8 border-indigo-900">
        <h2 className="text-2xl md:text-3xl font-black text-indigo-950 uppercase tracking-tighter mb-6">Gerenciamento de Senhas</h2>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
            <input
              type="text"
              placeholder="Nome do Responsável / Sistema"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm flex-1 w-full"
            />
            <input
              type="text"
              placeholder="Senha"
              value={newKeyPassword}
              onChange={(e) => setNewKeyPassword(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm flex-1 w-full"
            />
            <button onClick={handleAddKey} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase w-full md:w-auto">Adicionar</button>
          </div>
          {Object.entries(passwords).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
              <span className="font-bold text-zinc-700 uppercase text-sm">{key}</span>
              {editingKey === key ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <button onClick={() => handleSave(key)} className="bg-green-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase">Salvar</button>
                  <button onClick={() => setEditingKey(null)} className="bg-zinc-300 text-white px-4 py-2 rounded-lg text-xs font-black uppercase">Cancelar</button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <span className="font-mono text-zinc-500">********</span>
                  <button onClick={() => { setEditingKey(key); setNewPassword(value); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-xs font-black uppercase">Alterar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPasswordManager;
