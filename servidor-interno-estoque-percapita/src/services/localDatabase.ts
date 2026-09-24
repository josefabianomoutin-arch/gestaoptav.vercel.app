/**
 * Serviço de Conexão com o Banco de Dados Local do Servidor Interno Fechado
 * Opera 100% offline via API REST local embutida no Express (sem necessidade de internet ou Firebase)
 */

export interface ServerStatus {
  status: string;
  mode: string;
  nodeVersion: string;
  uptimeSeconds: number;
  memoryUsageMB: number;
  localIPs: { iface: string; ip: string }[];
  collections: string[];
  timestamp: string;
}

const API_BASE = ''; // Relativo ao mesmo host/porta do servidor

export const localDatabase = {
  /**
   * Obtém os dados completos de uma coleção
   */
  async getCollection<T = any>(collectionName: string): Promise<T | null> {
    try {
      const res = await fetch(`${API_BASE}/api/data/${collectionName}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.data as T;
    } catch (err: any) {
      console.warn(`[LocalDB] Falha ao carregar coleção '${collectionName}':`, err.message);
      // Fallback para cache local no localStorage do navegador caso o backend esteja reiniciando
      const cached = localStorage.getItem(`cache_${collectionName}`);
      return cached ? JSON.parse(cached) : null;
    }
  },

  /**
   * Salva ou adiciona um item em uma coleção
   */
  async saveItem<T = any>(collectionName: string, item: any): Promise<T> {
    try {
      const res = await fetch(`${API_BASE}/api/data/${collectionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.item as T;
    } catch (err: any) {
      console.error(`[LocalDB] Erro ao salvar item em '${collectionName}':`, err.message);
      throw err;
    }
  },

  /**
   * Atualiza um item específico em uma coleção
   */
  async updateItem<T = any>(collectionName: string, id: string, data: any): Promise<T> {
    try {
      const res = await fetch(`${API_BASE}/api/data/${collectionName}/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.item as T;
    } catch (err: any) {
      console.error(`[LocalDB] Erro ao atualizar item '${id}' em '${collectionName}':`, err.message);
      throw err;
    }
  },

  /**
   * Substitui uma coleção inteira
   */
  async setCollection(collectionName: string, data: any): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/data/${collectionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      // Salva no cache do navegador por precaução
      try {
        localStorage.setItem(`cache_${collectionName}`, JSON.stringify(data));
      } catch (_e) {
        // Ignora erro de cota de localStorage
      }
      return true;
    } catch (err: any) {
      console.error(`[LocalDB] Erro ao salvar coleção '${collectionName}':`, err.message);
      throw err;
    }
  },

  /**
   * Remove um item da coleção por ID
   */
  async deleteItem(collectionName: string, id: string): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/data/${collectionName}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return !!json.deleted;
    } catch (err: any) {
      console.error(`[LocalDB] Erro ao remover item '${id}' em '${collectionName}':`, err.message);
      throw err;
    }
  },

  /**
   * Salva arquivo localmente no servidor interno
   */
  async uploadFile(filename: string, base64: string, contentType: string = 'application/pdf'): Promise<string> {
    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename, base64, contentType }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      return json.url;
    } catch (err: any) {
      console.error(`[LocalDB] Erro no upload local:`, err.message);
      throw err;
    }
  },

  /**
   * Obtém diagnóstico do servidor
   */
  async getStatus(): Promise<ServerStatus | null> {
    try {
      const res = await fetch(`${API_BASE}/api/status`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  },

  /**
   * Dispara download do backup JSON completo
   */
  exportBackupFile(): void {
    window.location.href = `${API_BASE}/api/backup/export`;
  },

  /**
   * Restaura backup a partir de JSON
   */
  async restoreBackup(backupObject: any): Promise<any> {
    const res = await fetch(`${API_BASE}/api/backup/restore`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(backupObject),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
};
