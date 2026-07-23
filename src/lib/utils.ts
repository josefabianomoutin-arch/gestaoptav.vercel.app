import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeLocalStorageSetItem(key: string, value: string): boolean {
  let processedValue = value;

  const robustCompare = (a: any, b: any): number => {
    const timeA = typeof a.timestamp === 'number' ? a.timestamp : (a.timestamp ? Number(a.timestamp) : (a.date ? new Date(a.date).getTime() : 0));
    const timeB = typeof b.timestamp === 'number' ? b.timestamp : (b.timestamp ? Number(b.timestamp) : (b.date ? new Date(b.date).getTime() : 0));
    
    if (!isNaN(timeA) && !isNaN(timeB) && timeA !== 0 && timeB !== 0) {
      return timeB - timeA; // Descending (newest first)
    }
    
    const dateA = String(a.date || a.timestamp || '');
    const dateB = String(b.date || b.timestamp || '');
    return (dateB || '').localeCompare(dateA || '');
  };

  try {
    if (key === 'cached_warehouseLog') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          const sorted = [...parsed].sort(robustCompare);
          processedValue = JSON.stringify(sorted.slice(0, 300));
        }
      } catch (err) {
        console.warn("Failed to prune cached_warehouseLog:", err);
      }
    } else if (key === 'cached_suppliers') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
          // 1. First, limit the number of suppliers themselves to 200 to prevent quota issues
          const limitedSuppliers = parsed.slice(0, 200);

          // 2. Then, prune deliveries for each of these suppliers
          const trimmed = limitedSuppliers.map((sup: any) => {
            if (sup && Array.isArray(sup.deliveries)) {
              const sortedDeliveries = [...sup.deliveries].sort((a: any, b: any) => {
                const dA = String(a.date || '');
                const dB = String(b.date || '');
                return (dB || '').localeCompare(dA || '');
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
              // 1. Limit the number of suppliers themselves to 100 to prevent quota issues
              const limitedSuppliers = parsed[listKey].slice(0, 100);

              // 2. Prune deliveries for each of these suppliers
              parsed[listKey] = limitedSuppliers.map((sup: any) => {
                if (sup && Array.isArray(sup.deliveries)) {
                  const sortedDeliveries = [...sup.deliveries].sort((a: any, b: any) => {
                    const dA = String(a.date || '');
                    const dB = String(b.date || '');
                    return (dB || '').localeCompare(dA || '');
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
          const sorted = [...parsed].sort(robustCompare);
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
  return Math.round((value + Number.EPSILON) * 100) / 100;
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

export const normalizeText = (str: string): string => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
};

export const getMatchScore = (requestedName: string, logName: string): number => {
  const reqNorm = normalizeText(requestedName);
  const logNorm = normalizeText(logName);
  if (!reqNorm || !logNorm) return 0;

  // Exact match gets score 100
  if (reqNorm === logNorm) return 100;

  const reqWords = reqNorm.split(' ').filter(Boolean);
  const logWords = logNorm.split(' ').filter(Boolean);

  if (reqWords.length === 0 || logWords.length === 0) return 0;

  const reqFirstTwo = reqWords.slice(0, 2).join(' ');
  const logFirstTwo = logWords.slice(0, 2).join(' ');
  if (reqFirstTwo && logFirstTwo && reqFirstTwo === logFirstTwo) return 90;

  if (logNorm.includes(reqNorm)) return 85;
  if (reqNorm.includes(logNorm)) return 80;

  if (reqWords[0] === logWords[0]) return 50;

  const reqFirstWordChars = reqWords[0].slice(0, 4);
  const logFirstWordChars = logWords[0].slice(0, 4);
  if (reqFirstWordChars && logFirstWordChars && reqFirstWordChars === logFirstWordChars) return 40;

  const sharedWords = reqWords.filter(w => logWords.includes(w));
  if (sharedWords.length > 0) {
    return 20 + sharedWords.length;
  }

  return 0;
};

export const getPrintableLotDetails = (itemName: string, warehouseLog?: any[]) => {
  if (!itemName || !itemName.trim() || !warehouseLog || warehouseLog.length === 0) return null;

  const reqNorm = normalizeText(itemName);
  if (!reqNorm) return null;

  const candidates: Array<{ log: any; score: number; index: number }> = [];

  warehouseLog.forEach((log: any, idx: number) => {
    if (!log) return;
    const logItemName = log.itemName || log.item || '';
    if (!logItemName) return;

    const score = getMatchScore(itemName, logItemName);
    if (score >= 35) {
      candidates.push({ log, score, index: idx });
    }
  });

  if (candidates.length === 0) return null;

  // Filter only 'entrada' (inbound) logs if any exist
  const entradas = candidates.filter(c => c.log.type === 'entrada');
  const pool = entradas.length > 0 ? entradas : candidates;

  // Find maximum match score in the pool
  const maxScore = Math.max(...pool.map(c => c.score));

  // CRITICAL FIX: If exact match (score 100) exists, ONLY use exact matches!
  const topCandidates = pool.filter(c => maxScore === 100 ? c.score === 100 : c.score >= Math.max(80, maxScore - 5));

  if (topCandidates.length === 0) return null;

  // Parse arrival date/time for sorting latest arrival first
  const getLogTime = (item: { log: any; index: number }) => {
    const l = item.log;
    if (typeof l.timestamp === 'number' && l.timestamp > 0) return l.timestamp;
    if (l.timestamp && !isNaN(Number(l.timestamp))) return Number(l.timestamp);
    if (l.createdAt) {
      const t = typeof l.createdAt === 'number' ? l.createdAt : new Date(l.createdAt).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    if (l.date && typeof l.date === 'string') {
      let dStr = l.date.trim();
      if (dStr.includes('/')) {
        const parts = dStr.split('/');
        if (parts.length === 3) dStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      const t = new Date(dStr).getTime();
      if (!isNaN(t) && t > 0) return t;
    }
    return item.index;
  };

  // Sort by arrival time DESCENDING (latest arrival / último a chegar first)
  topCandidates.sort((a, b) => {
    const timeA = getLogTime(a);
    const timeB = getLogTime(b);
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return b.index - a.index;
  });

  return topCandidates[0].log;
};

export const generateStandardLabelStyles = () => `
  @page { size: 100mm 50mm; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff; color: #000;
    -webkit-print-color-adjust: exact;
  }
  .label-card {
    width: 100mm; height: 50mm;
    padding: 2.5mm 3.5mm; box-sizing: border-box;
    display: flex; flex-direction: column;
    justify-content: space-between;
    border: 1px solid #ccc;
    page-break-after: always;
    background: #fff;
  }
  .label-card:last-child {
    page-break-after: avoid;
  }
  .header-row {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 4px; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 2px;
  }
  .item-title {
    font-size: 11pt; line-height: 1.15; font-weight: 900;
    text-transform: uppercase; color: #000; margin: 0;
    max-height: 2.3em; overflow: hidden;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    word-break: break-word; flex-grow: 1;
  }
  .tag-badge {
    background-color: #000; color: #fff;
    padding: 1.5px 5px; font-size: 6.5pt; font-weight: 900;
    border-radius: 2px; text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
  }
  .destaque-box {
    display: flex; align-items: center; justify-content: space-around;
    border: 1.5px solid #000; background-color: #f8f9fa;
    border-radius: 3px; padding: 2px 4px; margin: 1.5px 0;
  }
  .destaque-col {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .destaque-label {
    font-size: 6pt; font-weight: 900; text-transform: uppercase; color: #333; letter-spacing: 0.5px;
  }
  .destaque-val {
    font-size: 10pt; font-weight: 900; text-transform: uppercase; color: #000; line-height: 1.1;
  }
  .destaque-divider {
    width: 1.5px; height: 18px; background-color: #000;
  }
  .info-body {
    font-size: 7.5pt; line-height: 1.25; color: #111;
  }
  .info-line {
    margin: 1px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .info-line strong {
    font-weight: 900; color: #000; text-transform: uppercase;
  }
  .barcode-container {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    margin-top: auto; padding-top: 1px;
  }
  .barcode-svg {
    max-width: 95%; height: 14mm !important;
  }
`;

