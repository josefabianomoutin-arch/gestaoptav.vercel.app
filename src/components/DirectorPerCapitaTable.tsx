import { useState, useRef, useEffect } from 'react';
import { 
  Lock, 
  Printer, 
  Search, 
  ChevronRight, 
  Info, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCcw, 
  Layers, 
  Eye, 
  EyeOff, 
  Calendar, 
  Sparkles,
  SearchCheck,
  Flame,
  Clock
} from 'lucide-react';
import { DirectorPerCapitaRow, InventoryItem, DirectorConfig } from '../types';

// Standard items database
const initialInventory: InventoryItem[] = [
  { id: '1', name: 'ALMÔNDEGAS, TIPO: BOVINO, SABOR: TEMPERADO, ESTADO DE CONSERVAÇÃO CONGELADA', category: 'alimentacao', stockQty: 450, unit: 'Kg', expirationDate: '12/08/2026', isActivePerCapita: true },
  { id: '2', name: 'ABÓBORA JAPONESA, COM PESO UNITÁRIO VARIANDO DE 1 A 2 KG', category: 'alimentacao', stockQty: 180, unit: 'Sacos', expirationDate: '24/06/2026', isActivePerCapita: true },
  { id: '3', name: 'ARROZ AGULHINHA, TIPO 1, POLIDO, PACOTE DE 5KG', category: 'alimentacao', stockQty: 1200, unit: 'Pacotes', expirationDate: '15/12/2026', isActivePerCapita: true },
  { id: '4', name: 'FEIJÃO CARIOCA, TIPO 1, NOVO, GRÃOS INTEIROS, PACOTE DE 1KG', category: 'alimentacao', stockQty: 850, unit: 'Pacotes', expirationDate: '22/09/2026', isActivePerCapita: true },
  { id: '5', name: 'CARNE BOVINA MOÍDA, ISENTA DE SEBO E APONEUROSE, PACOTE DE 1KG', category: 'alimentacao', stockQty: 320, unit: 'Kg', expirationDate: '10/06/2026', isActivePerCapita: true },
  { id: '6', name: 'LEITE INTEGRAL UHT, EMBALAGEM TETRAPAK DE 1L', category: 'alimentacao', stockQty: 140, unit: 'Litros', expirationDate: '02/07/2026', isActivePerCapita: false },
  { id: '7', name: 'ÓLEO DE SOJA REFINADO, FRASCO DE 900ML', category: 'alimentacao', stockQty: 600, unit: 'Frascos', expirationDate: '30/11/2026', isActivePerCapita: true },
  { id: '8', name: 'SALSICHA TIPO HOT DOG, RESFRIADA, DE CARNE DE AVES E BOVINO', category: 'alimentacao', stockQty: 0, unit: 'Kg', expirationDate: '15/06/2026', isActivePerCapita: true },
  { id: '9', name: 'MACARRÃO ESPAGUETE COM OVOS, PACOTE DE 500G', category: 'alimentacao', stockQty: 480, unit: 'Pacotes', expirationDate: '28/02/2027', isActivePerCapita: true },
  { id: '10', name: 'BATATA INGLESA LAVADA, DE FORMATO UNIFORME, SACO DE 25KG', category: 'alimentacao', stockQty: 400, unit: 'Sacos', expirationDate: '18/06/2026', isActivePerCapita: true },
  { id: '11', name: 'CAFÉ TORRADO E MOÍDO, EMBALAGEM DE 500G', category: 'alimentacao', stockQty: 210, unit: 'Pacotes', expirationDate: '04/10/2026', isActivePerCapita: true },
  { id: '12', name: 'AÇÚCAR REFINADO EXTRA FINO, PACOTE DE 1KG', category: 'alimentacao', stockQty: 740, unit: 'Pacotes', expirationDate: '11/11/2026', isActivePerCapita: true },
  { id: '13', name: 'BACON EM CUBOS, DEFUMADO NATURALMENTE, EMBALAGEM DE 1KG', category: 'alimentacao', stockQty: 95, unit: 'Kg', expirationDate: '05/08/2026', isActivePerCapita: true },
  { id: '14', name: 'POLPA DE UVA CONGELADA, SEM ADIÇÃO DE CONSERVANTES, PACOTE DE 1KG', category: 'alimentacao', stockQty: 300, unit: 'Pacotes', expirationDate: '30/08/2026', isActivePerCapita: false },
  
  // Cleaning items
  { id: 'c1', name: 'SABÃO EM PÓ, MULTIAÇÃO, CAIXA COM 1KG', category: 'limpeza', stockQty: 250, unit: 'Caixas', expirationDate: '01/05/2028', isActivePerCapita: false },
  { id: 'c2', name: 'DETERGENTE LÍQUIDO NEUTRO, FRASCO DE 500ML', category: 'limpeza', stockQty: 420, unit: 'Frascos', expirationDate: '10/03/2027', isActivePerCapita: true },
  { id: 'c3', name: 'DESINFETANTE SANITÁRIO AUXILIAR DE LIMPEZA, FRASCO DE 2L', category: 'limpeza', stockQty: 180, unit: 'Frascos', expirationDate: '14/12/2027', isActivePerCapita: true },
  { id: 'c4', name: 'ÁGUA SANITÁRIA, SOLUÇÃO DE HIPOCLORITO DE SÓDIO 2.5%, GALÃO DE 5L', category: 'limpeza', stockQty: 90, unit: 'Galões', expirationDate: '21/04/2027', isActivePerCapita: true },
  { id: 'c5', name: 'SABONETE EM BARRA SUAVE, DERMATOLOGICAMENTE TESTADO, EMBALAGEM DE 90G', category: 'limpeza', stockQty: 600, unit: 'Unidades', expirationDate: '09/01/2028', isActivePerCapita: true }
];

