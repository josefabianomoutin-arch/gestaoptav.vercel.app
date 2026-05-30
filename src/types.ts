export interface DirectorPerCapitaRow {
  ref: number;
  itemName: string; // Shows first two words
  itemFullName: string; // Holds the original full string
  quantity: string;
  observations: string;
}

export interface InventoryItem {
  id: string;
  name: string; // Complete name for list view/autocomplete
  category: 'alimentacao' | 'limpeza';
  stockQty: number;
  unit: string;
  expirationDate: string; // ISO date string or DD/MM/YYYY
  lote: string; // Added batch field
  isActivePerCapita: boolean;
}

export type DirectorType = 'chefeDep' | 'chefeSeg';

export interface DirectorConfig {
  id: DirectorType;
  name: string;
  role: string;
  avatar: string;
}
