import { getCategoryDef } from '../constants/categories';
import * as reminderRepository from '../db/reminderRepository';
import * as smsSender from '../native/smsSender';
import { formatDisplayDateTime } from '../utils/dateFormat';
import * as notificationService from './notificationService';
import type { Reminder } from '../types/reminder';

export async function handleMarkDone(reminderId: number): Promise<Reminder | null> {
  const reminder = await reminderRepository.getById(reminderId);
  if (!reminder) return null;
  await notificationService.cancelReminder(reminderId);
  return reminderRepository.updateStatus(reminderId, 'done');
}

export async function handleSnooze(reminderId: number): Promise<Reminder | null> {
  const reminder = await reminderRepository.getById(reminderId);
  if (!reminder) return null;
  await notificationService.cancelReminder(reminderId);
  const snoozedUntil = await notificationService.scheduleSnooze(
    reminder,
    notificationService.SNOOZE_MINUTES,
  );
  return reminderRepository.snoozeUntil(reminderId, snoozedUntil.toISOString());
}

export async function handleNotificationAction(actionId: string, reminderId: number): Promise<void> {
  if (actionId === notificationService.MARK_DONE_ACTION) {
    await handleMarkDone(reminderId);
  } else if (actionId === notificationService.SNOOZE_ACTION) {
    await handleSnooze(reminderId);
  }
}

// Fires when the Phase 6 advance notification for a Special Day with SMS
// enabled is delivered. Best-effort: a failed/denied SMS must never crash
// the background handler or stop the regular push notification, which has
// already been shown by the time this runs.
export async function handleAdvanceSms(reminderId: number, phoneNumber: string): Promise<void> {
  const reminder = await reminderRepository.getById(reminderId);
  if (!reminder) return;

  const message = `Reminder: "${reminder.title}" (${getCategoryDef(reminder.category).label}) is coming up on ${formatDisplayDateTime(reminder.dueDate)}.`;

  try {
    await smsSender.sendSms(phoneNumber, message);
  } catch (err) {
    console.warn('Failed to send advance SMS', err);
  }
}
