
export interface LotInfo {
    number: string;
    expirationDate: string;
    lotNumber?: string;
    remainingQuantity?: number;
}

export interface Delivery {
    id: string;
    date: string;
    time: string;
    item: string;
    kg: number;
    value: number;
    itemId?: string;
    itemName?: string;
    invoiceUploaded: boolean;
    invoiceNumber?: string;
    invoiceUrl?: string;
    invoiceDate?: string;
    isOpened?: boolean;
    barcode?: string;
    receiptTermNumber?: string;
    nl?: string;
    pd?: string;
    arrivalTime?: string;
    lots?: LotInfo[];
}

export interface ContractItem {
    id?: string;
    name: string;
    totalKg: number;
    valuePerKg: number;
    unit?: string;
    period?: '1_QUAD' | '2_3_QUAD' | string;
    category?: string;
    comprasCode?: string;
    becCode?: string;
    commitmentNumber?: string;
    commitmentValue?: string;
}

export interface Supplier {
    name: string;
    cpf: string;
    initialValue: number;
    contractItems: ContractItem[];
    deliveries: any; // flexible to allow array methods or object access as seen in current code
    allowedWeeks: number[];
    address?: string;
    city?: string;
    processNumber?: string;
    observations?: string;
}

export interface WarehouseMovement {
    id: string;
    date: string;
    timestamp: number;
    type: 'entrada' | 'saida' | 'saída';
    item: string;
    kg: number;
    supplierName: string;
    supplierCpf: string;
    invoiceNumber?: string;
    lotNumber?: string;
    expirationDate?: string;
    responsible?: string;
    itemName?: string;
    inboundInvoice?: string;
    outboundInvoice?: string;
    quantity?: number;
    barcode?: string;
    nlNumber?: string;
    pdNumber?: string;
    value?: number;
    weight?: number;
}

export interface PerCapitaConfig {
    ppaisProducers?: PerCapitaSupplier[];
    pereciveisSuppliers?: PerCapitaSupplier[];
    estocaveisSuppliers?: PerCapitaSupplier[];
    inmateCount?: number;
    staffCount?: number;
    customValues?: Record<string, any>;
    seiProcessNumbers?: Record<string, string>;
    seiProcessDefinitions?: Record<string, string>;
    monthlyQuota?: Record<string, number>;
    monthlyResource?: Record<string, number>;
    ptresResources?: Record<string, any>;
    monthlyAdvances?: Record<string, number>;
}

export interface PerCapitaSupplier {
    id: string;
    name: string;
    cpfCnpj: string;
    address?: string;
    city?: string;
    processNumber?: string;
    monthlySchedule?: Record<string, number[]>;
    deliveries?: Delivery[];
    contractItems?: ContractItem[];
    contractNumber?: string;
    representativeName?: string;
    representativeCpf?: string;
}

export interface CleaningLog {
    id: string;
    date: string;
    area?: string;
    responsible: string;
    shift?: string;
    observations?: string;
    location?: string;
    maintenanceDetails?: string;
    type?: string;
    serviceProcessId?: string;
    partsProcessId?: string;
    numeroProcesso?: string;
}

export interface DirectorPerCapitaLog {
    id: string;
    date: string;
    month: string;
    week: string;
    recipient: string;
    items: DirectorItem[];
    totalValue: number;
}

export interface MenuRow {
    id?: string;
    item?: string;
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
    contractedItem?: string;
    unitWeight?: any;
    totalWeight?: any;
    foodItem?: string;
    preparationDetails?: string;
    period?: string;
    description?: string;
}

export interface StandardMenu {
    [key: string]: MenuRow[];
}

export interface DailyMenus {
    [date: string]: {
        breakfast?: string;
        lunch?: string;
        dinner?: string;
        snack?: string;
    } | any;
}

export interface FinancialRecord {
    id: string;
    date: string;
    description: string;
    value: number;
    type: 'receita' | 'despesa' | 'entrada' | 'saida';
    category: string;
    natureza?: string;
    tipo?: 'CUSTO FIXO' | 'CUSTO VARIÁVEL' | 'RECEITA' | string;
    valorRecebido?: number;
    valorUtilizado?: number;
    valorSolicitado?: number;
    status?: string;
    dataRecebimento?: string;
    dataPagamento?: string;
    numeroProcesso?: string;
    descricao?: string;
    numeroEmpenho?: string;
    notaCredito?: string;
    dataFinalizacaoProcesso?: string;
    modalidade?: string;
    adiantado?: any;
    ptres?: string;
    favorecido?: string;
    data?: string;
    dataSolicitacao?: string;
    selecao?: any;
    justificativa?: string;
    localUtilizado?: string;
}

