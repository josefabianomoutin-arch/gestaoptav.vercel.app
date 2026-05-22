import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundToTwoDecimalPlaces(value: number) {
  return Math.floor(value * 100) / 100;
}

export function ensureArray<T>(data: T[] | Record<string, T> | undefined | null): T[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data.map((item: any, idx: number) => {
      if (item && typeof item === 'object' && !item.id) {
        return { ...item, id: `arr-idx-${idx}` };
      }
      return item;
    }) as T[];
  }
  if (typeof data === 'object') {
    return Object.entries(data).map(([key, value]: [string, any]) => {
      if (value && typeof value === 'object') {
        if (!value.id) {
          return { ...value, id: key };
        }
      }
      return value;
    }) as T[];
  }
  return [];
}
