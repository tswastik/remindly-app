import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  EventType,
  TriggerType,
  type EventDetail,
  type TimestampTrigger,
} from '@notifee/react-native';
import { getCategoryDef } from '../constants/categories';
import type { Reminder } from '../types/reminder';

const CHANNEL_ID = 'reminders-default';

export const MARK_DONE_ACTION = 'mark-done';
export const SNOOZE_ACTION = 'snooze';
export const SNOOZE_MINUTES = 10;

export async function ensureChannel(): Promise<void> {
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Reminders',
    importance: AndroidImportance.HIGH,
  });
}

export async function requestPermissions(): Promise<void> {
  await notifee.requestPermission();
}

export async function isExactAlarmPermissionGranted(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.ENABLED;
}

export async function openExactAlarmSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}

function notificationIdFor(id: number): string {
  return String(id);
}

async function createNotificationAt(reminder: Reminder, timestamp: number): Promise<void> {
  if (timestamp <= Date.now()) return;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: { allowWhileIdle: true },
  };

  await notifee.createTriggerNotification(
    {
      id: notificationIdFor(reminder.id),
      title: reminder.title,
      body: reminder.notes ?? getCategoryDef(reminder.category).label,
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
        actions: [
          { title: 'Mark Done', pressAction: { id: MARK_DONE_ACTION } },
          { title: 'Snooze', pressAction: { id: SNOOZE_ACTION } },
        ],
      },
    },
    trigger,
  );
}

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  await createNotificationAt(reminder, new Date(reminder.dueDate).getTime());
}

export async function scheduleSnooze(reminder: Reminder, minutes: number): Promise<Date> {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await createNotificationAt(reminder, snoozedUntil.getTime());
  return snoozedUntil;
}

export async function cancelReminder(id: number): Promise<void> {
  await notifee.cancelTriggerNotification(notificationIdFor(id));
}

export interface NotificationAction {
  actionId: string;
  reminderId: number;
}

function toAction(detail: EventDetail): NotificationAction | null {
  const idStr = detail.notification?.id;
  const actionId = detail.pressAction?.id;
  if (!idStr || !actionId) return null;
  const reminderId = Number(idStr);
  if (Number.isNaN(reminderId)) return null;
  return { actionId, reminderId };
}

export function onForegroundAction(callback: (action: NotificationAction) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS) return;
    const action = toAction(detail);
    if (action) callback(action);
  });
}

export function onBackgroundAction(callback: (action: NotificationAction) => Promise<void>): void {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type !== EventType.ACTION_PRESS) return;
    const action = toAction(detail);
    if (action) await callback(action);
  });
}
