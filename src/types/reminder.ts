export type Category =
  | 'financial'
  | 'personal_event'
  | 'todo'
  | 'maintenance'
  | 'study'
  | 'note'
  | 'vacation';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom_days';

export type ReminderStatus = 'active' | 'done' | 'snoozed';

export interface Reminder {
  id: number;
  category: Category;
  subcategory: string | null;
  title: string;
  notes: string | null;
  dueDate: string; // ISO 8601; for 'vacation' this is the trip START date
  endDate: string | null; // ISO 8601; only used for 'vacation' — trip END date
  destination: string | null; // only used for 'vacation'
  stayOptions: string[] | null; // only used for 'vacation'
  advanceMinutes: number | null; // minutes before dueDate to fire an extra "upcoming" notification; null = none
  recurrenceType: RecurrenceType;
  recurrenceInterval: number | null; // only used when recurrenceType = 'custom_days'
  status: ReminderStatus;
  snoozedUntil: string | null;
  notificationId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Fields the Add/Edit form collects. The repository fills in id/timestamps/notificationId.
export type ReminderInput = Omit<
  Reminder,
  'id' | 'createdAt' | 'updatedAt' | 'notificationId'
>;