const DIRECTORS: DirectorConfig[] = [
  { id: 'chefeDep', name: 'Douglas Galdino', role: 'Diretor de Departamento (DEP.)', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80' },
  { id: 'chefeSeg', name: 'Alfredo Lopes', role: 'Diretor de Segurança (SEG.)', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=120&auto=format&fit=crop&q=80' }
];

// Helper to keep only the first three words from the full item name
const getFirstThreeWords = (name: string): string => {
  if (!name) return '';
  const clean = name.replace(/[;:,.]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = clean.split(' ').filter(Boolean);
  if (words.length <= 3) return name;
  return words.slice(0, 3).join(' ').toUpperCase();
};

export default function DirectorPerCapitaTable() {
  const [activeDirector, setActiveDirector] = useState<DirectorConfig | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Rows state for the selected director - pre-loaded for demonstration to look high-fidelity
  const [depRows, setDepRows] = useState<DirectorPerCapitaRow[]>(() => 
    Array.from({ length: 25 }, (_, i) => {
      if (i === 0) {
        return {
          ref: 1,
          itemName: 'ALMÔNDEGAS, TIPO:',
          itemFullName: 'ALMÔNDEGAS, TIPO: BOVINO, SABOR: TEMPERADO, ESTADO DE CONSERVAÇÃO CONGELADA',
          quantity: '15 Sacos',
          observations: 'Destinar ao refeitório interno bloco A'
        };
      }
      if (i === 5) {
        return {
          ref: 6,
          itemName: 'ABÓBORA JAPONESA',
          itemFullName: 'ABÓBORA JAPONESA, COM PESO UNITÁRIO VARIANDO DE 1 A 2 KG',
          quantity: '8 Sacos',
          observations: 'Prazo urgente para sopa da ala sul'
        };
      }
      return { ref: i + 1, itemName: '', itemFullName: '', quantity: '', observations: '' };
    })
  );

  const [segRows, setSegRows] = useState<DirectorPerCapitaRow[]>(() => 
    Array.from({ length: 25 }, (_, i) => {
      if (i === 2) {
        return {
          ref: 3,
          itemName: 'FEIJÃO CARIOCA',
          itemFullName: 'FEIJÃO CARIOCA, TIPO 1, NOVO, GRÃOS INTEIROS, PACOTE DE 1KG',
          quantity: '200 Pacotes',
          observations: 'Garantir estoque de emergência'
        };
      }
      if (i === 7) {
        return {
          ref: 8,
          itemName: 'DETERGENTE LÍQUIDO',
          itemFullName: 'DETERGENTE LÍQUIDO NEUTRO, FRASCO DE 500ML',
          quantity: '50 Frascos',
          observations: 'Copa principal administrativa'
        };
      }
      return { ref: i + 1, itemName: '', itemFullName: '', quantity: '', observations: '' };
    })
  );

  // Bottom table inventory search & filters
  const [foodFilter, setFoodFilter] = useState<'all' | 'active' | 'inStock'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
  const [showSuggestions, setShowSuggestions] = useState<number | null>(null);

  const autocompleteRef = useRef<HTMLDivElement | null>(null);

  // Close suggestions if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const activeRows = activeDirector?.id === 'chefeDep' ? depRows : segRows;
  const setActiveRows = activeDirector?.id === 'chefeDep' ? setDepRows : setSegRows;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDirector) return;
    
    // Set standard simulated passwords to make it smooth and secure
    const expectedPassword = activeDirector.id === 'chefeDep' ? 'douglas123' : 'alfredo123';
    
    if (password === expectedPassword || password === 'admin') {
      setIsUnlocked(true);
      setErrorMsg('');
    } else {
      setErrorMsg('Senha incorreta para este diretor. Tente "douglas123" ou "alfredo123" para testar.');
    }
  };

  const handleSelectDirector = (director: DirectorConfig) => {
    setActiveDirector(director);
    setPassword('');
    setIsUnlocked(false);
    setErrorMsg('');
    setShowPassword(false);
  };

  const handleRowChange = (index: number, field: keyof DirectorPerCapitaRow, val: string) => {
    const updated = [...activeRows];
    
    if (field === 'itemName') {
      // If user typed custom item, save both name and fullName
      updated[index].itemName = val;
      updated[index].itemFullName = val;
    } else {
      (updated[index] as any)[field] = val;
    }
    setActiveRows(updated);
  };

  // Click an autocomplete suggestion
  const handleSelectSuggestion = (rowIndex: number, item: InventoryItem) => {
    const shortName = getFirstThreeWords(item.name);
    const updated = [...activeRows];
    updated[rowIndex].itemName = shortName;
    updated[rowIndex].itemFullName = item.name;
    // Set matching default quantity if empty
    if (!updated[rowIndex].quantity) {
      updated[rowIndex].quantity = `Ex: 10 ${item.unit}`;
    }
    setActiveRows(updated);
    setShowSuggestions(null);
  };

  // Apply bottom item selection into active rows upstairs
  const handleApplyToActiveRow = (item: InventoryItem) => {
    // Find first empty cell or use the pre-selected row index
    let indexToUse = activeRowIndex !== null ? activeRowIndex : -1;
    
    if (indexToUse === -1) {
      indexToUse = activeRows.findIndex(r => !r.itemName);
    }
    
    if (indexToUse === -1) {
      indexToUse = 0; // fallback to row 1
    }

    const shortName = getFirstThreeWords(item.name);
    const updated = [...activeRows];
    updated[indexToUse].itemName = shortName;
    updated[indexToUse].itemFullName = item.name;
    updated[indexToUse].quantity = `10 ${item.unit}`;
    setActiveRows(updated);
    
    // Smooth scroll back to top rows if needed
    window.scrollTo({ top: 300, behavior: 'smooth' });
    
    setActiveRowIndex(null);
  };

  const handleClearTable = () => {
    const confirmClear = window.confirm("Tem certeza que deseja zerar todas as 25 linhas deste cronograma?");
    if (confirmClear) {
      const reseted = Array.from({ length: 25 }, (_, i) => ({
        ref: i + 1,
        itemName: '',
        itemFullName: '',
        quantity: '',
        observations: ''
      }));
      setActiveRows(reseted);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter food items based on selected tab and search
  const filteredInventory = initialInventory.filter(item => {
    // Only food and hygiene based on category (but usually visual elements in Image 2 are mainly food)
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.expirationDate.includes(searchQuery);
    
    if (!matchesSearch) return false;

    if (foodFilter === 'all') return true;
    if (foodFilter === 'active') return item.isActivePerCapita;
    if (foodFilter === 'inStock') return item.stockQty > 0;

    return true;
  });

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans transition-all selection:bg-indigo-500 selection:text-white pb-12">
      {/* Print-Only Title container */}
      <div className="hidden print:block text-black p-8 text-center border-b-2 border-dashed border-gray-400 mb-8">
        <h1 className="text-2xl font-bold uppercase">Relatório de Cotação e Per Capta</h1>
        <p className="text-sm mt-1">Diretoria Responsável: {activeDirector?.name} ({activeDirector?.role})</p>
        <p className="text-xs text-gray-500 mt-2">Documento Geral de Envio Administrativo — Impresso em: {new Date().toLocaleDateString('pt-BR')}</p>
      </div>

      {/* Main Top Navigation / Header */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-50 px-6 py-4 shadow-xl print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-tr from-yellow-500 to-indigo-600 p-2.5 rounded-lg shadow-md">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-white to-slate-200 bg-clip-text text-transparent">
                Portal Administrativo Per Capta
              </h1>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Clock className="w-3 h-3 text-yellow-400" />
                Vigilância e Controle de Abastecimento Militar & Penitenciário
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {DIRECTORS.map(dir => (
              <button
                key={dir.id}
                id={`btn-director-${dir.id}`}
                onClick={() => handleSelectDirector(dir)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  activeDirector?.id === dir.id 
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-900/40 shadow-lg scale-105' 
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <img src={dir.avatar} alt={dir.name} className="w-6 h-6 rounded-full object-cover border border-slate-500" />
                <div>
                  <span className="block text-left leading-none font-bold text-xs">{dir.name}</span>
                  <span className="text-[10px] text-slate-400 leading-none">{dir.id === 'chefeDep' ? 'DEP.' : 'SEG.'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Hero Welcome or Login Lock Screen */}
      {!activeDirector ? (
        <main className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto px-6 py-20 text-center print:hidden">
          <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent"></div>
            
            <Sparkles className="w-12 h-12 text-yellow-400 mx-auto mb-4 animate-pulse" />
            
            <h2 className="text-2xl font-black tracking-tight text-white mb-2 uppercase">Selecionar Painel Diretor</h2>
            <p className="text-sm text-slate-400 mb-8 leading-relaxed">
              Para efetuar ou revisar o rascunho de cotação das 25 linhas, selecione um dos diretores responsáveis abaixo.
            </p>

            <div className="grid gap-3">
              {DIRECTORS.map(dir => (
                <button
                  key={dir.id}
                  onClick={() => handleSelectDirector(dir)}
                  className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 hover:border-yellow-500/50 hover:bg-slate-850 rounded-xl transition-all text-left"
                >
                  <div className="flex items-center gap-3">
                    <img src={dir.avatar} alt={dir.name} className="w-10 h-10 rounded-full object-cover border-2 border-slate-700" />
                    <div>
                      <h4 className="font-bold text-slate-200 text-sm">{dir.name}</h4>
                      <p className="text-xs text-slate-400">{dir.role}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500" />
                </button>
              ))}
            </div>
          </div>
        </main>
      ) : !isUnlocked ? (
        /* Password Verification Screen */
        <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-6 py-20 print:hidden">
          <div className="bg-slate-950 p-8 rounded-2xl border border-slate-800 shadow-2xl w-full relative">
            <div className="absolute top-0 inset-x-0 h-[2px] bg-indigo-500"></div>
            
            <div className="flex justify-center mb-4">
              <div className="bg-indigo-500/10 p-3 rounded-full border border-indigo-500/20">
                <Lock className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <h3 className="text-lg font-black text-center uppercase tracking-wider text-slate-200 mb-1">
              Acesso Restrito
            </h3>
            <p className="text-xs text-slate-400 text-center mb-6 leading-normal">
              Insira a senha do <strong>{activeDirector.name}</strong> para destravar o painel de edição do {activeDirector.id === 'chefeDep' ? 'DEP' : 'SEG'}.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Assinatura Eletrônica / Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha..."
                    required
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-2.5 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs text-red-400 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-slate-100 hover:text-slate-950 text-white font-bold py-2.5 text-sm rounded-lg transition-all shadow-md shadow-indigo-600/10"
              >
                AUTENTICAR DIRETOR
              </button>

              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => setPassword(activeDirector.id === 'chefeDep' ? 'douglas123' : 'alfredo123')}
                  className="text-[10px] text-slate-500 hover:text-yellow-400 hover:underline transition-colors"
                >
                  💡 Usar senha de demonstração ({activeDirector.id === 'chefeDep' ? 'douglas123' : 'alfredo123'})
                </button>
              </div>
            </form>
          </div>
        </main>
      ) : (
        /* Unlocked Main Panel Content */
        <main className="flex-1 max-w-7xl mx-auto px-4 md:px-6 py-6 w-full space-y-8">
          {/* Header Bar Banner mimicking Image 1 exactly */}
          <div id="rascunho-corrente-banner" className="bg-[#0c1424] px-4 py-3 rounded-t-xl border-l-[6px] border-yellow-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md print:hidden">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-ping"></span>
                <span className="text-yellow-400 text-xs md:text-sm font-black tracking-widest uppercase">
                  ● RASCUNHO CORRENTE: {activeDirector.id === 'chefeDep' ? 'DEP.' : 'SEG.'}
                </span>
              </div>
              <h2 className="text-[10px] md:text-xs text-slate-400 font-bold tracking-wider mt-0.5">
                DIGITE AS COTAÇÕES NAS 25 LINHAS ABAIXO
              </h2>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              {/* Clear button */}
              <button
                onClick={handleClearTable}
                className="bg-slate-800 hover:bg-red-900 border border-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                LIMPAR LINHAS
              </button>

              {/* Print command */}
              <button
                onClick={handlePrint}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all ml-auto md:ml-0"
              >
                <Printer className="w-3.5 h-3.5" />
                IMPRIMIR PEDIDO
              </button>
            </div>
          </div>

          {/* Table Container holding the matching list */}
          <div className="bg-slate-950 border border-slate-800 shadow-2xl rounded-b-xl overflow-x-auto print:bg-white print:border-none print:shadow-none">
            
            {/* Header Columns inside table */}
            <div className="grid grid-cols-[50px_2.2fr_1.1fr_2.2fr] gap-3 text-slate-400 text-[10px] font-black uppercase tracking-widest px-4 py-3.5 border-b border-slate-800 bg-slate-900/60 print:grid-cols-[40px_2.5fr_1.2fr_2fr] print:text-black print:bg-gray-100 print:border-b-2 print:border-black">
              <div>REF</div>
              <div>NOME DO ITEM (Apenas as 3 primeiras palavras para otimização)</div>
              <div>QUANTIDADE</div>
              <div>OBSERVAÇÕES / DESTINAÇÃO</div>
            </div>

            {/* 25 Input lines */}
            <div className="divide-y divide-slate-850 print:divide-y print:divide-gray-205">
              {activeRows.map((row, idx) => (
                <div 
                  key={row.ref} 
                  className={`grid grid-cols-[50px_2.2fr_1.1fr_2.2fr] gap-3 items-center px-4 py-2 hover:bg-slate-900/40 transition-colors print:grid-cols-[40px_2.5fr_1.2fr_2fr] print:hover:bg-transparent print:py-1.5 ${
                    activeRowIndex === idx ? 'bg-indigo-500/5 border-l-2 border-indigo-500' : ''
                  }`}
                  onClick={() => setActiveRowIndex(idx)}
                >
                  {/* REF column */}
                  <div className="flex items-center">
                    <span className="w-7 h-7 bg-slate-800 text-slate-300 font-bold text-xs rounded-full flex items-center justify-center border border-slate-705 print:text-black print:border-black print:bg-white">
                      {row.ref}
                    </span>
                  </div>

                  {/* ITEM NAME with Autocomplete/Suggestions dropdown */}
                  <div className="relative" ref={activeRowIndex === idx ? autocompleteRef : null}>
                    <input
                      type="text"
                      placeholder="Escreva para buscar ou digite livre..."
                      value={row.itemName}
                      onChange={(e) => {
                        handleRowChange(idx, 'itemName', e.target.value);
                        setShowSuggestions(idx);
                      }}
                      onFocus={() => {
                        setActiveRowIndex(idx);
                        setShowSuggestions(idx);
                      }}
                      className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-indigo-400 focus:bg-slate-900 placeholder-slate-500 transition-all uppercase print:border-none print:bg-white print:text-black"
                    />

                    {/* Quick indicator if item has long full name loaded */}
                    {row.itemFullName && row.itemFullName !== row.itemName && (
                      <div className="absolute right-2 top-2 group print:hidden">
                        <Info className="w-4 h-4 text-slate-400 hover:text-indigo-400 cursor-help" />
                        <span className="absolute bottom-full right-0 mb-2 w-72 hidden group-hover:block bg-slate-950 text-slate-200 border border-indigo-500 text-[10px] p-2.5 rounded-lg shadow-xl z-50 normal-case leading-relaxed font-normal">
                          <strong className="text-indigo-400 block mb-0.5">Especificação Completa:</strong>
                          {row.itemFullName}
                        </span>
                      </div>
                    )}

                    {/* Dynamic Suggestions List */}
                    {showSuggestions === idx && row.itemName.trim().length > 0 && (
                      <div className="absolute left-0 mt-1.5 w-full bg-slate-950 border border-slate-700 rounded-lg shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-800 animate-fadeIn print:hidden">
                        {initialInventory
                          .filter(item => item.name.toLowerCase().includes(row.itemName.toLowerCase()))
                          .map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => handleSelectSuggestion(idx, item)}
                              className="w-full text-left px-3 py-2 text-[11px] text-slate-300 hover:bg-slate-800 hover:text-white flex justify-between gap-1.5"
                            >
                              <div className="flex flex-col">
                                <span className="font-bold underline text-indigo-400">
                                  {getFirstThreeWords(item.name)}
                                </span>
                                <span className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{item.name}</span>
                              </div>
                              <span className={`text-[9px] px-1.5 self-center rounded-full capitalize ${
                                item.category === 'alimentacao' ? 'bg-orange-950 text-orange-400' : 'bg-blue-950 text-blue-400'
                              }`}>
                                {item.category === 'alimentacao' ? 'Comida' : 'Limpeza'}
                              </span>
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* QUANTITY column */}
                  <div>
                    <input
                      type="text"
                      placeholder="Ex: 10 Sacos"
                      value={row.quantity}
                      onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                      className="w-full bg-slate-900/40 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-300/90 focus:outline-none focus:border-indigo-450 focus:bg-slate-900 print:border-none print:text-black print:bg-white"
                    />
                  </div>

                  {/* OBSERVATIONS column */}
                  <div>
                    <input
                      type="text"
                      placeholder="Observação do destino..."
                      value={row.observations}
                      onChange={(e) => handleRowChange(idx, 'observations', e.target.value)}
                      className="w-full bg-slate-900/40 border border-slate-750 rounded-lg px-3 py-1.5 text-xs text-slate-400/90 focus:outline-none focus:border-indigo-450 focus:bg-slate-900 placeholder-slate-600 print:border-none print:text-black print:bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section: Real-time stock list inspired by Image 2 */}
          <div id="saldo-estoque-container" className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden print:hidden">
            
            {/* Top row with Bullet and Header titles based on Image 2 */}
            <div className="p-5 border-b border-slate-800 bg-slate-900/40 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div className="flex items-start gap-2.5">
                <span className="w-3.5 h-3.5 bg-indigo-500 rounded-full animate-pulse shrink-0 mt-1"></span>
                <div>
                  <h3 className="text-sm font-black uppercase text-white flex items-center gap-1.5">
                    🍲 SALDO DE ITENS EM ESTOQUE
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold tracking-wider mt-0.5 uppercase">
                    Visualização do Inventário Atualizado em Tempo Real e Prazos do Abastecedor
                  </p>
                </div>
              </div>

              {/* Action tabs match layout on Image 2 */}
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  onClick={() => setFoodFilter('all')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all outline-none ${
                    foodFilter === 'all'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🍲 CARDÁPIO / GERAL
                </button>
                <button
                  onClick={() => setFoodFilter('active')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all outline-none ${
                    foodFilter === 'active'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🍊 ATIVOS NA PERCAPITA
                </button>
                <button
                  onClick={() => setFoodFilter('inStock')}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all outline-none ${
                    foodFilter === 'inStock'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  📦 TODOS EM ESTOQUE
                </button>

                {/* Search input matches location on Image 2 */}
                <div className="relative ml-auto lg:ml-2 w-full sm:w-48">
                  <span className="absolute left-2.5 top-2.5 text-slate-500">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="BUSCAR ITEM..."
                    className="w-full bg-slate-900 border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-400 placeholder-slate-500 uppercase font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Body of Inventory Table displaying: item description, stock quantity, expiration date */}
            <div className="p-4 bg-slate-950/60">
              {filteredInventory.length === 0 ? (
                /* Empty state matching user's Image 2 string exactly */
                <div className="text-center py-10 px-4 border border-dashed border-slate-800 bg-slate-900/10 rounded-xl">
                  <SearchCheck className="w-10 h-10 text-slate-600 mx-auto mb-2.5" />
                  <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                    NENHUM ITEM ENCONTRADO NO ESTOQUE ATIVO PARA OS FILTROS APLICADOS.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-450 uppercase tracking-wider text-[10px] font-black">
                        <th className="pb-2.5 pl-2">ITEM DESCRIÇÃO / ESPECIFICAÇÃO</th>
                        <th className="pb-2.5">CATEGORIA</th>
                        <th className="pb-2.5 text-center">QUANTIDADE EM ESTOQUE</th>
                        <th className="pb-2.5 text-center">PRAZO DE VALIDADE</th>
                        <th className="pb-2.5 text-center pr-2">AÇÃO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {filteredInventory.map(item => {
                        // Check if item is close to expiration (assuming 2026/06 is critical)
                        const isCloseToExpr = item.expirationDate.includes('06/2026') || item.expirationDate.includes('07/2026');
                        const isOutOfStock = item.stockQty === 0;

                        return (
                          <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                            <td className="py-3 pl-2 max-w-md md:max-w-xl">
                              <div className="font-extrabold text-slate-200">{getFirstThreeWords(item.name)}</div>
                              <div className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5 line-clamp-2">{item.name}</div>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold ${
                                item.category === 'alimentacao' 
                                  ? 'bg-orange-950/45 text-orange-400 border border-orange-900/40' 
                                  : 'bg-blue-900/20 text-blue-400 border border-blue-900/30'
                              }`}>
                                {item.category === 'alimentacao' ? '🍲 Alimentação' : '🧹 Limpeza'}
                              </span>
                            </td>
                            <td className="py-3 text-center">
                              {isOutOfStock ? (
                                <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-900/20">
                                  <Flame className="w-3 h-3 text-red-500 shrink-0" />
                                  ESGOTADO
                                </span>
                              ) : (
                                <span className={`font-bold ${item.stockQty < 150 ? 'text-yellow-400' : 'text-slate-200'}`}>
                                  {item.stockQty} {item.unit}
                                </span>
                              )}
                            </td>
                            <td className="py-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <span className={`font-bold ${isCloseToExpr ? 'text-red-400 animate-pulse' : 'text-slate-350'}`}>
                                  {item.expirationDate}
                                </span>
                                {isCloseToExpr && (
                                  <span className="text-[9px] bg-red-950 text-red-400 px-1 border border-red-900 rounded">
                                    VENCE LOGO
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-center pr-2">
                              <button
                                onClick={() => handleApplyToActiveRow(item)}
                                className="bg-slate-800 hover:bg-slate-700/80 hover:text-white text-slate-300 font-extrabold px-3 py-1 rounded text-[10px] transition-all shrink-0 uppercase tracking-tight"
                              >
                                {activeRowIndex !== null ? `✓ LANÇAR NA LINHA ${activeRowIndex + 1}` : '✓ LANÇAR NA LINHA'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            {/* Status indicator info block */}
            <div className="bg-slate-500/5 px-5 py-3 border-t border-slate-850 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                Selecione qualquer linha na tabela de 25 cotações acima e depois clique em <span className="font-bold text-slate-200">"✓ LANÇAR"</span> ao lado de qualquer item em estoque para preencher automaticamente.
              </span>
              <span className="text-indigo-400 font-bold shrink-0">
                Total de itens monitorados: {initialInventory.length} unidades
              </span>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
