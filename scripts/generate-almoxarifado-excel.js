import ExcelJS from 'exceljs';
import fs from 'fs';
import path from 'path';

async function generateWarehouseExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Sistema de Gestão de Almoxarifado';
  workbook.lastModifiedBy = 'Almoxarifado Central';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Cores do Tema (Profissional Corporativo / Almoxarifado)
  const colors = {
    primaryHeader: '1E3A8A',    // Azul escuro militar/corporativo
    secondaryHeader: '0284C7',  // Azul médio
    accentHeader: '0F766E',     // Verde petróleo
    warningHeader: 'D97706',    // Âmbar
    dangerHeader: 'DC2626',     // Vermelho
    zebraLight: 'F8FAFC',       // Cinza muito claro
    border: 'CBD5E1',           // Cinza borda
    whiteText: 'FFFFFF',
    darkText: '0F172A',
  };

  const borderStyle = {
    top: { style: 'thin', color: { argb: colors.border } },
    left: { style: 'thin', color: { argb: colors.border } },
    bottom: { style: 'thin', color: { argb: colors.border } },
    right: { style: 'thin', color: { argb: colors.border } },
  };

  const headerStyle = (bgColor = colors.primaryHeader) => ({
    font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
    border: borderStyle,
  });

  const cellStyle = (align = 'left', bold = false) => ({
    font: { name: 'Segoe UI', size: 10, bold },
    alignment: { vertical: 'middle', horizontal: align },
    border: borderStyle,
  });

  // =========================================================================
  // 1. ABA DASHBOARD & INDICADORES (PRIMEIRA ABA VISÍVEL)
  // =========================================================================
  const wsDash = workbook.addWorksheet('Painel & Indicadores', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: colors.primaryHeader } },
  });

  wsDash.columns = [
    { width: 5 },  // A
    { width: 28 }, // B
    { width: 18 }, // C
    { width: 5 },  // D
    { width: 28 }, // E
    { width: 18 }, // F
    { width: 5 },  // G
    { width: 32 }, // H
    { width: 20 }, // I
  ];

  // Título Dashboard
  wsDash.mergeCells('B2:I2');
  const dashTitle = wsDash.getCell('B2');
  dashTitle.value = '📊 SISTEMA DE GESTÃO DO ALMOXARIFADO - PAINEL GERAL DE CONTROLE';
  dashTitle.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: colors.whiteText } };
  dashTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryHeader } };
  dashTitle.alignment = { vertical: 'middle', horizontal: 'center' };
  wsDash.getRow(2).height = 42;

  // Subtítulo
  wsDash.mergeCells('B3:I3');
  const dashSub = wsDash.getCell('B3');
  dashSub.value = 'Controle Unificado de Fornecedores, Itens, Movimentações, Cronograma de Entregas e Etiquetas (Sem anexos de arquivos)';
  dashSub.font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: '475569' } };
  dashSub.alignment = { vertical: 'middle', horizontal: 'center' };
  dashSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } };
  wsDash.getRow(3).height = 24;

  // Linha 5: Cards de Indicadores (Linha Superior)
  // Card 1: Fornecedores Cadastrados
  wsDash.getCell('B5').value = 'FORNECEDORES ATIVOS';
  wsDash.getCell('B5').style = headerStyle(colors.secondaryHeader);
  wsDash.getCell('C5').value = { formula: 'COUNTIF(FORNECEDORES!N4:N100, "Ativo")' };
  wsDash.getCell('C5').style = {
    font: { name: 'Segoe UI', size: 18, bold: true, color: { argb: colors.primaryHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } },
  };

  // Card 2: Itens Cadastrados
  wsDash.getCell('E5').value = 'TOTAL DE ITENS NO CATÁLOGO';
  wsDash.getCell('E5').style = headerStyle(colors.accentHeader);
  wsDash.getCell('F5').value = { formula: 'COUNTA(CADASTRO_ITENS!A4:A100)' };
  wsDash.getCell('F5').style = {
    font: { name: 'Segoe UI', size: 18, bold: true, color: { argb: colors.accentHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0FDF4' } },
  };

  // Card 3: Valor Total do Estoque
  wsDash.getCell('H5').value = 'VALOR TOTAL EM ESTOQUE';
  wsDash.getCell('H5').style = headerStyle(colors.primaryHeader);
  wsDash.getCell('I5').value = { formula: 'SUM(CADASTRO_ITENS!M4:M100)' };
  wsDash.getCell('I5').numFmt = '"R$ "#,##0.00';
  wsDash.getCell('I5').style = {
    font: { name: 'Segoe UI', size: 16, bold: true, color: { argb: colors.primaryHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EFF6FF' } },
  };
  wsDash.getRow(5).height = 36;

  // Linha 7: Cards de Indicadores (Alertas e Operação)
  // Card 4: Itens com Estoque Baixo
  wsDash.getCell('B7').value = '⚠️ ITENS COM ESTOQUE BAIXO';
  wsDash.getCell('B7').style = headerStyle(colors.warningHeader);
  wsDash.getCell('C7').value = { formula: 'COUNTIF(CADASTRO_ITENS!N4:N100, "*BAIXO*")' };
  wsDash.getCell('C7').style = {
    font: { name: 'Segoe UI', size: 18, bold: true, color: { argb: colors.warningHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFBEB' } },
  };

  // Card 5: Lotes com Validade Crítica
  wsDash.getCell('E7').value = '🚨 LOTES EM VALIDADE CRÍTICA';
  wsDash.getCell('E7').style = headerStyle(colors.dangerHeader);
  wsDash.getCell('F7').value = { formula: 'COUNTIF(CONTROLE_VALIDADES!J4:J100, "*CRÍTICO*") + COUNTIF(CONTROLE_VALIDADES!J4:J100, "*VENCIDO*")' };
  wsDash.getCell('F7').style = {
    font: { name: 'Segoe UI', size: 18, bold: true, color: { argb: colors.dangerHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } },
  };

  // Card 6: Entregas Programadas
  wsDash.getCell('H7').value = '🚚 ENTREGAS AGENDADAS';
  wsDash.getCell('H7').style = headerStyle(colors.secondaryHeader);
  wsDash.getCell('I7').value = { formula: 'COUNTIF(CRONOGRAMA_ENTREGAS!K4:K100, "*Agendada*")' };
  wsDash.getCell('I7').style = {
    font: { name: 'Segoe UI', size: 18, bold: true, color: { argb: colors.secondaryHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0F9FF' } },
  };
  wsDash.getRow(7).height = 36;

  // Linha 9: Sumário de Navegação Rápida
  wsDash.mergeCells('B9:I9');
  const navHeader = wsDash.getCell('B9');
  navHeader.value = '📌 ESTRUTURA E FUNCIONAMENTO DAS ABAS DO ALMOXARIFADO';
  navHeader.style = headerStyle('334155');
  wsDash.getRow(9).height = 28;

  const abasInfo = [
    ['1. FORNECEDORES', 'Cadastro completo de fornecedores, produtores (PPAIS/PPL/Convencionais), contatos, dados bancários e contratos.'],
    ['2. CADASTRO_ITENS', 'Catálogo de materiais e gêneros alimentícios, unidade de medida, estoques mínimo e cálculo automático do saldo e valor.'],
    ['3. MOVIMENTAÇÕES', 'Livro de registro de Entradas e Saídas diárias, número de NF (sem anexo PDF), lotes, validades e conferente responsável.'],
    ['4. CRONOGRAMA_ENTREGAS', 'Programação de entregas por dia da semana, fornecedor, quantidade prevista versus quantidade recebida e controle de saldos.'],
    ['5. IMPRESSÃO_ETIQUETAS', 'Área formatada pronta para imprimir etiquetas de prateleira, caixas e paletes com código de barras, lote e validade.'],
    ['6. CONTROLE_VALIDADES', 'Rastreabilidade de lotes com cálculo automático de dias restantes para o vencimento e alerta de risco por cores.'],
    ['7. INSTRUÇÕES_USO', 'Manual passo a passo com explicações de fórmulas (PROCV, SOMASE, CONT.SE), atalhos e boas práticas de almoxarifado.'],
  ];

  abasInfo.forEach((item, idx) => {
    const rowNum = 10 + idx;
    wsDash.getCell(`B${rowNum}`).value = item[0];
    wsDash.getCell(`B${rowNum}`).style = {
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: colors.primaryHeader } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: borderStyle,
      fill: { type: 'pattern', pattern: 'solid', fgColor: idx % 2 === 0 ? colors.zebraLight : 'FFFFFF' },
    };
    wsDash.mergeCells(`C${rowNum}:I${rowNum}`);
    const descCell = wsDash.getCell(`C${rowNum}`);
    descCell.value = item[1];
    descCell.style = {
      font: { name: 'Segoe UI', size: 10, color: { argb: colors.darkText } },
      alignment: { vertical: 'middle', horizontal: 'left' },
      border: borderStyle,
      fill: { type: 'pattern', pattern: 'solid', fgColor: idx % 2 === 0 ? colors.zebraLight : 'FFFFFF' },
    };
    wsDash.getRow(rowNum).height = 24;
  });

  // =========================================================================
  // 2. ABA FORNECEDORES (CADASTRO DE FORNECEDORES)
  // =========================================================================
  const wsForn = workbook.addWorksheet('FORNECEDORES', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { tabColor: { argb: colors.secondaryHeader } },
  });

  wsForn.columns = [
    { header: 'ID FORNECEDOR', key: 'id', width: 16 },
    { header: 'RAZÃO SOCIAL / NOME', key: 'razao', width: 34 },
    { header: 'NOME FANTASIA / PROPRIEDADE', key: 'fantasia', width: 28 },
    { header: 'CNPJ / CPF', key: 'documento', width: 20 },
    { header: 'TIPO FORNECEDOR', key: 'tipo', width: 22 },
    { header: 'RAMO / CATEGORIA', key: 'categoria', width: 24 },
    { header: 'TELEFONE / WHATSAPP', key: 'telefone', width: 20 },
    { header: 'E-MAIL', key: 'email', width: 28 },
    { header: 'CIDADE / UF', key: 'cidade', width: 20 },
    { header: 'CONTRATO / ATA RP', key: 'contrato', width: 22 },
    { header: 'VIGÊNCIA ATÉ', key: 'vigencia', width: 16 },
    { header: 'DADOS BANCÁRIOS / PIX', key: 'banco', width: 30 },
    { header: 'DIA HABITUAL DE ENTREGA', key: 'diaEntrega', width: 22 },
    { header: 'STATUS', key: 'status', width: 14 },
    { header: 'OBSERVAÇÕES', key: 'obs', width: 32 },
  ];

  // Título da aba
  wsForn.insertRow(1, ['CADASTRO GERAL DE FORNECEDORES E PRODUTORES (ALMOXARIFADO)']);
  wsForn.mergeCells('A1:O1');
  const fornTitle = wsForn.getCell('A1');
  fornTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.secondaryHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsForn.getRow(1).height = 34;

  // Subtítulo
  wsForn.insertRow(2, ['Base de dados oficial para vinculação às entradas, notas fiscais e cronogramas de entrega.']);
  wsForn.mergeCells('A2:O2');
  const fornSub = wsForn.getCell('A2');
  fornSub.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  };
  wsForn.getRow(2).height = 20;

  // Cabeçalho das colunas (Linha 3)
  const fornHeaderRow = wsForn.getRow(3);
  fornHeaderRow.height = 28;
  fornHeaderRow.eachCell((cell) => {
    cell.style = headerStyle(colors.secondaryHeader);
  });

  // Dados de Exemplo Realistas
  const fornecedoresData = [
    ['FORN-001', 'COOPERATIVA AGRICOLA FAMILIAR VALE VERDE', 'COOP VALE VERDE', '12.345.678/0001-90', 'PPAIS / Familiar', 'Hortifrúti & Legumes', '(14) 99876-1234', 'contato@valeverde.coop.br', 'Marília/SP', 'ATA-RP 012/2026', '31/12/2026', 'Banco do Brasil Ag 0123 CC 45678-9', 'Terça e Quinta', 'Ativo', 'Entrega no período matutino até as 10h'],
    ['FORN-002', 'FRIGORIFICO CENTRAL PAULISTA LTDA', 'FRIGO CENTRAL', '23.456.789/0001-01', 'Convencional', 'Carnes & Proteínas', '(14) 3456-7890', 'vendas@frigocentral.com.br', 'Bauru/SP', 'CONTRATO 045/2025', '30/06/2026', 'Bradesco Ag 4567 CC 12345-6', 'Segunda e Quarta', 'Ativo', 'Caminhão refrigerado monitorado'],
    ['FORN-003', 'DISTRIBUIDORA DE ALIMENTOS BOA MESA EIRELI', 'BOA MESA ALIMENTOS', '34.567.890/0001-12', 'Atacadista', 'Estocáveis & Secos', '(11) 3222-4455', 'comercial@boamesa.com.br', 'São Paulo/SP', 'ATA-RP 008/2026', '31/12/2026', 'Itaú Ag 7890 CC 98765-4', 'Sexta-feira', 'Ativo', 'Entrega quinzenal de itens secos'],
    ['FORN-004', 'PANIFICADORA E CONFEITARIA ESPERANCA LTDA', 'PANIF. ESPERANÇA', '45.678.901/0001-23', 'Convencional', 'Panificação & Pães', '(14) 98765-4321', 'panificadora@esperanca.com', 'Álvaro de Carvalho/SP', 'CONTRATO 018/2026', '31/12/2026', 'Caixa Ag 1234 CC 54321-0', 'Diário (Seg a Sex)', 'Ativo', 'Entrega diária às 06h30'],
    ['FORN-005', 'LATICINIOS COLINA DO SOL INDUSTRIA LTDA', 'COLINA DO SOL', '56.789.012/0001-34', 'Convencional', 'Laticínios & Derivados', '(16) 3344-5566', 'pedidos@colinadosol.ind.br', 'Araraquara/SP', 'ATA-RP 021/2026', '31/10/2026', 'Santander Ag 3210 CC 65432-1', 'Quarta-feira', 'Ativo', 'Leite pasteurizado e queijos'],
    ['FORN-006', 'PRODUTOR JOAO BATISTA DA SILVA', 'SITIO SAO JOSE', '123.456.789-00', 'PPL / Familiar', 'Hortaliças & Frutas', '(14) 99123-4567', 'joao.sitiosaojose@email.com', 'Garça/SP', 'CHAMADA PÚBLICA 002/26', '31/12/2026', 'Banco do Brasil Ag 0890 CC 22114-5', 'Terça-feira', 'Ativo', 'Alface, couve, cenoura e mandioca'],
    ['FORN-007', 'QUIMICA LIMPA FACIL PRODUTOS DE HIGIENE', 'LIMPA FACIL', '67.890.123/0001-45', 'Convencional', 'Limpeza & Descartáveis', '(11) 4004-9988', 'sac@limpafacil.com.br', 'Campinas/SP', 'ATA-RP 005/2026', '31/12/2026', 'Banco do Brasil Ag 4321 CC 88776-6', 'Última quinta do mês', 'Ativo', 'Detergentes, água sanitária e sacos'],
    ['FORN-008', 'M. S. EMBALAGENS E DESCARTAVEIS ME', 'MS EMBALAGENS', '78.901.234/0001-56', 'Convencional', 'Descartáveis & EPI', '(14) 3412-8899', 'contato@msembalagens.com.br', 'Marília/SP', 'CONTRATO 031/2025', '15/08/2026', 'Bradesco Ag 0099 CC 11223-4', 'Quinta-feira', 'Ativo', 'Luvas, toucas e potes marmita'],
  ];

  fornecedoresData.forEach((row, idx) => {
    const addedRow = wsForn.addRow(row);
    addedRow.height = 22;
    addedRow.eachCell((cell, colNumber) => {
      cell.style = cellStyle(colNumber === 1 || colNumber === 4 || colNumber === 11 || colNumber === 14 ? 'center' : 'left');
      if (idx % 2 === 0) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraLight } };
      }
    });
  });

  // =========================================================================
  // 3. ABA CADASTRO_ITENS (CATÁLOGO DE MATERIAIS E ESTOQUE AUTOMÁTICO)
  // =========================================================================
  const wsItens = workbook.addWorksheet('CADASTRO_ITENS', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { tabColor: { argb: colors.accentHeader } },
  });

  wsItens.columns = [
    { header: 'CÓD. ITEM', key: 'codItem', width: 14 },
    { header: 'CÓD. BARRAS / EAN', key: 'codBarras', width: 18 },
    { header: 'DESCRIÇÃO DO ITEM', key: 'descricao', width: 34 },
    { header: 'CATEGORIA', key: 'categoria', width: 22 },
    { header: 'UNID.', key: 'unidade', width: 10 },
    { header: 'LOCALIZAÇÃO / PRATELEIRA', key: 'local', width: 24 },
    { header: 'ESTOQUE MÍNIMO', key: 'estMin', width: 16 },
    { header: 'ESTOQUE MÁXIMO', key: 'estMax', width: 16 },
    { header: 'PREÇO UNIT. (R$)', key: 'precoUnit', width: 16 },
    { header: 'TOTAL ENTRADAS', key: 'totEntradas', width: 16 },
    { header: 'TOTAL SAÍDAS', key: 'totSaidas', width: 16 },
    { header: 'SALDO ATUAL', key: 'saldoAtual', width: 16 },
    { header: 'VALOR EM ESTOQUE (R$)', key: 'valEstoque', width: 22 },
    { header: 'STATUS DO ESTOQUE', key: 'statusEstoque', width: 24 },
    { header: 'FORNECEDOR PADRÃO', key: 'fornPadrão', width: 30 },
  ];

  // Título da aba
  wsItens.insertRow(1, ['CATÁLOGO DE ITENS E CONTROLE DE ESTOQUE AUTOMATIZADO']);
  wsItens.mergeCells('A1:O1');
  const itensTitle = wsItens.getCell('A1');
  itensTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.accentHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsItens.getRow(1).height = 34;

  // Subtítulo
  wsItens.insertRow(2, ['Saldos calculados dinamicamente via SOMASE a partir dos registros da aba MOVIMENTAÇÕES.']);
  wsItens.mergeCells('A2:O2');
  const itensSub = wsItens.getCell('A2');
  itensSub.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  };
  wsItens.getRow(2).height = 20;

  // Cabeçalho das colunas (Linha 3)
  const itensHeaderRow = wsItens.getRow(3);
  itensHeaderRow.height = 28;
  itensHeaderRow.eachCell((cell) => {
    cell.style = headerStyle(colors.accentHeader);
  });

  // Lista base de itens
  const itensBase = [
    ['IT-001', '7891000100101', 'ARROZ BRANCO TIPO 1 - PCT 5KG', 'Estocáveis & Secos', 'PCT', 'GALPÃO A - CORREDOR 1 - PALETE 01', 50, 300, 24.50, 'COOP VALE VERDE'],
    ['IT-002', '7891000100202', 'FEIJAO CARIOCA TIPO 1 - PCT 1KG', 'Estocáveis & Secos', 'PCT', 'GALPÃO A - CORREDOR 1 - PALETE 02', 40, 250, 7.80, 'DISTRIBUIDORA BOA MESA'],
    ['IT-003', '7891000100303', 'OLEO DE SOJA REFINADO 900ML', 'Estocáveis & Secos', 'UN', 'GALPÃO A - PRATELEIRA 03', 60, 400, 5.90, 'DISTRIBUIDORA BOA MESA'],
    ['IT-004', '7891000100404', 'ACUCAR CRISTAL - PCT 5KG', 'Estocáveis & Secos', 'PCT', 'GALPÃO A - CORREDOR 2 - PALETE 01', 30, 200, 16.20, 'DISTRIBUIDORA BOA MESA'],
    ['IT-005', '7891000100505', 'CAFE TORRADO E MOIDO - PCT 500G', 'Estocáveis & Secos', 'PCT', 'GALPÃO A - PRATELEIRA 04', 40, 180, 18.50, 'DISTRIBUIDORA BOA MESA'],
    ['IT-006', '7892000200102', 'CARNE BOVINA ACEM RESFRIADO', 'Carnes & Proteínas', 'KG', 'CÂMARA FRIA 01 - CARNES', 80, 500, 31.90, 'FRIGORIFICO CENTRAL PAULISTA'],
    ['IT-007', '7892000200203', 'PEITO DE FRANGO CONGELADO', 'Carnes & Proteínas', 'KG', 'CÂMARA FRIA 02 - AVES', 100, 600, 14.80, 'FRIGORIFICO CENTRAL PAULISTA'],
    ['IT-008', '7892000200304', 'SALSICHA RESFRIADA', 'Carnes & Proteínas', 'KG', 'CÂMARA FRIA 01 - CARNES', 30, 200, 11.50, 'FRIGORIFICO CENTRAL PAULISTA'],
    ['IT-009', '7893000300103', 'ALFACE CRESPA HIGIENIZADA', 'Hortifrúti & Legumes', 'KG', 'CÂMARA DE VERDURAS 03', 20, 80, 6.50, 'SITIO SAO JOSE - JOAO SILVA'],
    ['IT-010', '7893000300204', 'TOMATE LONGA VIDA', 'Hortifrúti & Legumes', 'KG', 'CÂMARA DE VERDURAS 03', 40, 150, 7.20, 'COOP VALE VERDE'],
    ['IT-011', '7893000300305', 'CENOURA COMUM EXTRA', 'Hortifrúti & Legumes', 'KG', 'CÂMARA DE VERDURAS 03', 30, 120, 4.90, 'COOP VALE VERDE'],
    ['IT-012', '7893000300406', 'BATATA INGLESA LAVADA', 'Hortifrúti & Legumes', 'KG', 'GALPÃO B - DEPOSITO SECO', 50, 250, 5.40, 'COOP VALE VERDE'],
    ['IT-013', '7894000400104', 'PAO FRANCES 50G CONGELADO/FRESCO', 'Panificação & Pães', 'KG', 'ÁREA DE PREPARO / PANIFICAÇÃO', 30, 150, 12.00, 'PANIFICADORA ESPERANCA'],
    ['IT-014', '7895000500105', 'LEITE INTEGRAL UHT 1L', 'Laticínios & Derivados', 'LT', 'GALPÃO A - PRATELEIRA 02', 80, 500, 4.85, 'LATICINIOS COLINA DO SOL'],
    ['IT-015', '7897000700107', 'DETERGENTE NEUTRO 5L CONCENTRADO', 'Limpeza & Descartáveis', 'GL', 'ALMOXARIFADO DE LIMPEZA', 15, 60, 21.00, 'QUIMICA LIMPA FACIL'],
    ['IT-016', '7897000700208', 'AGUA SANITARIA 5L (2.5% CLORO)', 'Limpeza & Descartáveis', 'GL', 'ALMOXARIFADO DE LIMPEZA', 20, 80, 14.50, 'QUIMICA LIMPA FACIL'],
    ['IT-017', '7898000800108', 'MARMITA DESCARTAVEL ALUMÍNIO 3 DIV', 'Descartáveis & EPI', 'CX', 'GALPÃO B - PRATELEIRA 05', 25, 120, 68.00, 'MS EMBALAGENS'],
    ['IT-018', '7898000800209', 'LUVA NITRILICA AZUL TAM G - CX 100', 'Descartáveis & EPI', 'CX', 'ARMARIO DE EPI 01', 10, 50, 34.00, 'MS EMBALAGENS'],
  ];

  itensBase.forEach((item, idx) => {
    const rowNum = 4 + idx;
    const row = wsItens.addRow([
      item[0], // A: Cód
      item[1], // B: Cód Barras
      item[2], // C: Descrição
      item[3], // D: Categoria
      item[4], // E: Unid
      item[5], // F: Local
      item[6], // G: Est Min
      item[7], // H: Est Max
      item[8], // I: Preço Unit
      { formula: `SUMIF(MOVIMENTAÇÕES!D:D, A${rowNum}, MOVIMENTAÇÕES!K:K)` }, // J: Tot Entradas
      { formula: `SUMIF(MOVIMENTAÇÕES!D:D, A${rowNum}, MOVIMENTAÇÕES!L:L)` }, // K: Tot Saídas
      { formula: `J${rowNum}-K${rowNum}` }, // L: Saldo Atual
      { formula: `L${rowNum}*I${rowNum}` }, // M: Valor Estoque
      { formula: `IF(L${rowNum}<=0, "🚨 ZERADO", IF(L${rowNum}<=G${rowNum}, "⚠️ BAIXO (COMPRAR)", "✅ NORMAL"))` }, // N: Status
      item[9], // O: Fornecedor Padrão
    ]);

    row.height = 22;
    row.getCell(1).style = cellStyle('center', true);
    row.getCell(2).style = cellStyle('center');
    row.getCell(3).style = cellStyle('left', true);
    row.getCell(4).style = cellStyle('left');
    row.getCell(5).style = cellStyle('center');
    row.getCell(6).style = cellStyle('left');
    row.getCell(7).style = cellStyle('right');
    row.getCell(8).style = cellStyle('right');
    row.getCell(9).style = cellStyle('right');
    row.getCell(9).numFmt = '"R$ "#,##0.00';
    row.getCell(10).style = cellStyle('right');
    row.getCell(11).style = cellStyle('right');
    row.getCell(12).style = cellStyle('right', true);
    row.getCell(13).style = cellStyle('right');
    row.getCell(13).numFmt = '"R$ "#,##0.00';
    row.getCell(14).style = cellStyle('center', true);
    row.getCell(15).style = cellStyle('left');

    if (idx % 2 === 0) {
      for (let c = 1; c <= 15; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraLight } };
      }
    }
  });

  // Linha de Totais do Catálogo
  const totalRowItens = 4 + itensBase.length;
  const totRow = wsItens.addRow([
    'TOTAL GERAL', '', '', '', '', '', '', '', '',
    { formula: `SUM(J4:J${totalRowItens - 1})` },
    { formula: `SUM(K4:K${totalRowItens - 1})` },
    { formula: `SUM(L4:L${totalRowItens - 1})` },
    { formula: `SUM(M4:M${totalRowItens - 1})` },
    '', ''
  ]);
  totRow.height = 26;
  totRow.eachCell((cell, colNumber) => {
    cell.style = {
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: colors.whiteText } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.accentHeader } },
      alignment: { vertical: 'middle', horizontal: colNumber >= 10 && colNumber <= 13 ? 'right' : 'center' },
      border: borderStyle,
    };
    if (colNumber === 13) {
      cell.numFmt = '"R$ "#,##0.00';
    }
  });

  // =========================================================================
  // 4. ABA MOVIMENTAÇÕES (ENTRADAS E SAÍDAS DO ALMOXARIFADO - SEM ANEXO DE PDF)
  // =========================================================================
  const wsMov = workbook.addWorksheet('MOVIMENTAÇÕES', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { tabColor: { argb: colors.primaryHeader } },
  });

  wsMov.columns = [
    { header: 'ID MOV.', key: 'idMov', width: 14 },
    { header: 'DATA MOV.', key: 'dataMov', width: 14 },
    { header: 'TIPO MOVIMENTO', key: 'tipoMov', width: 16 },
    { header: 'CÓD. ITEM', key: 'codItem', width: 14 },
    { header: 'DESCRIÇÃO DO ITEM', key: 'descItem', width: 34 },
    { header: 'UNID.', key: 'unidade', width: 10 },
    { header: 'Nº NOTA FISCAL / REQ.', key: 'numDoc', width: 22 },
    { header: 'FORNECEDOR / DESTINO', key: 'fornDest', width: 32 },
    { header: 'Nº DO LOTE', key: 'lote', width: 18 },
    { header: 'DATA DE VALIDADE', key: 'validade', width: 18 },
    { header: 'QTD ENTRADA', key: 'qtdEntrada', width: 16 },
    { header: 'QTD SAÍDA', key: 'qtdSaida', width: 16 },
    { header: 'PREÇO UNIT. (R$)', key: 'precoUnit', width: 16 },
    { header: 'VALOR TOTAL (R$)', key: 'valTotal', width: 18 },
    { header: 'RESPONSÁVEL / CONFERENTE', key: 'resp', width: 26 },
    { header: 'OBSERVAÇÕES DO RECEBIMENTO', key: 'obs', width: 34 },
  ];

  // Título da aba
  wsMov.insertRow(1, ['LIVRO REGISTRO DE MOVIMENTAÇÕES DE ALMOXARIFADO (ENTRADAS E SAÍDAS)']);
  wsMov.mergeCells('A1:P1');
  const movTitle = wsMov.getCell('A1');
  movTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsMov.getRow(1).height = 34;

  // Subtítulo
  wsMov.insertRow(2, ['Registro operacional contínuo. Fórmulas automáticas de descrição e unidade via PROCV. Sem necessidade de anexo PDF de notas fiscais.']);
  wsMov.mergeCells('A2:P2');
  const movSub = wsMov.getCell('A2');
  movSub.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  };
  wsMov.getRow(2).height = 20;

  // Cabeçalho das colunas (Linha 3)
  const movHeaderRow = wsMov.getRow(3);
  movHeaderRow.height = 28;
  movHeaderRow.eachCell((cell) => {
    cell.style = headerStyle(colors.primaryHeader);
  });

  // Movimentações Iniciais Realistas
  const movimentacoesData = [
    // Entradas
    ['MOV-0001', '01/09/2026', 'ENTRADA', 'IT-001', 'NF 10452', 'COOP VALE VERDE', 'LOTE-AR26-09', '01/03/2027', 150, 0, 24.50, 'Silva - Almoxarife', 'Recebido em perfeito estado, sacos limpos e lacrados'],
    ['MOV-0002', '01/09/2026', 'ENTRADA', 'IT-002', 'NF 10452', 'COOP VALE VERDE', 'LOTE-FE26-08', '15/02/2027', 120, 0, 7.80, 'Silva - Almoxarife', 'Embalagens a vácuo íntegras'],
    ['MOV-0003', '02/09/2026', 'ENTRADA', 'IT-006', 'NF 88721', 'FRIGORIFICO CENTRAL PAULISTA', 'LOTE-CAR260902', '12/09/2026', 220, 0, 31.90, 'Fabiano - Nutricionista', 'Caminhão com temp. a 2.5ºC. SIF verificado'],
    ['MOV-0004', '02/09/2026', 'ENTRADA', 'IT-007', 'NF 88721', 'FRIGORIFICO CENTRAL PAULISTA', 'LOTE-AVE260901', '30/11/2026', 300, 0, 14.80, 'Fabiano - Nutricionista', 'Congelado a -14ºC. Embalagem primária intacta'],
    ['MOV-0005', '03/09/2026', 'ENTRADA', 'IT-009', 'NF 3314', 'SITIO SAO JOSE - JOAO SILVA', 'LOTE-ALF260903', '08/09/2026', 45, 0, 6.50, 'Moutinho - Almoxarifado', 'Hortaliças frescas recém-colhidas'],
    ['MOV-0006', '03/09/2026', 'ENTRADA', 'IT-010', 'NF 10488', 'COOP VALE VERDE', 'LOTE-TOM260903', '15/09/2026', 90, 0, 7.20, 'Moutinho - Almoxarifado', 'Grau de maturação uniforme'],
    ['MOV-0007', '04/09/2026', 'ENTRADA', 'IT-014', 'NF 55210', 'LATICINIOS COLINA DO SOL', 'LOTE-LEI260830', '30/12/2026', 240, 0, 4.85, 'Silva - Almoxarife', 'Caixas com 12 unidades'],
    ['MOV-0008', '05/09/2026', 'ENTRADA', 'IT-015', 'NF 9912', 'QUIMICA LIMPA FACIL', 'LOTE-DET2608', '01/08/2028', 30, 0, 21.00, 'Costa - Segurança', 'Galões 5L lacrados com ficha FISPQ'],
    ['MOV-0009', '05/09/2026', 'ENTRADA', 'IT-017', 'NF 7741', 'MS EMBALAGENS', 'LOTE-MARM2608', '31/12/2030', 60, 0, 68.00, 'Costa - Segurança', 'Caixas de 100 unidades cada'],

    // Saídas (Consumo da Cozinha / Setores)
    ['MOV-0010', '08/09/2026', 'SAÍDA', 'IT-001', 'REQ-012/26', 'Cozinha Central - Almoço', 'LOTE-AR26-09', '01/03/2027', 0, 25, 24.50, 'Dona Maria - Cozinheira', 'Requisição diária de preparo do almoço'],
    ['MOV-0011', '08/09/2026', 'SAÍDA', 'IT-002', 'REQ-012/26', 'Cozinha Central - Almoço', 'LOTE-FE26-08', '15/02/2027', 0, 20, 7.80, 'Dona Maria - Cozinheira', 'Preparo do feijão diário'],
    ['MOV-0012', '08/09/2026', 'SAÍDA', 'IT-006', 'REQ-013/26', 'Cozinha Central - Almoço', 'LOTE-CAR260902', '12/09/2026', 0, 60, 31.90, 'Fabiano - Nutricionista', 'Carne cozida com legumes'],
    ['MOV-0013', '08/09/2026', 'SAÍDA', 'IT-009', 'REQ-014/26', 'Cozinha Central - Saladas', 'LOTE-ALF260903', '08/09/2026', 0, 15, 6.50, 'Dona Maria - Cozinheira', 'Salada do almoço e jantar'],
    ['MOV-0014', '09/09/2026', 'SAÍDA', 'IT-014', 'REQ-015/26', 'Cozinha Central - Café Manhã', 'LOTE-LEI260830', '30/12/2026', 0, 40, 4.85, 'Dona Maria - Cozinheira', 'Café da manhã dos funcionários e internos'],
    ['MOV-0015', '09/09/2026', 'SAÍDA', 'IT-015', 'REQ-016/26', 'Setor de Higienização e Limpeza', 'LOTE-DET2608', '01/08/2028', 0, 5, 21.00, 'Zeladoria Geral', 'Limpeza dos refeitórios e corredores'],
    ['MOV-0016', '10/09/2026', 'SAÍDA', 'IT-017', 'REQ-017/26', 'Setor de Montagem de Marmitas', 'LOTE-MARM2608', '31/12/2030', 0, 10, 68.00, 'Equipe de Montagem', 'Fornecimento para montagem diária'],
  ];

  movimentacoesData.forEach((mov, idx) => {
    const rowNum = 4 + idx;
    const addedRow = wsMov.addRow([
      mov[0], // A: ID Mov
      mov[1], // B: Data
      mov[2], // C: Tipo
      mov[3], // D: Cód Item
      { formula: `IFERROR(VLOOKUP(D${rowNum}, CADASTRO_ITENS!A:C, 3, FALSE), "")` }, // E: Descrição
      { formula: `IFERROR(VLOOKUP(D${rowNum}, CADASTRO_ITENS!A:E, 5, FALSE), "")` }, // F: Unidade
      mov[4], // G: Nº Doc / NF
      mov[5], // H: Fornecedor / Destino
      mov[6], // I: Lote
      mov[7], // J: Validade
      mov[8], // K: Qtd Entrada
      mov[9], // L: Qtd Saída
      mov[10], // M: Preço Unit
      { formula: `M${rowNum}*(K${rowNum}+L${rowNum})` }, // N: Valor Total
      mov[11], // O: Responsável
      mov[12], // P: Observações
    ]);

    addedRow.height = 22;
    addedRow.getCell(1).style = cellStyle('center', true);
    addedRow.getCell(2).style = cellStyle('center');
    addedRow.getCell(3).style = cellStyle('center', true);
    // Cor condicional por tipo
    if (mov[2] === 'ENTRADA') {
      addedRow.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '15803D' } };
    } else {
      addedRow.getCell(3).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'B91C1C' } };
    }
    addedRow.getCell(4).style = cellStyle('center', true);
    addedRow.getCell(5).style = cellStyle('left');
    addedRow.getCell(6).style = cellStyle('center');
    addedRow.getCell(7).style = cellStyle('center');
    addedRow.getCell(8).style = cellStyle('left');
    addedRow.getCell(9).style = cellStyle('center');
    addedRow.getCell(10).style = cellStyle('center');
    addedRow.getCell(11).style = cellStyle('right');
    addedRow.getCell(12).style = cellStyle('right');
    addedRow.getCell(13).style = cellStyle('right');
    addedRow.getCell(13).numFmt = '"R$ "#,##0.00';
    addedRow.getCell(14).style = cellStyle('right', true);
    addedRow.getCell(14).numFmt = '"R$ "#,##0.00';
    addedRow.getCell(15).style = cellStyle('left');
    addedRow.getCell(16).style = cellStyle('left');

    if (idx % 2 === 0) {
      for (let c = 1; c <= 16; c++) {
        if (!addedRow.getCell(c).fill) {
          addedRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraLight } };
        }
      }
    }
  });

  // Linha de Totais da Movimentação
  const totalRowMov = 4 + movimentacoesData.length;
  const totMovRow = wsMov.addRow([
    'TOTAL GERAL', '', '', '', '', '', '', '', '', '',
    { formula: `SUM(K4:K${totalRowMov - 1})` },
    { formula: `SUM(L4:L${totalRowMov - 1})` },
    '',
    { formula: `SUM(N4:N${totalRowMov - 1})` },
    '', ''
  ]);
  totMovRow.height = 26;
  totMovRow.eachCell((cell, colNumber) => {
    cell.style = {
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: colors.whiteText } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.primaryHeader } },
      alignment: { vertical: 'middle', horizontal: colNumber >= 11 && colNumber <= 14 ? 'right' : 'center' },
      border: borderStyle,
    };
    if (colNumber === 14) {
      cell.numFmt = '"R$ "#,##0.00';
    }
  });

  // =========================================================================
  // 5. ABA CRONOGRAMA_ENTREGAS (PLANEJAMENTO E RECEBIMENTO PROGRAMADO)
  // =========================================================================
  const wsCrono = workbook.addWorksheet('CRONOGRAMA_ENTREGAS', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { tabColor: { argb: colors.warningHeader } },
  });

  wsCrono.columns = [
    { header: 'ID AGD.', key: 'idAgd', width: 14 },
    { header: 'DATA PREVISTA', key: 'dataPrev', width: 16 },
    { header: 'DIA SEMANA', key: 'diaSemana', width: 16 },
    { header: 'TURNO / HORÁRIO', key: 'turno', width: 20 },
    { header: 'FORNECEDOR', key: 'fornecedor', width: 32 },
    { header: 'CÓD. ITEM', key: 'codItem', width: 14 },
    { header: 'DESCRIÇÃO DO ITEM', key: 'descItem', width: 34 },
    { header: 'QTD PREVISTA', key: 'qtdPrev', width: 16 },
    { header: 'QTD RECEBIDA', key: 'qtdRec', width: 16 },
    { header: 'SALDO A RECEBER', key: 'saldo', width: 18 },
    { header: 'STATUS DA ENTREGA', key: 'status', width: 22 },
    { header: 'Nº NF RECEBIDA', key: 'nfRecebida', width: 20 },
    { header: 'CONFERENTE RESPONSÁVEL', key: 'conferente', width: 26 },
    { header: 'OBSERVAÇÕES DA CARGA', key: 'obsCarga', width: 34 },
  ];

  // Título da aba
  wsCrono.insertRow(1, ['CRONOGRAMA DE ENTREGAS E RECEBIMENTO DE GÊNEROS (ALMOXARIFADO)']);
  wsCrono.mergeCells('A1:N1');
  const cronoTitle = wsCrono.getCell('A1');
  cronoTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.warningHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsCrono.getRow(1).height = 34;

  // Subtítulo
  wsCrono.insertRow(2, ['Planejamento de chegadas diárias e semanais para evitar sobrecarga de recebimento e garantir rastreabilidade.']);
  wsCrono.mergeCells('A2:N2');
  const cronoSub = wsCrono.getCell('A2');
  cronoSub.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  };
  wsCrono.getRow(2).height = 20;

  // Cabeçalho das colunas (Linha 3)
  const cronoHeaderRow = wsCrono.getRow(3);
  cronoHeaderRow.height = 28;
  cronoHeaderRow.eachCell((cell) => {
    cell.style = headerStyle(colors.warningHeader);
  });

  // Agendamentos Realistas
  const cronogramaData = [
    ['AGD-001', '15/09/2026', 'Terça-feira', 'Manhã (07h30 - 09h00)', 'COOP VALE VERDE', 'IT-001', 100, 100, 'Entregue Total', 'NF 10520', 'Silva - Almoxarife', 'Carga conferida e descarregada sem avarias'],
    ['AGD-002', '15/09/2026', 'Terça-feira', 'Manhã (09h00 - 10h30)', 'SITIO SAO JOSE - JOAO SILVA', 'IT-009', 30, 30, 'Entregue Total', 'NF 3328', 'Moutinho - Almoxarifado', 'Verduras colhidas pela manhã'],
    ['AGD-003', '16/09/2026', 'Quarta-feira', 'Manhã (08h00 - 10h00)', 'FRIGORIFICO CENTRAL PAULISTA', 'IT-006', 150, 150, 'Entregue Total', 'NF 88910', 'Fabiano - Nutricionista', 'Temperatura do caminhão aferida em 3ºC'],
    ['AGD-004', '16/09/2026', 'Quarta-feira', 'Tarde (13h30 - 15h00)', 'LATICINIOS COLINA DO SOL', 'IT-014', 180, 180, 'Entregue Total', 'NF 55420', 'Silva - Almoxarife', 'Leite com validade superior a 90 dias'],
    ['AGD-005', '21/09/2026', 'Segunda-feira', 'Manhã (07h00 - 08h30)', 'PANIFICADORA ESPERANCA', 'IT-013', 40, 40, 'Entregue Total', 'NF 1205', 'Dona Maria - Cozinha', 'Pães entregues aquecidos e frescos'],
    ['AGD-006', '22/09/2026', 'Terça-feira', 'Manhã (08h30 - 10h00)', 'COOP VALE VERDE', 'IT-010', 80, 0, 'Agendada', '', 'Aguardando', 'Caminhão com placa prevista ABC-1234'],
    ['AGD-007', '23/09/2026', 'Quarta-feira', 'Manhã (08h00 - 10h00)', 'FRIGORIFICO CENTRAL PAULISTA', 'IT-007', 200, 0, 'Agendada', '', 'Aguardando', 'Câmara fria 02 higienizada e pronta'],
    ['AGD-008', '24/09/2026', 'Quinta-feira', 'Tarde (14h00 - 16h00)', 'QUIMICA LIMPA FACIL', 'IT-015', 20, 0, 'Agendada', '', 'Aguardando', 'Descarregamento exclusivo no depósito externo'],
    ['AGD-009', '25/09/2026', 'Sexta-feira', 'Manhã (09h00 - 11h00)', 'DISTRIBUIDORA BOA MESA', 'IT-003', 120, 0, 'Agendada', '', 'Aguardando', 'Remessa programada de óleo de soja'],
  ];

  cronogramaData.forEach((crono, idx) => {
    const rowNum = 4 + idx;
    const addedRow = wsCrono.addRow([
      crono[0], // A: ID
      crono[1], // B: Data
      crono[2], // C: Dia Semana
      crono[3], // D: Turno
      crono[4], // E: Fornecedor
      crono[5], // F: Cód Item
      { formula: `IFERROR(VLOOKUP(F${rowNum}, CADASTRO_ITENS!A:C, 3, FALSE), "")` }, // G: Descrição
      crono[6], // H: Qtd Prevista
      crono[7], // I: Qtd Recebida
      { formula: `H${rowNum}-I${rowNum}` }, // J: Saldo
      crono[8], // K: Status
      crono[9], // L: NF Recebida
      crono[10], // M: Conferente
      crono[11], // N: Observações
    ]);

    addedRow.height = 22;
    addedRow.getCell(1).style = cellStyle('center', true);
    addedRow.getCell(2).style = cellStyle('center');
    addedRow.getCell(3).style = cellStyle('center');
    addedRow.getCell(4).style = cellStyle('left');
    addedRow.getCell(5).style = cellStyle('left');
    addedRow.getCell(6).style = cellStyle('center', true);
    addedRow.getCell(7).style = cellStyle('left');
    addedRow.getCell(8).style = cellStyle('right');
    addedRow.getCell(9).style = cellStyle('right');
    addedRow.getCell(10).style = cellStyle('right', true);
    addedRow.getCell(11).style = cellStyle('center', true);
    if (crono[8] === 'Entregue Total') {
      addedRow.getCell(11).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: '15803D' } };
    } else {
      addedRow.getCell(11).font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'D97706' } };
    }
    addedRow.getCell(12).style = cellStyle('center');
    addedRow.getCell(13).style = cellStyle('left');
    addedRow.getCell(14).style = cellStyle('left');

    if (idx % 2 === 0) {
      for (let c = 1; c <= 14; c++) {
        addedRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraLight } };
      }
    }
  });

  // =========================================================================
  // 6. ABA IMPRESSÃO_ETIQUETAS (MODELO VISUAL PRONTO PARA IMPRESSÃO A4)
  // =========================================================================
  const wsEtq = workbook.addWorksheet('IMPRESSÃO_ETIQUETAS', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: '4338CA' } },
    pageSetup: {
      paperSize: 9, // A4
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.1, footer: 0.1 },
    },
  });

  wsEtq.columns = [
    { width: 4 },  // A (Margem)
    // Etiqueta Coluna 1 (B, C, D, E)
    { width: 14 }, // B
    { width: 14 }, // C
    { width: 14 }, // D
    { width: 14 }, // E
    { width: 3 },  // F (Espaçamento entre etiquetas)
    // Etiqueta Coluna 2 (G, H, I, J)
    { width: 14 }, // G
    { width: 14 }, // H
    { width: 14 }, // I
    { width: 14 }, // J
  ];

  // Cabeçalho da Folha de Etiquetas
  wsEtq.mergeCells('B2:J2');
  const etqHeader = wsEtq.getCell('B2');
  etqHeader.value = '🏷️ CENTRAL DE IMPRESSÃO DE ETIQUETAS DO ALMOXARIFADO';
  etqHeader.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsEtq.getRow(2).height = 36;

  // Painel de Controle / Seleção Rápida
  wsEtq.mergeCells('B3:J3');
  const etqHelp = wsEtq.getCell('B3');
  etqHelp.value = 'Como Usar: Digite o Código do Item na célula de controle abaixo para carregar automaticamente ou utilize os modelos pré-configurados prontos para impressão (Ctrl + P).';
  etqHelp.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsEtq.getRow(3).height = 24;

  // Célula de Seletor Dinâmico
  wsEtq.getCell('B4').value = 'SELECIONE O CÓDIGO DO ITEM:';
  wsEtq.getCell('B4').style = {
    font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: '4338CA' } },
    alignment: { vertical: 'middle', horizontal: 'right' },
  };
  wsEtq.mergeCells('C4:D4');
  const seletorItem = wsEtq.getCell('C4');
  seletorItem.value = 'IT-001';
  seletorItem.style = {
    font: { name: 'Segoe UI', size: 12, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E1B4B' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: borderStyle,
  };

  wsEtq.getCell('E4').value = 'DESCRIÇÃO:';
  wsEtq.getCell('E4').style = {
    font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: '475569' } },
    alignment: { vertical: 'middle', horizontal: 'right' },
  };
  wsEtq.mergeCells('F4:J4');
  const seletorDesc = wsEtq.getCell('F4');
  seletorDesc.value = { formula: 'IFERROR(VLOOKUP(C4, CADASTRO_ITENS!A:C, 3, FALSE), "ITEM NÃO ENCONTRADO")' };
  seletorDesc.style = {
    font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: '1E3A8A' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E7FF' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
    border: borderStyle,
  };
  wsEtq.getRow(4).height = 28;

  // Função auxiliar para desenhar uma etiqueta padronizada bonita
  const drawLabel = (startRow, startCol, labelData) => {
    const colLetters = startCol === 'B' ? ['B', 'C', 'D', 'E'] : ['G', 'H', 'I', 'J'];
    const [c1, c2, c3, c4] = colLetters;

    const thickBorder = {
      top: { style: 'medium', color: { argb: '1E293B' } },
      left: { style: 'medium', color: { argb: '1E293B' } },
      bottom: { style: 'medium', color: { argb: '1E293B' } },
      right: { style: 'medium', color: { argb: '1E293B' } },
    };

    // Linha 1 do bloco: Topo da Etiqueta
    wsEtq.mergeCells(`${c1}${startRow}:${c4}${startRow}`);
    const topCell = wsEtq.getCell(`${c1}${startRow}`);
    topCell.value = 'ALMOXARIFADO CENTRAL • CONTROLE DE QUALIDADE';
    topCell.style = {
      font: { name: 'Segoe UI', size: 8, bold: true, color: { argb: colors.whiteText } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E293B' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: thickBorder,
    };
    wsEtq.getRow(startRow).height = 20;

    // Linha 2 do bloco: Nome do Produto em Destaque
    wsEtq.mergeCells(`${c1}${startRow + 1}:${c4}${startRow + 1}`);
    const nameCell = wsEtq.getCell(`${c1}${startRow + 1}`);
    nameCell.value = labelData.name;
    nameCell.style = {
      font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: '0F172A' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F8FAFC' } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: thickBorder,
    };
    wsEtq.getRow(startRow + 1).height = 30;

    // Linha 3 do bloco: Código e Categoria
    wsEtq.mergeCells(`${c1}${startRow + 2}:${c2}${startRow + 2}`);
    wsEtq.getCell(`${c1}${startRow + 2}`).value = `CÓD: ${labelData.cod}`;
    wsEtq.getCell(`${c1}${startRow + 2}`).style = {
      font: { name: 'Segoe UI', size: 9, bold: true },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: borderStyle,
    };

    wsEtq.mergeCells(`${c3}${startRow + 2}:${c4}${startRow + 2}`);
    wsEtq.getCell(`${c3}${startRow + 2}`).value = `UNID: ${labelData.unid}`;
    wsEtq.getCell(`${c3}${startRow + 2}`).style = {
      font: { name: 'Segoe UI', size: 9, bold: true },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: borderStyle,
    };
    wsEtq.getRow(startRow + 2).height = 18;

    // Linha 4 do bloco: Lote e Entrada
    wsEtq.mergeCells(`${c1}${startRow + 3}:${c2}${startRow + 3}`);
    wsEtq.getCell(`${c1}${startRow + 3}`).value = `LOTE: ${labelData.lote}`;
    wsEtq.getCell(`${c1}${startRow + 3}`).style = {
      font: { name: 'Segoe UI', size: 9, bold: true },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: borderStyle,
    };

    wsEtq.mergeCells(`${c3}${startRow + 3}:${c4}${startRow + 3}`);
    wsEtq.getCell(`${c3}${startRow + 3}`).value = `ENTRADA: ${labelData.entrada}`;
    wsEtq.getCell(`${c3}${startRow + 3}`).style = {
      font: { name: 'Segoe UI', size: 9 },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: borderStyle,
    };
    wsEtq.getRow(startRow + 3).height = 18;

    // Linha 5 do bloco: VALIDADE (DESTAQUE MÁXIMO)
    wsEtq.mergeCells(`${c1}${startRow + 4}:${c4}${startRow + 4}`);
    const valCell = wsEtq.getCell(`${c1}${startRow + 4}`);
    valCell.value = `VALIDADE: ${labelData.validade}`;
    valCell.style = {
      font: { name: 'Segoe UI', size: 12, bold: true, color: { argb: colors.dangerHeader } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF2F2' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: thickBorder,
    };
    wsEtq.getRow(startRow + 4).height = 24;

    // Linha 6 do bloco: Simulação de Código de Barras / EAN
    wsEtq.mergeCells(`${c1}${startRow + 5}:${c4}${startRow + 5}`);
    const barCell = wsEtq.getCell(`${c1}${startRow + 5}`);
    barCell.value = `|||| ||||| |||| |||||||| ||||||| ${labelData.ean}`;
    barCell.style = {
      font: { name: 'Courier New', size: 9, bold: true, color: { argb: '1E293B' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF' } },
      border: borderStyle,
    };
    wsEtq.getRow(startRow + 5).height = 20;

    // Linha 7 do bloco: Origem / Fornecedor e Responsável
    wsEtq.mergeCells(`${c1}${startRow + 6}:${c4}${startRow + 6}`);
    const rodCell = wsEtq.getCell(`${c1}${startRow + 6}`);
    rodCell.value = `FORN: ${labelData.forn} | CONF: ${labelData.conf}`;
    rodCell.style = {
      font: { name: 'Segoe UI', size: 8, italic: true, color: { argb: '475569' } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: thickBorder,
    };
    wsEtq.getRow(startRow + 6).height = 18;
  };

  // 6 Etiquetas em Grade 2 x 3 para Folha A4
  const labels = [
    { name: 'ARROZ BRANCO TIPO 1 - PCT 5KG', cod: 'IT-001', unid: 'PCT 5KG', lote: 'LOTE-AR26-09', entrada: '01/09/2026', validade: '01/03/2027', ean: '7891000100101', forn: 'COOP VALE VERDE', conf: 'Silva' },
    { name: 'FEIJAO CARIOCA TIPO 1 - PCT 1KG', cod: 'IT-002', unid: 'PCT 1KG', lote: 'LOTE-FE26-08', entrada: '01/09/2026', validade: '15/02/2027', ean: '7891000100202', forn: 'COOP VALE VERDE', conf: 'Silva' },
    { name: 'CARNE BOVINA ACEM RESFRIADO', cod: 'IT-006', unid: 'KG', lote: 'LOTE-CAR260902', entrada: '02/09/2026', validade: '12/09/2026', ean: '7892000200102', forn: 'FRIGO CENTRAL', conf: 'Fabiano' },
    { name: 'PEITO DE FRANGO CONGELADO', cod: 'IT-007', unid: 'KG', lote: 'LOTE-AVE260901', entrada: '02/09/2026', validade: '30/11/2026', ean: '7892000200203', forn: 'FRIGO CENTRAL', conf: 'Fabiano' },
    { name: 'LEITE INTEGRAL UHT 1L', cod: 'IT-014', unid: 'LT', lote: 'LOTE-LEI260830', entrada: '04/09/2026', validade: '30/12/2026', ean: '7895000500105', forn: 'COLINA DO SOL', conf: 'Silva' },
    { name: 'DETERGENTE NEUTRO 5L CONCENTRADO', cod: 'IT-015', unid: 'GL 5L', lote: 'LOTE-DET2608', entrada: '05/09/2026', validade: '01/08/2028', ean: '7897000700107', forn: 'LIMPA FACIL', conf: 'Costa' },
  ];

  // Renderizar 3 linhas de 2 etiquetas cada
  let curRow = 6;
  for (let i = 0; i < labels.length; i += 2) {
    drawLabel(curRow, 'B', labels[i]);
    if (labels[i + 1]) {
      drawLabel(curRow, 'G', labels[i + 1]);
    }
    curRow += 8; // Avança para o próximo bloco de etiquetas
  }

  // =========================================================================
  // 7. ABA CONTROLE_VALIDADES (RASTREAMENTO DE LOTES & PREVENÇÃO DE PERDAS)
  // =========================================================================
  const wsVal = workbook.addWorksheet('CONTROLE_VALIDADES', {
    views: [{ showGridLines: true, state: 'frozen', xSplit: 0, ySplit: 3 }],
    properties: { tabColor: { argb: colors.dangerHeader } },
  });

  wsVal.columns = [
    { header: 'CÓD. ITEM', key: 'codItem', width: 14 },
    { header: 'DESCRIÇÃO DO ITEM', key: 'descItem', width: 34 },
    { header: 'Nº DO LOTE', key: 'lote', width: 18 },
    { header: 'FORNECEDOR', key: 'fornecedor', width: 30 },
    { header: 'LOCAL DE ARMAZENAGEM', key: 'local', width: 26 },
    { header: 'DATA ENTRADA', key: 'dataEntrada', width: 16 },
    { header: 'DATA VALIDADE', key: 'dataValidade', width: 16 },
    { header: 'QTD DO LOTE', key: 'qtdLote', width: 16 },
    { header: 'DIAS RESTANTES', key: 'diasRest', width: 16 },
    { header: 'CLASSIFICAÇÃO DE RISCO', key: 'statusRisco', width: 26 },
    { header: 'AÇÃO RECOMENDADA', key: 'acao', width: 32 },
  ];

  // Título da aba
  wsVal.insertRow(1, ['PAINEL DE CONTROLE DE VALIDADES E RASTREABILIDADE DE LOTES']);
  wsVal.mergeCells('A1:K1');
  const valTitle = wsVal.getCell('A1');
  valTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.dangerHeader } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsVal.getRow(1).height = 34;

  // Subtítulo
  wsVal.insertRow(2, ['Cálculo automático de dias para vencer baseado na data atual. Alertas automáticos para evitar perdas e desperdícios.']);
  wsVal.mergeCells('A2:K2');
  const valSub = wsVal.getCell('A2');
  valSub.style = {
    font: { name: 'Segoe UI', size: 9, italic: true, color: { argb: '475569' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F1F5F9' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
  };
  wsVal.getRow(2).height = 20;

  // Cabeçalho das colunas (Linha 3)
  const valHeaderRow = wsVal.getRow(3);
  valHeaderRow.height = 28;
  valHeaderRow.eachCell((cell) => {
    cell.style = headerStyle(colors.dangerHeader);
  });

  const lotesData = [
    ['IT-009', 'LOTE-ALF260903', 'SITIO SAO JOSE', 'CÂMARA DE VERDURAS 03', '03/09/2026', '28/09/2026', 30, 'Consumo imediato na salada do almoço'],
    ['IT-010', 'LOTE-TOM260903', 'COOP VALE VERDE', 'CÂMARA DE VERDURAS 03', '03/09/2026', '05/10/2026', 90, 'Distribuir prioritariamente nos próximos 7 dias'],
    ['IT-006', 'LOTE-CAR260902', 'FRIGO CENTRAL', 'CÂMARA FRIA 01', '02/09/2026', '10/10/2026', 160, 'Utilizar no cardápio da semana corrente'],
    ['IT-007', 'LOTE-AVE260901', 'FRIGO CENTRAL', 'CÂMARA FRIA 02', '02/09/2026', '30/11/2026', 300, 'Estoque seguro congelado. Seguir rotação PEPS'],
    ['IT-014', 'LOTE-LEI260830', 'COLINA DO SOL', 'GALPÃO A - PRAT 02', '04/09/2026', '30/12/2026', 200, 'Consumo programado conforme cardápio matutino'],
    ['IT-002', 'LOTE-FE26-08', 'COOP VALE VERDE', 'GALPÃO A - PALETE 02', '01/09/2026', '15/02/2027', 100, 'Gênero seco estocado adequadamente em paletes'],
    ['IT-001', 'LOTE-AR26-09', 'COOP VALE VERDE', 'GALPÃO A - PALETE 01', '01/09/2026', '01/03/2027', 125, 'Gênero seco com amplo prazo de conservação'],
    ['IT-015', 'LOTE-DET2608', 'QUIMICA LIMPA FACIL', 'ALMOXARIFADO LIMPEZA', '05/09/2026', '01/08/2028', 25, 'Material de limpeza e saneantes'],
  ];

  lotesData.forEach((lote, idx) => {
    const rowNum = 4 + idx;
    const addedRow = wsVal.addRow([
      lote[0], // A: Cód Item
      { formula: `IFERROR(VLOOKUP(A${rowNum}, CADASTRO_ITENS!A:C, 3, FALSE), "")` }, // B: Descrição
      lote[1], // C: Lote
      lote[2], // D: Fornecedor
      lote[3], // E: Local
      lote[4], // F: Data Entrada
      lote[5], // G: Data Validade
      lote[6], // H: Qtd
      { formula: `DATEVALUE(G${rowNum}) - TODAY()` }, // I: Dias Restantes
      { formula: `IF(I${rowNum}<0, "⛔ VENCIDO", IF(I${rowNum}<=15, "🚨 CRÍTICO (≤15d)", IF(I${rowNum}<=30, "⚠️ ALERTA (≤30d)", IF(I${rowNum}<=60, "🟡 ATENÇÃO (≤60d)", "🟢 OK (REGULAR)"))))` }, // J: Classificação
      lote[7], // K: Ação Recomendada
    ]);

    addedRow.height = 22;
    addedRow.getCell(1).style = cellStyle('center', true);
    addedRow.getCell(2).style = cellStyle('left', true);
    addedRow.getCell(3).style = cellStyle('center', true);
    addedRow.getCell(4).style = cellStyle('left');
    addedRow.getCell(5).style = cellStyle('left');
    addedRow.getCell(6).style = cellStyle('center');
    addedRow.getCell(7).style = cellStyle('center', true);
    addedRow.getCell(8).style = cellStyle('right');
    addedRow.getCell(9).style = cellStyle('center', true);
    addedRow.getCell(10).style = cellStyle('center', true);
    addedRow.getCell(11).style = cellStyle('left');

    if (idx % 2 === 0) {
      for (let c = 1; c <= 11; c++) {
        addedRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.zebraLight } };
      }
    }
  });

  // =========================================================================
  // 8. ABA INSTRUÇÕES_USO (MANUAL COMPLETO DO USUÁRIO)
  // =========================================================================
  const wsInst = workbook.addWorksheet('INSTRUÇÕES_USO', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: '334155' } },
  });

  wsInst.columns = [
    { width: 4 },  // A
    { width: 28 }, // B
    { width: 75 }, // C
  ];

  // Título do Manual
  wsInst.mergeCells('B2:C2');
  const instTitle = wsInst.getCell('B2');
  instTitle.value = '📖 MANUAL DE OPERAÇÃO E GUIA DE FUNCIONAMENTO DO ALMOXARIFADO';
  instTitle.style = {
    font: { name: 'Segoe UI', size: 14, bold: true, color: { argb: colors.whiteText } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: '334155' } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  };
  wsInst.getRow(2).height = 36;

  const instrucoes = [
    ['1. OBJETIVO DA PLANILHA', 'Esta planilha foi desenvolvida sob medida para gerenciar todas as operações essenciais do almoxarifado de forma independente no Excel, LibreOffice ou Google Planilhas. Contém fórmulas automáticas para evitar digitação duplicada e simplificar o dia a dia.'],
    ['2. CADASTRO DE FORNECEDORES', 'Aba "FORNECEDORES": Cadastre todos os produtores da agricultura familiar (PPAIS/PPL), atacadistas e distribuidores convencionais com seus respectivos dados bancários, telefones e termos contratuais.'],
    ['3. CADASTRO DE ITENS', 'Aba "CADASTRO_ITENS": Insira o código único do item (ex: IT-001), descrição e ponto de estoque mínimo. Não altere as colunas "Total Entradas", "Total Saídas", "Saldo Atual" e "Status", pois são calculadas automaticamente com a fórmula SOMASE.'],
    ['4. LANÇAMENTO DE MOVIMENTAÇÕES', 'Aba "MOVIMENTAÇÕES": Cada vez que uma mercadoria entrar ou sair, crie uma linha indicando o Tipo (ENTRADA ou SAÍDA) e o Código do Item. A descrição e a unidade de medida são preenchidas automaticamente via PROCV. O número da Nota Fiscal é registrado em campo textual limpo, sem necessidade de carregar anexos em PDF.'],
    ['5. CRONOGRAMA DE ENTREGAS', 'Aba "CRONOGRAMA_ENTREGAS": Utilize esta aba para planejar os dias e horários de chegada de fornecedores. Ao receber a mercadoria, informe a Quantidade Recebida para apurar o saldo restante e atualizar o status.'],
    ['6. IMPRESSÃO DE ETIQUETAS', 'Aba "IMPRESSÃO_ETIQUETAS": Aba configurada para impressão direta em papel A4 comum ou formulário adesivo (Pressione Ctrl + P). Os blocos já contêm layout pronto de rastreabilidade (Item, Lote, Entrada, Validade e Código de Barras).'],
    ['7. CONTROLE DE VALIDADES & PEPS', 'Aba "CONTROLE_VALIDADES": Registre os lotes recebidos para monitorar o prazo de validade em dias com alertas visuais. Pratique sempre a regra PEPS (Primeiro que Entra, Primeiro que Sai) para evitar desperdícios.'],
    ['8. SEM ANEXO DE PDF DE NF', 'Conforme solicitado, o sistema não exige nem contém botões para upload ou anexo de arquivos PDF de notas fiscais, mantendo a planilha leve, rápida e compatível com qualquer computador ou servidor.'],
  ];

  instrucoes.forEach((inst, idx) => {
    const rowNum = 4 + idx;
    wsInst.getCell(`B${rowNum}`).value = inst[0];
    wsInst.getCell(`B${rowNum}`).style = {
      font: { name: 'Segoe UI', size: 11, bold: true, color: { argb: colors.primaryHeader } },
      alignment: { vertical: 'top', horizontal: 'left' },
      border: borderStyle,
      fill: { type: 'pattern', pattern: 'solid', fgColor: 'F1F5F9' },
    };

    wsInst.getCell(`C${rowNum}`).value = inst[1];
    wsInst.getCell(`C${rowNum}`).style = {
      font: { name: 'Segoe UI', size: 10, color: { argb: colors.darkText } },
      alignment: { vertical: 'middle', horizontal: 'left', wrapText: true },
      border: borderStyle,
      fill: { type: 'pattern', pattern: 'solid', fgColor: idx % 2 === 0 ? colors.zebraLight : 'FFFFFF' },
    };
    wsInst.getRow(rowNum).height = 34;
  });

  // Salvar em public/ e na raiz para acesso direto
  const publicDir = path.resolve('public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const publicFilePath = path.join(publicDir, 'Planilha_Gestao_Almoxarifado_Completa.xlsx');
  const rootFilePath = path.resolve('Planilha_Gestao_Almoxarifado_Completa.xlsx');

  await workbook.xlsx.writeFile(publicFilePath);
  await workbook.xlsx.writeFile(rootFilePath);

  console.log(`✅ Planilha Excel gerada com sucesso!`);
  console.log(`📁 Arquivo salvo em: ${publicFilePath}`);
  console.log(`📁 Arquivo salvo em: ${rootFilePath}`);
}

generateWarehouseExcel().catch((err) => {
  console.error('Erro gerando planilha:', err);
  process.exit(1);
});
