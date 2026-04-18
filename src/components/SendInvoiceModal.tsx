import React, { useState } from 'react';
import { X, Send, Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Delivery, ContractItem } from '../types';

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
  const [supplierName, setSupplierName] = useState('');
  const [deliveries, setDeliveries] = useState<any[]>(invoiceInfo.deliveries.map(d => ({ ...d })));
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const handleAddDelivery = () => {
    setDeliveries([...deliveries, { id: `manual-${Date.now()}`, itemId: '', itemName: '', kg: 0, value: 0 }]);
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
          if (item) updated.itemName = item.name;
        }
        return updated;
      }
      return d;
    }));
  };

  const extractDataFromPdf = async (file: File) => {
    setLoading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const response = await fetch('/api/gemini-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64,
          mimeType: file.type,
          prompt: "Extract invoice data: number, date, supplier, and items (name, quantity, totalValue). Return JSON."
        })
      });

      if (!response.ok) throw new Error("Falha na chamada da API");
      const data = await response.json();
      
      if (data.number) setInvoiceNumber(data.number);
      if (data.date) setInvoiceDate(data.date);
      if (data.supplier) setSupplierName(data.supplier);
      
      if (data.items) {
        const extractedDeliveries = data.items.map((item: any) => ({
          id: `extracted-${Date.now()}-${Math.random()}`,
          itemName: item.name,
          kg: item.quantity || 0,
          value: item.totalValue || 0,
          itemId: contractItems.find(ci => ci.name === item.name)?.id || ''
        }));
        setDeliveries(prev => [...prev, ...extractedDeliveries]);
      }
    } catch (error) {
      console.error("Extraction error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) extractDataFromPdf(file);
  };

  const handleSave = () => {
    // Basic validation
    if (!invoiceNumber) {
        alert("Número da nota é obrigatório");
        return;
    }
    onSave(invoiceNumber, invoiceUrl, deliveries, invoiceDate);
    onClose();
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
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">URL da Nota (Firebase Storage)</label>
              <input 
                type="text" 
                value={invoiceUrl}
                onChange={(e) => setInvoiceUrl(e.target.value)}
                placeholder="https://firebasestorage.googleapis.com/..."
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
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
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Extrair PDF (AI)</span>
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
              </label>
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
              <p className="text-gray-500 font-medium">Extraindo dados com Gemini AI...</p>
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
              className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              Finalizar Envio
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SendInvoiceModal;
