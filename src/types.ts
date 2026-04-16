export interface Delivery {
  id: string;
  invoiceId: string;
  itemId: string;
  itemName: string;
  kg: number;
  value: number; // Total value for this delivery item
  lotId?: string;
}

export interface Invoice {
  id: string;
  number: string;
  date: string; // ISO format or similar for sorting
  supplierId: string;
  supplierName: string;
  deliveries: Delivery[];
  totalValue: number;
}

export interface ContractItem {
  id: string;
  name: string;
  valuePerKg: number;
}
