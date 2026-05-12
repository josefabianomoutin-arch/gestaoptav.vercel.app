import React, { useState } from 'react';
import { X, Send, Plus, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delivery, ContractItem } from '../types';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

interface SendInvoiceModalProps {
  invoiceInfo: { date: string; deliveries: Delivery[] };
  contractItems: ContractItem[];
  onClose: () => void;
  onSave: (invoiceNumber: string, invoiceUrl: string, deliveries: Delivery[], invoiceDate?: string) => void;
}

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({ invoiceInfo, contractItems, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(invoiceInfo.date);
  const [deliveries, setDeliveries] = useState<any[]>(invoiceInfo.deliveries.map(d => ({ ...d })));
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const handleAddDelivery = () => {
    // IMPORTANTE: prefixo new_ para que o handleSaveInvoice no App.tsx reconheça como novo item
    setDeliveries([...deliveries, { id: `new_manual-${Date.now()}`, itemId: '', itemName: '', kg: 0, value: 0 }]);
  };

  const handleRemoveDelivery = (id: string) => {
    setDeliveries(deliveries.filter(d => d.id !== id));
  };

  const handleUpdateDelivery = (id: string, field: string, val: any) => {
    setDeliveries(deliveries.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: val };
        if (field === 'itemId') {
          const item = contractItems.find(ci => ci.id === val);
          if (item) {
            updated.itemName = item.name;
            updated.item = item.name; // Garante ambos para compatibilidade
          }
        }
        return updated;
      }
      return d;
    }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!invoiceNumber) {
        alert("Número da nota é obrigatório");
        return;
    }
    if (deliveries.length === 0) {
        alert("Adicione pelo menos um item da nota fiscal para cadastrar.");
        return;
    }
    setLoading(true);
    try {
      await onSave(invoiceNumber, invoiceUrl, deliveries, invoiceDate);
      onClose();
    } catch (e) {
      console.error("Erro ao salvar nota:", e);
      // O erro já deve ter sido mostrado pelo toast no App.tsx
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Enviar Nota Fiscal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Link ou Arquivo da Nota Fiscal</label>
              <div className="flex flex-col gap-2">
                {!(invoiceUrl && invoiceUrl.startsWith('data:')) && (
                  <input 
                      type="text" 
                      value={invoiceUrl}
                      onChange={(e) => setInvoiceUrl(e.target.value)}
                      placeholder="URL da nota fiscal (opcional se enviar arquivo)"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                )}
                <label className="flex items-center justify-center gap-3 px-4 py-3 bg-emerald-600 text-white rounded-xl cursor-pointer hover:bg-emerald-700 transition-all shadow-md group">
                    <Plus className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Anexar PDF da Nota</p>
                        <p className="text-[8px] font-bold opacity-80 uppercase tracking-tighter mt-1">Clique para selecionar o arquivo</p>
                    </div>
                    <input type="file" accept="application/pdf" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setLoading(true);
                            try {
                                const reader = new FileReader();
                                reader.onload = (event) => {
                                    setInvoiceUrl(event.target?.result as string);
                                    setLoading(false);
                                };
                                reader.onerror = () => {
                                    alert("Erro ao ler o arquivo selecionado.");
                                    setLoading(false);
                                };
                                reader.readAsDataURL(file);
                            } catch(e) {
                                console.error(e);
                                alert("Erro ao processar arquivo da nota fiscal.");
                                setLoading(false);
                            }
                        }
                    }} />
                </label>
                {invoiceUrl && (
                  <p className="text-[9px] text-green-600 font-bold uppercase truncate px-2">✓ Arquivo carregado ou link inserido</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Número da Nota</label>
                  <input 
                    type="text" 
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data da Nota</label>
                  <input 
                    type="date" 
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Itens da Nota</h3>
            <div className="flex gap-2">
              <button 
                onClick={handleAddDelivery}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm font-medium">Adicionar Item</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-gray-500 font-medium">Processando...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {deliveries.map((delivery) => (
                  <motion.div 
                    key={delivery.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end"
                  >
                    <div className="md:col-span-5 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Item</label>
                      <select 
                        value={delivery.itemId}
                        onChange={(e) => handleUpdateDelivery(delivery.id!, 'itemId', e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                      >
                        <option value="">Selecione o item...</option>
                        {contractItems.map(item => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Quantidade (Kg)</label>
                      <input 
                        type="number"
                        value={delivery.kg}
                        onChange={(e) => handleUpdateDelivery(delivery.id!, 'kg', Number(e.target.value))}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none"
                      />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Total (R$)</label>
                      <input 
                        type="number"
                        value={delivery.value}
                        onChange={(e) => handleUpdateDelivery(delivery.id!, 'value', Number(e.target.value))}
                        placeholder="Valor na NF"
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none font-medium text-blue-600"
                      />
                    </div>
                    <div className="md:col-span-1">
                      <button 
                        onClick={() => handleRemoveDelivery(delivery.id!)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-b-2xl">
          <div className="text-gray-600 font-medium">
            Total da Nota: <span className="text-blue-600 font-bold ml-2">
              R$ {deliveries.reduce((acc, d) => acc + (d.value || 0), 0).toFixed(2)}
            </span>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave}
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Finalizar Envio
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SendInvoiceModal;
