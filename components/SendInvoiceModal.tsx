import React, { useState, useRef, useMemo, useEffect } from 'react';
import type { Delivery, ContractItem } from '../types';
import { speechService } from '../src/services/speechService';
import { Volume2, Upload, FileText, Download, CheckCircle2, Loader2, Plus, Trash2, Calendar, Sparkles } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface SendInvoiceModalProps {
  invoiceInfo: { date: string; deliveries: Delivery[] };
  contractItems: ContractItem[];
  onClose: () => void;
  onSave: (invoiceNumber: string, invoiceUrl: string, deliveries: Delivery[], invoiceDate: string) => Promise<void>;
}

const SendInvoiceModal: React.FC<SendInvoiceModalProps> = ({ invoiceInfo, contractItems, onClose, onSave }) => {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(invoiceInfo.date);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Initialize with existing deliveries or one empty if none
  const [deliveries, setDeliveries] = useState<Delivery[]>(() => {
    if (invoiceInfo.deliveries.length > 0 && invoiceInfo.deliveries[0].item !== 'AGENDAMENTO PENDENTE') {
      return invoiceInfo.deliveries.map(d => ({
        ...d,
        lots: d.lots || [{ id: Math.random().toString(), lotNumber: '', initialQuantity: d.kg || 0, remainingQuantity: d.kg || 0, expirationDate: '' }]
      }));
    }
    // If it's a pending schedule, start with one empty item row
    return [{
      id: `new_${Date.now()}_0`,
      date: invoiceInfo.date,
      time: '08:00',
      item: '',
      kg: 0,
      value: 0,
      invoiceUploaded: true,
      lots: [{ id: Math.random().toString(), lotNumber: '', initialQuantity: 0, remainingQuantity: 0, expirationDate: '' }]
    }];
  });

  const [isSaved, setIsSaved] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ai = useMemo(() => {
    const key = process.env.GEMINI_API_KEY;
    if (key) return new GoogleGenAI({ apiKey: key });
    return null;
  }, []);

  const extractDataFromPdf = async (file: File) => {
    if (!ai) return;
    
    setIsExtracting(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      const base64Data = await base64Promise;
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
      
      const prompt = `Analise esta Nota Fiscal e extraia as seguintes informações em formato JSON:
      {
        "invoiceNumber": "string",
        "invoiceDate": "YYYY-MM-DD",
        "items": [
          {
            "name": "string (nome do produto)",
            "quantity": number (peso/quantidade),
            "lot": "string (número do lote se existir)",
            "validity": "YYYY-MM-DD (data de validade se existir)"
          }
        ]
      }
      Retorne APENAS o JSON, sem markdown ou explicações.`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data.split(',')[1],
            mimeType: "application/pdf"
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      const jsonStr = text.replace(/```json|```/g, '').trim();
      const extracted = JSON.parse(jsonStr);
      setExtractedData(extracted);

      if (extracted.invoiceNumber) setInvoiceNumber(extracted.invoiceNumber);
      if (extracted.invoiceDate) setInvoiceDate(extracted.invoiceDate);

      if (extracted.items && extracted.items.length > 0) {
        const newDeliveries = extracted.items.map((ei: any, index: number) => {
          const matchedItem = contractItems.find(ci => 
            ei.name.toUpperCase().includes(ci.name.toUpperCase()) || 
            ci.name.toUpperCase().includes(ei.name.toUpperCase())
          );

          return {
            id: `new_${Date.now()}_${index}`,
            date: invoiceInfo.date,
            time: '08:00',
            item: matchedItem ? matchedItem.name : '',
            kg: ei.quantity || 0,
            value: matchedItem ? (matchedItem.valuePerKg * (ei.quantity || 0)) : 0,
            invoiceUploaded: true,
            lots: [{ 
              id: Math.random().toString(),
              lotNumber: ei.lot || '', 
              initialQuantity: ei.quantity || 0,
              remainingQuantity: ei.quantity || 0,
              expirationDate: ei.validity || '' 
            }]
          };
        });

        if (newDeliveries.length > 0) {
          setDeliveries(newDeliveries);
        }
      }
    } catch (error) {
      console.error("Erro na extração Gemini:", error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddItem = () => {
    const newId = `new_${Date.now()}_${deliveries.length}`;
    setDeliveries([...deliveries, {
      id: newId,
      date: invoiceInfo.date,
      time: '08:00',
      item: '',
      kg: 0,
      value: 0,
      invoiceUploaded: true,
      lots: [{ id: Math.random().toString(), lotNumber: '', initialQuantity: 0, remainingQuantity: 0, expirationDate: '' }]
    }]);
  };

  const handleRemoveItem = (index: number) => {
    if (deliveries.length > 1) {
      const newDeliveries = [...deliveries];
      newDeliveries.splice(index, 1);
      setDeliveries(newDeliveries);
    }
  };

  const handleUpdateItem = (index: number, field: keyof Delivery, value: any) => {
    const newDeliveries = [...deliveries];
    const d = { ...newDeliveries[index] };
    
    if (field === 'item') {
      d.item = value;
      const contractItem = contractItems.find(ci => ci.name === value);
      if (contractItem) {
        d.value = (d.kg || 0) * contractItem.valuePerKg;
      }

      // Try to auto-fill lot and validity from extracted data if available
      if (extractedData?.items) {
        const extractedItem = extractedData.items.find((ei: any) => 
          ei.name.toUpperCase().includes(value.toUpperCase()) || 
          value.toUpperCase().includes(ei.name.toUpperCase())
        );
        if (extractedItem && d.lots && d.lots[0]) {
          d.lots[0].lotNumber = extractedItem.lot || d.lots[0].lotNumber;
          d.lots[0].expirationDate = extractedItem.validity || d.lots[0].expirationDate;
          if (extractedItem.quantity && d.kg === 0) {
            d.kg = extractedItem.quantity;
            if (contractItem) {
              d.value = extractedItem.quantity * contractItem.valuePerKg;
            }
          }
        }
      }
    } else if (field === 'kg') {
      const kg = parseFloat(value) || 0;
      d.kg = kg;
      const contractItem = contractItems.find(ci => ci.name === d.item);
      if (contractItem) {
        d.value = kg * contractItem.valuePerKg;
      }
      if (d.lots && d.lots[0]) {
        d.lots[0].initialQuantity = kg;
        d.lots[0].remainingQuantity = kg;
      }
    }
    
    newDeliveries[index] = d;
    setDeliveries(newDeliveries);
  };

  const handleUpdateLot = (index: number, field: 'lotNumber' | 'expirationDate', value: string) => {
    const newDeliveries = [...deliveries];
    const d = { ...newDeliveries[index] };
    if (d.lots && d.lots[0]) {
      d.lots[0] = { ...d.lots[0], [field]: value };
    }
    newDeliveries[index] = d;
    setDeliveries(newDeliveries);
  };

  const totalInvoiceValue = useMemo(() => {
    return deliveries.reduce((sum, d) => sum + (d.value || 0), 0);
  }, [deliveries]);

  const handlePlayGuide = async () => {
    const text = "Bem-vindo ao envio da nota fiscal. Digite o número da nota fiscal, selecione o arquivo PDF, adicione os itens da nota com peso, lote e validade, e clique em Enviar PDF.";
    await speechService.speak(text);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        setUploadError("O arquivo é muito grande. O tamanho máximo permitido é 2MB.");
        setSelectedFile(null);
        return;
      }
      setUploadError(null);
      setSelectedFile(file);
      extractDataFromPdf(file);
    }
  };

  const formattedDate = new Date(invoiceInfo.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  const isFormValid = invoiceNumber.trim().length > 0 && selectedFile !== null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid || !selectedFile) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          console.log('Iniciando onSave no Modal...', { invoiceNumber, fileSize: base64String.length });
          // Timeout de segurança de 45 segundos para a operação completa de salvamento
          const savePromise = onSave(invoiceNumber, base64String, deliveries, invoiceDate);
          const saveTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('A operação demorou demais. Verifique sua conexão.')), 45000)
          );

          await Promise.race([savePromise, saveTimeout]);
          console.log('onSave concluído no Modal');
          
          setIsUploading(false);
          setIsSaved(true);
        } catch (error: any) {
          console.error("Error saving invoice:", error);
          setUploadError(error.message || "Erro ao salvar a nota fiscal. Tente novamente.");
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        setUploadError("Erro ao ler o arquivo. Tente novamente.");
        setIsUploading(false);
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error("Error starting upload:", error);
      setUploadError("Erro ao iniciar o envio.");
      setIsUploading(false);
    }
  };

  if (isSaved) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-2 md:p-4">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up border border-gray-100 overflow-hidden p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Enviado com Sucesso!</h2>
            <p className="text-sm text-gray-500 mt-2">
              A nota fiscal foi enviada e salva no sistema para o administrador.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-2xl transition-all shadow-xl uppercase tracking-widest text-sm active:scale-95 flex items-center justify-center gap-2"
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-[100] p-2 md:p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md flex flex-col animate-fade-in-up border border-gray-100 overflow-hidden">
        
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter italic leading-none">Enviar NF</h2>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Fornecedor</p>
            </div>
            <button 
              type="button" 
              onClick={handlePlayGuide}
              className="bg-indigo-100 text-indigo-600 p-1.5 rounded-full hover:bg-indigo-200 transition-colors"
              title="Ouvir Guia"
            >
              <Volume2 className="h-4 w-4" />
            </button>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 bg-gray-50 rounded-full disabled:opacity-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form className="flex flex-col overflow-hidden" onSubmit={handleSave}>
            <div className="p-4 md:p-6 space-y-4">
                <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 flex items-start gap-2">
                    <div className="bg-orange-500 text-white p-1.5 rounded-lg flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <p className="text-[9px] text-orange-800 font-black uppercase tracking-tight">Data da Entrega</p>
                        <p className="text-sm font-bold text-orange-950">{formattedDate}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label htmlFor="invoice-number" className="text-[10px] font-black text-gray-400 uppercase ml-1">Nº da Nota Fiscal (NF)</label>
                        <input type="text" id="invoice-number" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} required placeholder="Ex: 001234" disabled={isUploading} className="w-full h-14 px-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800 disabled:opacity-50"/>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="invoice-date" className="text-[10px] font-black text-gray-400 uppercase ml-1">Data da Nota Fiscal</label>
                        <input type="date" id="invoice-date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} required disabled={isUploading} className="w-full h-14 px-4 border-2 border-gray-100 rounded-2xl focus:ring-2 focus:ring-orange-500 outline-none font-bold text-gray-800 disabled:opacity-50"/>
                    </div>
                </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Arquivo da Nota (PDF) - OBRIGATÓRIO</label>
                        <div 
                          onClick={() => !isUploading && fileInputRef.current?.click()}
                          className={`w-full h-14 px-4 border-2 border-dashed rounded-2xl flex items-center justify-between gap-2 transition-all ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${selectedFile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-indigo-300 hover:bg-indigo-50'}`}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {isExtracting ? (
                              <>
                                <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-indigo-600" />
                                <span className="text-xs font-bold text-indigo-600 animate-pulse">EXTRAINDO DADOS...</span>
                              </>
                            ) : selectedFile ? (
                              <>
                                <FileText className="h-5 w-5 flex-shrink-0" />
                                <span className="text-xs font-bold truncate">{selectedFile.name}</span>
                              </>
                            ) : (
                              <>
                                <Upload className="h-5 w-5 flex-shrink-0" />
                                <span className="text-xs font-bold">Selecionar PDF</span>
                              </>
                            )}
                          </div>
                          {selectedFile && !isUploading && (
                            <button 
                              type="button" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="p-2 hover:bg-green-100 rounded-full transition-colors text-green-600"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileChange} 
                          accept="application/pdf" 
                          className="hidden" 
                          disabled={isUploading}
                          required
                        />
                    </div>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase">Itens da Nota Fiscal</label>
                            <button 
                                type="button" 
                                onClick={handleAddItem}
                                className="flex items-center gap-1 text-[10px] font-black text-indigo-600 uppercase hover:text-indigo-700 transition-colors"
                            >
                                <Plus className="h-3 w-3" />
                                Adicionar Item
                            </button>
                        </div>
                        
                        <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {deliveries.map((delivery, index) => (
                                <div key={delivery.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3 relative group">
                                    {deliveries.length > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={() => handleRemoveItem(index)}
                                            className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                    
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Item</label>
                                        <select 
                                            value={delivery.item || ''} 
                                            onChange={e => handleUpdateItem(index, 'item', e.target.value)}
                                            className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 bg-white outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="">-- Selecione o Item --</option>
                                            {contractItems.map(ci => (
                                                <option key={ci.name} value={ci.name}>{ci.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Qtd (Kg)</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                placeholder="0,00" 
                                                value={delivery.kg || ''} 
                                                onChange={e => handleUpdateItem(index, 'kg', e.target.value)}
                                                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Valor Total</label>
                                            <div className="w-full h-10 px-3 border border-gray-100 bg-gray-100/50 rounded-xl text-xs font-black text-indigo-600 flex items-center">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(delivery.value || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Lote</label>
                                            <input 
                                                type="text" 
                                                placeholder="Lote" 
                                                value={delivery.lots?.[0]?.lotNumber || ''} 
                                                onChange={e => handleUpdateLot(index, 'lotNumber', e.target.value)}
                                                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-1">Validade</label>
                                            <input 
                                                type="date" 
                                                value={delivery.lots?.[0]?.expirationDate || ''} 
                                                onChange={e => handleUpdateLot(index, 'expirationDate', e.target.value)}
                                                className="w-full h-10 px-3 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 flex justify-between items-center">
                            <span className="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Valor Total da Nota</span>
                            <span className="text-lg font-black text-indigo-600 italic">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInvoiceValue)}
                            </span>
                        </div>
                    </div>
                
                {uploadError && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl border border-red-100 font-medium">
                    {uploadError}
                  </div>
                )}
                
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                      <span>Enviando...</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="bg-indigo-500 h-2 rounded-full transition-all duration-300 w-full animate-pulse"></div>
                    </div>
                  </div>
                )}
            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-white flex flex-col sm:flex-row gap-3 flex-shrink-0 pb-[max(24px,env(safe-area-inset-bottom))]">
                <button type="button" onClick={onClose} disabled={isUploading} className="flex-1 bg-gray-50 text-gray-400 font-black h-16 rounded-2xl uppercase text-[10px] tracking-widest hover:bg-gray-100 active:scale-95 transition-all disabled:opacity-50">Cancelar</button>
                <button 
                    type="submit" 
                    disabled={!isFormValid || isUploading}
                    className={`flex-[2] flex items-center justify-center gap-2 font-black h-16 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-xs text-white ${isFormValid && !isUploading ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-200 cursor-not-allowed text-gray-400'}`}
                >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-5 w-5" />
                        Enviar PDF
                      </>
                    )}
                </button>
            </div>
        </form>
      </div>
       <style>{`
        @keyframes fade-in-up { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>
    </div>
  );
};

export default SendInvoiceModal;
