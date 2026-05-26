import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  let processedValue = value;

  try {
    if (key === 'cached_warehouseLog') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort((a: any, b: any) => {
            const dateA = a.timestamp || a.date || '';
            const dateB = b.timestamp || b.date || '';
            return dateB.localeCompare(dateA);
          });
          processedValue = JSON.stringify(sorted.slice(0, 300));
        }
      } catch (err) {
        console.warn("Failed to prune cached_warehouseLog:", err);
      }
    } else if (key === 'cached_suppliers') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const trimmed = parsed.map((sup: any) => {
            if (sup && Array.isArray(sup.deliveries)) {
              const sortedDeliveries = [...sup.deliveries].sort((a: any, b: any) => {
                const dA = a.date || '';
                const dB = b.date || '';
                return dB.localeCompare(dA);
              });
              return {
                ...sup,
                deliveries: sortedDeliveries.slice(0, 50)
              };
            }
            return sup;
          });
          processedValue = JSON.stringify(trimmed);
        }
      } catch (err) {
        console.warn("Failed to prune cached_suppliers:", err);
      }
    } else if (key === 'cached_perCapitaConfig') {
      try {
        const parsed = JSON.parse(value);
        if (parsed && typeof parsed === 'object') {
          const lists: ('ppaisProducers' | 'pereciveisSuppliers' | 'estocaveisSuppliers')[] = [
            'ppaisProducers',
            'pereciveisSuppliers',
            'estocaveisSuppliers'
          ];
          lists.forEach((listKey) => {
            if (Array.isArray(parsed[listKey])) {
              parsed[listKey] = parsed[listKey].map((sup: any) => {
                if (sup && Array.isArray(sup.deliveries)) {
                  const sortedDeliveries = [...sup.deliveries].sort((a: any, b: any) => {
                    const dA = a.date || '';
                    const dB = b.date || '';
                    return dB.localeCompare(dA);
                  });
                  return {
                    ...sup,
                    deliveries: sortedDeliveries.slice(0, 50)
                  };
                }
                return sup;
              });
            }
          });
          processedValue = JSON.stringify(parsed);
        }
      } catch (err) {
        console.warn("Failed to prune cached_perCapitaConfig:", err);
      }
    } else if (key === 'cached_thirdPartyEntries') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort((a: any, b: any) => {
            const dateA = a.timestamp || a.date || '';
            const dateB = b.timestamp || b.date || '';
            return dateB.localeCompare(dateA);
          });
          processedValue = JSON.stringify(sorted.slice(0, 200));
        }
      } catch (err) {
        console.warn("Failed to prune cached_thirdPartyEntries:", err);
      }
    }

    localStorage.setItem(key, processedValue);
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
        localStorage.setItem(key, processedValue);
        console.log(`Successfully recovered and saved key "${key}" after clearing other cached collections.`);
        return true;
      } catch (retryError) {
        console.warn(`Failed to recoup quota even after clearing other caches for key "${key}":`, retryError);
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
