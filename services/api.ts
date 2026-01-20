const API_BASE = 'http://10.92.63.171:2621'; // Adjust for your network setup
const FETCH_TIMEOUT = 3000; // 3 seconds timeout

export interface Log {
  id: number;
  date: string; // YYYY-MM-DD
  amount: number; // decimal value
  type: string; // e.g., "intake" or "burn"
  category: string; // e.g., "lunch", "running", "snack"
  description: string;
}

export type NewLog = Omit<Log, 'id'>;

const log = (message: string, data?: any) => {
  console.log(`[API] ${message}`, data ?? '');
};

// Helper function to add timeout to fetch
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout: number = FETCH_TIMEOUT): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - server unreachable');
    }
    throw error;
  }
};

export const api = {
  async getLogs(): Promise<Log[]> {
    log('GET /logs');
    const response = await fetchWithTimeout(`${API_BASE}/logs`);
    if (!response.ok) throw new Error('Failed to fetch logs');
    const data = await response.json();
    log('GET /logs success', data);
    return data;
  },

  async getLog(id: number): Promise<Log> {
    log(`GET /log/${id}`);
    const response = await fetchWithTimeout(`${API_BASE}/log/${id}`);
    if (!response.ok) throw new Error(`Failed to fetch log ${id}`);
    const data = await response.json();
    log(`GET /log/${id} success`, data);
    return data;
  },

  async createLog(newLog: NewLog): Promise<Log> {
    log('POST /log', newLog);
    const response = await fetchWithTimeout(`${API_BASE}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create log');
    }
    const data = await response.json();
    log('POST /log success', data);
    return data;
  },

  async deleteLog(id: number): Promise<Log> {
    log(`DELETE /log/${id}`);
    const response = await fetchWithTimeout(`${API_BASE}/log/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error(`Failed to delete log ${id}`);
    const data = await response.json();
    log(`DELETE /log/${id} success`, data);
    return data;
  },

  async getAllLogs(): Promise<Log[]> {
    log('GET /allLogs');
    const response = await fetchWithTimeout(`${API_BASE}/allLogs`);
    if (!response.ok) throw new Error('Failed to fetch all logs');
    const data = await response.json();
    log('GET /allLogs success', data);
    return data;
  },
};
