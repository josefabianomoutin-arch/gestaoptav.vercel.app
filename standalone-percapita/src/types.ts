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
    lotNumber?: string;
    expirationDate?: string;
    isOpened?: boolean;
    barcode?: string;
    receiptTermNumber?: string;
    nl?: string;
    pd?: string;
    ne?: string;
    arrivalTime?: string;
    exitTime?: string;
    lots?: LotInfo[];
    observations?: string;
}

export interface ContractItem {
    id?: string;
    name: string;
    totalKg: number;
    valuePerKg: number;
    monthlyWeight?: number;
    monthlyValue?: number;
    unit?: string;
    period?: '1_QUAD' | '2_3_QUAD' | string;
    category?: string;
    comprasCode?: string;
    becCode?: string;
    commitmentNumber?: string;
    commitmentValue?: number;
}

export interface Supplier {
    name: string;
    cpf: string;
    initialValue: number;
    contractItems: ContractItem[];
    deliveries: any;
    allowedWeeks: number[];
    monthlySchedule?: Record<string, number[]>;
    address?: string;
    city?: string;
    processNumber?: string;
    observations?: string;
    [key: string]: any;
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
    neNumber?: string;
    ne?: string;
    value?: number;
    totalValue?: number;
    weight?: number;
    invoiceUrl?: string;
    lotId?: string;
    deliveryId?: string;
}

export interface PerCapitaConfig {
    ppaisProducers?: PerCapitaSupplier[];
    pereciveisSuppliers?: PerCapitaSupplier[];
    estocaveisSuppliers?: PerCapitaSupplier[];
    pereciveisSuppliers1Q?: PerCapitaSupplier[];
    pereciveisSuppliers2Q?: PerCapitaSupplier[];
    pereciveisSuppliers3Q?: PerCapitaSupplier[];
    estocaveisSuppliers1Q?: PerCapitaSupplier[];
    estocaveisSuppliers2Q?: PerCapitaSupplier[];
    estocaveisSuppliers3Q?: PerCapitaSupplier[];
    pereciveisSuppliers2027_1Q?: PerCapitaSupplier[];
    pereciveisSuppliers2027_2Q?: PerCapitaSupplier[];
    pereciveisSuppliers2027_3Q?: PerCapitaSupplier[];
    estocaveisSuppliers2027_1Q?: PerCapitaSupplier[];
    estocaveisSuppliers2027_2Q?: PerCapitaSupplier[];
    estocaveisSuppliers2027_3Q?: PerCapitaSupplier[];
    contractsByYearQuadrimestre?: Record<string, PerCapitaSupplier[]>;
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
    cpf?: string;
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

export interface AcquisitionItem {
    id: string;
    name: string;
    category?: string;
    unit?: string;
    perCapitaAdulto?: number;
    perCapitaCrianca?: number;
    frequency?: string;
    comprasCode?: string;
    becCode?: string;
    assignments?: {
        supplierCpf: string;
        totalKg: number;
        valuePerKg: number;
        unit?: string;
        category?: string;
        comprasCode?: string;
        becCode?: string;
        commitmentNumber?: string;
        commitmentValue?: number;
    }[];
}

export interface DirectorItem {
    name: string;
    quantity: number;
    expirationDate?: string;
    totalValue?: number;
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
