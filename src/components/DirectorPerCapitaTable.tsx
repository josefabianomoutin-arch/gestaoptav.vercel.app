import { useState, useRef, useEffect } from 'react';
import { 
  Printer, 
  Search, 
  Info, 
  AlertTriangle, 
  Calendar, 
  SearchCheck, 
  Flame, 
  TrendingUp, 
  DollarSign, 
  FileSpreadsheet, 
  FileText, 
  Truck, 
  Car, 
  UtensilsCrossed, 
  Check, 
  X, 
  RefreshCw, 
  Plus, 
  Trash2
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
  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<'recursos' | 'adiantamentos' | 'ptres' | 'cardapio' | 'chegadas' | 'saida' | 'percapita'>('percapita');
  
  // Per Capita specific state
  const [activeDirector, setActiveDirector] = useState<DirectorConfig>(DIRECTORS[0]); // default logged in
  const [categoryFilter, setCategoryFilter] = useState<'alimentacao' | 'limpeza'>('alimentacao');
  const [periodFilter, setPeriodFilter] = useState<'semanal' | 'mensal'>('semanal');

  // Adiantamentos Tab states
  const [advances, setAdvances] = useState([
    { id: 1, name: 'Alfredo Lopes', role: 'Diretor de Segurança (SEG.)', amount: 30000, description: 'Abastecimento emergencial de gêneros e kits de higiene para a ala norte', date: '30/05/2026', status: 'Liberado' },
    { id: 2, name: 'Julio Santana', role: 'Coordenador Subportaria', amount: 15000, description: 'Manutenção imediata do portão eletrônico e iluminação perimetral', date: '29/05/2026', status: 'Liberado' },
    { id: 3, name: 'Daniele Garcia Possidonio', role: 'Depto. Financeiro', amount: 25000, description: 'Custeio extraordinário para lavanderia de uniformes', date: '28/05/2026', status: 'Aprovado' }
  ]);

  // PTRES/Natures States
  const ptresList = [
    { id: '174092', code: '33.90.30', desc: 'Material de Consumo - Gêneros de Alimentação', initial: 350000, current: 247500, color: 'emerald' },
    { id: '174095', code: '33.90.30', desc: 'Combustíveis e Lubrificantes Automotivos', initial: 120000, current: 14800, color: 'rose' },
    { id: '174098', code: '33.90.39', desc: 'Serviços de Terceiros - Limpeza e Higiene', initial: 180000, current: 122000, color: 'indigo' },
    { id: '174100', code: '33.90.30', desc: 'Material de Copa, Cozinha e Refeitório', initial: 95000, current: 63500, color: 'amber' }
  ];

  // Logistic arrivals state
  const [arrivals, setArrivals] = useState([
    { id: 'SH30', carrier: 'Coan Nutrição S.A.', plate: 'FLZ-8C41', cargo: 'Gêneros Alimentícios (Proteína Congelada)', scheduled: '14:30', real: '14:22', status: 'Pátio Interno' },
    { id: 'SH31', carrier: 'Nutri-Vida Comercial', plate: 'BRA-3Z92', cargo: 'Hortifruti Fresco e Legumes', scheduled: '15:15', real: 'A caminho', status: 'Em Trânsito' },
    { id: 'SH32', carrier: 'D&D Distribuidora', plate: 'KLP-1M45', cargo: 'Produtos Químicos de Higiene Sanitária', scheduled: '16:00', real: 'Check na balsa', status: 'Aguardando' }
  ]);

  // Vehicle logs
  const [vehicleExits, setVehicleExits] = useState([
    { id: 101, plate: 'BRA-9E28', driver: 'Sgt. Marcos Mendes', destination: 'Almoxarifado Geral Penitenciário', departure: '08:15', returnTime: '13:40', purpose: 'Retirada de insumos industriais', status: 'Concluído' },
    { id: 102, plate: 'EGO-0942', driver: 'Cabo Fonseca', destination: 'Distribuidora Logística Central', departure: '14:00', returnTime: '--:--', purpose: 'Recolhimento de cestas padrão', status: 'Em Trânsito' }
  ]);

  // Rows state for the selected director - pre-loaded for demonstration to look high-fidelity
  const [depRows, setDepRows] = useState<DirectorPerCapitaRow[]>(() => 
    Array.from({ length: 25 }, (_, i) => {
      if (i === 0) {
        return {
          ref: 1,
          itemName: 'ALMÔNDEGAS, TIPO: BOVINO',
          itemFullName: 'ALMÔNDEGAS, TIPO: BOVINO, SABOR: TEMPERADO, ESTADO DE CONSERVAÇÃO CONGELADA',
          quantity: '15 Sacos',
          observations: 'Destinar ao refeitório interno bloco A'
        };
      }
      if (i === 5) {
        return {
          ref: 6,
          itemName: 'ABÓBORA JAPONESA COM',
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
          itemName: 'FEIJÃO CARIOCA TIPO',
          itemFullName: 'FEIJÃO CARIOCA, TIPO 1, NOVO, GRÃOS INTEIROS, PACOTE DE 1KG',
          quantity: '200 Pacotes',
          observations: 'Garantir estoque de emergência'
        };
      }
      if (i === 7) {
        return {
          ref: 8,
          itemName: 'DETERGENTE LÍQUIDO NEUTRO',
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

  const activeRows = activeDirector.id === 'chefeDep' ? depRows : segRows;
  const setActiveRows = activeDirector.id === 'chefeDep' ? setDepRows : setSegRows;

  const handleSelectDirector = (director: DirectorConfig) => {
    setActiveDirector(director);
  };

  const handleRowChange = (index: number, field: keyof DirectorPerCapitaRow, val: string) => {
    const updated = [...activeRows];
    if (field === 'itemName') {
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
    if (!updated[rowIndex].quantity) {
      updated[rowIndex].quantity = `Ex: 10 ${item.unit}`;
    }
    setActiveRows(updated);
    setShowSuggestions(null);
  };

  // Apply bottom item selection into active rows upstairs
  const handleApplyToActiveRow = (item: InventoryItem) => {
    let indexToUse = activeRowIndex !== null ? activeRowIndex : -1;
    if (indexToUse === -1) {
      indexToUse = activeRows.findIndex(r => !r.itemName);
    }
    if (indexToUse === -1) {
      indexToUse = 0;
    }

    const shortName = getFirstThreeWords(item.name);
    const updated = [...activeRows];
    updated[indexToUse].itemName = shortName;
    updated[indexToUse].itemFullName = item.name;
    updated[indexToUse].quantity = `10 ${item.unit}`;
    setActiveRows(updated);
    
    window.scrollTo({ top: 400, behavior: 'smooth' });
    setActiveRowIndex(null);
  };

  const handleClearTable = () => {
    const confirmClear = window.confirm("Tem certeza que deseja zerar todas as 25 linhas deste cronograma de cotação?");
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
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.expirationDate.includes(searchQuery);
    if (!matchesSearch) return false;

    if (foodFilter === 'all') return true;
    if (foodFilter === 'active') return item.isActivePerCapita;
    if (foodFilter === 'inStock') return item.stockQty > 0;
    return true;
  });

  return (
    <div className="bg-slate-50 min-h-screen text-slate-850 flex flex-col font-sans selection:bg-indigo-600 selection:text-white pb-12 transition-all">
      {/* 1. TOP TICKER MARQUEE AS SHOWN IN IMAGE 3 */}
      <div className="bg-[#1e2354] dark:bg-slate-950 text-white py-1.5 px-6 border-b border-white/10 text-xs overflow-hidden flex items-center print:hidden">
        <span className="bg-[#bfdbfe] text-[#1e3a8a] text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 mr-3 animate-pulse">
          COMUNICADOS:
        </span>
        <div className="relative w-full overflow-hidden whitespace-nowrap">
          <div className="inline-block animate-marquee pl-10 font-medium">
            O Movimento Maio Amarelo nasceu em 2014, criado pelo Observatório Nacional de Segurança Viária (ONSV) no Brasil, com o objetivo internacional de reduzir acidentes e mortes no trânsito. A cor amarela simboliza atenção e a sinalização de advertência. • Abastecimento Militar geral e Penitenciário • Adiantabilidade atualizada em 30/05/2026.
          </div>
        </div>
      </div>

      {/* 2. DUAL MAIN HEADER CARD */}
      <header className="bg-white px-6 md:px-8 py-5 border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          
          {/* Brand/Department */}
          <div className="flex flex-col text-center lg:text-left">
            <span className="text-[#202758] font-black tracking-wide text-lg md:text-xl font-sans italic uppercase">
              VISÃO FINANCEIRA INSTITUCIONAL
            </span>
            <span className="text-[10px] text-slate-400 font-extrabold tracking-widest uppercase mt-0.5">
              Monitoramento de Recursos e Despesas
            </span>
          </div>

          {/* Central rounded greeting badge */}
          <div className="bg-[#e0f2fe] border border-blue-200 text-[#0369a1] text-xs md:text-sm font-black px-6 py-2.5 rounded-full shadow-inner text-center max-w-2xl">
            BOM DIA, DANIELE GARCIA POSSIDONIO, HOJE TEMOS LIBERADOS OS ADIANTADOS: ALFREDO - JULIO
          </div>

          {/* Action buttons (Reports and Logout) */}
          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handlePrint}
              className="bg-[#4834e4] hover:bg-[#341f97] text-white text-[11px] font-extrabold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-md shadow-[#4834e4]/20 uppercase transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              RELATÓRIO PDF
            </button>
            <button 
              onClick={() => {
                setActiveTab('percapita');
              }}
              className="bg-[#eb4d4b] hover:bg-[#ff7675] text-white text-[11px] font-extrabold px-3 py-2 rounded-lg flex items-center gap-1 uppercase transition-all"
            >
              <X className="w-3.5 h-3.5" />
              SAIR
            </button>
          </div>
        </div>
      </header>

      {/* 3. PRIMARY NAVIGATION BAR */}
      <nav className="bg-[#242b5c] shadow-lg sticky top-0 z-40 print:hidden border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6 overflow-x-auto scrollbar-none flex">
          {[
            { id: 'recursos', label: 'RECURSO DISPONÍVEL', icon: DollarSign },
            { id: 'adiantamentos', label: 'CONTROLE DE ADIANTAMENTOS', icon: RefreshCw },
            { id: 'ptres', label: 'SALDOS PTRES / NATUREZA', icon: FileSpreadsheet },
            { id: 'cardapio', label: '🍴 CARDÁPIO INSTITUCIONAL', icon: UtensilsCrossed, isHighlight: true },
            { id: 'chegadas', label: '📅 AGENDA DE CHEGADAS', icon: Truck },
            { id: 'saida', label: '🚗 SAÍDA DE VEÍCULOS', icon: Car },
            { id: 'percapita', label: '📝 PER CAPITA CHEFE DEP.', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-black tracking-wider uppercase border-b-4 transition-all outline-none whitespace-nowrap shrink-0 ${
                  isActive 
                    ? 'border-yellow-400 text-yellow-400 bg-white/5' 
                    : tab.isHighlight 
                      ? 'border-transparent text-yellow-300 hover:text-yellow-100 hover:bg-white/5' 
                      : 'border-transparent text-slate-200 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.id === 'percapita' ? `PER CAPITA CHEFE ${activeDirector.id === 'chefeDep' ? 'DEP.' : 'SEG.'}` : tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 4. ACTIVE VIEWPORTS INTEGRATED DYNAMICALLY */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 font-sans">
        
        {/* TAB 1: RECURSO DISPONÍVEL */}
        {activeTab === 'recursos' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">Demonstrativo de Recursos Financeiros</h2>
                <p className="text-xs text-slate-500">Fluxo geral de recursos e orçamentos para aquisição direta</p>
              </div>
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Conexão Orçamentária SIAP Net
              </span>
            </div>

            {/* Quick dashboard figures */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Verba Total Disponível</span>
                <span className="text-2xl font-black text-[#1a237e] mt-1 block">R$ 545.000,00</span>
                <div className="text-[10px] text-slate-500 mt-2 flex justify-between">
                  <span>DEP: R$ 320.000,00</span>
                  <span>SEG: R$ 225.000,00</span>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Adiantamentos Consumidos</span>
                <span className="text-2xl font-black text-amber-600 mt-1 block">R$ 70.000,00</span>
                <span className="text-[10px] text-emerald-600 mt-2 block font-extrabold">● 100% PRESTADOS OU EM ANÁLISE</span>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Saldo de Empenho Ativo</span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block">R$ 380.200,00</span>
                <span className="text-[10px] text-slate-500 mt-2 block">Dedicado a gêneros alimentares diretos</span>
              </div>
              <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                <span className="text-[10px] text-slate-400 font-extrabold block uppercase tracking-wider">Reserva Emergencial</span>
                <span className="text-2xl font-black text-slate-600 mt-1 block">R$ 94.800,00</span>
                <span className="text-[10px] text-slate-500 mt-2 block">Para substituições urgentes na cota percapita</span>
              </div>
            </div>

            {/* budget breakdown graph */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
              <TrendingUp className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
              <h3 className="font-extrabold text-[#1a237e] uppercase mb-1">Taxas de Comprometimento de Saldo Recurso</h3>
              <p className="text-xs text-slate-500 mb-6">Gráfico demonstrativo de empenhos versus adiantabilidade corrente</p>
              
              <div className="space-y-4 max-w-xl mx-auto text-left">
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Gêneros Alimentícios Base (DEP)</span>
                    <span>78% Utilizado (R$ 249.600,00)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-[#4834e4] h-full rounded-full" style={{ width: '78%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Insumos e Produtos de Limpeza (SEG)</span>
                    <span>42% Utilizado (R$ 94.500,00)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: '42%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span>Despesas Emergenciais Administrativas</span>
                    <span>15% Utilizado (R$ 14.220,00)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTROLE DE ADIANTAMENTOS */}
        {activeTab === 'adiantamentos' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">Controle de Adiantamentos Ativos</h2>
                <p className="text-xs text-slate-500">Valores emergenciais sob responsabilidade direta dos gestores</p>
              </div>
              <button 
                onClick={() => {
                  const desc = prompt("Escreva o motivo/descrição do adiantamento:");
                  const amt = Number(prompt("Insira o valor em R$:"));
                  if (desc && amt) {
                    setAdvances([...advances, {
                      id: advances.length + 1,
                      name: 'Daniele Garcia Possidonio',
                      role: 'Depto. Financeiro',
                      amount: amt,
                      description: desc,
                      date: '30/05/2026',
                      status: 'Aprovado'
                    }]);
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> NOVO ADIANTAMENTO
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">GESTOR RESPONÁVEL</th>
                    <th className="py-3 px-4">VALOR ADIANTADO</th>
                    <th className="py-3 px-4">FINALIDADE / MOTIVO</th>
                    <th className="py-3 px-4">DATA LIBERAÇÃO</th>
                    <th className="py-3 px-4">STATUS FINANCEIRO</th>
                    <th className="py-3 px-4 text-center">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {advances.map(adv => (
                    <tr key={adv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-extrabold text-slate-800">
                        {adv.name}
                        <span className="block text-[10px] text-slate-400 font-normal">{adv.role}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-900 font-bold">R$ {adv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs">{adv.description}</td>
                      <td className="py-3 px-4 text-slate-500">{adv.date}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          adv.status === 'Liberado' ? 'bg-emerald-100 text-emerald-850' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {adv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button 
                          onClick={() => {
                            if (confirm(`Prestar contas do adiantamento de R$ ${adv.amount.toLocaleString()}?`)) {
                              setAdvances(advances.filter(a => a.id !== adv.id));
                            }
                          }}
                          className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-600 text-[10px] px-2.5 py-1 rounded"
                        >
                          ✓ Prestar Contas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SALDOS PTRES / NATUREZA */}
        {activeTab === 'ptres' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">Saldos Disponíveis - PTRES / Natureza de Despesa</h2>
                <p className="text-xs text-slate-500">Planejamento Orçamentário e Classificação de Insumos da Unidade</p>
              </div>
              <span className="bg-slate-100 text-slate-600 text-xs px-2.5 py-1 rounded border">Valores de Exercício Atual - 2026</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ptresList.map(pt => {
                const currentPct = Math.round((pt.current / pt.initial) * 100);
                return (
                  <div key={pt.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="bg-[#1a237e] text-white text-[10px] font-black px-2 py-0.5 rounded uppercase">
                          PTRES {pt.id}
                        </span>
                        <span className="text-xs font-bold text-slate-400">Natureza: {pt.code}</span>
                      </div>
                      <span className={`text-xs font-extrabold ${pt.color === 'rose' ? 'text-rose-600' : 'text-[#1a237e]'}`}>{currentPct}% Saldo Livre</span>
                    </div>
                    <p className="font-extrabold text-sm text-slate-800 leading-normal">{pt.desc}</p>
                    
                    <div className="flex justify-between text-xs pt-1.5 border-t">
                      <span>Saldo Inicial: <strong>R$ {pt.initial.toLocaleString('pt-BR')}</strong></span>
                      <span className="text-slate-900 font-bold">Saldo Corrente: R$ {pt.current.toLocaleString('pt-BR')}</span>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full ${
                        pt.color === 'rose' ? 'bg-red-500' : pt.color === 'amber' ? 'bg-amber-500' : pt.color === 'emerald' ? 'bg-emerald-500' : 'bg-indigo-500'
                      }`} style={{ width: `${currentPct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: CARDÁPIO INSTITUCIONAL */}
        {activeTab === 'cardapio' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">🍴 Cardápio Semanal Sugerido</h2>
                <p className="text-xs text-slate-500">Planejamento das refeições elaboradas pelo Setor de Nutrição</p>
              </div>
              <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-3 py-1 rounded-full uppercase">Cardápio em Alta</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { day: 'SEGUNDA-FEIRA', b: 'Preparo: Arroz, Pão Francês com manteiga e café com leite integral.', l: 'Carne de Panela moída com legumes frescos (abóbora, batata e cenoura), feijão e salada.', d: 'Caldo quentinho de feijão com macarrão e torrada temperada.' },
                { day: 'TERÇA-FEIRA', b: 'Preparo: Mingau de aveia tradicional com canela, café preto adoçado.', l: 'Almôndegas ao molho vermelho encorpado, arroz agulhinha e acompanhamento verde.', d: 'Sopa de legumes batidos com tiras finas de frango grelhado.' },
                { day: 'QUARTA-FEIRA', b: 'Preparo: Pão de leite fatiado com queijo minas frescal, chá quente.', l: 'Feijoada leve com bacon defumado em cubos, couve refogada e gomos de laranja.', d: 'Canja de galinha desfiada com grãos cozidos e cheiro-verde.' },
                { day: 'QUINTA-FEIRA', b: 'Preparo: Salada de frutas picadas com mel, pão integral e leite.', l: 'Frango assado em pedaços suculentos, arroz dourado e feijão carioca tipo 1.', d: 'Sopa de lentilha nutritiva com croutons de pão caseiro.' }
              ].map((c, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm flex flex-col justify-between">
                  <div className="bg-[#1e2354] px-4 py-2.5 text-center text-white text-xs font-black tracking-widest uppercase">
                    {c.day}
                  </div>
                  <div className="p-4 space-y-3.5 flex-1 divide-y divide-slate-100">
                    <div className="text-xs">
                      <span className="font-extrabold text-[#1a237e] block uppercase text-[10px]">Café da Manhã</span>
                      <p className="text-slate-600 mt-1 leading-normal font-medium">{c.b}</p>
                    </div>
                    <div className="text-xs pt-3">
                      <span className="font-extrabold text-[#1a237e] block uppercase text-[10px]">Almoço Principal</span>
                      <p className="text-slate-600 mt-1 leading-normal font-medium">{c.l}</p>
                    </div>
                    <div className="text-xs pt-3">
                      <span className="font-extrabold text-[#1a237e] block uppercase text-[10px]">Jantar Geral</span>
                      <p className="text-slate-600 mt-1 leading-normal font-medium">{c.d}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: AGENDA DE CHEGADAS */}
        {activeTab === 'chegadas' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">📅 Agenda de Chegadas de Insumos</h2>
                <p className="text-xs text-slate-500">Logística de fornecedores cadastrados na portaria principal em tempo real</p>
              </div>
              <button 
                onClick={() => {
                  setArrivals([...arrivals, {
                    id: 'SH' + (arrivals.length + 30),
                    carrier: 'Comercial Alvorada Eireli',
                    plate: 'EDH-5V32',
                    cargo: 'Suplementos Alimentares e Leite UHT',
                    scheduled: '16:45',
                    real: 'A caminho',
                    status: 'Em Trânsito'
                  }]);
                }}
                className="bg-[#1e2354] hover:bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1 shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> AGENDAR NOVO HISTÓRICO
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">NOTIFICAÇÃO REF</th>
                    <th className="py-3 px-4">DISTRIBUIDORA / ABASTECEDOR</th>
                    <th className="py-3 px-4">PLACA VEÍCULO</th>
                    <th className="py-3 px-4">VEÍCULO / CARGA</th>
                    <th className="py-3 px-4">JANELA AGENDADA</th>
                    <th className="py-3 px-4">CHEGADA REAL</th>
                    <th className="py-3 px-4">LOGÍSTICA STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {arrivals.map(arr => (
                    <tr key={arr.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-black text-indigo-600">{arr.id}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{arr.carrier}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-600">{arr.plate}</td>
                      <td className="py-3 px-4 text-slate-600">{arr.cargo}</td>
                      <td className="py-3 px-4 text-slate-900 font-bold">{arr.scheduled}</td>
                      <td className="py-3 px-4 text-slate-500">{arr.real}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          arr.status === 'Pátio Interno' 
                            ? 'bg-emerald-100 text-emerald-850' 
                            : arr.status === 'Em Trânsito' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                        }`}>
                          {arr.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: SAÍDA DE VEÍCULOS */}
        {activeTab === 'saida' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h2 className="text-xl font-extrabold text-[#1a237e] uppercase">🚗 Ordem de Saída de Veículos (VTR)</h2>
                <p className="text-xs text-slate-500">Monitoramento e autorização de transporte externo de bens</p>
              </div>
              <button 
                onClick={() => {
                  setVehicleExits([...vehicleExits, {
                    id: vehicleExits.length + 101,
                    plate: 'FGT-2910',
                    driver: 'Cabo Lima',
                    destination: 'Supermercado Atacadão Varejo',
                    departure: '15:10',
                    returnTime: '--:--',
                    purpose: 'Aquisição secundária de frutas e ovos',
                    status: 'Em Trânsito'
                  }]);
                }}
                className="bg-[#1e2354] hover:bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow transition-all"
              >
                <Plus className="w-3.5 h-3.5" /> EMITIR REGISTRO SAÍDA
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4">ORDEM N°</th>
                    <th className="py-3 px-4">PLACA VTR</th>
                    <th className="py-3 px-4">MILITAR CONDUTOR</th>
                    <th className="py-3 px-4">DESTINAÇÃO DETALHADA</th>
                    <th className="py-3 px-4">FORA DA UNIDADE</th>
                    <th className="py-3 px-4">RETORNO CONFIRMADO</th>
                    <th className="py-3 px-4">MISSÃO FINALIDADE</th>
                    <th className="py-3 px-4">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {vehicleExits.map(ex => (
                    <tr key={ex.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-black">{ex.id}</td>
                      <td className="py-3 px-4 font-mono font-black text-indigo-650">{ex.plate}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{ex.driver}</td>
                      <td className="py-3 px-4 text-slate-600">{ex.destination}</td>
                      <td className="py-3 px-4 text-slate-900 font-bold">{ex.departure}</td>
                      <td className="py-3 px-4 text-slate-550">{ex.returnTime}</td>
                      <td className="py-3 px-4 text-slate-500 italic max-w-xs">{ex.purpose}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                          ex.status === 'Concluído' ? 'bg-emerald-100 text-emerald-850' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {ex.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: PER CAPITA CHEFE DEP. (ACTIVE IN IMAGE 3) */}
        {activeTab === 'percapita' && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Screen layout framed exactly based on third image */}
            <div className="bg-[#0b1329] border border-slate-850 rounded-2xl p-6 shadow-2xl relative text-white">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#4834e4] via-yellow-400 to-[#eb4d4b] rounded-t-2xl"></div>

              {/* Title Section (COTA PER CAPITA DOS DIRETORES and button panel) */}
              <div className="text-center pb-5 mb-6 border-b border-white/10">
                <h2 className="text-base md:text-lg font-black tracking-widest uppercase text-white">
                  COTA PER CAPITA DOS DIRETORES
                </h2>
                
                {/* Large center button indicator */}
                <div className="mt-4 flex justify-center">
                  <span className="bg-[#4834e4] border border-[#686de0] text-white text-xs font-black px-8 py-2.5 rounded-lg shadow-lg flex items-center gap-2 uppercase">
                    📝 SEU PAINEL: {activeDirector.id === 'chefeDep' ? 'DEP.' : 'SEG.'}
                  </span>
                </div>
              </div>

              {/* Active Selection, Active Order, History Buttons Block */}
              <div className="bg-[#111c2e] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                
                {/* Active chief */}
                <div className="flex flex-col">
                  <span className="text-[9px] text-[#0369a1] font-extrabold uppercase tracking-widest">
                    CHEFIA ATIVA SELECIONADA
                  </span>
                  <div className="flex items-center gap-2.5 mt-1">
                    <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-ping shrink-0"></span>
                    <button 
                      onClick={() => handleSelectDirector(activeDirector.id === 'chefeDep' ? DIRECTORS[1] : DIRECTORS[0])}
                      className="text-sm md:text-base font-black text-white hover:text-yellow-400 cursor-pointer transition-colors uppercase text-left flex items-center gap-1 border-b border-dashed border-white/20"
                      title="Clique para alternar gestor responsável"
                    >
                      {activeDirector.name === 'Douglas Galdino' ? 'DOUGLAS FERNANDO SEMENZIN GALDINO' : 'ALFREDO LOPES'} (Alternar)
                    </button>
                  </div>
                </div>

                {/* Subportaria toggles as requested in the image */}
                <div className="flex gap-2">
                  <button className="bg-[#4834e4] text-white text-xs font-black px-4 py-2.5 rounded-lg border border-indigo-400 shadow flex items-center gap-1.5 uppercase">
                    <Check className="w-3.5 h-3.5" /> PEDIDO ATIVO
                  </button>
                  <button className="bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-black px-4 py-2.5 rounded-lg border border-slate-700 flex items-center gap-1.5 uppercase">
                    <Calendar className="w-3.5 h-3.5" /> HISTÓRICO (0)
                  </button>
                </div>
              </div>

              {/* Category Filters + Target Period Selection as in image */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-center mb-6">
                
                {/* Alimentacao vs Limpeza Category Tab Toggles */}
                <div className="bg-[#111c2e] p-1 rounded-xl border border-white/5 flex gap-1 max-w-md">
                  <button 
                    onClick={() => setCategoryFilter('alimentacao')}
                    className={`flex-1 py-2 text-xs font-black tracking-wider uppercase rounded-lg transition-all outline-none flex justify-center items-center gap-1.5 ${
                      categoryFilter === 'alimentacao' 
                        ? 'bg-white text-slate-900 shadow-md font-bold' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🍎 ALIMENTAÇÃO
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('limpeza')}
                    className={`flex-1 py-2 text-xs font-black tracking-wider uppercase rounded-lg transition-all outline-none flex justify-center items-center gap-1.5 ${
                      categoryFilter === 'limpeza' 
                        ? 'bg-white text-slate-900 shadow-md font-bold' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    🧹 LIMPEZA
                  </button>
                </div>

                {/* Reference Period Selector */}
                <div className="bg-[#111c2e] p-4 rounded-xl border border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">PERÍODO DE REFERÊNCIA DA PER CAPITA</span>
                    <span className="text-[10px] text-[#0369a1] font-bold block mt-0.5">Selecione se o consumo será semanal ou mensal para este rascunho de pedido de diretor</span>
                  </div>
                  <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-850 flex gap-1 self-end md:self-auto">
                    <button 
                      onClick={() => setPeriodFilter('semanal')}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-all ${
                        periodFilter === 'semanal' ? 'bg-[#4834e4] text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      ⏳ SEMANAL
                    </button>
                    <button 
                      onClick={() => setPeriodFilter('mensal')}
                      className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition-all ${
                        periodFilter === 'mensal' ? 'bg-[#4834e4] text-white font-bold' : 'text-slate-400'
                      }`}
                    >
                      📅 MENSAL
                    </button>
                  </div>
                </div>
              </div>

              {/* Rascunho Corrente Action Header Banner */}
              <div className="bg-[#111c2e] px-4 py-3 rounded-t-xl border-l-[6px] border-[#4834e4] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-md mb-0.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full animate-pulse shrink-0"></span>
                    <span className="text-yellow-400 text-xs font-black tracking-widest uppercase">
                      ● RASCUNHO CORRENTE: {activeDirector.id === 'chefeDep' ? 'DEP.' : 'SEG.'}
                    </span>
                  </div>
                  <h2 className="text-[10px] text-slate-400 font-extrabold tracking-wider mt-0.5 uppercase">
                    DIGITE AS COTAÇÕES NAS 25 LINHAS ABAIXO
                  </h2>
                </div>

                <div className="flex gap-2 w-full md:w-auto">
                  {/* Clear button */}
                  <button
                    onClick={handleClearTable}
                    className="bg-slate-800 hover:bg-rose-950 border border-slate-700/80 text-slate-350 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1.5 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    LIMPAR CAMPO
                  </button>

                  {/* Print command */}
                  <button
                    onClick={handlePrint}
                    className="bg-[#4834e4] hover:bg-[#341f97] text-white font-black px-4 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 transition-all ml-auto md:ml-0"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    IMPRIMIR PEDIDO
                  </button>
                </div>
              </div>

              {/* Main table list with 25 customizable rows */}
              <div className="bg-[#111c2e]/60 border border-white/5 shadow-2xl rounded-b-xl overflow-x-auto">
                <div className="grid grid-cols-[50px_2.2fr_1.1fr_2.2fr] gap-3 text-slate-300 text-[10px] font-black uppercase tracking-widest px-4 py-3 border-b border-white/5 bg-slate-900/60 font-sans">
                  <div>REF</div>
                  <div>NOME DO ITEM (Apenas as 3 primeiras palavras para otimização)</div>
                  <div>QUANTIDADE</div>
                  <div>OBSERVAÇÕES / DESTINAÇÃO</div>
                </div>

                <div className="divide-y divide-white/5">
                  {activeRows.map((row, idx) => (
                    <div 
                      key={row.ref} 
                      className={`grid grid-cols-[50px_2.2fr_1.1fr_2.2fr] gap-3 items-center px-4 py-2 hover:bg-slate-900/40 transition-colors ${
                        activeRowIndex === idx ? 'bg-indigo-600/10 border-l-2 border-indigo-400' : ''
                      }`}
                      onClick={() => setActiveRowIndex(idx)}
                    >
                      {/* REF ID block */}
                      <div className="flex items-center">
                        <span className="w-7 h-7 bg-slate-850 text-slate-300 font-extrabold text-xs rounded-full flex items-center justify-center border border-white/10">
                          {row.ref}
                        </span>
                      </div>

                      {/* ITEM AUTOCOMPLETE INTERACTIVE FIELD */}
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
                          className="w-full bg-[#0a0f1d] border border-slate-700/60 hover:border-slate-500 rounded-lg px-3 py-1.5 text-xs text-white font-black uppercase focus:outline-none focus:border-[#4834e4] focus:bg-[#060a13] placeholder-slate-500 transition-all"
                        />

                        {/* Quick indicator if item has long full name loaded */}
                        {row.itemFullName && row.itemFullName !== row.itemName && (
                          <div className="absolute right-2 top-2 group">
                            <Info className="w-4 h-4 text-slate-400 hover:text-indigo-400 cursor-help" />
                            <span className="absolute bottom-full right-0 mb-2 w-72 hidden group-hover:block bg-[#050912] text-slate-100 border border-indigo-500 text-[10px] p-2.5 rounded-lg shadow-2xl z-50 normal-case leading-relaxed font-normal">
                              <strong className="text-indigo-400 block mb-0.5">Especificação Completa:</strong>
                              {row.itemFullName}
                            </span>
                          </div>
                        )}

                        {/* Dynamic Suggestions List */}
                        {showSuggestions === idx && row.itemName.trim().length > 0 && (
                          <div className="absolute left-0 mt-1.5 w-full bg-[#060b14] border border-[#1e2e4b] rounded-lg shadow-2xl z-50 max-h-56 overflow-y-auto divide-y divide-white/5 animate-fadeIn">
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

                      {/* QUANTITY selector */}
                      <div>
                        <input
                          type="text"
                          placeholder="Ex: 10 Sacos"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, 'quantity', e.target.value)}
                          className="w-full bg-[#0a0f1d] border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-[#4834e4] focus:bg-[#060a13] font-bold"
                        />
                      </div>

                      {/* OBSERVATIONS target */}
                      <div>
                        <input
                          type="text"
                          placeholder="Ex: Destinação da Ala sul..."
                          value={row.observations}
                          onChange={(e) => handleRowChange(idx, 'observations', e.target.value)}
                          className="w-[#0a0f1d] w-full bg-[#0a0f1d] border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-[#4834e4] focus:bg-[#060a13]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Stock Selector Portal directly linked underneath */}
              <div className="mt-8 bg-[#111c2e] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
                
                {/* Header title for stock logs */}
                <div className="p-5 border-b border-white/5 bg-slate-900/60 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 bg-yellow-400 rounded-full animate-bounce shrink-0 mt-1"></span>
                    <div>
                      <h3 className="text-sm font-black uppercase text-white tracking-wider">
                        🍲 SALDO DE ITENS EM ESTOQUE
                      </h3>
                      <p className="text-[10px] text-[#0369a1] font-extrabold tracking-wider mt-0.5 uppercase">
                        Visualização do Inventário de Abastecimento Geral para Lançamento Rápido
                      </p>
                    </div>
                  </div>

                  {/* Stock quick categorizer */}
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <button
                      onClick={() => setFoodFilter('all')}
                      className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${
                        foodFilter === 'all' ? 'bg-[#4834e4] text-white shadow font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🍲 CARDÁPIO / GERAL
                    </button>
                    <button
                      onClick={() => setFoodFilter('active')}
                      className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${
                        foodFilter === 'active' ? 'bg-[#4834e4] text-white shadow font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      🍊 ATIVOS NA PERCAPITA
                    </button>
                    <button
                      onClick={() => setFoodFilter('inStock')}
                      className={`text-[10px] font-black uppercase px-3 py-2 rounded-lg transition-all ${
                        foodFilter === 'inStock' ? 'bg-[#4834e4] text-white shadow font-bold' : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      📦 TODOS EM ESTOQUE
                    </button>

                    {/* Stock search box */}
                    <div className="relative ml-auto lg:ml-2 w-full sm:w-48">
                      <span className="absolute left-2.5 top-2.5 text-slate-500">
                        <Search className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="BUSCAR ITEM..."
                        className="w-full bg-[#0a0f1d] border border-slate-700/60 rounded-lg pl-8 pr-3 py-1.5 text-[10px] text-white font-extrabold placeholder-slate-500 uppercase tracking-wider"
                      />
                    </div>
                  </div>
                </div>

                {/* Grid items */}
                <div className="p-4 bg-slate-950/20 max-h-[420px] overflow-y-auto">
                  {filteredInventory.length === 0 ? (
                    <div className="text-center py-12">
                      <SearchCheck className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-extrabold tracking-widest uppercase">
                        NENHUM INSUMO ADERENTE AOS FILTROS SELECIONADOS NO PÁTIO DE ABASTECIMENTO.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-white/5 text-slate-400 uppercase tracking-widest text-[9px] font-black">
                            <th className="pb-3 pl-2">ITEM DESCRIÇÃO / ESPECIFICAÇÃO</th>
                            <th className="pb-3 text-center">CATEGORIA</th>
                            <th className="pb-3 text-center">QUANTIDADE EM SUCURSAL</th>
                            <th className="pb-3 text-center">PRAZO DE VALIDADE</th>
                            <th className="pb-3 text-center pr-2">AÇÃO</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {filteredInventory.map(item => {
                            const isCloseToExpr = item.expirationDate.includes('06/2026') || item.expirationDate.includes('07/2026');
                            const isOutOfStock = item.stockQty === 0;

                            return (
                              <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                                <td className="py-2.5 pl-2">
                                  {/* Keeps only three words as explicitly requested by USER */}
                                  <div className="font-extrabold text-slate-200">{getFirstThreeWords(item.name)}</div>
                                  <div className="text-[10px] text-slate-400 font-normal leading-relaxed mt-0.5 line-clamp-1">{item.name}</div>
                                </td>
                                <td className="py-2.5 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                    item.category === 'alimentacao' 
                                      ? 'bg-orange-950/45 text-orange-400 border border-orange-900/30' 
                                      : 'bg-blue-950/45 text-blue-400 border border-blue-900/40'
                                  }`}>
                                    {item.category === 'alimentacao' ? '🍲 Comida' : '🧹 Limpeza'}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center">
                                  {isOutOfStock ? (
                                    <span className="inline-flex items-center gap-1 text-red-400 font-bold bg-red-950/10 px-2 py-0.5 rounded border border-red-900/20">
                                      <Flame className="w-3 h-3 text-red-500 shrink-0" /> ELIMINADO
                                    </span>
                                  ) : (
                                    <span className={`font-black ${item.stockQty < 150 ? 'text-yellow-400' : 'text-slate-250'}`}>
                                      {item.stockQty} {item.unit}
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 text-center">
                                  <span className={`font-bold ${isCloseToExpr ? 'text-rose-400 animate-pulse' : 'text-slate-350'}`}>
                                    {item.expirationDate}
                                  </span>
                                </td>
                                <td className="py-2.5 text-center pr-2">
                                  <button
                                    onClick={() => handleApplyToActiveRow(item)}
                                    className="bg-slate-800 hover:bg-slate-700/80 hover:text-white text-slate-300 font-black px-3 py-1 rounded text-[10px] transition-all uppercase tracking-tight"
                                  >
                                    {activeRowIndex !== null ? `✓ LANÇAR NA LINHA ${activeRowIndex + 1}` : '✓ LANÇAR RÁPIDO'}
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

                {/* Informative bottom bar */}
                <div className="bg-white/5 py-3 px-5 text-[10px] text-slate-400 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-2">
                  <span>
                    💡 Dica: Clique em qualquer linha acima de 1 a 25. Em seguida, selecione <span className="font-bold text-white">"✓ LANÇAR RÁPIDO"</span> aqui embaixo para preencher a tabela superior.
                  </span>
                  <span className="text-indigo-400 font-bold">Total Sistema: {initialInventory.length} Materiais Monitorados</span>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
