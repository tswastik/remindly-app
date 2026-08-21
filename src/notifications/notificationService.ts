import notifee, { AndroidImportance, TriggerType, type TimestampTrigger } from '@notifee/react-native';
import { getCategoryDef } from '../constants/categories';
import type { Reminder } from '../types/reminder';

const CHANNEL_ID = 'reminders-default';

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

function notificationIdFor(id: number): string {
  return String(id);
}

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  const dueTimestamp = new Date(reminder.dueDate).getTime();
  if (dueTimestamp <= Date.now()) return; // Phase 3 only schedules future reminders

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp: dueTimestamp,
  };

  await notifee.createTriggerNotification(
    {
      id: notificationIdFor(reminder.id),
      title: reminder.title,
      body: reminder.notes ?? getCategoryDef(reminder.category).label,
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

export async function cancelReminder(id: number): Promise<void> {
  await notifee.cancelTriggerNotification(notificationIdFor(id));
}
