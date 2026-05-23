import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e: any) {
    console.warn(`Local storage quota exceeded or failed to save for key "${key}":`, e);
    // Try to free up space if we got a quota overflow or a standard failure
    if (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014) {
      try {
        const cacheKeys = [
          'cached_suppliers',
          'cached_warehouseLog',
          'cached_perCapitaConfig',
          'cached_thirdPartyEntries',
          'cached_acquisitionItems',
          'cached_standardMenu',
          'cached_dailyMenus',
          'cached_publicInfo'
        ];
        
        // Remove other cached keys to reclaim quota
        cacheKeys.forEach(k => {
          if (k !== key) {
            localStorage.removeItem(k);
          }
        });
        
        // Retry the setItem call once
        localStorage.setItem(key, value);
        console.log(`Successfully recovered and saved key "${key}" after clearing other cached collections.`);
        return true;
      } catch (retryError) {
        console.error(`Failed to recoup quota even after clearing other caches for key "${key}":`, retryError);
      }
    }
    return false;
  }
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
