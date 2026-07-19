import React, { useState, useMemo } from 'react';
import { X, Plus, Trash2, Loader2, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delivery, ContractItem } from '../types';
import { toast } from 'sonner';
import { ensureArray } from '../lib/utils';

interface EditInvoiceItemsModalProps {
  isOpen: boolean;
  invoice: {
    invoiceNumber: string;
    invoiceUrl: string;
    date: string;
    items: Delivery[];
    isPending?: boolean;
  } | null;
  contractItems: ContractItem[];
  onClose: () => void;
  onSave: (
    invoiceNumber: string,
    invoiceUrl: string,
    updatedDeliveries: Delivery[],
    invoiceDate: string,
    originalDeliveryIds: string[]
  ) => Promise<void>;
}

const EditInvoiceItemsModal: React.FC<EditInvoiceItemsModalProps> = ({
  isOpen,
  invoice,
  contractItems,
  onClose,
  onSave,
}) => {
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(() => invoice?.invoiceNumber || '');
  const [invoiceDate, setInvoiceDate] = useState(() => invoice?.date || '');

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
    if (!invoice) return [];
    return invoice.items.map((d) => {
      // Find standard contract item matching by name or id
      const matchedItem = normalizedContractItems.find(
        (ci) => ci.name === d.item || ci.name === d.itemName || (d.itemId && String(ci.id) === String(d.itemId))
      );
      return {
        ...d,
        itemId: matchedItem?.id || d.itemId || '',
        itemName: matchedItem?.name || d.itemName || d.item || '',
        item: matchedItem?.name || d.item || d.itemName || '',
      };
    });
  });

  if (!isOpen || !invoice) return null;

  const handleAddDelivery = () => {
    setDeliveries([
      ...deliveries,
      {
        id: `new_manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: '',
        itemName: '',
        item: '',
        kg: 0,
        value: 0,
        date: invoice.date,
        time: '12:00',
        invoiceNumber: invoiceNumber,
        invoiceUrl: invoice.invoiceUrl || '',
        invoiceUploaded: true,
        status: 'CONCLUÍDO',
      },
    ]);
  };

  const handleRemoveDelivery = (id: string) => {
    setDeliveries(deliveries.filter((d) => d.id !== id));
  };

  const handleUpdateDelivery = (id: string, field: string, val: any) => {
    setDeliveries(
      deliveries.map((d) => {
        if (d.id === id) {
          const updated = { ...d, [field]: val };
          if (field === 'itemId') {
            if (!val) {
              updated.itemId = '';
              updated.itemName = '';
              updated.item = '';
            } else {
              const matched = normalizedContractItems.find((ci) => String(ci.id) === String(val) || ci.name === val);
              if (matched) {
                updated.itemId = matched.id;
                updated.itemName = matched.name;
                updated.item = matched.name; // For compatibility
                // Automatically calculate suggested value
                const itemPrice = Number(matched.valuePerKg) || 0;
                const itemKg = Number(updated.kg) || 0;
                if (itemPrice > 0 && itemKg > 0) {
                  updated.value = Number((itemKg * itemPrice).toFixed(2));
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
            const matched = normalizedContractItems.find((ci) => String(ci.id) === String(updated.itemId) || ci.name === updated.itemName || ci.name === updated.item);
            if (matched) {
              const itemPrice = Number(matched.valuePerKg) || 0;
              if (itemPrice > 0) {
                updated.value = Number((inputKg * itemPrice).toFixed(2));
              }
            }
          }
          return updated;
        }
        return d;
      })
    );
  };

  const handleUseScheduledDate = () => {
    const firstDeliveryDate = deliveries.find(d => d.date)?.date;
    if (firstDeliveryDate) {
      setInvoiceDate(firstDeliveryDate);
      toast.success('Data preenchida com a data do agendamento!');
    } else {
      toast.error('Nenhum agendamento com data encontrado.');
    }
  };

  const handleSave = async () => {
    if (!invoiceNumber.trim()) {
      toast.error('O número da nota é obrigatório.');
      return;
    }
    if (!invoiceDate) {
      toast.error('A data da nota é obrigatória.');
      return;
    }
    const invalid = deliveries.some((d) => !d.item || d.kg <= 0);
    if (invalid) {
      toast.error('Por favor, selecione o item e informe o peso (Kg) para todos os lançamentos.');
      return;
    }

    setSaving(true);
    try {
      const originalDeliveryIds = invoice.items.map((d) => d.id);
      const enrichedDeliveries = deliveries.map(d => ({
        ...d,
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate: invoiceDate
      }));

      await onSave(
        invoiceNumber.trim(),
        invoice.invoiceUrl || '',
        enrichedDeliveries,
        invoiceDate,
        originalDeliveryIds
      );
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar os itens da nota.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">
              Editar Itens da Nota Fiscal
            </h2>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              Nota Número: <span className="text-indigo-600 font-mono">{invoiceNumber || invoice.invoiceNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-indigo-50/40 p-4 rounded-2xl border border-indigo-100/50">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Número da Nota</label>
              <input 
                type="text" 
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-gray-800"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Data da Nota</label>
                <button
                  type="button"
                  onClick={handleUseScheduledDate}
                  className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-wider transition-colors"
                >
                  Usar data do agendamento
                </button>
              </div>
              <input 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-gray-800"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
              Lançamentos vinculados à nota
            </h3>
            <button
              onClick={handleAddDelivery}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              Adicionar Item
            </button>
          </div>

          {deliveries.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-3xl">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[11px]">
                Nenhum item vinculado a esta nota fiscal.
              </p>
              <p className="text-gray-400 text-[10px] mt-1">
                Clique em "Adicionar Item" acima para cadastrar um lançamento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {deliveries.map((delivery) => {
                  const matched = normalizedContractItems.find((ci) => 
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
                      className="p-4 bg-gray-50 border border-gray-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 items-end hover:border-indigo-100 transition-colors"
                    >
                      <div className="md:col-span-5 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Item do Contrato</label>
                        <select
                          value={selectedValue}
                          onChange={(e) => handleUpdateDelivery(delivery.id!, 'itemId', e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none text-sm font-medium"
                        >
                          <option value="">Selecione o item...</option>
                          {normalizedContractItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} (R$ {(Number(item.valuePerKg) || 0).toFixed(2)}/Kg)
                            </option>
                          ))}
                        </select>
                      </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Quantidade (Kg)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={delivery.kg || ''}
                        onChange={(e) => handleUpdateDelivery(delivery.id!, 'kg', Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none font-mono text-sm font-bold"
                        placeholder="0,00"
                      />
                    </div>

                    <div className="md:col-span-3 space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Valor Total (R$)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={delivery.value || ''}
                        onChange={(e) => handleUpdateDelivery(delivery.id!, 'value', Number(e.target.value))}
                        className="w-full p-2.5 bg-white border border-gray-200 rounded-xl outline-none font-mono text-sm font-black text-indigo-600"
                        placeholder="R$ 0,00"
                      />
                    </div>

                    <div className="md:col-span-1 flex justify-center">
                      <button
                        onClick={() => handleRemoveDelivery(delivery.id!)}
                        className="p-2.5 text-red-500 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Remover Item"
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

        <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="text-sm font-bold text-gray-600">
            Total da Nota: <span className="text-emerald-600 font-mono font-black ml-1 text-lg">
              R$ {deliveries.reduce((acc, d) => acc + (d.value || 0), 0).toFixed(2).replace('.', ',')}
            </span>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 text-gray-600 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-100 hover:shadow-xl transition-all active:scale-95 ${
                saving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar Alterações
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default EditInvoiceItemsModal;
