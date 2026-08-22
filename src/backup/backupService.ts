import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { Reminder } from '../types/reminder';

const BACKUP_VERSION = 1;

export interface BackupPayload {
  version: number;
  exportedAt: string;
  reminders: Reminder[];
}

function isBackupPayload(value: unknown): value is BackupPayload {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as BackupPayload).reminders)
  );
}

export async function writeAndShareBackup(reminders: Reminder[]): Promise<void> {
  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    reminders,
  };

  const dir = new Directory(Paths.document, 'backups');
  if (!dir.exists) dir.create({ intermediates: true });

  const file = new File(dir, `remindly-backup-${Date.now()}.json`);
  file.write(JSON.stringify(payload, null, 2));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'Save Remindly Backup',
    });
  }
}

export async function pickAndReadBackup(): Promise<BackupPayload | null> {
  const pick = await File.pickFileAsync({ mimeTypes: ['application/json'] });
  if (pick.canceled) return null;

  const text = await pick.result.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file is not a valid Remindly backup.');
  }

  if (!isBackupPayload(parsed)) {
    throw new Error('That file is not a valid Remindly backup.');
  }
  return parsed;
}
