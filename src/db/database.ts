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

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('reminders.db').then(async (db) => {
      await db.execAsync(SCHEMA);
      return db;
    });
  }
  return dbPromise;
}