export interface ThirdPartyEntryLog {
    id: string;
    date: string;
    time: string;
    companyName: string;
    companyCnpj: string;
    driverName?: string;
    vehiclePlate?: string;
    status: 'agendado' | 'concluido' | 'cancelado';
    arrivalTime?: string;
    locations?: string[] | string;
    photo?: string;
    vehicle?: string;
    plate?: string;
    serviceExecutionNumber?: string;
    contractNumber?: string;
    serviceDetails?: string;
    receiptTermDate?: string;
    monitoringResponsible?: string;
    pestControlResponsible?: string;
    exitTime?: string;
    observations?: string;
    idNumber?: string;
}

export interface AcquisitionItem {
    id: string;
    name: string;
    unit: string;
    category: string;
    supplierName?: string;
    comprasCode?: string;
    becCode?: string;
    acquiredQuantity: number;
    contractAddendum?: number;
    unitValue: number;
    unitValue23?: number; // Valor para 2º e 3º quadrimestre
    stockBalance?: number;
    contractItemName?: string;
    expenseNature?: string;
    nickname?: string;
}

export interface VehicleExitOrder {
    id: string;
    date: string;
    time?: string;
    vehicleId?: string;
    driverId?: string;
    destination: string;
    kmOut?: number;
    kmIn?: number;
    status: 'aberta' | 'concluida';
    exitTime?: string;
    returnTime?: string;
    plate?: string;
    validationRole?: string;
    exitDate?: string;
    returnDate?: string;
    pdfUrl?: string;
    responsibleServer?: string;
    serverRole?: string;
    fctNumber?: string;
    companions?: any[];
    observations?: string;
    checklist?: Record<string, boolean>;
    validatedBy?: string;
    validationTimestamp?: string;
    assetNumber?: string;
    vehicle?: string;
}

export interface VehicleAsset {
    id: string;
    name?: string;
    plate: string;
    model: string;
    brand?: string;
    assetNumber?: string;
}

export interface DriverAsset {
    id: string;
    name: string;
    licenseNumber?: string;
    role?: string;
    cnhCategory?: string;
    isFitToDrive?: boolean;
}

export interface DailyAllowance {
    id: string;
    date: string;
    staffId: string;
    value: number;
}

export interface Staff {
    id: string;
    name: string;
    role: string;
}

export interface ValidationRole {
    id: string;
    name?: string;
    permissions?: string[];
    roleName?: string;
    responsibleName?: string;
    password?: string;
}

export interface VehicleInspection {
    id: string;
    date: string;
    vehicleId: string;
    inspector: string;
    items: Record<string, boolean>;
    driverId?: string;
    type?: string;
    breakdownDescription?: string;
    lightingIssues?: string[];
    lightingDescription?: string;
    fluidIssues?: string[];
    fluidDescription?: string;
    mechanicIssues?: string[];
    mechanicDescription?: string;
    wheelIssues?: string[];
    wheelDescription?: string;
    damageIssues?: string[];
    damageDescription?: string;
}

export interface ServiceOrder {
    id: string;
    date?: string;
    requester: string;
    description: string;
    status: 'pendente' | 'em_andamento' | 'concluida' | 'concluido' | 'cancelado';
    requestingSector?: string;
    projectStage?: string;
    priority?: string;
    createdAt?: string;
    location?: string;
    inspectionObservations?: string;
    serviceType?: string;
    category?: string;
    updatedAt?: string;
}

export interface MaintenanceSchedule {
    id: string;
    vehicleId?: string;
    date: string;
    description: string;
    status: 'agendado' | 'concluido' | 'cancelado' | 'em_andamento' | 'concluida';
    time?: string;
    location?: string;
    accompanyingPerson?: string;
    toolsNeeded?: string;
    tools?: any[];
    ppls?: any[];
    toolsStatus?: string;
    validatedByChief?: boolean;
    validatedByDirector?: boolean;
    validatedByChiefAt?: string;
    validatedByDirectorAt?: string;
    exitAuthorizationUrl?: string;
    serviceOrderId?: string;
    entryAuthorizedAt?: string;
    entryAuthorizedBy?: string;
    returnAuthorizedAt?: string;
    returnAuthorizedBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface PublicInfo {
    id: string;
    title: string;
    content: string;
    date: string;
    sector?: string;
    updatedAt?: string;
}

export interface DirectorItem {
    id?: string;
    name: string;
    quantity: number;
    unitPrice?: number;
    unit?: string;
    totalValue?: number;
    expirationDate?: string;
}

export type UserRole = 'admin' | 'almoxarifado' | 'itesp' | 'financeiro' | 'cardapio' | 'subportaria' | 'infraestrutura' | 'ordem_saida' | 'julio' | 'producer' | 'pereciveis_supplier' | 'supplier' | 'ordem_servico';

