import type { StorageAdapter } from './StorageAdapter';
import type { Profile, Session, Settings } from '../types';
import { openAppDB, ensureDefaultSettings, type AppDB } from '../db/schema';
import * as q from '../db/queries';

export class IdbStorageAdapter implements StorageAdapter {
  private dbPromise: Promise<AppDB>;

  constructor() {
    this.dbPromise = openAppDB().then(async (db) => {
      await ensureDefaultSettings(db);
      return db;
    });
  }

  private async db(): Promise<AppDB> {
    return this.dbPromise;
  }

  async getProfile(): Promise<Profile | undefined> {
    return q.getProfile(await this.db());
  }

  async putProfile(profile: Profile): Promise<void> {
    return q.putProfile(await this.db(), profile);
  }

  async getSettings(): Promise<Settings> {
    return q.getSettings(await this.db());
  }

  async putSettings(settings: Settings): Promise<void> {
    return q.putSettings(await this.db(), settings);
  }

  async putSession(session: Session): Promise<void> {
    return q.putSession(await this.db(), session);
  }

  async getSession(id: string): Promise<Session | undefined> {
    return q.getSession(await this.db(), id);
  }

  async getAllSessions(): Promise<Session[]> {
    return q.getAllSessions(await this.db());
  }

  async getSessionsInRange(fromIso: string, toIso: string): Promise<Session[]> {
    return q.getSessionsInRange(await this.db(), fromIso, toIso);
  }

  async deleteAllData(): Promise<void> {
    return q.deleteAllData(await this.db());
  }
}
