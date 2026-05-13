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
  if (Array.isArray(data)) return data;
  if (typeof data === 'object') return Object.values(data);
  return [];
}
