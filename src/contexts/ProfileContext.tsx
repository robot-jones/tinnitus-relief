import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile, Settings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import type { StorageAdapter } from '../adapters/StorageAdapter';

interface ProfileContextValue {
  profile: Profile | null;
  settings: Settings;
  refreshProfile(): Promise<void>;
  updateSettings(next: Settings): Promise<void>;
  storage: StorageAdapter;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

interface Props {
  storage: StorageAdapter;
  children: ReactNode;
}

export function ProfileProvider({ storage, children }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    Promise.all([storage.getProfile(), storage.getSettings()]).then(([p, s]) => {
      setProfile(p ?? null);
      setSettings(s);
    });
  }, [storage]);

  async function refreshProfile() {
    const [p, s] = await Promise.all([storage.getProfile(), storage.getSettings()]);
    setProfile(p ?? null);
    setSettings(s);
  }

  async function updateSettings(next: Settings) {
    await storage.putSettings(next);
    setSettings(next);
  }

  return (
    <ProfileContext.Provider value={{ profile, settings, refreshProfile, updateSettings, storage }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider');
  return ctx;
}
