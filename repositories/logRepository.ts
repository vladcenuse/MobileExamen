import * as SQLite from 'expo-sqlite';
import { api, Log, NewLog } from '../services/api';
import {
  addFetchedRecordDb,
  addLogDb,
  createTables,
  deleteLogDb,
  getAllLogsDb,
  getLogDb,
  isFetchedDb,
} from './sqlHelpers';

let db: SQLite.SQLiteDatabase | null = null;

const getDb = (): SQLite.SQLiteDatabase => {
  if (!db) {
    db = SQLite.openDatabaseSync('logs.db');
    createTables(db);
  }
  return db;
};

const log = (message: string, data?: any) => {
  console.log(`[Repository] ${message}`, data ?? '');
};

// Load from SQL on app start
export const loadFromSQL = async (): Promise<Log[] | null> => {
  try {
    const database = getDb();
    const logs = await getAllLogsDb(database);
    if (logs.length > 0) {
      log('Loaded logs from SQL on startup', logs.length);
      return logs;
    }
    return null;
  } catch (error) {
    console.error('[Repository] Error loading from SQL:', error);
    return null;
  }
};

export const logRepository = {
  async getLogs(): Promise<{ data: Log[]; isOffline: boolean }> {
    try {
      const data = await api.getLogs();
      // Save each log to SQL
      const database = getDb();
      for (const logItem of data) {
        await addLogDb(database, logItem);
      }
      log('Logs saved to SQL');
      return { data, isOffline: false };
    } catch (error) {
      log('Online fetch failed, loading from SQL');
      const database = getDb();
      const cached = await getAllLogsDb(database);
      if (cached.length > 0) {
        return { data: cached, isOffline: true };
      }
      throw error;
    }
  },

  async getLog(id: number): Promise<Log> {
    try {
      const data = await api.getLog(id);
      const database = getDb();
      // Save to SQL
      await addLogDb(database, data);
      // Mark as explicitly fetched
      await addFetchedRecordDb(database, id);
      log('Log detail saved to SQL', id);
      return data;
    } catch (error) {
      log('Online fetch failed, checking if detail was previously fetched');
      const database = getDb();
      // Only return if explicitly fetched before
      const wasFetched = await isFetchedDb(database, id);
      if (wasFetched) {
        const cached = await getLogDb(database, id);
        if (cached) {
          log('Returning cached detail from SQL (previously fetched)', id);
          return cached;
        }
      }
      throw error;
    }
  },

  async createLog(newLog: NewLog): Promise<Log> {
    const data = await api.createLog(newLog);
    // Save to SQL
    const database = getDb();
    await addLogDb(database, data);
    return data;
  },

  async deleteLog(id: number): Promise<Log> {
    const data = await api.deleteLog(id);
    // Remove from SQL
    const database = getDb();
    await deleteLogDb(database, id);
    return data;
  },

  async getAllLogs(): Promise<Log[]> {
    // For reports/insights - always fetch fresh from server, no caching needed
    const data = await api.getAllLogs();
    log('All logs fetched (not cached - for reports/insights)');
    return data;
  },

  // Add log to SQL (for WebSocket updates)
  async addToCache(logItem: Log): Promise<void> {
    const database = getDb();
    await addLogDb(database, logItem);
    log('Log added to SQL from WebSocket', logItem);
  },
};
