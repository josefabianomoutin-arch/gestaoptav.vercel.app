import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function ensureArray<T>(item: any): T[] {
  if (Array.isArray(item)) return item;
  if (!item) return [];
  if (typeof item === 'object') {
    return Object.values(item) as T[];
  }
  return [item] as T[];
}

export function roundToTwoDecimalPlaces(val: number): number {
  if (isNaN(val)) return 0;
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`localStorage set failed for key ${key}:`, e);
    return false;
  }
}
