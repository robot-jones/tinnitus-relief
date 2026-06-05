import type { Profile, Session, Settings } from '../types';

export interface StorageAdapter {
  getProfile(): Promise<Profile | undefined>;
  putProfile(profile: Profile): Promise<void>;

  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;

  putSession(session: Session): Promise<void>;
  getSession(id: string): Promise<Session | undefined>;
  getAllSessions(): Promise<Session[]>;
  getSessionsInRange(fromIso: string, toIso: string): Promise<Session[]>;

  deleteAllData(): Promise<void>;
}
