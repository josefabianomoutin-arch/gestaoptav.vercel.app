import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function roundToTwoDecimalPlaces(value: number) {
  return Math.floor(value * 100) / 100;
}
