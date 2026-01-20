import { SQLiteDatabase } from 'expo-sqlite';
import { Log } from '../services/api';

export async function createTables(db: SQLiteDatabase) {
  // Create Logs table
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Logs (
      id INTEGER PRIMARY KEY,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  // Create Fetched table to track explicitly fetched details
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS Fetched (
      id INTEGER PRIMARY KEY
    )
  `);
}

export async function getAllLogsDb(db: SQLiteDatabase): Promise<Log[]> {
  console.log('[SQL] Fetching all logs from db...');
  const rows = await db.getAllAsync('SELECT * FROM Logs');
  return rows as Log[];
}

export async function getLogDb(db: SQLiteDatabase, id: number): Promise<Log | null> {
  console.log(`[SQL] Fetching log ${id} from db...`);
  const rows = await db.getAllAsync('SELECT * FROM Logs WHERE id = ?', [id]);
  return rows.length > 0 ? (rows[0] as Log) : null;
}

export async function addLogDb(db: SQLiteDatabase, log: Log) {
  console.log(`[SQL] Adding log ${log.id} to db...`);
  await db.runAsync(
    'INSERT OR REPLACE INTO Logs (id, date, amount, type, category, description) VALUES (?, ?, ?, ?, ?, ?)',
    [log.id, log.date, log.amount, log.type, log.category, log.description]
  );
}

export async function deleteLogDb(db: SQLiteDatabase, id: number) {
  console.log(`[SQL] Deleting log ${id} from db...`);
  await db.runAsync('DELETE FROM Logs WHERE id = ?', [id]);
}

export async function addFetchedRecordDb(db: SQLiteDatabase, id: number) {
  console.log(`[SQL] Marking log ${id} as fetched...`);
  await db.runAsync('INSERT OR REPLACE INTO Fetched (id) VALUES (?)', [id]);
}

export async function isFetchedDb(db: SQLiteDatabase, id: number): Promise<boolean> {
  console.log(`[SQL] Checking if log ${id} was fetched...`);
  const rows = await db.getAllAsync('SELECT * FROM Fetched WHERE id = ?', [id]);
  return rows.length > 0;
}
