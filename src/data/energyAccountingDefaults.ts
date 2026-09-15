import { EnergyAccountingRecord, EnergyBillItem, EnergySubmeterCompany } from '../types';

export const DEFAULT_ENERGY_ITEMS_AGO_26: EnergyBillItem[] = [
  {
    id: 'item-1',
    code: '605',
    description: 'Consumo Ponta [KWh] - TUSD',
    registeredQuantity: 6927.6,
    billedQuantity: 6927.6,
    unit: 'KWh',
    tariffWithTaxes: 0.17437786,
    totalOperationValue: 1208.02,
    baseIcms: 1208.02,
    basePisCofins: 1208.02,
    pis: 12.44,
    cofins: 58.35,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-2',
    code: '605',
    description: 'Consumo Fora Ponta [KWh]-TUSD',
    registeredQuantity: 65514,
    billedQuantity: 65514,
    unit: 'KWh',
    tariffWithTaxes: 0.17437861,
    totalOperationValue: 11424.24,
    baseIcms: 11424.24,
    basePisCofins: 11424.24,
    pis: 117.67,
    cofins: 551.79,
    isForaPontaEnergy: true,
  },
  {
    id: 'item-3',
    code: '601',
    description: 'Cons Ponta - TE',
    registeredQuantity: 6927.6,
    billedQuantity: 6927.6,
    unit: 'KWh',
    tariffWithTaxes: 0.45876206,
    totalOperationValue: 3178.12,
    baseIcms: 3178.12,
    basePisCofins: 3178.12,
    pis: 32.73,
    cofins: 153.50,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-4',
    code: '601',
    description: 'Cons FPonta TE',
    registeredQuantity: 65514,
    billedQuantity: 65514,
    unit: 'KWh',
    tariffWithTaxes: 0.28980249,
    totalOperationValue: 18986.12,
    baseIcms: 18986.12,
    basePisCofins: 18986.12,
    pis: 195.56,
    cofins: 917.03,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-5',
    code: '',
    description: 'Adicional Band. Amarela Ponta',
    billedQuantity: 1,
    unit: 'UN',
    tariffWithTaxes: 138.72,
    totalOperationValue: 138.72,
    baseIcms: 138.72,
    basePisCofins: 138.72,
    pis: 1.43,
    cofins: 6.70,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-6',
    code: '',
    description: 'Adicional Band. Amarela F/Ponta',
    billedQuantity: 1,
    unit: 'UN',
    tariffWithTaxes: 1311.81,
    totalOperationValue: 1311.81,
    baseIcms: 1311.81,
    basePisCofins: 1311.81,
    pis: 13.51,
    cofins: 63.36,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-7',
    code: '601',
    description: 'Consumo Reativo Exc Fora Ponta',
    registeredQuantity: 13.0137,
    billedQuantity: 13.0137,
    unit: 'KWh',
    tariffWithTaxes: 0.30813681,
    totalOperationValue: 4.01,
    baseIcms: 4.01,
    basePisCofins: 4.01,
    pis: 0.04,
    cofins: 0.19,
    isForaPontaEnergy: true,
  },
  {
    id: 'item-8',
    code: '602',
    description: 'Demanda Ponta [kW] - TUSD',
    registeredQuantity: 133.68,
    billedQuantity: 133.68,
    unit: 'KW',
    tariffWithTaxes: 51.94389588,
    totalOperationValue: 6943.86,
    baseIcms: 6943.86,
    basePisCofins: 6943.86,
    pis: 71.52,
    cofins: 335.39,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-9',
    code: '602',
    description: 'Demanda Ponta [kW] - TUSD',
    billedQuantity: 3.36,
    unit: 'KW',
    tariffWithTaxes: 17.55952381,
    totalOperationValue: 59.00,
    baseIcms: 59.00,
    basePisCofins: 59.00,
    pis: 0.61,
    cofins: 2.85,
    isForaPontaEnergy: false,
  },
  {
    id: 'item-10',
    code: '602',
    description: 'Demanda F Ponta [kW] - TUSD',
    registeredQuantity: 158.64,
    billedQuantity: 158.64,
    unit: 'KW',
    tariffWithTaxes: 17.55893846,
    totalOperationValue: 2785.55,
    baseIcms: 2785.55,
    basePisCofins: 2785.55,
    pis: 28.69,
    cofins: 134.54,
    isForaPontaEnergy: true,
  },
  {
    id: 'item-11',
    code: '602',
    description: 'Demanda Ultrap FPonta -TUSD',
    billedQuantity: 13.68,
    unit: 'KW',
    tariffWithTaxes: 103.8874269,
    totalOperationValue: 1421.18,
    baseIcms: 1421.18,
    basePisCofins: 1421.18,
    pis: 14.64,
    cofins: 68.64,
    isForaPontaEnergy: true,
  },
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
    baseTotalKWh: 65699.3337,
    amountToPay: 13.22,
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
    baseTotalKWh: 65699.3337,
    amountToPay: 63.50,
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
    baseTotalKWh: 65699.3337,
    amountToPay: 114.14,
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
  subtotal: 47460.63,
  totalDistribuidora: 47460.63,
  cipMunicipal: 31.29,
  totalDevolucoesAjustes: 31.29,
  irrfConsumo: -435.02,
  irrfDemanda: -538.06,
  totalRetencoes: -973.08,
  totalAPagar: 46518.84,
  valorConsolidado: 46518.84,
  somaKWhForaPonta: 65699.3337,
  custoMedioPorKWh: 0.722391341,
  pisPercentage: 1.03,
  cofinsPercentage: 4.83,
  basePisCofins: 46010.10,
  pisTotal: 473.90,
  cofinsTotal: 2222.29,
  companies: DEFAULT_ENERGY_COMPANIES_AGO_26,
  generalNotes: 'Referente a cobrança da utilização de energia eletrica no pavilhao de trabalho do Centro de Progressão Penitenciária de Guariba. Leitura Anterior 2,1 kwh, Leitura Atual 3,6 Kwh, Consumo do Mês 1,5 kwh.',
  updatedAt: new Date().toISOString(),
  createdAt: new Date().toISOString()
};

export function recalculateEnergyRecord(record: EnergyAccountingRecord): EnergyAccountingRecord {
  // Recalculate bill items
  const updatedItems = record.items.map(item => {
    let total = item.totalOperationValue;
    if (item.billedQuantity > 0 && item.tariffWithTaxes > 0 && item.description !== 'Adicional Band. Amarela Ponta' && item.description !== 'Adicional Band. Amarela F/Ponta') {
      total = Number((item.billedQuantity * item.tariffWithTaxes).toFixed(2));
    }
    const basePis = item.basePisCofins !== undefined ? item.basePisCofins : total;
    const pis = Number((basePis * (record.pisPercentage / 100)).toFixed(2));
    const cofins = Number((basePis * (record.cofinsPercentage / 100)).toFixed(2));

    return {
      ...item,
      totalOperationValue: total,
      baseIcms: item.baseIcms !== undefined ? item.baseIcms : total,
      basePisCofins: basePis,
      pis,
      cofins
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
