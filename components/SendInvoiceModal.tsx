import React, { useState, useEffect } from 'react';
import { X, Send, Plus, Trash2, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";
import { Delivery, ContractItem } from '../types';

interface SendInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (invoice: any) => void;
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({ isOpen, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [deliveries, setDeliveries] = useState<Partial<Delivery>[]>([]);
  const [contractItems] = useState<ContractItem[]>([
    { id: '1', name: 'Item A', valuePerKg: 10.5 },
    { id: '2', name: 'Item B', valuePerKg: 20.0 },
  ]);

  const handleAddDelivery = () => {
    setDeliveries([...deliveries, { id: crypto.randomUUID(), itemId: '', itemName: '', kg: 0, value: 0 }]);
  };

  const handleRemoveDelivery = (id: string) => {
    setDeliveries(deliveries.filter(d => d.id !== id));
  };

  const handleUpdateDelivery = (id: string, field: keyof Delivery, val: any) => {
    setDeliveries(deliveries.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: val };
        // If item changes, we might want to update itemName but we DO NOT recalculate value
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

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            text: "Extract invoice data: number, date, supplier, and items (name, quantity, totalValue). Return JSON."
          },
          {
            inlineData: {
              mimeType: file.type,
              data: base64
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              number: { type: Type.STRING },
              date: { type: Type.STRING },
              supplier: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    quantity: { type: Type.NUMBER },
                    totalValue: { type: Type.NUMBER }
                  }
                }
              }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      if (data.number) setInvoiceNumber(data.number);
      if (data.date) setInvoiceDate(data.date);
      if (data.supplier) setSupplierName(data.supplier);
      
      if (data.items) {
        const extractedDeliveries = data.items.map((item: any) => ({
          id: crypto.randomUUID(),
          itemName: item.name,
          kg: item.quantity || 0,
          value: item.totalValue || 0, // DIRECTLY FROM PDF
          itemId: contractItems.find(ci => ci.name === item.name)?.id || ''
        }));
        setDeliveries(extractedDeliveries);
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
    onSave({
      id: crypto.randomUUID(),
      number: invoiceNumber,
      date: invoiceDate,
      supplierName,
      deliveries,
      totalValue: deliveries.reduce((acc, d) => acc + (d.value || 0), 0)
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl"
      >
        <div className="p-6 border-bottom border-gray-100 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Enviar Nota Fiscal</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Fornecedor</label>
              <input 
                type="text" 
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-800">Itens da Nota</h3>
            <div className="flex gap-2">
              <label className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium">Extrair PDF</span>
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
              <p className="text-gray-500 font-medium">Extraindo dados...</p>
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
              {deliveries.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
                  <p className="text-gray-400">Nenhum item adicionado.</p>
                </div>
              )}
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
