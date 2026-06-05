import { v4 as uuidv4 } from 'uuid';
import type { StorageAdapter } from '../adapters/StorageAdapter';
import type { Session, SessionConfig, SessionEvent, Settings, Profile, CompletionStatus } from '../types';

const STREAK_THRESHOLD = 0.8;

function detectPlatform(): Session['platform'] {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mobi/.test(ua)) return 'android';
  return 'desktop';
}

function deriveCompletionStatus(pct: number): CompletionStatus {
  if (pct >= STREAK_THRESHOLD) return 'completed';
  if (pct >= 0.25) return 'partial';
  return 'abandoned';
}

function buildConfig(profile: Profile, settings: Settings, volumeLevel: number): SessionConfig {
  const leftHz = profile.ears.left?.frequencyHz;
  const rightHz = profile.ears.right?.frequencyHz;

  return {
    toneOnMs: settings.defaultToneOnMs,
    toneOffMs: settings.defaultToneOffMs,
    fadeMs: settings.defaultFadeMs,
    frequencyHz: {
      ...(leftHz !== undefined ? { left: leftHz } : {}),
      ...(rightHz !== undefined ? { right: rightHz } : {}),
    },
    volumeLevel,
  };
}

export class SessionService {
  constructor(private storage: StorageAdapter) {}

  async startSession(profile: Profile, settings: Settings, volumeLevel = 5): Promise<Session> {
    const ears =
      profile.ears.left && profile.ears.right
        ? 'both'
        : profile.ears.left
          ? 'left'
          : 'right';

    const session: Session = {
      id: uuidv4(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationTarget: settings.defaultSessionDurationS,
      durationActual: 0,
      ears,
      config: buildConfig(profile, settings, volumeLevel),
      completionPct: 0,
      completionStatus: 'abandoned',
      postSessionFeeling: null,
      events: [],
      platform: detectPlatform(),
      wakeLockGranted: false,
    };

    await this.storage.putSession(session);
    return session;
  }

  async recordEvent(session: Session, event: SessionEvent): Promise<Session> {
    const updated: Session = {
      ...session,
      events: [...session.events, event],
    };
    await this.storage.putSession(updated);
    return updated;
  }

  async endSession(
    session: Session,
    durationActualS: number,
    wakeLockGranted: boolean,
  ): Promise<Session> {
    const completionPct = Math.min(durationActualS / session.durationTarget, 1);
    const updated: Session = {
      ...session,
      completedAt: new Date().toISOString(),
      durationActual: durationActualS,
      wakeLockGranted,
      completionPct,
      completionStatus: deriveCompletionStatus(completionPct),
    };
    await this.storage.putSession(updated);
    return updated;
  }

  async recordFeeling(
    session: Session,
    feeling: Session['postSessionFeeling'],
  ): Promise<Session> {
    const updated: Session = { ...session, postSessionFeeling: feeling };
    await this.storage.putSession(updated);
    return updated;
  }

  async getAllSessions(): Promise<Session[]> {
    return this.storage.getAllSessions();
  }

  async getSessionsInRange(fromIso: string, toIso: string): Promise<Session[]> {
    return this.storage.getSessionsInRange(fromIso, toIso);
  }

  /** Count consecutive days ending today that have at least one completed session. */
  async getCurrentStreak(): Promise<number> {
    const sessions = await this.storage.getAllSessions();
    const completedDays = new Set(
      sessions
        .filter((s) => s.completionStatus === 'completed')
        .map((s) => s.startedAt.slice(0, 10)),
    );

    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      if (!completedDays.has(key)) break;
      streak++;
    }
    return streak;
  }
}
