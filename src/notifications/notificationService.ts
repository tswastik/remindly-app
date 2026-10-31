import notifee, {
  AndroidImportance,
  AndroidNotificationSetting,
  EventType,
  TriggerType,
  type EventDetail,
  type TimestampTrigger,
} from '@notifee/react-native';
import { getCategoryDef } from '../constants/categories';
import * as profileRepository from '../db/profileRepository';
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

function advanceNotificationIdFor(id: number): string {
  return `${id}-advance`;
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

async function createAdvanceNotificationAt(
  reminder: Reminder,
  timestamp: number,
  data?: Record<string, string>,
): Promise<void> {
  if (timestamp <= Date.now()) return;

  const trigger: TimestampTrigger = {
    type: TriggerType.TIMESTAMP,
    timestamp,
    alarmManager: { allowWhileIdle: true },
  };

  await notifee.createTriggerNotification(
    {
      id: advanceNotificationIdFor(reminder.id),
      title: `Upcoming: ${reminder.title}`,
      body: reminder.notes ?? getCategoryDef(reminder.category).label,
      data,
      android: {
        channelId: CHANNEL_ID,
        pressAction: { id: 'default' },
      },
    },
    trigger,
  );
}

// Resolves who the Phase 7 advance-notice SMS should go to: a per-reminder
// override, falling back to the number saved on the Profile screen.
async function resolveSmsPhoneNumber(reminder: Reminder): Promise<string | null> {
  if (reminder.smsPhoneOverride) return reminder.smsPhoneOverride;
  const profile = await profileRepository.getProfile();
  return profile.mobileNumber;
}

export async function scheduleReminder(reminder: Reminder): Promise<void> {
  await createNotificationAt(reminder, new Date(reminder.dueDate).getTime());

  if (reminder.advanceMinutes) {
    const advanceTimestamp = new Date(reminder.dueDate).getTime() - reminder.advanceMinutes * 60_000;

    let data: Record<string, string> | undefined;
    if (reminder.category === 'personal_event' && reminder.smsEnabled) {
      const phoneNumber = await resolveSmsPhoneNumber(reminder);
      if (phoneNumber) data = { smsEnabled: 'true', phoneNumber };
    }

    await createAdvanceNotificationAt(reminder, advanceTimestamp, data);
  }
}

export async function scheduleSnooze(reminder: Reminder, minutes: number): Promise<Date> {
  const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
  await createNotificationAt(reminder, snoozedUntil.getTime());
  return snoozedUntil;
}

export async function cancelReminder(id: number): Promise<void> {
  await notifee.cancelTriggerNotification(notificationIdFor(id));
  await notifee.cancelTriggerNotification(advanceNotificationIdFor(id));
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

export interface AdvanceSmsPayload {
  reminderId: number;
  phoneNumber: string;
}

const ADVANCE_ID_SUFFIX = '-advance';

function toAdvanceSmsPayload(detail: EventDetail): AdvanceSmsPayload | null {
  const idStr = detail.notification?.id;
  const data = detail.notification?.data;
  if (!idStr || !idStr.endsWith(ADVANCE_ID_SUFFIX) || !data) return null;
  if (data.smsEnabled !== 'true') return null;
  const phoneNumber = data.phoneNumber;
  if (typeof phoneNumber !== 'string' || !phoneNumber) return null;
  const reminderId = Number(idStr.slice(0, -ADVANCE_ID_SUFFIX.length));
  if (Number.isNaN(reminderId)) return null;
  return { reminderId, phoneNumber };
}

// Foreground events can have any number of listeners, so this is a plain
// sibling to onForegroundAction above.
export function onAdvanceSmsForeground(callback: (payload: AdvanceSmsPayload) => void): () => void {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (type !== EventType.DELIVERED) return;
    const payload = toAdvanceSmsPayload(detail);
    if (payload) callback(payload);
  });
}

// notifee allows only ONE onBackgroundEvent registration for the whole app,
// so action-press (Mark Done/Snooze) and the advance-notification DELIVERED
// event (Phase 7's silent SMS) are dispatched from this single handler
// rather than two separate notifee.onBackgroundEvent calls.
export function registerBackgroundHandlers(handlers: {
  onAction: (action: NotificationAction) => Promise<void>;
  onAdvanceSms: (payload: AdvanceSmsPayload) => Promise<void>;
}): void {
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.ACTION_PRESS) {
      const action = toAction(detail);
      if (action) await handlers.onAction(action);
      return;
    }
    if (type === EventType.DELIVERED) {
      const payload = toAdvanceSmsPayload(detail);
      if (payload) await handlers.onAdvanceSms(payload);
    }
  });
}
