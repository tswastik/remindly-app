import { getDatabase } from './database';

export interface Profile {
  photoUri: string | null;
  mobileNumber: string | null;
}

interface ProfileRow {
  photo_uri: string | null;
  mobile_number: string | null;
}

export async function getProfile(): Promise<Profile> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<ProfileRow>('SELECT photo_uri, mobile_number FROM profile WHERE id = 1');
  return {
    photoUri: row?.photo_uri ?? null,
    mobileNumber: row?.mobile_number ?? null,
  };
}

export async function saveProfile(profile: Profile): Promise<Profile> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO profile (id, photo_uri, mobile_number, updated_at) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET photo_uri = excluded.photo_uri, mobile_number = excluded.mobile_number, updated_at = excluded.updated_at`,
    [profile.photoUri, profile.mobileNumber, now],
  );
  return profile;
}
