import { v4 as uuidv4 } from 'uuid';
import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { Profile, EarProfile, Ear } from '../types';

export class ProfileService {
  constructor(private storage: StorageAdapter) {}

  async getProfile(): Promise<Profile | null> {
    return (await this.storage.getProfile()) ?? null;
  }

  async getOrCreateProfile(): Promise<Profile> {
    const existing = await this.storage.getProfile();
    if (existing) return existing;

    const profile: Profile = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ears: { left: null, right: null },
    };
    await this.storage.putProfile(profile);
    return profile;
  }

  async updateEarProfile(ear: Ear, earProfile: EarProfile): Promise<Profile> {
    const profile = await this.getOrCreateProfile();
    const updated: Profile = {
      ...profile,
      updatedAt: new Date().toISOString(),
      ears: { ...profile.ears, [ear]: earProfile },
    };
    await this.storage.putProfile(updated);
    return updated;
  }

  async clearEarProfile(ear: Ear): Promise<Profile> {
    const profile = await this.getOrCreateProfile();
    const updated: Profile = {
      ...profile,
      updatedAt: new Date().toISOString(),
      ears: { ...profile.ears, [ear]: null },
    };
    await this.storage.putProfile(updated);
    return updated;
  }

  /** Returns true if at least one ear is calibrated. */
  isCalibrated(profile: Profile | null): boolean {
    return profile !== null && (profile.ears.left !== null || profile.ears.right !== null);
  }
}
