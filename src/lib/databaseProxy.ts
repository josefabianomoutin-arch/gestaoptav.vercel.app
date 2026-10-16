
/**
 * Database Proxy para Servidor Interno
 * Fornece métodos compatíveis com a sintaxe do Firebase Database SDK, 
 * realizando chamadas HTTP para o servidor local com alta resiliência.
 */

async function apiCall(method: string, endpoint: string, body?: any) {
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body !== undefined) options.body = JSON.stringify(body);
  
  const res = await fetch(endpoint, options);
  if (!res.ok) throw new Error(`Erro na API Local: ${res.status}`);
  const text = await res.text();
  if (!text || text.trim() === '') return { success: true };
  try {
    return JSON.parse(text);
  } catch {
    return { success: true };
  }
}

export const localDatabase = {
  get: async (path: string) => {
    try {
      const res = await fetch(`/api/db?path=${encodeURIComponent(path)}`);
      if (!res.ok) return { val: () => null, exists: () => false };
      const text = await res.text();
      if (!text || text.trim() === '') {
        return { val: () => null, exists: () => false };
      }
      const val = JSON.parse(text);
      return {
        val: () => val,
        exists: () => val !== null && val !== undefined
      };
    } catch {
      return { val: () => null, exists: () => false };
    }
  },
  
  set: async (path: string, data: any) => {
    return apiCall('POST', '/api/db/set', { path, data });
  },
  
  update: async (path: string, data: any) => {
    return apiCall('POST', '/api/db/update', { path, data });
  },
  
  push: async (path: string, data: any) => {
    return apiCall('POST', '/api/db/push', { path, data });
  },
  
  remove: async (path: string) => {
    return apiCall('POST', '/api/db/set', { path, data: null });
  }
};

export const isInternalServer = () => {
  // O servidor full-stack Express (server.ts) está sempre ativo provendo a API /api/db com db.json
  return true;
};
