import type { AudioAdapter, ToneHandle } from '../adapters/AudioAdapter';
import type { SessionConfig } from '../types';

const LOOKAHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 50;

export type AudioServiceState = 'idle' | 'playing' | 'paused' | 'stopped';

export interface AudioServiceCallbacks {
  onToneOn(audioTimeS: number): void;
  onToneOff(audioTimeS: number): void;
}

interface ScheduledCycle {
  toneStart: number;
  toneEnd: number;
  cycleEnd: number;
}

export class AudioService {
  private state: AudioServiceState = 'idle';
  private config: SessionConfig | null = null;
  private callbacks: AudioServiceCallbacks | null = null;

  private scheduleTimer: ReturnType<typeof setTimeout> | null = null;
  private nextEventTime = 0;
  private currentPhase: 'tone' | 'gap' = 'tone';

  private activeTone: ToneHandle | null = null;
  private scheduledCycles: ScheduledCycle[] = [];

  private pausedAt: number | null = null;
  private totalPausedS = 0;
  private sessionStartAudioTime = 0;

  constructor(private audio: AudioAdapter) {}

  get currentState(): AudioServiceState {
    return this.state;
  }

  /** Elapsed session time in seconds, excluding paused time. */
  elapsedSeconds(): number {
    if (this.state === 'idle' || this.state === 'stopped') return 0;
    const now = this.audio.currentTime();
    const paused = this.pausedAt !== null ? now - this.pausedAt : 0;
    return now - this.sessionStartAudioTime - this.totalPausedS - paused;
  }

  async start(config: SessionConfig, callbacks: AudioServiceCallbacks): Promise<void> {
    if (this.state !== 'idle') return;

    await this.audio.resume();

    this.config = config;
    this.callbacks = callbacks;
    this.state = 'playing';
    this.totalPausedS = 0;
    this.pausedAt = null;
    this.scheduledCycles = [];
    this.currentPhase = 'tone';
    this.sessionStartAudioTime = this.audio.currentTime();
    this.nextEventTime = this.sessionStartAudioTime;

    this.scheduleTick();
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.pausedAt = this.audio.currentTime();
    this.stopScheduler();

    // Fade out any active tone immediately
    if (this.activeTone) {
      const now = this.audio.currentTime();
      this.activeTone.scheduleGain(0, now + 0.05);
      this.activeTone.stop(now + 0.1);
      this.activeTone = null;
    }
    this.scheduledCycles = [];
  }

  resume(): void {
    if (this.state !== 'paused') return;

    const now = this.audio.currentTime();
    if (this.pausedAt !== null) {
      this.totalPausedS += now - this.pausedAt;
      this.pausedAt = null;
    }

    this.state = 'playing';
    this.nextEventTime = now;
    this.currentPhase = 'tone';
    this.scheduleTick();
  }

  stop(): void {
    if (this.state === 'stopped' || this.state === 'idle') return;
    this.state = 'stopped';
    this.stopScheduler();

    if (this.activeTone) {
      const now = this.audio.currentTime();
      this.activeTone.scheduleGain(0, now + 0.05);
      this.activeTone.stop(now + 0.1);
      this.activeTone = null;
    }
    this.scheduledCycles = [];
  }

  dispose(): void {
    this.stop();
    this.audio.dispose();
    this.state = 'idle';
  }

  private scheduleTick(): void {
    this.scheduleTimer = setTimeout(() => this.scheduleLoop(), SCHEDULE_INTERVAL_MS);
  }

  private stopScheduler(): void {
    if (this.scheduleTimer !== null) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }
  }

  private scheduleLoop(): void {
    if (this.state !== 'playing' || !this.config) return;

    const now = this.audio.currentTime();
    const horizon = now + LOOKAHEAD_S;

    while (this.nextEventTime < horizon) {
      this.scheduleNextCycle();
    }

    this.scheduleTick();
  }

  private scheduleNextCycle(): void {
    if (!this.config) return;

    const { toneOnMs, toneOffMs, fadeMs, frequencyHz, volumeLevel } = this.config;
    const toneOnS = toneOnMs / 1000;
    const toneOffS = toneOffMs / 1000;
    const fadeS = fadeMs / 1000;
    const gainValue = volumeLevel / 10;

    if (this.currentPhase === 'tone') {
      const toneStart = this.nextEventTime;
      const toneEnd = toneStart + toneOnS;

      // Schedule left ear tone
      if (frequencyHz.left !== undefined) {
        this.scheduleTone(frequencyHz.left, 'left', gainValue, fadeS, toneStart, toneEnd);
      }
      // Schedule right ear tone
      if (frequencyHz.right !== undefined) {
        this.scheduleTone(frequencyHz.right, 'right', gainValue, fadeS, toneStart, toneEnd);
      }

      this.callbacks?.onToneOn(toneStart);
      this.scheduledCycles.push({ toneStart, toneEnd, cycleEnd: toneEnd + toneOffS });

      this.nextEventTime = toneEnd;
      this.currentPhase = 'gap';
    } else {
      this.callbacks?.onToneOff(this.nextEventTime);
      this.nextEventTime += toneOffS > 0 ? toneOffS : 0.001;
      this.currentPhase = 'tone';
    }
  }

  private scheduleTone(
    frequencyHz: number,
    ear: 'left' | 'right',
    gainValue: number,
    fadeS: number,
    startTime: number,
    endTime: number,
  ): void {
    const handle = this.audio.createTone({ frequencyHz, ear, gainValue: 0 });
    handle.start(startTime);
    handle.scheduleGain(gainValue, startTime + fadeS);
    handle.scheduleGain(gainValue, endTime - fadeS);
    handle.scheduleGain(0, endTime);
    handle.stop(endTime + 0.01);
    this.activeTone = handle;
  }

  /** Sweep adapter — used by calibration, not sessions. */
  async startCalibrationSweep(options: {
    ear: 'left' | 'right';
    startHz: number;
    endHz: number;
    durationS: number;
    gainValue: number;
    onComplete(): void;
  }): Promise<{ stop(): void }> {
    await this.audio.resume();

    const { ear, startHz, endHz, durationS, gainValue, onComplete } = options;
    const handle = this.audio.createTone({ frequencyHz: startHz, ear, gainValue: 0 });
    const startTime = this.audio.currentTime() + 0.05;
    const endTime = startTime + durationS;

    handle.start(startTime);
    handle.scheduleGain(gainValue, startTime + 0.1);
    handle.scheduleFrequency(endHz, endTime - 0.1);
    handle.scheduleGain(gainValue, endTime - 0.1);
    handle.scheduleGain(0, endTime);
    handle.stop(endTime + 0.01);

    const timer = setTimeout(onComplete, durationS * 1000);

    return {
      stop() {
        clearTimeout(timer);
      },
    };
  }

  /** Play a single validation tone at a fixed frequency. */
  async playValidationTone(options: {
    ear: 'left' | 'right';
    frequencyHz: number;
    durationS: number;
    gainValue: number;
  }): Promise<void> {
    await this.audio.resume();
    const { ear, frequencyHz, durationS, gainValue } = options;
    const handle = this.audio.createTone({ frequencyHz, ear, gainValue: 0 });
    const startTime = this.audio.currentTime() + 0.05;
    const endTime = startTime + durationS;
    handle.start(startTime);
    handle.scheduleGain(gainValue, startTime + 0.05);
    handle.scheduleGain(gainValue, endTime - 0.05);
    handle.scheduleGain(0, endTime);
    handle.stop(endTime + 0.01);
  }
}
