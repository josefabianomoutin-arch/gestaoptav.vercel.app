import React, { useState, useMemo } from 'react';
import { X, Send, Plus, Trash2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delivery, ContractItem } from '../types';
import { ensureArray } from '../lib/utils';

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

  // Garantir que contractItems seja um Array e que cada item possua um ID ÚNICO E EXCLUSIVO
  const normalizedContractItems = useMemo(() => {
    const raw = ensureArray<ContractItem>(contractItems);
    const seenIds = new Set<string>();
    let dupCounter = 1;
    return raw.map((ci, idx) => {
      const cleanName = ci.name || (ci as any).itemName || (ci as any).item || `Item ${idx + 1}`;
      const slugName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawId = ci.id && String(ci.id).trim() !== '' ? String(ci.id).trim() : null;
      
      let uniqueId = rawId ? rawId : `ci-idx-${idx}-${slugName}`;
      if (seenIds.has(uniqueId)) {
        uniqueId = `ci-idx-${idx}-${slugName || 'item'}-dup-${dupCounter++}`;
      }
      seenIds.add(uniqueId);

      return {
        ...ci,
        id: uniqueId,
        name: cleanName,
      };
    });
  }, [contractItems]);

  const [deliveries, setDeliveries] = useState<any[]>(() => {
    return ensureArray(invoiceInfo.deliveries).map((d, dIdx) => {
      const matched = normalizedContractItems.find(ci => 
        (d.itemName && ci.name === d.itemName) || 
        (d.item && ci.name === d.item) ||
        (d.itemId && String(ci.id) === String(d.itemId))
      );
      return {
        ...d,
        id: d.id || `delivery-${Date.now()}-${dIdx}`,
        itemId: matched?.id || d.itemId || '',
        itemName: matched?.name || d.itemName || d.item || '',
        item: matched?.name || d.item || d.itemName || '',
      };
    });
  });
  const [invoiceUrl, setInvoiceUrl] = useState('');

  const handleAddDelivery = () => {
    // IMPORTANTE: prefixo new_ para que o handleSaveInvoice no App.tsx reconheça como novo item
    setDeliveries(prev => [
      ...prev, 
      { id: `new_manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, itemId: '', itemName: '', item: '', kg: 0, value: 0 }
    ]);
  };

  const handleRemoveDelivery = (id: string) => {
    setDeliveries(prev => prev.filter(d => d.id !== id));
  };

  const handleUpdateDelivery = (id: string, field: string, val: any) => {
    setDeliveries(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: val };
        if (field === 'itemId') {
          if (!val) {
            updated.itemId = '';
            updated.itemName = '';
            updated.item = '';
          } else {
            const matchedItem = normalizedContractItems.find(ci => String(ci.id) === String(val) || ci.name === val);
            if (matchedItem) {
              updated.itemId = matchedItem.id;
              updated.itemName = matchedItem.name;
              updated.item = matchedItem.name; // Garante ambos para compatibilidade
              const price = Number(matchedItem.valuePerKg) || 0;
              const inputKg = Number(updated.kg) || 0;
              if (price > 0 && inputKg > 0) {
                updated.value = Number((inputKg * price).toFixed(2));
              }
            } else {
              updated.itemId = val;
              updated.itemName = val;
              updated.item = val;
            }
          }
        } else if (field === 'kg') {
          const inputKg = Number(val) || 0;
          updated.kg = inputKg;
          const matchedItem = normalizedContractItems.find(ci => String(ci.id) === String(updated.itemId) || ci.name === updated.itemName || ci.name === updated.item);
          if (matchedItem) {
            const price = Number(matchedItem.valuePerKg) || 0;
            if (price > 0) {
              updated.value = Number((inputKg * price).toFixed(2));
            }
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
    const invalid = deliveries.some(d => !d.itemName && !d.item);
    if (invalid) {
        alert("Por favor, selecione o item para todos os lançamentos.");
        return;
    }
    setLoading(true);
    try {
      const cleanedDeliveries = deliveries.map(d => {
        const matched = normalizedContractItems.find(ci => String(ci.id) === String(d.itemId) || ci.name === d.itemName || ci.name === d.item);
        const finalName = matched?.name || d.itemName || d.item || '';
        return {
          ...d,
          item: finalName,
          itemName: finalName,
          itemId: matched?.id || d.itemId || finalName,
          invoiceNumber,
          invoiceUrl,
          invoiceDate
        };
      });
      await onSave(invoiceNumber, invoiceUrl, cleanedDeliveries, invoiceDate);
      onClose();
    } catch (e) {
      console.error("Erro ao salvar nota:", e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100] overflow-y-auto">
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
                {deliveries.map((delivery) => {
                  const matched = normalizedContractItems.find(ci => 
                    (delivery.itemId && String(ci.id) === String(delivery.itemId)) ||
                    (delivery.itemName && ci.name === delivery.itemName) ||
                    (delivery.item && ci.name === delivery.item)
                  );
                  const selectedValue = matched ? matched.id : (delivery.itemId || '');

                  return (
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
                          value={selectedValue}
                          onChange={(e) => handleUpdateDelivery(delivery.id!, 'itemId', e.target.value)}
                          className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none font-medium text-sm"
                        >
                          <option value="">Selecione o item...</option>
                          {normalizedContractItems.map((item) => {
                            const priceText = item.valuePerKg ? ` (R$ ${Number(item.valuePerKg).toFixed(2)}/Kg)` : '';
                            return (
                              <option key={item.id} value={item.id}>
                                {item.name}{priceText}
                              </option>
                            );
                          })}
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
                );
              })}
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
