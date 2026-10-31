import { getDatabase } from './database';
import type { Category, Reminder, ReminderInput, ReminderStatus } from '../types/reminder';

interface ReminderRow {
  id: number;
  category: string;
  subcategory: string | null;
  title: string;
  notes: string | null;
  due_date: string;
  end_date: string | null;
  destination: string | null;
  stay_options: string | null;
  advance_minutes: number | null;
  sms_enabled: number;
  sms_phone_override: string | null;
  recurrence_type: string;
  recurrence_interval: number | null;
  status: string;
  snoozed_until: string | null;
  notification_id: string | null;
  created_at: string;
  updated_at: string;
}

function rowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    category: row.category as Category,
    subcategory: row.subcategory,
    title: row.title,
    notes: row.notes,
    dueDate: row.due_date,
    endDate: row.end_date,
    destination: row.destination,
    stayOptions: row.stay_options ? JSON.parse(row.stay_options) : null,
    advanceMinutes: row.advance_minutes,
    smsEnabled: row.sms_enabled === 1,
    smsPhoneOverride: row.sms_phone_override,
    recurrenceType: row.recurrence_type as Reminder['recurrenceType'],
    recurrenceInterval: row.recurrence_interval,
    status: row.status as ReminderStatus,
    snoozedUntil: row.snoozed_until,
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listAll(): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders ORDER BY due_date ASC',
  );
  return rows.map(rowToReminder);
}

export async function listByCategory(category: Category): Promise<Reminder[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    'SELECT * FROM reminders WHERE category = ? ORDER BY due_date ASC',
    [category],
  );
  return rows.map(rowToReminder);
}

export async function getById(id: number): Promise<Reminder | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ReminderRow>('SELECT * FROM reminders WHERE id = ?', [id]);
  return row ? rowToReminder(row) : null;
}

export async function create(input: ReminderInput): Promise<Reminder> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const result = await db.runAsync(
    `INSERT INTO reminders
      (category, subcategory, title, notes, due_date, end_date, destination, stay_options,
       advance_minutes, sms_enabled, sms_phone_override, recurrence_type, recurrence_interval,
       status, snoozed_until, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    [
      input.category,
      input.subcategory,
      input.title,
      input.notes,
      input.dueDate,
      input.endDate,
      input.destination,
      input.stayOptions ? JSON.stringify(input.stayOptions) : null,
      input.advanceMinutes,
      input.smsEnabled ? 1 : 0,
      input.smsPhoneOverride,
      input.recurrenceType,
      input.recurrenceInterval,
      input.status,
      input.snoozedUntil,
      now,
      now,
    ],
  );
  const created = await getById(result.lastInsertRowId);
  if (!created) throw new Error('Failed to read back newly created reminder');
  return created;
}

export async function update(id: number, input: ReminderInput): Promise<Reminder> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE reminders SET
      category = ?, subcategory = ?, title = ?, notes = ?, due_date = ?, end_date = ?,
      destination = ?, stay_options = ?, advance_minutes = ?, sms_enabled = ?, sms_phone_override = ?,
      recurrence_type = ?, recurrence_interval = ?, status = ?, snoozed_until = ?, updated_at = ?
     WHERE id = ?`,
    [
      input.category,
      input.subcategory,
      input.title,
      input.notes,
      input.dueDate,
      input.endDate,
      input.destination,
      input.stayOptions ? JSON.stringify(input.stayOptions) : null,
      input.advanceMinutes,
      input.smsEnabled ? 1 : 0,
      input.smsPhoneOverride,
      input.recurrenceType,
      input.recurrenceInterval,
      input.status,
      input.snoozedUntil,
      now,
      id,
    ],
  );
  const updated = await getById(id);
  if (!updated) throw new Error(`Reminder ${id} not found after update`);
  return updated;
}

export async function updateStatus(id: number, status: ReminderStatus): Promise<Reminder> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync('UPDATE reminders SET status = ?, updated_at = ? WHERE id = ?', [
    status,
    now,
    id,
  ]);
  const updated = await getById(id);
  if (!updated) throw new Error(`Reminder ${id} not found after status update`);
  return updated;
}

export async function snoozeUntil(id: number, snoozedUntilIso: string): Promise<Reminder> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    "UPDATE reminders SET status = 'snoozed', snoozed_until = ?, updated_at = ? WHERE id = ?",
    [snoozedUntilIso, now, id],
  );
  const updated = await getById(id);
  if (!updated) throw new Error(`Reminder ${id} not found after snooze`);
  return updated;
}

export async function remove(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM reminders WHERE id = ?', [id]);
}

export async function listDistinctNoteSubcategories(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ subcategory: string }>(
    "SELECT DISTINCT subcategory FROM reminders WHERE category = 'note' AND subcategory IS NOT NULL",
  );
  return rows.map((r) => r.subcategory);
}
