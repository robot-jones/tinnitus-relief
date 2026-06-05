import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Profile, Session, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface TinnitusDB extends DBSchema {
  profile: {
    key: string;
    value: Profile;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { 'by-startedAt': string };
  };
  settings: {
    key: string;
    value: Settings & { id: string };
  };
}

const DB_NAME = 'tinnitus-relief';
const DB_VERSION = 1;

export type AppDB = IDBPDatabase<TinnitusDB>;

export async function openAppDB(): Promise<AppDB> {
  return openDB<TinnitusDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('profile', { keyPath: 'id' });

        const sessionsStore = db.createObjectStore('sessions', { keyPath: 'id' });
        sessionsStore.createIndex('by-startedAt', 'startedAt');

        db.createObjectStore('settings', { keyPath: 'id' });
      }
    },
  });
}

export async function ensureDefaultSettings(db: AppDB): Promise<void> {
  const existing = await db.get('settings', 'singleton');
  if (!existing) {
    await db.put('settings', { id: 'singleton', ...DEFAULT_SETTINGS });
  }
}
