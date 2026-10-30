import * as SQLite from 'expo-sqlite';

const SCHEMA = `
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    subcategory TEXT,
    title TEXT NOT NULL,
    notes TEXT,
    due_date TEXT NOT NULL,
    end_date TEXT,
    destination TEXT,
    stay_options TEXT,
    recurrence_type TEXT NOT NULL DEFAULT 'none',
    recurrence_interval INTEGER,
    status TEXT NOT NULL DEFAULT 'active',
    snoozed_until TEXT,
    notification_id TEXT,
    advance_minutes INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reminders_category ON reminders(category);
  CREATE INDEX IF NOT EXISTS idx_reminders_status ON reminders(status);

  CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    photo_uri TEXT,
    mobile_number TEXT,
    updated_at TEXT NOT NULL
  );
`;

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Lightweight migration for columns added after the table already shipped —
// SQLite has no "ADD COLUMN IF NOT EXISTS", so check table_info first.
async function ensureColumn(
  db: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await db.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('reminders.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      await ensureColumn(db, 'reminders', 'advance_minutes', 'INTEGER');
      return db;
    });
  }
  return dbPromise;
}
