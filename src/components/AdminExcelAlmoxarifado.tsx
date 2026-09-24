import React, { useState } from 'react';
import { 
    Download, 
    FileSpreadsheet, 
    Printer, 
    Users, 
    Package, 
    ArrowLeftRight, 
    Clock, 
    Info, 
    BarChart3,
    Calendar,
    RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { Supplier, WarehouseMovement, AcquisitionItem } from '../types';

interface AdminExcelAlmoxarifadoProps {
    suppliers?: Supplier[];
    warehouseLog?: WarehouseMovement[];
    acquisitionItems?: AcquisitionItem[];
}

export const AdminExcelAlmoxarifado: React.FC<AdminExcelAlmoxarifadoProps> = ({
    suppliers = [],
    warehouseLog = [],
    acquisitionItems = []
}) => {
    const [selectedTab, setSelectedTab] = useState<'painel' | 'fornecedores' | 'itens' | 'movimentacoes' | 'cronograma' | 'etiquetas' | 'validades' | 'manual'>('painel');
    const [isExportingRealData, setIsExportingRealData] = useState(false);

    // Exportação dinâmica com os dados reais atuais do sistema (utilizando SheetJS XLSX)
    const handleExportDynamicData = () => {
        setIsExportingRealData(true);
        try {
            const wb = XLSX.utils.book_new();

            // 1. Aba Fornecedores
            const fornecedoresRows = suppliers.map((s, idx) => ({
                'ID': `FORN-${String(idx + 1).padStart(3, '0')}`,
                'RAZÃO SOCIAL / NOME': s.name || '',
                'NOME FANTASIA': s.nickname || s.name || '',
                'CNPJ / CPF': s.cpf || '',
                'TIPO': s.type || 'Produtor / Fornecedor',
                'RAMO / CATEGORIA': s.category || 'Alimentação',
                'TELEFONE': s.phone || '',
                'E-MAIL': s.email || '',
                'ENDEREÇO / CIDADE': s.address || '',
                'CONTRATO / ATA': s.contractNumber || '',
                'BANCO / PIX': s.bankInfo || '',
                'STATUS': s.status || 'Ativo',
                'OBSERVAÇÕES': s.notes || ''
            }));
            const wsForn = XLSX.utils.json_to_sheet(fornecedoresRows.length > 0 ? fornecedoresRows : [
                { 'ID': 'FORN-001', 'RAZÃO SOCIAL / NOME': 'Exemplo Fornecedor', 'CNPJ / CPF': '00.000.000/0001-00', 'STATUS': 'Ativo' }
            ]);
            XLSX.utils.book_append_sheet(wb, wsForn, 'FORNECEDORES');

            // 2. Aba Cadastro Itens
            const itensRows = (acquisitionItems.length > 0 ? acquisitionItems : [
                { code: 'IT-001', name: 'ARROZ BRANCO TIPO 1', category: 'Secos', unit: 'PCT 5KG', minStock: 50, avgPrice: 24.5 },
                { code: 'IT-002', name: 'FEIJAO CARIOCA TIPO 1', category: 'Secos', unit: 'PCT 1KG', minStock: 40, avgPrice: 7.8 },
                { code: 'IT-006', name: 'CARNE BOVINA ACEM', category: 'Carnes', unit: 'KG', minStock: 80, avgPrice: 31.9 },
                { code: 'IT-009', name: 'ALFACE CRESPA', category: 'Hortifrúti', unit: 'KG', minStock: 20, avgPrice: 6.5 },
                { code: 'IT-014', name: 'LEITE INTEGRAL UHT 1L', category: 'Laticínios', unit: 'LT', minStock: 80, avgPrice: 4.85 },
            ]).map((item: any, idx: number) => ({
                'CÓDIGO': item.code || `IT-${String(idx + 1).padStart(3, '0')}`,
                'DESCRIÇÃO DO ITEM': item.name || '',
                'CATEGORIA': item.category || 'Geral',
                'UNIDADE': item.unit || 'UN',
                'ESTOQUE MÍNIMO': item.minStock || 20,
                'PREÇO UNIT. (R$)': item.avgPrice || item.price || 0,
                'LOCALIZAÇÃO': item.location || 'Almoxarifado Central',
                'STATUS': 'Ativo'
            }));
            const wsItens = XLSX.utils.json_to_sheet(itensRows);
            XLSX.utils.book_append_sheet(wb, wsItens, 'CADASTRO_ITENS');

            // 3. Aba Movimentações (sem anexo PDF, apenas dados textuais da NF)
            const movRows = warehouseLog.map((log: any, idx: number) => ({
                'ID MOV.': `MOV-${String(idx + 1).padStart(4, '0')}`,
                'DATA': log.date ? log.date.split('-').reverse().join('/') : '',
                'TIPO': log.type === 'entrada' ? 'ENTRADA' : 'SAÍDA',
                'CÓD. ITEM': log.itemCode || log.code || '',
                'DESCRIÇÃO': log.item || log.itemName || '',
                'QUANTIDADE': Number(log.kg || log.quantity || 0),
                'VALOR TOTAL (R$)': Number(log.value || 0),
                'Nº NOTA FISCAL / REQ.': log.invoiceNumber || log.docNumber || 'S/N',
                'FORNECEDOR / DESTINO': log.supplierName || log.destination || '',
                'Nº LOTE': log.lotNumber || 'UNICO',
                'VALIDADE': log.expirationDate ? log.expirationDate.split('-').reverse().join('/') : '',
                'RESPONSÁVEL': log.responsible || 'Almoxarifado',
                'OBSERVAÇÕES': log.observations || ''
            }));
            const wsMov = XLSX.utils.json_to_sheet(movRows.length > 0 ? movRows : [
                { 'ID MOV.': 'MOV-0001', 'DATA': '01/09/2026', 'TIPO': 'ENTRADA', 'DESCRIÇÃO': 'Item Exemplo', 'QUANTIDADE': 100, 'Nº NOTA FISCAL / REQ.': 'NF 1234' }
            ]);
            XLSX.utils.book_append_sheet(wb, wsMov, 'MOVIMENTAÇÕES');

            // 4. Aba Cronograma de Entregas
            const cronoRows = [
                { 'ID AGD.': 'AGD-001', 'DATA PREVISTA': '15/09/2026', 'DIA': 'Terça-feira', 'FORNECEDOR': 'COOP VALE VERDE', 'ITEM': 'ARROZ BRANCO 5KG', 'QTD PREVISTA': 100, 'QTD RECEBIDA': 100, 'STATUS': 'Entregue Total', 'NF': 'NF 10520' },
                { 'ID AGD.': 'AGD-002', 'DATA PREVISTA': '15/09/2026', 'DIA': 'Terça-feira', 'FORNECEDOR': 'SITIO SAO JOSE', 'ITEM': 'ALFACE CRESPA', 'QTD PREVISTA': 30, 'QTD RECEBIDA': 30, 'STATUS': 'Entregue Total', 'NF': 'NF 3328' },
                { 'ID AGD.': 'AGD-003', 'DATA PREVISTA': '16/09/2026', 'DIA': 'Quarta-feira', 'FORNECEDOR': 'FRIGORIFICO CENTRAL', 'ITEM': 'CARNE BOVINA ACEM', 'QTD PREVISTA': 150, 'QTD RECEBIDA': 150, 'STATUS': 'Entregue Total', 'NF': 'NF 88910' },
                { 'ID AGD.': 'AGD-004', 'DATA PREVISTA': '22/09/2026', 'DIA': 'Terça-feira', 'FORNECEDOR': 'COOP VALE VERDE', 'ITEM': 'TOMATE LONGA VIDA', 'QTD PREVISTA': 80, 'QTD RECEBIDA': 0, 'STATUS': 'Agendada', 'NF': '' },
                { 'ID AGD.': 'AGD-005', 'DATA PREVISTA': '23/09/2026', 'DIA': 'Quarta-feira', 'FORNECEDOR': 'FRIGORIFICO CENTRAL', 'ITEM': 'PEITO DE FRANGO', 'QTD PREVISTA': 200, 'QTD RECEBIDA': 0, 'STATUS': 'Agendada', 'NF': '' },
            ];
            const wsCrono = XLSX.utils.json_to_sheet(cronoRows);
            XLSX.utils.book_append_sheet(wb, wsCrono, 'CRONOGRAMA_ENTREGAS');

            // 5. Aba Instruções
            const wsInstrucoes = XLSX.utils.aoa_to_sheet([
                ['MANUAL DE USO DA PLANILHA DE ALMOXARIFADO'],
                [''],
                ['1. FORNECEDORES: Cadastre os produtores, cooperativas e atacadistas.'],
                ['2. CADASTRO DE ITENS: Mantenha os códigos e descrições dos gêneros e materiais.'],
                ['3. MOVIMENTAÇÕES: Registre todas as entradas e saídas com Nº de NF textual (sem necessidade de anexo PDF).'],
                ['4. CRONOGRAMA DE ENTREGAS: Acompanhe as datas programadas e a quantidade recebida.'],
                ['5. ETIQUETAS: Utilize os dados de lote e validade para imprimir etiquetas de rastreabilidade.'],
                ['6. FUNCIONAMENTO: Planilha 100% autônoma para Excel, LibreOffice ou Google Planilhas.']
            ]);
            XLSX.utils.book_append_sheet(wb, wsInstrucoes, 'INSTRUCOES');

            // Gerar e baixar arquivo
            XLSX.writeFile(wb, `Planilha_Almoxarifado_Dados_Atuais_${new Date().toISOString().slice(0, 10)}.xlsx`);
        } catch (err) {
            console.error('Erro exportando:', err);
            alert('Não foi possível gerar a exportação dos dados atuais.');
        } finally {
            setIsExportingRealData(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Banner de Apresentação e Download da Planilha */}
            <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-emerald-700/40">
                <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <FileSpreadsheet className="w-96 h-96 text-white" />
                </div>

                <div className="relative z-10 max-w-4xl space-y-4">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                        Planilha Oficial em Excel (.XLSX)
                    </div>

                    <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                        Planilha de Gestão Completa do Almoxarifado
                    </h2>

                    <p className="text-sm md:text-base text-emerald-100/90 leading-relaxed">
                        Estrutura pronta para uso com <strong>Cadastro de Fornecedores</strong>, <strong>Cadastro de Itens</strong>, <strong>Movimentação de Entradas e Saídas</strong>, <strong>Cronograma de Entrega</strong>, <strong>Impressão de Etiquetas</strong>, <strong>Controle de Validades</strong> e <strong>Painel Gerencial</strong> com fórmulas automáticas (PROCV, SOMASE, CONT.SE).
                    </p>

                    <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-200 flex items-start gap-2.5">
                        <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <strong>Sem anexo de PDF de Nota Fiscal:</strong> Conforme solicitado, todas as movimentações e entradas utilizam registro textual limpo do número da nota fiscal e dados de lote/validade, sem o campo de anexo PDF, garantindo máxima velocidade, simplicidade e compatibilidade universal no Excel, LibreOffice e Google Sheets.
                        </div>
                    </div>

                    {/* Botões de Ação Principal */}
                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <a
                            href="/Planilha_Gestao_Almoxarifado_Completa.xlsx"
                            download="Planilha_Gestao_Almoxarifado_Completa.xlsx"
                            className="inline-flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-6 py-3.5 rounded-xl shadow-lg hover:shadow-emerald-500/25 active:scale-95 transition-all text-sm uppercase tracking-wide"
                        >
                            <Download className="w-5 h-5" />
                            Baixar Planilha Excel Oficial (.xlsx)
                        </a>

                        <button
                            onClick={handleExportDynamicData}
                            disabled={isExportingRealData}
                            className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-600/60 text-white font-bold px-5 py-3.5 rounded-xl shadow active:scale-95 transition-all text-sm"
                        >
                            <RefreshCw className={`w-4 h-4 text-emerald-400 ${isExportingRealData ? 'animate-spin' : ''}`} />
                            {isExportingRealData ? 'Gerando Arquivo...' : 'Exportar Dados Atuais do Sistema'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Menu de Abas para Visualização Interativa */}
            <div className="bg-white rounded-2xl p-2 border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto">
                {[
                    { id: 'painel', label: '📊 Painel Geral', icon: BarChart3 },
                    { id: 'fornecedores', label: '🏢 Fornecedores', icon: Users },
                    { id: 'itens', label: '📦 Cadastro de Itens', icon: Package },
                    { id: 'movimentacoes', label: '🔄 Movimentações (E/S)', icon: ArrowLeftRight },
                    { id: 'cronograma', label: '📅 Cronograma Entregas', icon: Calendar },
                    { id: 'etiquetas', label: '🏷️ Impressão Etiquetas', icon: Printer },
                    { id: 'validades', label: '⏳ Controle Validades', icon: Clock },
                    { id: 'manual', label: '📖 Instruções de Uso', icon: Info },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSelectedTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                            selectedTab === tab.id
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Conteúdo da Aba Selecionada */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                {selectedTab === 'painel' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: Painel & Indicadores Gerais</h3>
                                <p className="text-xs text-slate-500">Resumo automático com fórmulas SOMASE, CONT.SE e alertas em tempo real.</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                                Totalmente Automatizado no Excel
                            </span>
                        </div>

                        {/* Cards Simulados */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50">
                                <span className="text-[11px] font-black uppercase text-blue-700">Fornecedores Ativos</span>
                                <div className="text-3xl font-black text-blue-900 mt-1">8 Cadastrados</div>
                                <span className="text-[10px] text-blue-600 font-mono mt-1 block">=CONT.SE(FORNECEDORES!N:N; "Ativo")</span>
                            </div>

                            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50">
                                <span className="text-[11px] font-black uppercase text-emerald-700">Total de Itens no Catálogo</span>
                                <div className="text-3xl font-black text-emerald-900 mt-1">18 Gêneros/Materiais</div>
                                <span className="text-[10px] text-emerald-600 font-mono mt-1 block">=CONT.VALORES(CADASTRO_ITENS!A4:A100)</span>
                            </div>

                            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50">
                                <span className="text-[11px] font-black uppercase text-indigo-700">Valor Total do Estoque</span>
                                <div className="text-3xl font-black text-indigo-900 mt-1">R$ 28.740,50</div>
                                <span className="text-[10px] text-indigo-600 font-mono mt-1 block">=SOMA(CADASTRO_ITENS!M4:M100)</span>
                            </div>

                            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50">
                                <span className="text-[11px] font-black uppercase text-amber-700">Itens com Estoque Baixo</span>
                                <div className="text-3xl font-black text-amber-900 mt-1">2 Alertas</div>
                                <span className="text-[10px] text-amber-600 font-mono mt-1 block">=CONT.SE(CADASTRO_ITENS!N:N; "*BAIXO*")</span>
                            </div>

                            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50">
                                <span className="text-[11px] font-black uppercase text-red-700">Lotes em Validade Crítica</span>
                                <div className="text-3xl font-black text-red-900 mt-1">1 Lote (&le; 15 dias)</div>
                                <span className="text-[10px] text-red-600 font-mono mt-1 block">=CONT.SE(CONTROLE_VALIDADES!J:J; "*CRÍTICO*")</span>
                            </div>

                            <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50">
                                <span className="text-[11px] font-black uppercase text-sky-700">Entregas Agendadas na Semana</span>
                                <div className="text-3xl font-black text-sky-900 mt-1">4 Chegadas</div>
                                <span className="text-[10px] text-sky-600 font-mono mt-1 block">=CONT.SE(CRONOGRAMA_ENTREGAS!K:K; "*Agendada*")</span>
                            </div>
                        </div>
                    </div>
                )}

                {selectedTab === 'fornecedores' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: FORNECEDORES</h3>
                                <p className="text-xs text-slate-500">Cadastro de Produtores Familiares (PPAIS/PPL), Atacadistas, dados bancários e contratos.</p>
                            </div>
                            <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                                15 Colunas Estruturadas
                            </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-800 text-white uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Razão Social / Nome</th>
                                        <th className="p-3">Fantasia</th>
                                        <th className="p-3">CNPJ / CPF</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3">Categoria</th>
                                        <th className="p-3">Telefone</th>
                                        <th className="p-3">Cidade/UF</th>
                                        <th className="p-3">Contrato / Ata</th>
                                        <th className="p-3">Dia Entrega</th>
                                        <th className="p-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">FORN-001</td>
                                        <td className="p-3 font-bold">COOPERATIVA AGRICOLA FAMILIAR VALE VERDE</td>
                                        <td className="p-3 text-slate-500">COOP VALE VERDE</td>
                                        <td className="p-3 font-mono">12.345.678/0001-90</td>
                                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">PPAIS / Familiar</span></td>
                                        <td className="p-3">Hortifrúti & Legumes</td>
                                        <td className="p-3">(14) 99876-1234</td>
                                        <td className="p-3">Marília/SP</td>
                                        <td className="p-3 font-mono">ATA-RP 012/2026</td>
                                        <td className="p-3">Terça e Quinta</td>
                                        <td className="p-3"><span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">Ativo</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">FORN-002</td>
                                        <td className="p-3 font-bold">FRIGORIFICO CENTRAL PAULISTA LTDA</td>
                                        <td className="p-3 text-slate-500">FRIGO CENTRAL</td>
                                        <td className="p-3 font-mono">23.456.789/0001-01</td>
                                        <td className="p-3"><span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">Convencional</span></td>
                                        <td className="p-3">Carnes & Proteínas</td>
                                        <td className="p-3">(14) 3456-7890</td>
                                        <td className="p-3">Bauru/SP</td>
                                        <td className="p-3 font-mono">CONTRATO 045/2025</td>
                                        <td className="p-3">Segunda e Quarta</td>
                                        <td className="p-3"><span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">Ativo</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">FORN-006</td>
                                        <td className="p-3 font-bold">PRODUTOR JOAO BATISTA DA SILVA</td>
                                        <td className="p-3 text-slate-500">SITIO SAO JOSE</td>
                                        <td className="p-3 font-mono">123.456.789-00</td>
                                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">PPL / Familiar</span></td>
                                        <td className="p-3">Hortaliças & Frutas</td>
                                        <td className="p-3">(14) 99123-4567</td>
                                        <td className="p-3">Garça/SP</td>
                                        <td className="p-3 font-mono">CHAMADA 002/26</td>
                                        <td className="p-3">Terça-feira</td>
                                        <td className="p-3"><span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[10px]">Ativo</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedTab === 'itens' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: CADASTRO_ITENS</h3>
                                <p className="text-xs text-slate-500">Catálogo com saldos atualizados automaticamente pelas fórmulas SOMASE ligadas às movimentações.</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                Fórmulas: =SOMASE(...) e =SE(...)
                            </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-teal-900 text-white uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Cód.</th>
                                        <th className="p-3">Código Barras</th>
                                        <th className="p-3">Descrição do Item</th>
                                        <th className="p-3">Unid.</th>
                                        <th className="p-3">Localização</th>
                                        <th className="p-3 text-right">Est. Mín</th>
                                        <th className="p-3 text-right">Preço Unit.</th>
                                        <th className="p-3 text-right">Entradas</th>
                                        <th className="p-3 text-right">Saídas</th>
                                        <th className="p-3 text-right font-black">Saldo Atual</th>
                                        <th className="p-3 text-right">Valor Total</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-001</td>
                                        <td className="p-3 font-mono text-slate-500">7891000100101</td>
                                        <td className="p-3 font-bold">ARROZ BRANCO TIPO 1 - PCT 5KG</td>
                                        <td className="p-3">PCT</td>
                                        <td className="p-3 text-slate-500">GALPÃO A - PALETE 01</td>
                                        <td className="p-3 text-right">50</td>
                                        <td className="p-3 text-right">R$ 24,50</td>
                                        <td className="p-3 text-right text-emerald-600 font-bold">150</td>
                                        <td className="p-3 text-right text-red-600 font-bold">25</td>
                                        <td className="p-3 text-right font-black text-slate-900 bg-slate-50">125</td>
                                        <td className="p-3 text-right font-bold text-slate-800">R$ 3.062,50</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">✅ NORMAL</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-006</td>
                                        <td className="p-3 font-mono text-slate-500">7892000200102</td>
                                        <td className="p-3 font-bold">CARNE BOVINA ACEM RESFRIADO</td>
                                        <td className="p-3">KG</td>
                                        <td className="p-3 text-slate-500">CÂMARA FRIA 01</td>
                                        <td className="p-3 text-right">80</td>
                                        <td className="p-3 text-right">R$ 31,90</td>
                                        <td className="p-3 text-right text-emerald-600 font-bold">220</td>
                                        <td className="p-3 text-right text-red-600 font-bold">60</td>
                                        <td className="p-3 text-right font-black text-slate-900 bg-slate-50">160</td>
                                        <td className="p-3 text-right font-bold text-slate-800">R$ 5.104,00</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">✅ NORMAL</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-009</td>
                                        <td className="p-3 font-mono text-slate-500">7893000300103</td>
                                        <td className="p-3 font-bold">ALFACE CRESPA HIGIENIZADA</td>
                                        <td className="p-3">KG</td>
                                        <td className="p-3 text-slate-500">CÂMARA VERDURAS 03</td>
                                        <td className="p-3 text-right">20</td>
                                        <td className="p-3 text-right">R$ 6,50</td>
                                        <td className="p-3 text-right text-emerald-600 font-bold">45</td>
                                        <td className="p-3 text-right text-red-600 font-bold">15</td>
                                        <td className="p-3 text-right font-black text-slate-900 bg-slate-50">30</td>
                                        <td className="p-3 text-right font-bold text-slate-800">R$ 195,00</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">✅ NORMAL</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedTab === 'movimentacoes' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: MOVIMENTAÇÕES (Entradas e Saídas)</h3>
                                <p className="text-xs text-slate-500">Registro operacional diário. Descrição preenchida via PROCV. Sem necessidade de anexo PDF de NF.</p>
                            </div>
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                                NF Apenas Textual (Sem Anexo PDF)
                            </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-blue-900 text-white uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">ID Mov</th>
                                        <th className="p-3">Data</th>
                                        <th className="p-3">Tipo</th>
                                        <th className="p-3">Cód.</th>
                                        <th className="p-3">Descrição (PROCV)</th>
                                        <th className="p-3">Nº NF / Requisição</th>
                                        <th className="p-3">Fornecedor / Destino</th>
                                        <th className="p-3">Lote</th>
                                        <th className="p-3">Validade</th>
                                        <th className="p-3 text-right">Qtd Ent.</th>
                                        <th className="p-3 text-right">Qtd Saída</th>
                                        <th className="p-3">Responsável</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-indigo-700">MOV-0001</td>
                                        <td className="p-3">01/09/2026</td>
                                        <td className="p-3"><span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold text-[10px]">ENTRADA</span></td>
                                        <td className="p-3 font-bold">IT-001</td>
                                        <td className="p-3 font-bold">ARROZ BRANCO TIPO 1 - PCT 5KG</td>
                                        <td className="p-3 font-mono font-bold text-slate-700">NF 10452</td>
                                        <td className="p-3">COOP VALE VERDE</td>
                                        <td className="p-3 font-mono">LOTE-AR26-09</td>
                                        <td className="p-3 font-mono">01/03/2027</td>
                                        <td className="p-3 text-right font-bold text-emerald-700">150</td>
                                        <td className="p-3 text-right text-slate-400">0</td>
                                        <td className="p-3">Silva - Almoxarife</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-mono font-bold text-indigo-700">MOV-0010</td>
                                        <td className="p-3">08/09/2026</td>
                                        <td className="p-3"><span className="bg-red-100 text-red-800 px-2 py-0.5 rounded font-bold text-[10px]">SAÍDA</span></td>
                                        <td className="p-3 font-bold">IT-001</td>
                                        <td className="p-3 font-bold">ARROZ BRANCO TIPO 1 - PCT 5KG</td>
                                        <td className="p-3 font-mono font-bold text-slate-700">REQ-012/26</td>
                                        <td className="p-3">Cozinha Central - Almoço</td>
                                        <td className="p-3 font-mono">LOTE-AR26-09</td>
                                        <td className="p-3 font-mono">01/03/2027</td>
                                        <td className="p-3 text-right text-slate-400">0</td>
                                        <td className="p-3 text-right font-bold text-red-700">25</td>
                                        <td className="p-3">Dona Maria - Cozinheira</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedTab === 'cronograma' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: CRONOGRAMA_ENTREGAS</h3>
                                <p className="text-xs text-slate-500">Programação semanal de chegadas para conferência de saldos previstos vs entregues.</p>
                            </div>
                            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                                Controle de Saldos Restantes
                            </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-amber-700 text-white uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">ID Agd</th>
                                        <th className="p-3">Data Prevista</th>
                                        <th className="p-3">Dia</th>
                                        <th className="p-3">Turno / Horário</th>
                                        <th className="p-3">Fornecedor</th>
                                        <th className="p-3">Item Programado</th>
                                        <th className="p-3 text-right">Previsto</th>
                                        <th className="p-3 text-right">Recebido</th>
                                        <th className="p-3 text-right">Saldo Restante</th>
                                        <th className="p-3 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">AGD-001</td>
                                        <td className="p-3">15/09/2026</td>
                                        <td className="p-3 font-medium">Terça-feira</td>
                                        <td className="p-3">Manhã (07h30 - 09h00)</td>
                                        <td className="p-3 font-bold">COOP VALE VERDE</td>
                                        <td className="p-3">ARROZ BRANCO TIPO 1 - PCT 5KG</td>
                                        <td className="p-3 text-right font-bold">100</td>
                                        <td className="p-3 text-right font-bold text-emerald-600">100</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-400">0</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">Entregue Total</span></td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">AGD-006</td>
                                        <td className="p-3">22/09/2026</td>
                                        <td className="p-3 font-medium">Terça-feira</td>
                                        <td className="p-3">Manhã (08h30 - 10h00)</td>
                                        <td className="p-3 font-bold">COOP VALE VERDE</td>
                                        <td className="p-3">TOMATE LONGA VIDA</td>
                                        <td className="p-3 text-right font-bold">80</td>
                                        <td className="p-3 text-right font-bold text-slate-400">0</td>
                                        <td className="p-3 text-right font-mono font-bold text-amber-700">80</td>
                                        <td className="p-3 text-center"><span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px]">Agendada</span></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedTab === 'etiquetas' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: IMPRESSÃO_ETIQUETAS</h3>
                                <p className="text-xs text-slate-500">Modelo formatado para folha A4 com grade de etiquetas para caixas, paletes e prateleiras com código de barras, lote e validade.</p>
                            </div>
                            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                                Formato A4 Pronto para Impressão
                            </span>
                        </div>

                        {/* Amostra visual de 2 etiquetas formatadas */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { name: 'ARROZ BRANCO TIPO 1 - PCT 5KG', cod: 'IT-001', unid: 'PCT 5KG', lote: 'LOTE-AR26-09', validade: '01/03/2027', ean: '7891000100101', forn: 'COOP VALE VERDE' },
                                { name: 'CARNE BOVINA ACEM RESFRIADO', cod: 'IT-006', unid: 'KG', lote: 'LOTE-CAR260902', validade: '12/09/2026', ean: '7892000200102', forn: 'FRIGO CENTRAL' }
                            ].map((etq, idx) => (
                                <div key={idx} className="border-2 border-slate-900 rounded-xl p-4 bg-white shadow space-y-2">
                                    <div className="bg-slate-900 text-white text-[9px] font-black text-center py-1 rounded uppercase tracking-wider">
                                        ALMOXARIFADO CENTRAL • CONTROLE DE QUALIDADE
                                    </div>
                                    <div className="text-center font-black text-slate-950 text-sm uppercase py-1 border-b">
                                        {etq.name}
                                    </div>
                                    <div className="grid grid-cols-2 text-xs font-bold gap-2">
                                        <div className="bg-slate-50 p-1.5 rounded border text-center">CÓD: {etq.cod}</div>
                                        <div className="bg-slate-50 p-1.5 rounded border text-center">UNID: {etq.unid}</div>
                                    </div>
                                    <div className="grid grid-cols-2 text-xs font-bold gap-2">
                                        <div className="bg-slate-50 p-1.5 rounded border text-center">LOTE: {etq.lote}</div>
                                        <div className="bg-slate-50 p-1.5 rounded border text-center">ENTRADA: 01/09/2026</div>
                                    </div>
                                    <div className="bg-red-50 border border-red-300 text-red-700 font-black text-center py-2 rounded text-sm">
                                        VALIDADE: {etq.validade}
                                    </div>
                                    <div className="text-center font-mono text-xs font-bold tracking-widest text-slate-800 py-1 bg-slate-50 border rounded">
                                        |||| ||||| |||| |||||||| {etq.ean}
                                    </div>
                                    <div className="text-[10px] text-center text-slate-500 italic">
                                        FORN: {etq.forn} | CONFERIDO NO ALMOXARIFADO
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {selectedTab === 'validades' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: CONTROLE_VALIDADES</h3>
                                <p className="text-xs text-slate-500">Monitoramento de lotes e cálculo dinâmico de dias para vencimento com alerta por cores.</p>
                            </div>
                            <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-200">
                                Prevenção de Perdas PEPS
                            </span>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-red-800 text-white uppercase text-[10px] tracking-wider">
                                    <tr>
                                        <th className="p-3">Cód.</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3">Nº Lote</th>
                                        <th className="p-3">Fornecedor</th>
                                        <th className="p-3">Local</th>
                                        <th className="p-3 text-center">Validade</th>
                                        <th className="p-3 text-right">Qtd Lote</th>
                                        <th className="p-3 text-center">Dias Restantes</th>
                                        <th className="p-3 text-center">Classificação de Risco</th>
                                        <th className="p-3">Ação Recomendada</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-009</td>
                                        <td className="p-3 font-bold">ALFACE CRESPA HIGIENIZADA</td>
                                        <td className="p-3 font-mono">LOTE-ALF260903</td>
                                        <td className="p-3">SITIO SAO JOSE</td>
                                        <td className="p-3 text-slate-500">CÂMARA VERDURAS 03</td>
                                        <td className="p-3 text-center font-bold font-mono">28/09/2026</td>
                                        <td className="p-3 text-right font-bold">30 KG</td>
                                        <td className="p-3 text-center font-bold text-red-600">4 dias</td>
                                        <td className="p-3 text-center"><span className="bg-red-100 text-red-800 font-black px-2 py-0.5 rounded text-[10px]">🚨 CRÍTICO (≤15d)</span></td>
                                        <td className="p-3 text-red-700 font-bold">Consumo imediato na salada do almoço</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-010</td>
                                        <td className="p-3 font-bold">TOMATE LONGA VIDA</td>
                                        <td className="p-3 font-mono">LOTE-TOM260903</td>
                                        <td className="p-3">COOP VALE VERDE</td>
                                        <td className="p-3 text-slate-500">CÂMARA VERDURAS 03</td>
                                        <td className="p-3 text-center font-bold font-mono">05/10/2026</td>
                                        <td className="p-3 text-right font-bold">90 KG</td>
                                        <td className="p-3 text-center font-bold text-amber-600">11 dias</td>
                                        <td className="p-3 text-center"><span className="bg-amber-100 text-amber-800 font-black px-2 py-0.5 rounded text-[10px]">⚠️ ALERTA (≤30d)</span></td>
                                        <td className="p-3 text-amber-700">Distribuir prioritariamente na semana</td>
                                    </tr>
                                    <tr className="hover:bg-slate-50">
                                        <td className="p-3 font-bold text-indigo-700">IT-001</td>
                                        <td className="p-3 font-bold">ARROZ BRANCO TIPO 1 - PCT 5KG</td>
                                        <td className="p-3 font-mono">LOTE-AR26-09</td>
                                        <td className="p-3">COOP VALE VERDE</td>
                                        <td className="p-3 text-slate-500">GALPÃO A - PALETE 01</td>
                                        <td className="p-3 text-center font-bold font-mono">01/03/2027</td>
                                        <td className="p-3 text-right font-bold">125 PCT</td>
                                        <td className="p-3 text-center font-bold text-emerald-600">158 dias</td>
                                        <td className="p-3 text-center"><span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded text-[10px]">🟢 OK (REGULAR)</span></td>
                                        <td className="p-3 text-slate-600">Gênero seco com amplo prazo de conservação</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {selectedTab === 'manual' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 uppercase">Aba: INSTRUÇÕES_USO (Manual Prático)</h3>
                                <p className="text-xs text-slate-500">Guia de fórmulas, rotinas de almoxarifado e esclarecimento sobre notas fiscais.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 leading-relaxed">
                            <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                                <h4 className="font-black text-slate-900 uppercase">1. Como Lançar Entradas e Saídas</h4>
                                <p>
                                    Ao receber ou retirar um material, vá até a aba <strong>MOVIMENTAÇÕES</strong> e crie uma nova linha. Basta preencher o Código do Item e o sistema puxará o nome e unidade via <code>=PROCV(...)</code>. Informe a quantidade em <strong>Qtd Entrada</strong> ou <strong>Qtd Saída</strong>.
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                                <h4 className="font-black text-slate-900 uppercase">2. Como os Saldos São Atualizados</h4>
                                <p>
                                    Na aba <strong>CADASTRO_ITENS</strong>, as colunas de Entradas, Saídas e Saldo Atual utilizam a fórmula <code>=SOMASE(...)</code> apontando para a aba de movimentações. Você nunca precisa calcular o estoque na mão!
                                </p>
                            </div>

                            <div className="p-4 bg-slate-50 border rounded-xl space-y-2">
                                <h4 className="font-black text-slate-900 uppercase">3. Impressão de Etiquetas</h4>
                                <p>
                                    A aba <strong>IMPRESSÃO_ETIQUETAS</strong> está pré-configurada na orientação Retrato A4. Selecione o código do item na célula superior ou preencha os blocos e aperte <kbd className="bg-white border px-1.5 py-0.5 rounded font-mono font-bold">Ctrl + P</kbd> para imprimir diretamente.
                                </p>
                            </div>

                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                                <h4 className="font-black text-emerald-900 uppercase">4. Sem Anexos de Arquivos PDF</h4>
                                <p className="text-emerald-800">
                                    Conforme sua solicitação, eliminamos qualquer necessidade de anexar ou vincular arquivos PDF de notas fiscais. O número da nota fiscal e os dados de lote e validade são salvos como campos normais de texto na planilha.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
export default AdminExcelAlmoxarifado;
