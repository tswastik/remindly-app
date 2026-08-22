import * as reminderRepository from '../db/reminderRepository';
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
