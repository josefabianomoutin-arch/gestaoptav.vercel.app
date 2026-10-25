import React, { useState, useMemo } from 'react';
import { X, Send, Plus, Trash2, Loader2, Upload, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Delivery, ContractItem } from '../types';
import { ensureArray } from '../lib/utils';

interface SendInvoiceModalProps {
  invoiceInfo: { date: string; deliveries: Delivery[] };
  contractItems: ContractItem[];
  onClose: () => void;
  onSave: (invoiceNumber: string, invoiceUrl: string, deliveries: Delivery[], invoiceDate?: string) => Promise<any> | void;
}

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({ invoiceInfo, contractItems, onClose, onSave }) => {
  const [loading, setLoading] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(invoiceInfo.date || new Date().toISOString().split('T')[0]);
  const [invoiceUrl, setInvoiceUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isUploadingFile, setIsUploadingFile] = useState(false);

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
    const initial = ensureArray(invoiceInfo.deliveries).map((d, dIdx) => {
      const matched = normalizedContractItems.find(ci => 
        (d.itemName && ci.name === d.itemName) || 
        (d.item && ci.name === d.item) ||
        (d.itemId && String(ci.id) === String(d.itemId))
      );
      const name = matched?.name || d.itemName || d.item || '';
      return {
        ...d,
        id: d.id || `delivery-${Date.now()}-${dIdx}`,
        itemId: matched?.id || d.itemId || '',
        itemName: name,
        item: name,
        isCustom: !matched && Boolean(name)
      };
    });
    // Se a lista inicial estiver vazia, adiciona automaticamente um primeiro item para facilitar
    if (initial.length === 0) {
      return [{
        id: `new_manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        itemId: '',
        itemName: '',
        item: '',
        kg: 0,
        value: 0,
        isCustom: normalizedContractItems.length === 0
      }];
    }
    return initial;
  });

  const handleAddDelivery = () => {
    setDeliveries(prev => [
      ...prev, 
      { 
        id: `new_manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, 
        itemId: '', 
        itemName: '', 
        item: '', 
        kg: 0, 
        value: 0,
        isCustom: normalizedContractItems.length === 0
      }
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
          if (val === '__custom__') {
            updated.isCustom = true;
            updated.itemId = '__custom__';
          } else if (!val) {
            updated.itemId = '';
            updated.itemName = '';
            updated.item = '';
            updated.isCustom = false;
          } else {
            updated.isCustom = false;
            const matchedItem = normalizedContractItems.find(ci => String(ci.id) === String(val) || ci.name === val);
            if (matchedItem) {
              updated.itemId = matchedItem.id;
              updated.itemName = matchedItem.name;
              updated.item = matchedItem.name;
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
        } else if (field === 'itemName' || field === 'item') {
          updated.itemName = val;
          updated.item = val;
        } else if (field === 'kg') {
          const inputKg = Number(val) || 0;
          updated.kg = inputKg;
          if (!updated.isCustom) {
            const matchedItem = normalizedContractItems.find(ci => 
              String(ci.id) === String(updated.itemId) || 
              ci.name === updated.itemName || 
              ci.name === updated.item
            );
            if (matchedItem) {
              const price = Number(matchedItem.valuePerKg) || 0;
              if (price > 0) {
                updated.value = Number((inputKg * price).toFixed(2));
              }
            }
          }
        }
        return updated;
      }
      return d;
    }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 15MB");
      return;
    }

    setIsUploadingFile(true);
    setFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          // Upload para o servidor local
          const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
          const res = await fetch('/api/proxy-storage-upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              path: `invoices/NF_${invoiceNumber || 'doc'}_${Date.now()}_${safeName}`,
              base64
            })
          });
          const data = await res.json();
          if (data.success && data.url) {
            setInvoiceUrl(data.url);
            toast.success("Arquivo anexado com sucesso!");
          } else {
            // Fallback para base64 direto se o endpoint falhar
            setInvoiceUrl(base64);
            toast.success("Arquivo carregado.");
          }
        } catch {
          setInvoiceUrl(base64);
          toast.success("Arquivo carregado.");
        } finally {
          setIsUploadingFile(false);
        }
      };
      reader.onerror = () => {
        toast.error("Erro ao ler o arquivo");
        setIsUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Erro ao processar o arquivo");
      setIsUploadingFile(false);
    }
  };

  const handleSave = async () => {
    const cleanNum = String(invoiceNumber || '').trim();
    if (!cleanNum) {
      toast.error("Por favor, informe o número da Nota Fiscal.");
      return;
    }
    if (deliveries.length === 0) {
      toast.error("Adicione pelo menos um item da nota fiscal para cadastrar.");
      return;
    }
    const invalid = deliveries.some(d => !(d.itemName || d.item || '').trim());
    if (invalid) {
      toast.error("Por favor, selecione ou digite o nome de todos os itens.");
      return;
    }

    setLoading(true);
    try {
      const randId = Math.floor(100 + Math.random() * 900);
      const generatedProtocol = `NF-${cleanNum.replace(/\D/g, '') || '0'}-${Date.now().toString().slice(-4)}-${randId}`;
      const cleanedDeliveries = deliveries.map(d => {
        const matched = normalizedContractItems.find(ci => String(ci.id) === String(d.itemId) || ci.name === d.itemName || ci.name === d.item);
        const finalName = (matched?.name || d.itemName || d.item || '').trim();
        return {
          ...d,
          item: finalName,
          itemName: finalName,
          itemId: matched?.id || d.itemId || finalName,
          invoiceNumber: cleanNum,
          invoiceUrl: invoiceUrl || d.invoiceUrl || '',
          invoiceDate: invoiceDate || new Date().toISOString().split('T')[0],
          date: invoiceDate || d.date || new Date().toISOString().split('T')[0],
          invoiceCode: generatedProtocol,
          invoiceProtocol: generatedProtocol,
          protocol: generatedProtocol
        };
      });

      await onSave(cleanNum, invoiceUrl, cleanedDeliveries, invoiceDate);
      toast.success("Nota Fiscal registrada com sucesso!");
      onClose();
    } catch (e: any) {
      console.error("Erro ao salvar nota:", e);
      toast.error(e?.message || "Erro ao salvar nota fiscal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden my-auto"
      >
        <div className="p-6 bg-zinc-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight italic">Incluir Nota Fiscal</h2>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">Registro de Entrega e Faturamento</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Número da Nota Fiscal *</label>
              <input 
                type="text" 
                placeholder="Ex: 12345"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Data de Emissão da Nota *</label>
              <input 
                type="date" 
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full p-3 bg-slate-50 border-2 border-gray-100 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-0.5">Anexo PDF / Foto (Opcional)</label>
              <div className="relative">
                <input 
                  type="file" 
                  id="send-invoice-file"
                  accept="application/pdf,image/*"
                  onChange={handleFileUpload}
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('send-invoice-file')?.click()}
                  disabled={isUploadingFile}
                  className={`w-full p-3 border-2 border-dashed rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                    invoiceUrl 
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800' 
                      : 'bg-slate-50 border-gray-200 text-gray-600 hover:border-indigo-400 hover:bg-indigo-50/30'
                  }`}
                >
                  {isUploadingFile ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>Anexando...</span>
                    </>
                  ) : invoiceUrl ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="truncate max-w-[180px]">{fileName || 'Arquivo Anexado'}</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-gray-400" />
                      <span>Anexar PDF / Imagem</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Itens da Nota Fiscal</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Informe os produtos e quantidades presentes na NF</p>
            </div>
            <button 
              onClick={handleAddDelivery}
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 text-white rounded-xl hover:bg-black transition-all shadow-md active:scale-95 text-xs font-black uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Item</span>
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
              <p className="text-gray-500 font-bold text-xs uppercase tracking-widest">Processando e gravando nota...</p>
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
                  const selectedValue = delivery.isCustom ? '__custom__' : (matched ? matched.id : (delivery.itemId || ''));

                  return (
                    <motion.div 
                      key={delivery.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="p-4 bg-slate-50 border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                    >
                      <div className="md:col-span-5 space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Item / Produto</label>
                          {normalizedContractItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextCustom = !delivery.isCustom;
                                handleUpdateDelivery(delivery.id!, 'isCustom', nextCustom);
                                if (nextCustom) {
                                  handleUpdateDelivery(delivery.id!, 'itemId', '__custom__');
                                } else {
                                  handleUpdateDelivery(delivery.id!, 'itemId', '');
                                }
                              }}
                              className="text-[9px] font-black text-indigo-600 hover:underline uppercase"
                            >
                              {delivery.isCustom ? 'Escolher do Contrato' : 'Digitar Nome Livre'}
                            </button>
                          )}
                        </div>

                        {normalizedContractItems.length > 0 && !delivery.isCustom ? (
                          <select 
                            value={selectedValue}
                            onChange={(e) => handleUpdateDelivery(delivery.id!, 'itemId', e.target.value)}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                          >
                            <option value="">Selecione o item do contrato...</option>
                            {normalizedContractItems.map((item) => {
                              const priceText = item.valuePerKg ? ` (R$ ${Number(item.valuePerKg).toFixed(2)}/Kg)` : '';
                              return (
                                <option key={item.id} value={item.id}>
                                  {item.name}{priceText}
                                </option>
                              );
                            })}
                            <option value="__custom__">Outro item (digitar nome livre)...</option>
                          </select>
                        ) : (
                          <input 
                            type="text"
                            placeholder="Nome do produto na nota fiscal..."
                            value={delivery.itemName || delivery.item || ''}
                            onChange={(e) => {
                              handleUpdateDelivery(delivery.id!, 'itemName', e.target.value);
                              handleUpdateDelivery(delivery.id!, 'item', e.target.value);
                            }}
                            className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                          />
                        )}
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Quantidade (Kg)</label>
                        <input 
                          type="number"
                          step="any"
                          value={delivery.kg || ''}
                          placeholder="0"
                          onChange={(e) => handleUpdateDelivery(delivery.id!, 'kg', Number(e.target.value))}
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>

                      <div className="md:col-span-3 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Valor Total do Item (R$)</label>
                        <input 
                          type="number"
                          step="any"
                          value={delivery.value || ''}
                          onChange={(e) => handleUpdateDelivery(delivery.id!, 'value', Number(e.target.value))}
                          placeholder="0.00"
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-bold text-xs text-indigo-600 outline-none focus:ring-2 focus:ring-indigo-400"
                        />
                      </div>

                      <div className="md:col-span-1 flex justify-end">
                        <button 
                          type="button"
                          onClick={() => handleRemoveDelivery(delivery.id!)}
                          className="p-2.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                          title="Remover item"
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

        <div className="p-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/60">
          <div className="text-gray-700 font-bold text-sm">
            Total da Nota: <span className="text-indigo-600 font-black ml-2 text-base font-mono">
              R$ {deliveries.reduce((acc, d) => acc + (Number(d.value) || 0), 0).toFixed(2)}
            </span>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 md:flex-initial px-6 py-2.5 text-gray-600 font-black uppercase text-xs hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={handleSave}
              disabled={loading}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-8 py-2.5 bg-indigo-600 text-white font-black uppercase text-xs rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all active:scale-95 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>Gravar Nota Fiscal</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SendInvoiceModal;
