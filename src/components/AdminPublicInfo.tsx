import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicInfo } from '../types';
import { toast } from 'sonner';

interface AdminPublicInfoProps {
  infoList: PublicInfo[];
  onSave: (info: Omit<PublicInfo, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const AdminPublicInfo: React.FC<AdminPublicInfoProps> = ({ infoList, onSave, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentInfo, setCurrentInfo] = useState<Partial<PublicInfo>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (info: PublicInfo) => {
    setCurrentInfo(info);
    setIsEditing(true);
  };

  const handleAddNew = () => {
    setCurrentInfo({
      sector: '',
      title: '',
      content: '',
      imageUrl: '',
      updatedAt: new Date().toISOString(),
    });
    setIsEditing(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        setCurrentInfo(prev => ({ ...prev, imageUrl: compressedDataUrl }));
        toast.success('Imagem carregada e otimizada com sucesso!');
      };
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInfo.sector || !currentInfo.title || !currentInfo.content) {
      toast.error('Por favor, preencha todos os campos obrigatórios (Setor, Título e Conteúdo).');
      return;
    }

    setIsSubmitting(true);
    try {
      const infoToSave = {
        ...currentInfo,
        updatedAt: new Date().toISOString(),
      };

      await onSave(infoToSave as Omit<PublicInfo, 'id'> & { id?: string });
      setIsEditing(false);
      setCurrentInfo({});
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gerenciar Portal Público</h2>
          <p className="text-xs text-gray-500">Cadastre avisos, comunicados e campanhas com imagens visíveis no portal público e no ticker superior.</p>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-md shadow-blue-200"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Nova Informação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {infoList.map((info) => (
          <motion.div
            key={info.id}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-lg transition-all relative group overflow-hidden flex flex-col justify-between"
          >
            <div>
              {/* Image Header Preview if available */}
              {info.imageUrl ? (
                <div className="h-36 w-full bg-slate-100 overflow-hidden relative border-b border-gray-100">
                  <img 
                    src={info.imageUrl} 
                    alt={info.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                  />
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg shadow-xs">
                      {info.sector}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 pb-0 flex justify-between items-start">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
                    {info.sector}
                  </span>
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-gray-900 leading-snug line-clamp-2">{info.title}</h3>
                  <div className="flex gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(info)}
                      title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(info.id)}
                      title="Excluir"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{info.content}</p>
              </div>
            </div>

            <div className="p-4 pt-0 text-[10px] text-gray-400 flex justify-between items-center border-t border-gray-50 mt-2">
              <div className="flex items-center gap-1 font-medium">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {new Date(info.updatedAt || info.date || '2026-01-01').toLocaleDateString('pt-BR')}
              </div>
              {info.imageUrl && (
                <span className="text-emerald-600 bg-emerald-50 font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                  🖼️ Com Imagem
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isEditing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {currentInfo.id ? 'Editar Informação' : 'Nova Informação'}
                  </h3>
                  <p className="text-xs text-gray-500">Preencha os dados e anexe uma imagem se desejado.</p>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Setor / Departamento *</label>
                  <input
                    type="text"
                    value={currentInfo.sector || ''}
                    onChange={(e) => setCurrentInfo({ ...currentInfo, sector: e.target.value })}
                    placeholder="Ex: CIPA, RH, FINANÇAS, SAÚDE"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Título *</label>
                  <input
                    type="text"
                    value={currentInfo.title || ''}
                    onChange={(e) => setCurrentInfo({ ...currentInfo, title: e.target.value })}
                    placeholder="Título da notícia ou campanha"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-700 mb-1">Conteúdo *</label>
                  <textarea
                    value={currentInfo.content || ''}
                    onChange={(e) => setCurrentInfo({ ...currentInfo, content: e.target.value })}
                    placeholder="Descreva a informação detalhadamente..."
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm resize-none font-medium"
                    required
                  />
                </div>

                {/* Image Section */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <label className="block text-xs font-bold uppercase text-gray-700">
                    Imagem do Cadastro (Banner/Cartaz)
                  </label>

                  {currentInfo.imageUrl ? (
                    <div className="relative rounded-xl overflow-hidden border border-gray-200 bg-slate-50 group">
                      <img 
                        src={currentInfo.imageUrl} 
                        alt="Preview" 
                        className="w-full h-40 object-cover" 
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCurrentInfo(prev => ({ ...prev, imageUrl: '' }))}
                          className="bg-red-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md hover:bg-red-700 transition-colors"
                        >
                          Remover Imagem
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 hover:border-blue-500 rounded-xl cursor-pointer bg-slate-50 hover:bg-blue-50/50 transition-all text-center">
                        <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-bold text-gray-700">Clique para selecionar uma imagem do seu computador</span>
                        <span className="text-[10px] text-gray-400 mt-0.5">Formatos suportados: PNG, JPG, JPEG, WEBP (Otimização automática)</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageUpload} 
                          className="hidden" 
                        />
                      </label>

                      <div className="relative flex py-1 items-center">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="shrink-0 mx-2 text-[10px] text-gray-400 font-bold uppercase">ou informe o link/URL da imagem</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                      </div>

                      <input
                        type="url"
                        value={currentInfo.imageUrl || ''}
                        onChange={(e) => setCurrentInfo({ ...currentInfo, imageUrl: e.target.value })}
                        placeholder="https://exemplo.com/imagem.jpg"
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs font-mono"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isConfidential"
                    checked={currentInfo.isConfidential || false}
                    onChange={(e) => setCurrentInfo({ ...currentInfo, isConfidential: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="isConfidential" className="text-xs font-semibold text-gray-700 cursor-pointer">
                    Confidencial (visível apenas em ordens internas)
                  </label>
                </div>
                
                <div className="flex gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-bold text-xs uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-200 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Informação'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminPublicInfo;
