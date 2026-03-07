
import React, { useState } from 'react';
import type { PpaisProducer } from '../types';

interface AdminPpaisProducersProps {
    producers: PpaisProducer[];
    onUpdate: (producers: PpaisProducer[]) => void;
}

const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const AdminPpaisProducers: React.FC<AdminPpaisProducersProps> = ({ producers, onUpdate }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [cpfCnpj, setCpfCnpj] = useState('');
    const [processNumber, setProcessNumber] = useState('');
    const [monthlySchedule, setMonthlySchedule] = useState<Record<string, boolean>>({});

    const filteredProducers = producers.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.cpfCnpj.includes(searchTerm) ||
        p.processNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const resetForm = () => {
        setName('');
        setCpfCnpj('');
        setProcessNumber('');
        setMonthlySchedule({});
        setIsAdding(false);
        setEditingId(null);
    };

    const handleEdit = (producer: PpaisProducer) => {
        setName(producer.name);
        setCpfCnpj(producer.cpfCnpj);
        setProcessNumber(producer.processNumber);
        setMonthlySchedule(producer.monthlySchedule || {});
        setEditingId(producer.id);
        setIsAdding(true);
    };

    const handleSave = () => {
        if (!name || !cpfCnpj || !processNumber) {
            alert('Preencha os campos obrigatórios: Nome, CPF/CNPJ e Número do Processo.');
            return;
        }

        const newProducer: PpaisProducer = {
            id: editingId || crypto.randomUUID(),
            name: name.toUpperCase(),
            cpfCnpj,
            processNumber,
            monthlySchedule
        };

        let updatedProducers: PpaisProducer[];
        if (editingId) {
            updatedProducers = producers.map(p => p.id === editingId ? newProducer : p);
        } else {
            updatedProducers = [...producers, newProducer];
        }

        onUpdate(updatedProducers);
        resetForm();
    };

    const handleDelete = (id: string) => {
        if (window.confirm('Tem certeza que deseja excluir este produtor?')) {
            onUpdate(producers.filter(p => p.id !== id));
        }
    };

    const toggleMonth = (month: string) => {
        setMonthlySchedule(prev => ({
            ...prev,
            [month]: !prev[month]
        }));
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-[2rem] shadow-xl border-b-4 border-emerald-600">
                <div className="relative w-full md:max-w-md">
                    <input 
                        type="text" 
                        placeholder="Pesquisar produtor, CPF ou processo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-2xl outline-none font-bold transition-all shadow-inner"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg hover:shadow-emerald-200 transition-all active:scale-95 uppercase text-xs tracking-widest flex items-center justify-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    Novo Produtor
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-8 rounded-[2rem] shadow-2xl border-2 border-emerald-100 animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-black text-emerald-900 uppercase tracking-tighter">
                            {editingId ? 'Editar Produtor' : 'Cadastrar Novo Produtor'}
                        </h3>
                        <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Nome do Produtor</label>
                            <input 
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none font-bold transition-all"
                                placeholder="NOME COMPLETO"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">CPF / CNPJ</label>
                            <input 
                                type="text"
                                value={cpfCnpj}
                                onChange={e => setCpfCnpj(e.target.value.replace(/[^\d]/g, ''))}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none font-bold transition-all font-mono"
                                placeholder="000.000.000-00"
                                maxLength={14}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Número do Processo</label>
                            <input 
                                type="text"
                                value={processNumber}
                                onChange={e => setProcessNumber(e.target.value)}
                                className="w-full p-4 bg-gray-50 border-2 border-transparent focus:border-emerald-500 rounded-xl outline-none font-bold transition-all"
                                placeholder="PROCESSO SEI"
                            />
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">Agenda de Entregas (Janeiro a Dezembro)</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {months.map(month => (
                                <button
                                    key={month}
                                    onClick={() => toggleMonth(month)}
                                    className={`p-3 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${
                                        monthlySchedule[month] 
                                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' 
                                        : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200'
                                    }`}
                                >
                                    {month}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={resetForm}
                            className="px-8 py-4 bg-gray-100 text-gray-500 font-black rounded-xl uppercase text-xs tracking-widest hover:bg-gray-200 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-8 py-4 bg-emerald-600 text-white font-black rounded-xl uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-lg transition-all active:scale-95"
                        >
                            {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-[2rem] shadow-xl overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-emerald-50/50">
                                <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100">Produtor</th>
                                <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100">Documento</th>
                                <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100">Processo</th>
                                <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100">Meses Ativos</th>
                                <th className="p-6 text-[10px] font-black text-emerald-600 uppercase tracking-widest border-b border-emerald-100 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredProducers.length > 0 ? (
                                filteredProducers.map(producer => (
                                    <tr key={producer.id} className="hover:bg-emerald-50/30 transition-colors group">
                                        <td className="p-6">
                                            <div className="font-black text-gray-800 uppercase tracking-tight">{producer.name}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-mono text-xs text-gray-500">{producer.cpfCnpj}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="font-bold text-sm text-indigo-600">{producer.processNumber}</div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex flex-wrap gap-1">
                                                {months.filter(m => producer.monthlySchedule?.[m]).length > 0 ? (
                                                    months.filter(m => producer.monthlySchedule?.[m]).map(m => (
                                                        <span key={m} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[9px] font-black uppercase">
                                                            {m.substring(0, 3)}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-gray-300 italic text-[10px]">Nenhum mês selecionado</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleEdit(producer)}
                                                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                    title="Editar"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 00-2 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(producer.id)}
                                                    className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                                    title="Excluir"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center">
                                        <div className="flex flex-col items-center gap-2 text-gray-300">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                                            <p className="font-bold uppercase text-xs tracking-widest">Nenhum produtor encontrado</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminPpaisProducers;
