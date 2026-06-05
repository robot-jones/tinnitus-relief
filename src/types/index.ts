export type Ear = 'left' | 'right';

export interface EarProfile {
  frequencyHz: number;
  loudnessLevel: number;
  loudnessDbHL: number | null;
  calibratedAt: string;
  passesCompleted: 1 | 2 | 3;
  validationConfirmed: boolean;
}

export interface Profile {
  id: string;
  createdAt: string;
  updatedAt: string;
  ears: {
    left: EarProfile | null;
    right: EarProfile | null;
  };
}

export type CompletionStatus = 'completed' | 'partial' | 'abandoned';

export interface SessionConfig {
  toneOnMs: number;
  toneOffMs: number;
  fadeMs: number;
  frequencyHz: { left?: number; right?: number };
  volumeLevel: number;
}

export interface SessionEvent {
  type: 'tone_on' | 'tone_off' | 'paused' | 'resumed';
  offsetMs: number;
}

export interface Session {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationTarget: number;
  durationActual: number;
  ears: 'left' | 'right' | 'both';
  config: SessionConfig;
  completionPct: number;
  completionStatus: CompletionStatus;
  postSessionFeeling: 'better' | 'same' | 'worse' | null;
  events: SessionEvent[];
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  wakeLockGranted: boolean;
}

export interface Settings {
  sweepSpeedMultiplier: number;
  defaultSessionDurationS: number;
  defaultToneOnMs: number;
  defaultToneOffMs: number;
  defaultFadeMs: number;
  theme: 'system' | 'light' | 'dark';
  remindersEnabled: boolean;
  reminderTime: string;
  streakAlertsEnabled: boolean;
  onboardingComplete: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  sweepSpeedMultiplier: 1.0,
  defaultSessionDurationS: 600,
  defaultToneOnMs: 4000,
  defaultToneOffMs: 1000,
  defaultFadeMs: 200,
  theme: 'system',
  remindersEnabled: false,
  reminderTime: '08:00',
  streakAlertsEnabled: true,
  onboardingComplete: false,
};
