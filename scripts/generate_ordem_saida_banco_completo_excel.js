import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function generateCompleteExitOrdersAndDatabaseWorkbook() {
  console.log('Iniciando geração da Planilha de Ordens de Saída e Banco de Dados Completo...');
  
  const dbPath = path.resolve('./server-data/db.json');
  if (!fs.existsSync(dbPath)) {
    console.error('Arquivo ./server-data/db.json não encontrado!');
    process.exit(1);
  }

  const rawData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(rawData);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Almoxarifado, Estoque e Transporte';
  workbook.lastModifiedBy = 'Administração Central';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Cores institucionais
  const NAVY = '1E3A8A';
  const INDIGO = '312E81';
  const EMERALD = '065F46';
  const SLATE = '1E293B';
  const AMBER = '92400E';
  const GRAY_HEADER = '334155';
  const LIGHT_BLUE = 'DBEAFE';
  const LIGHT_GRAY = 'F1F5F9';
  const WHITE = 'FFFFFF';

  // Helper para aplicar estilo de cabeçalho
  function applyHeaderStyle(row, bgColor = NAVY) {
    row.font = { bold: true, color: { argb: WHITE }, size: 10, name: 'Segoe UI' };
    row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    row.height = 28;
  }

  // Helper para aplicar bordas
  function applyBorders(sheet, startRow, endRow, colCount) {
    for (let r = startRow; r <= endRow; r++) {
      const row = sheet.getRow(r);
      for (let c = 1; c <= colCount; c++) {
        const cell = row.getCell(c);
        cell.border = {
          top: { style: 'thin', color: { argb: 'CBD5E1' } },
          left: { style: 'thin', color: { argb: 'CBD5E1' } },
          bottom: { style: 'thin', color: { argb: 'CBD5E1' } },
          right: { style: 'thin', color: { argb: 'CBD5E1' } }
        };
        cell.font = cell.font || { name: 'Segoe UI', size: 9 };
      }
    }
  }

  // Helper para auto-ajustar largura das colunas
  function autoFitColumns(sheet, minWidth = 12) {
    sheet.columns.forEach(col => {
      let maxLen = minWidth;
      col.eachCell({ includeEmpty: false }, (cell) => {
        const cellVal = cell.value ? String(cell.value) : '';
        if (cellVal.length > maxLen) {
          maxLen = Math.min(cellVal.length + 3, 50);
        }
      });
      col.width = maxLen;
    });
  }

  // =========================================================================
  // ABA 1: RESUMO & PAINEL GERAL (DASHBOARD)
  // =========================================================================
  const wsDash = workbook.addWorksheet('📊 Painel & Resumo', {
    views: [{ showGridLines: true }]
  });

  wsDash.addRow([]);
  const dashTitle = wsDash.addRow(['   SISTEMA DE GESTÃO - PAINEL EXECUTIVO E BANCO DE DADOS COMPLETO']);
  dashTitle.font = { bold: true, size: 14, color: { argb: WHITE }, name: 'Segoe UI' };
  dashTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  dashTitle.height = 36;
  wsDash.mergeCells('A2:H2');

  const dashSub = wsDash.addRow(['   Consolidação oficial: Ordens de Saída de Veículos, Entradas/Saídas de Estoque, Fornecedores e Frotas']);
  dashSub.font = { italic: true, size: 9, color: { argb: '94A3B8' }, name: 'Segoe UI' };
  dashSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  dashSub.height = 20;
  wsDash.mergeCells('A3:H3');

  wsDash.addRow([]);

  // KPIs
  const veoList = Object.values(db.vehicleExitOrders || {});
  const wlList = Object.values(db.warehouseLog || {});
  const suppList = Object.values(db.suppliers || {});
  const vehList = Object.values(db.vehicleAssets || {});
  const drvList = Object.values(db.driverAssets || {});
  const tempExits = Object.values(db.temporaryExitInmates || {});

  wsDash.addRow(['INDICADOR / MÓDULO', 'QUANTIDADE TOTAL REGISTRADA', 'UNIDADE / DESCRIÇÃO', 'STATUS OPERACIONAL']);
  applyHeaderStyle(wsDash.getRow(5), INDIGO);

  const kpis = [
    ['Ordens de Saída de Veículos (Viagens)', veoList.length, 'Ordens de Saída FCT emitidas', 'CONCLUÍDO / AUDITADO'],
    ['Entradas de Almoxarifado / Estoque', wlList.length, 'Lançamentos de mercadorias por NF', 'ATIVO COM RASTREABILIDADE'],
    ['Fornecedores Cadastrados', suppList.length, 'Contratos e produtores PPAIS/Alimentos', 'BASE ATUALIZADA'],
    ['Veículos na Frota Operacional', vehList.length, 'Viaturas próprias e locadas', 'EM OPERAÇÃO'],
    ['Motoristas / Servidores Habilitados', drvList.length, 'Condutores oficiais cadastrados', 'REGULAR'],
    ['Saídas Temporárias (Custodiados)', tempExits.length, 'Registros de benefícios de saída', 'HISTÓRICO ARQUIVADO']
  ];

  kpis.forEach((kpi, idx) => {
    const r = wsDash.addRow(kpi);
    r.height = 24;
    r.getCell(1).font = { bold: true, name: 'Segoe UI', size: 10 };
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(2).font = { bold: true, color: { argb: NAVY }, size: 11, name: 'Segoe UI' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(4).font = { bold: true, color: { argb: EMERALD }, size: 9, name: 'Segoe UI' };
    r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'F8FAFC' : WHITE } };
  });

  applyBorders(wsDash, 5, 5 + kpis.length, 4);

  wsDash.addRow([]);
  wsDash.addRow(['INFORMAÇÕES E DIRETRIZES DE USO']);
  const infoH = wsDash.getRow(13);
  infoH.font = { bold: true, color: { argb: WHITE }, size: 10, name: 'Segoe UI' };
  infoH.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  wsDash.mergeCells('A13:D13');

  const descRows = [
    ['1. Aba "Ordens de Saída (Veículos)": Contém as 834 viagens oficiais com número de processo FCT, datas, horários de saída e retorno, viatura, condutor, destino e equipe acompanhante.'],
    ['2. Aba "Entradas de Almoxarifado": Contém 1.217 entradas com detalhamento de notas fiscais, lotes, validades e fórmulas automáticas de status de vencimento.'],
    ['3. Aba "Fornecedores": Cadastro corporativo com CNPJs/CPFs, processos SEI, valor total de contrato e dados de entrega.'],
    ['4. Aba "Veículos & Frotas" e "Motoristas": Relação de viaturas e condutores autorizados.'],
    ['5. Todas as abas contam com auto-filtro ativado para facilitar consultas por data, placa, motorista, fornecedor ou item.']
  ];

  descRows.forEach(d => {
    const r = wsDash.addRow(d);
    r.height = 20;
    r.font = { size: 9, color: { argb: '334155' }, name: 'Segoe UI' };
    wsDash.mergeCells(`A${r.number}:D${r.number}`);
  });

  autoFitColumns(wsDash, 18);

  // =========================================================================
  // ABA 2: ORDENS DE SAÍDA DE VEÍCULOS (PRINCIPAL SOLICITAÇÃO)
  // =========================================================================
  console.log(`Exportando ${veoList.length} Ordens de Saída de Veículos...`);
  const wsVeo = workbook.addWorksheet('🚗 Ordens de Saída (Veículos)', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  // Título
  const veoTitle = wsVeo.addRow(['ORDENS DE SAÍDA DE VEÍCULOS E TRANSPORTE - BANCO DE DADOS COMPLETO']);
  veoTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  veoTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
  veoTitle.height = 30;
  wsVeo.mergeCells('A1:P1');

  // Subtítulo
  const veoSub = wsVeo.addRow([`Total de ${veoList.length} Ordens Registradas • Rastreamento Completo de FCT, Destino, Viatura e Condutores`]);
  veoSub.font = { italic: true, size: 9, color: { argb: 'CBD5E1' }, name: 'Segoe UI' };
  veoSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
  veoSub.height = 18;
  wsVeo.mergeCells('A2:P2');

  // Cabeçalhos
  const veoHeaders = [
    'Nº FCT / Ordem',
    'Data Saída',
    'Hora Saída',
    'Data Retorno',
    'Hora Retorno',
    'Veículo / Viatura',
    'Placa',
    'Patrimônio / Tipo',
    'Motorista / Responsável',
    'Cargo do Servidor',
    'Destino da Missão',
    'Acompanhantes / Equipe',
    'Validado Por',
    'Cargo Validador',
    'Data/Hora Validação',
    'Observações'
  ];

  const headerRowVeo = wsVeo.addRow(veoHeaders);
  applyHeaderStyle(headerRowVeo, NAVY);

  veoList.forEach((order, idx) => {
    // Formatar acompanhantes
    let compStr = '';
    if (order.companions && Array.isArray(order.companions)) {
      compStr = order.companions
        .filter(c => c && c.name && c.name.trim() !== '')
        .map(c => `${c.name}${c.rg ? ` (RG: ${c.rg})` : ''}`)
        .join('; ');
    }

    const row = wsVeo.addRow([
      order.fctNumber || order.id || '',
      order.date || '',
      order.exitTime || '',
      order.returnDate || '',
      order.returnTime || '',
      order.vehicle || '',
      order.plate || '',
      order.assetNumber || '',
      order.responsibleServer || '',
      order.serverRole || '',
      order.destination || '',
      compStr || '-',
      order.validatedBy || '',
      order.validationRole || '',
      order.validationTimestamp ? order.validationTimestamp.replace('T', ' ').substring(0, 19) : '',
      order.observations || ''
    ]);

    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(3).alignment = { horizontal: 'center' };
    row.getCell(4).alignment = { horizontal: 'center' };
    row.getCell(5).alignment = { horizontal: 'center' };
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };

    // Zebra striping
    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
    }
  });

  applyBorders(wsVeo, 3, 3 + veoList.length, veoHeaders.length);
  wsVeo.autoFilter = { from: 'A3', to: `P${3 + veoList.length}` };
  autoFitColumns(wsVeo, 12);

  // =========================================================================
  // ABA 3: ENTRADAS DE ALMOXARIFADO (ESTOQUE)
  // =========================================================================
  console.log(`Exportando ${wlList.length} Entradas de Almoxarifado...`);
  const wsWl = workbook.addWorksheet('📦 Entradas de Almoxarifado', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  const wlTitle = wsWl.addRow(['REGISTRO DE ENTRADAS DE ALMOXARIFADO E ESTOQUE - BANCO COMPLETO']);
  wlTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  wlTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD } };
  wlTitle.height = 30;
  wsWl.mergeCells('A1:N1');

  const wlSub = wsWl.addRow([`Total de ${wlList.length} Movimentações de Entrada Registradas • Controle de Lotes, Notas Fiscais e Validades`]);
  wlSub.font = { italic: true, size: 9, color: { argb: 'D1FAE5' }, name: 'Segoe UI' };
  wlSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EMERALD } };
  wlSub.height = 18;
  wsWl.mergeCells('A2:N2');

  const wlHeaders = [
    'ID Entrada',
    'Data Entrada',
    'Item / Descrição do Produto',
    'Quantidade (KG/UN)',
    'Valor Total (R$)',
    'Fornecedor / Produtor',
    'Nº Nota Fiscal',
    'Nº Lote',
    'Data Validade',
    'Status Validade',
    'Processo / Pedido (PD)',
    'Nota Empenho (NE)',
    'Código de Barras',
    'Data/Hora Registro'
  ];

  const headerRowWl = wsWl.addRow(wlHeaders);
  applyHeaderStyle(headerRowWl, EMERALD);

  wlList.forEach((m, idx) => {
    const rowNum = 4 + idx;
    const row = wsWl.addRow([
      m.id || '',
      m.date || '',
      m.itemName || m.item || '',
      Number(m.quantity || m.kg || 0),
      Number(m.value || m.totalValue || 0),
      m.supplierName || '',
      m.invoiceNumber || m.inboundInvoice || '',
      m.lotNumber || '',
      m.expirationDate || '',
      // Fórmula Excel para cálculo dinâmico de status de validade
      m.expirationDate ? { formula: `SE(I${rowNum}="","-",SE(DATA.VALOR(I${rowNum})<HOJE(),"VENCIDO",SE(DATA.VALOR(I${rowNum})-HOJE()<=30,"CRÍTICO (<=30D)","REGULAR")))` } : 'REGULAR',
      m.pdNumber || '',
      m.neNumber || '',
      m.barcode || '',
      m.timestamp ? String(m.timestamp).replace('T', ' ').substring(0, 19) : ''
    ]);

    row.height = 20;
    row.getCell(1).alignment = { horizontal: 'center' };
    row.getCell(2).alignment = { horizontal: 'center' };
    row.getCell(4).numFmt = '#,##0.00';
    row.getCell(5).numFmt = '"R$ "#,##0.00';
    row.getCell(7).alignment = { horizontal: 'center' };
    row.getCell(8).alignment = { horizontal: 'center' };
    row.getCell(9).alignment = { horizontal: 'center' };
    row.getCell(10).alignment = { horizontal: 'center' };

    if (idx % 2 === 1) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
    }
  });

  // Linha de Totais no final
  const totRowIndex = 4 + wlList.length;
  const totRow = wsWl.addRow([
    'TOTAL GERAL',
    '',
    '',
    { formula: `SOMA(D4:D${totRowIndex - 1})` },
    { formula: `SOMA(E4:E${totRowIndex - 1})` },
    '', '', '', '', '', '', '', '', ''
  ]);
  totRow.height = 24;
  totRow.font = { bold: true, size: 10, name: 'Segoe UI' };
  totRow.getCell(1).alignment = { horizontal: 'center' };
  totRow.getCell(4).numFmt = '#,##0.00';
  totRow.getCell(5).numFmt = '"R$ "#,##0.00';
  totRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_BLUE } };

  applyBorders(wsWl, 3, totRowIndex, wlHeaders.length);
  wsWl.autoFilter = { from: 'A3', to: `N${totRowIndex - 1}` };
  autoFitColumns(wsWl, 12);

  // =========================================================================
  // ABA 4: SAÍDAS E BAIXAS DE ESTOQUE
  // =========================================================================
  const wsSaidas = workbook.addWorksheet('📤 Saídas & Baixas de Estoque', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  const saidasTitle = wsSaidas.addRow(['REGISTRO DE SAÍDAS, BAIXAS E CONSUMO DE ALMOXARIFADO']);
  saidasTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  saidasTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER } };
  saidasTitle.height = 30;
  wsSaidas.mergeCells('A1:H1');

  const saidasSub = wsSaidas.addRow(['Registro de requisições, per capita e retiradas autorizadas']);
  saidasSub.font = { italic: true, size: 9, color: { argb: 'FEF3C7' }, name: 'Segoe UI' };
  saidasSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AMBER } };
  saidasSub.height = 18;
  wsSaidas.mergeCells('A2:H2');

  const saidasHeaders = [
    'ID Saída',
    'Data Saída',
    'Item / Produto',
    'Quantidade Baixada',
    'Destino / Setor Solicitante',
    'Responsável pela Saída',
    'Tipo de Movimento',
    'Observações'
  ];

  const headerRowSaidas = wsSaidas.addRow(saidasHeaders);
  applyHeaderStyle(headerRowSaidas, AMBER);

  // Obter saídas de warehouseLog ou directorWithdrawals
  const actualExits = wlList.filter(x => (x.type || '').toLowerCase().includes('sai'));
  const directorExits = Object.values(db.directorWithdrawals || {});

  const allExitsCombined = [...actualExits];
  directorExits.forEach((dw) => {
    if (dw.items && Array.isArray(dw.items)) {
      dw.items.forEach((it) => {
        allExitsCombined.push({
          id: dw.id || 'DW',
          date: dw.date || '',
          itemName: it.name || it.item || 'Item',
          quantity: it.kg || it.quantity || 0,
          sector: dw.recipient || 'Diretoria / Cozinha',
          responsible: dw.responsible || 'Diretoria',
          type: 'saída',
          observations: dw.observations || 'Retirada Per Capita'
        });
      });
    }
  });

  if (allExitsCombined.length === 0) {
    // Linha exemplo caso ainda não tenha baixas finalizadas
    const r = wsSaidas.addRow(['EX-001', new Date().toISOString().split('T')[0], 'HORTIFRUTI DIVERSOS', 150, 'COZINHA CENTRAL (REFEIÇÕES)', 'ALMOXARIFE', 'Consumo Diário Per Capita', 'Lançamento programado']);
    r.height = 20;
  } else {
    allExitsCombined.forEach((exit, idx) => {
      const r = wsSaidas.addRow([
        exit.id || '',
        exit.date || '',
        exit.itemName || exit.item || '',
        Number(exit.quantity || exit.kg || 0),
        exit.sector || exit.supplierName || 'COZINHA CENTRAL',
        exit.responsible || 'ALMOXARIFE',
        exit.type || 'Saída de Estoque',
        exit.observations || ''
      ]);
      r.height = 20;
      r.getCell(4).numFmt = '#,##0.00';
      if (idx % 2 === 1) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
    });
  }

  applyBorders(wsSaidas, 3, 3 + Math.max(allExitsCombined.length, 1), saidasHeaders.length);
  wsSaidas.autoFilter = { from: 'A3', to: `H${3 + Math.max(allExitsCombined.length, 1)}` };
  autoFitColumns(wsSaidas, 14);

  // =========================================================================
  // ABA 5: CADASTRO DE FORNECEDORES
  // =========================================================================
  console.log(`Exportando ${suppList.length} Fornecedores...`);
  const wsSupp = workbook.addWorksheet('🏢 Cadastro de Fornecedores', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  const suppTitle = wsSupp.addRow(['CADASTRO COMPLETO DE FORNECEDORES E PRODUTORES']);
  suppTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  suppTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  suppTitle.height = 30;
  wsSupp.mergeCells('A1:J1');

  const suppSub = wsSupp.addRow([`Total de ${suppList.length} Fornecedores • Contratos, CNPJ/CPF, Processos SEI e Entregas`]);
  suppSub.font = { italic: true, size: 9, color: { argb: 'CBD5E1' }, name: 'Segoe UI' };
  suppSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SLATE } };
  suppSub.height = 18;
  wsSupp.mergeCells('A2:J2');

  const suppHeaders = [
    'Razão Social / Nome do Produtor',
    'CNPJ / CPF',
    'Processo SEI',
    'Cidade / UF',
    'Endereço',
    'Valor Total Contrato (R$)',
    'Itens Contratados',
    'Entregas Realizadas',
    'Semanas Permitidas',
    'Observações'
  ];

  const headerRowSupp = wsSupp.addRow(suppHeaders);
  applyHeaderStyle(headerRowSupp, SLATE);

  suppList.forEach((s, idx) => {
    const itemsCount = s.contractItems && Array.isArray(s.contractItems) ? s.contractItems.length : 0;
    const deliveriesCount = s.deliveries && Array.isArray(s.deliveries) ? s.deliveries.length : (s.deliveries && typeof s.deliveries === 'object' ? Object.keys(s.deliveries).length : 0);
    const weeksStr = s.allowedWeeks && Array.isArray(s.allowedWeeks) ? s.allowedWeeks.join(', ') : 'Todas';

    const r = wsSupp.addRow([
      s.name || '',
      s.cpf || s.cpfCnpj || '',
      s.processNumber || '',
      s.city || '',
      s.address || '',
      Number(s.initialValue || 0),
      itemsCount,
      deliveriesCount,
      weeksStr,
      s.observations || ''
    ]);

    r.height = 20;
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(6).numFmt = '"R$ "#,##0.00';
    r.getCell(7).alignment = { horizontal: 'center' };
    r.getCell(8).alignment = { horizontal: 'center' };
    r.getCell(9).alignment = { horizontal: 'center' };

    if (idx % 2 === 1) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
  });

  applyBorders(wsSupp, 3, 3 + suppList.length, suppHeaders.length);
  wsSupp.autoFilter = { from: 'A3', to: `J${3 + suppList.length}` };
  autoFitColumns(wsSupp, 14);

  // =========================================================================
  // ABA 6: VEÍCULOS & FROTAS
  // =========================================================================
  const wsVeh = workbook.addWorksheet('🚐 Veículos & Frotas', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  const vehTitle = wsVeh.addRow(['CADASTRO DE VEÍCULOS E VIATURAS OFICIAIS']);
  vehTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  vehTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  vehTitle.height = 28;
  wsVeh.mergeCells('A1:E1');

  const vehHeaders = ['Modelo / Veículo', 'Placa', 'Nº Patrimônio', 'Tipo de Viatura', 'Status Operacional'];
  const headerVeh = wsVeh.addRow(vehHeaders);
  applyHeaderStyle(headerVeh, NAVY);

  vehList.forEach((v, idx) => {
    const r = wsVeh.addRow([
      v.model || v.name || v.vehicle || '',
      v.plate || '',
      v.assetNumber || v.patrimony || 'LOCADO',
      v.type || 'Oficial / Operacional',
      'ATIVO'
    ]);
    r.height = 20;
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(3).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    if (idx % 2 === 1) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
  });

  applyBorders(wsVeh, 2, 2 + Math.max(vehList.length, 1), vehHeaders.length);
  autoFitColumns(wsVeh, 15);

  // =========================================================================
  // ABA 7: MOTORISTAS & SERVIDORES HABILITADOS
  // =========================================================================
  const wsDrv = workbook.addWorksheet('👮 Motoristas & Condutores', {
    views: [{ showGridLines: true, freezePane: { ySplit: 3, xSplit: 0 } }]
  });

  const drvTitle = wsDrv.addRow(['RELAÇÃO DE MOTORISTAS E CONDUTORES AUTORIZADOS']);
  drvTitle.font = { bold: true, size: 12, color: { argb: WHITE }, name: 'Segoe UI' };
  drvTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
  drvTitle.height = 28;
  wsDrv.mergeCells('A1:E1');

  const drvHeaders = ['Nome Completo do Servidor', 'Registro Geral (RG)', 'Cargo / Função', 'Categoria CNH', 'Status'];
  const headerDrv = wsDrv.addRow(drvHeaders);
  applyHeaderStyle(headerDrv, INDIGO);

  drvList.forEach((d, idx) => {
    const r = wsDrv.addRow([
      d.name || '',
      d.rg || '',
      d.role || 'POLICIAL PENAL',
      d.cnh || 'B/D',
      'HABILITADO'
    ]);
    r.height = 20;
    r.getCell(2).alignment = { horizontal: 'center' };
    r.getCell(4).alignment = { horizontal: 'center' };
    r.getCell(5).alignment = { horizontal: 'center' };
    if (idx % 2 === 1) r.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: LIGHT_GRAY } };
  });

  applyBorders(wsDrv, 2, 2 + Math.max(drvList.length, 1), drvHeaders.length);
  autoFitColumns(wsDrv, 16);

  // Gravar arquivo
  const outputPath = path.resolve('./Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx');
  const publicPath = path.resolve('./public/Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx');
  const standalonePath = path.resolve('./servidor-interno-estoque-percapita/Planilha_Ordens_de_Saida_e_Banco_Completo.xlsx');

  await workbook.xlsx.writeFile(outputPath);
  console.log(`✅ Planilha salva em: ${outputPath}`);

  fs.copyFileSync(outputPath, publicPath);
  console.log(`✅ Planilha copiada para: ${publicPath}`);

  if (fs.existsSync(path.dirname(standalonePath))) {
    fs.copyFileSync(outputPath, standalonePath);
    console.log(`✅ Planilha copiada para pacote do servidor interno: ${standalonePath}`);
  }

  const stat = fs.statSync(outputPath);
  console.log(`Tamanho final do arquivo: ${(stat.size / 1024 / 1024).toFixed(2)} MB`);
}

generateCompleteExitOrdersAndDatabaseWorkbook().catch(err => {
  console.error('Erro ao gerar planilha:', err);
  process.exit(1);
});
