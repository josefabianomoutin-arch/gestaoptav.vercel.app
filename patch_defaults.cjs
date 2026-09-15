const fs = require('fs');

const data = `import { EnergyAccountingRecord, EnergyBillItem, EnergySubmeterCompany } from '../types';

export const DEFAULT_ENERGY_ITEMS_AGO_26: EnergyBillItem[] = [
  { id: 'item-1', code: '', description: 'Consumo Ponta [KWh] - TUSD AGO/26', billedQuantity: 5286.5280, unit: 'kWh', tariffAneel: 0.16416000, tariffWithTaxes: 0.17438100, totalOperationValue: 921.87, basePisCofins: 921.87, pis: 9.50, cofins: 44.53, isForaPontaEnergy: false },
  { id: 'item-2', code: '', description: 'Consumo Fora Ponta [KWh]-TUSD AGO/26', billedQuantity: 61667.5680, unit: 'kWh', tariffAneel: 0.16416000, tariffWithTaxes: 0.17437854, totalOperationValue: 10753.50, basePisCofins: 10753.50, pis: 110.76, cofins: 519.39, isForaPontaEnergy: true },
  { id: 'item-3', code: '', description: 'Cons Ponta - TE AGO/26', billedQuantity: 5286.5280, unit: 'kWh', tariffAneel: 0.43188000, tariffWithTaxes: 0.45876424, totalOperationValue: 2425.27, basePisCofins: 2425.27, pis: 24.98, cofins: 117.14, isForaPontaEnergy: false },
  { id: 'item-4', code: '', description: 'Cons FPonta TE AGO/26', billedQuantity: 61667.5680, unit: 'kWh', tariffAneel: 0.27282000, tariffWithTaxes: 0.28980258, totalOperationValue: 17871.42, basePisCofins: 17871.42, pis: 184.08, cofins: 863.19, isForaPontaEnergy: false },
  { id: 'item-5', code: '', description: 'Adicional Band Amarela Ponta AGO/26', billedQuantity: 1, unit: 'kWh', tariffWithTaxes: 105.85, totalOperationValue: 105.85, basePisCofins: 105.85, pis: 1.09, cofins: 5.11, isForaPontaEnergy: false },
  { id: 'item-6', code: '', description: 'Adicional Band Amarela FPonta AGO/26', billedQuantity: 1, unit: 'kWh', tariffWithTaxes: 1234.79, totalOperationValue: 1234.79, basePisCofins: 1234.79, pis: 12.72, cofins: 59.64, isForaPontaEnergy: false },
  { id: 'item-7', code: '', description: 'Consumo Reativo Exc Ponta AGO/26', billedQuantity: 153.5869, unit: 'kWh', tariffAneel: 0.29020000, tariffWithTaxes: 0.30829453, totalOperationValue: 47.35, basePisCofins: 47.35, pis: 0.49, cofins: 2.29, isForaPontaEnergy: false },
  { id: 'item-8', code: '', description: 'Consumo Reativo Exc Fora Ponta AGO/26', billedQuantity: 892.4948, unit: 'kWh', tariffAneel: 0.29020000, tariffWithTaxes: 0.30825950, totalOperationValue: 275.12, basePisCofins: 275.12, pis: 2.83, cofins: 13.29, isForaPontaEnergy: true },
  { id: 'item-9', code: '', description: 'Demanda Ponta [kW] - TUSD AGO/26', billedQuantity: 12.6000, unit: 'kW', tariffAneel: 48.90000000, tariffWithTaxes: 51.94365080, totalOperationValue: 654.49, basePisCofins: 654.49, pis: 6.74, cofins: 31.61, isForaPontaEnergy: false },
  { id: 'item-10', code: '', description: 'Demanda Ponta [kW] - TUSD AGO/26', billedQuantity: 104.4000, unit: 'kW', tariffAneel: 48.90000000, tariffWithTaxes: 51.9436552, totalOperationValue: 5422.95, basePisCofins: 5422.95, pis: 55.86, cofins: 261.93, isForaPontaEnergy: false },
  { id: 'item-11', code: '', description: 'Demanda F Ponta [kW] -TUSD AGO/26', billedQuantity: 186.4800, unit: 'kW', tariffAneel: 16.53000000, tariffWithTaxes: 17.55893394, totalOperationValue: 3274.39, basePisCofins: 3274.39, pis: 33.73, cofins: 158.15, isForaPontaEnergy: true }
];

export const DEFAULT_ENERGY_COMPANIES_AGO_26: EnergySubmeterCompany[] = [
  {
    id: 'comp-1',
    cnpj: '57.770.813/0001-88',
    companyName: 'ONETECH SERVICE LTDA',
    address: 'Via Fabiano Zacarelli, nº 18, Ande, CEP: 15.715-015',
    meterId: 'Pavilhão 01',
    referenceMonth: 'ago/26',
    previousReading: 20,
    currentReading: 38.3,
    unit: 'kWh',
    monthlyConsumption: 18.3,
    baseTotalKWh: 62746.5428,
    amountToPay: 0,
    status: 'PAGO',
    readingDate: '2026-09-01',
    nextReadingDate: '2026-10-01',
    notes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva.',
  },
  {
    id: 'comp-2',
    cnpj: '27.799.277/0001-82',
    companyName: 'BIFON & BIFON PALHEIROS E DERIVADOS',
    address: 'Rua Antônio Alves de Toledo, nº 897, bairro: Centro, CEP: 14.701-110',
    meterId: 'Pavilhão 02',
    referenceMonth: 'ago/26',
    previousReading: 0,
    currentReading: 87.9,
    unit: 'kWh',
    monthlyConsumption: 87.9,
    baseTotalKWh: 62746.5428,
    amountToPay: 0,
    status: 'PENDENTE',
    readingDate: '2026-09-01',
    nextReadingDate: '2026-10-01',
    notes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva.',
  },
  {
    id: 'comp-3',
    cnpj: '08.343.492/0005-53',
    companyName: 'MRV ENGENHARIA E PARTICIPAÇÕES',
    address: 'Av. Presidente Vargas, nº 2035, bairro: Jardim América, CEP: 14.020-260',
    meterId: 'Pavilhão 03',
    referenceMonth: 'ago/26',
    previousReading: 0,
    currentReading: 158,
    unit: 'kWh',
    monthlyConsumption: 158,
    baseTotalKWh: 62746.5428,
    amountToPay: 0,
    status: 'PENDENTE',
    readingDate: '2026-09-01',
    nextReadingDate: '2026-10-01',
    notes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba / Unidade de Taiuva.',
  }
];

export const DEFAULT_ENERGY_RECORD_AGO_26: EnergyAccountingRecord = {
  id: 'ago-26',
  referenceMonth: 'ago/26',
  year: 2026,
  month: 8,
  items: DEFAULT_ENERGY_ITEMS_AGO_26,
  subtotal: 42987.00,
  totalDistribuidora: 42987.00,
  cipMunicipal: 0,
  totalDevolucoesAjustes: 0,
  irrfConsumo: -403.62,
  irrfDemanda: -448.89,
  totalRetencoes: -852.51,
  totalAPagar: 42134.49,
  valorConsolidado: 42134.49,
  somaKWhForaPonta: 62746.5428,
  custoMedioPorKWh: 0.68508953,
  pisPercentage: 1.03,
  cofinsPercentage: 4.83,
  basePisCofins: 42987.00,
  pisTotal: 442.78,
  cofinsTotal: 2076.27,
  companies: DEFAULT_ENERGY_COMPANIES_AGO_26,
  generalNotes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba.',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

export function recalculateEnergyRecord(record: EnergyAccountingRecord): EnergyAccountingRecord {
  // Recalculate bill items
  const updatedItems = record.items.map(item => {
    let total = item.totalOperationValue;
    if (item.billedQuantity > 0 && item.tariffWithTaxes > 0 && !item.description.includes('Adicional Band') && !item.description.includes('Adicional Band. Amarela')) {
      total = Number((item.billedQuantity * item.tariffWithTaxes).toFixed(2));
    }

    const basePis = item.basePisCofins !== undefined ? item.basePisCofins : total;
    const pis = Number((basePis * (record.pisPercentage / 100)).toFixed(2));
    const cofins = Number((basePis * (record.cofinsPercentage / 100)).toFixed(2));

    return {
      ...item,
      totalOperationValue: total,
      baseIcms: item.baseIcms,
      basePisCofins: basePis,
      pis: item.pis !== undefined ? item.pis : pis,
      cofins: item.cofins !== undefined ? item.cofins : cofins
    };
  });

  // Calculate Subtotal (sum of operations)
  const subtotal = Number(updatedItems.reduce((acc, it) => acc + (it.totalOperationValue || 0), 0).toFixed(2));
  const totalDistribuidora = subtotal;
  const totalDevolucoesAjustes = Number((record.cipMunicipal || 0).toFixed(2));
  const totalRetencoes = Number(((record.irrfConsumo || 0) + (record.irrfDemanda || 0)).toFixed(2));
  
  const totalAPagar = Number((subtotal + totalDevolucoesAjustes + totalRetencoes).toFixed(2));
  const valorConsolidado = totalAPagar;

  // Calculate somaKWhForaPonta (sum of billedQuantity of items with isForaPontaEnergy = true)
  const calculatedSomaForaPonta = updatedItems
    .filter(it => it.isForaPontaEnergy)
    .reduce((acc, it) => acc + (Number(it.billedQuantity) || 0), 0);
  
  const somaKWhForaPonta = record.somaKWhForaPonta > 0 ? record.somaKWhForaPonta : Number(calculatedSomaForaPonta.toFixed(4));
  
  // Rate per kWh = totalDistribuidora / somaKWhForaPonta
  const custoMedioPorKWh = somaKWhForaPonta > 0 ? (totalDistribuidora / somaKWhForaPonta) : 0;

  // Base PIS/COFINS sum
  const basePisCofins = Number(updatedItems.reduce((acc, it) => acc + (it.basePisCofins || 0), 0).toFixed(2));
  const pisTotal = Number(updatedItems.reduce((acc, it) => acc + (it.pis || 0), 0).toFixed(2));
  const cofinsTotal = Number(updatedItems.reduce((acc, it) => acc + (it.cofins || 0), 0).toFixed(2));

  // Recalculate companies
  const updatedCompanies = (record.companies || []).map(comp => {
    const monthlyConsumption = Number((Math.max(0, comp.currentReading - comp.previousReading)).toFixed(2));
    const amountToPay = Number((monthlyConsumption * custoMedioPorKWh).toFixed(2));
    
    return {
      ...comp,
      monthlyConsumption,
      baseTotalKWh: somaKWhForaPonta,
      amountToPay
    };
  });

  return {
    ...record,
    items: updatedItems,
    subtotal,
    totalDistribuidora,
    totalDevolucoesAjustes,
    totalRetencoes,
    totalAPagar,
    valorConsolidado,
    somaKWhForaPonta,
    custoMedioPorKWh,
    basePisCofins,
    pisTotal,
    cofinsTotal,
    companies: updatedCompanies,
    updatedAt: new Date().toISOString()
  };
}
`;

fs.writeFileSync('src/data/energyAccountingDefaults.ts', data);
