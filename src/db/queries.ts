import type { AppDB } from './schema';
import type { Profile, Session, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

export async function getProfile(db: AppDB): Promise<Profile | undefined> {
  const all = await db.getAll('profile');
  return all[0];
}

export async function putProfile(db: AppDB, profile: Profile): Promise<void> {
  await db.put('profile', profile);
}

export async function getSettings(db: AppDB): Promise<Settings> {
  const record = await db.get('settings', 'singleton');
  if (!record) return { ...DEFAULT_SETTINGS };
  const { id: _id, ...settings } = record;
  return settings;
}

export async function putSettings(db: AppDB, settings: Settings): Promise<void> {
  await db.put('settings', { id: 'singleton', ...settings });
}

export async function putSession(db: AppDB, session: Session): Promise<void> {
  await db.put('sessions', session);
}

export async function getSession(db: AppDB, id: string): Promise<Session | undefined> {
  return db.get('sessions', id);
}

export async function getAllSessions(db: AppDB): Promise<Session[]> {
  return db.getAllFromIndex('sessions', 'by-startedAt');
}

export async function getSessionsInRange(
  db: AppDB,
  fromIso: string,
  toIso: string,
): Promise<Session[]> {
  return db.getAllFromIndex('sessions', 'by-startedAt', IDBKeyRange.bound(fromIso, toIso));
}

export async function deleteAllData(db: AppDB): Promise<void> {
  await Promise.all([
    db.clear('profile'),
    db.clear('sessions'),
    db.clear('settings'),
  ]);
}
