export interface ToneOptions {
  frequencyHz: number;
  ear: 'left' | 'right' | 'both';
  gainValue: number;
}

export interface LiveToneHandle {
  /** Smoothly ramp gain to value (0–1) immediately. */
  setGain(value: number): void;
  stop(): void;
}

export interface AudioAdapter {
  /** Resume or create the AudioContext (must be called from a user gesture). */
  resume(): Promise<void>;

  /** Current audio clock time in seconds. */
  currentTime(): number;

  /** Create an oscillator + gain node wired to the appropriate stereo channel.
   *  Returns a handle used to schedule and stop the tone. */
  createTone(options: ToneOptions): ToneHandle;

  /** Start a continuously-playing tone whose gain can be adjusted in real time. */
  startLiveTone(options: Omit<ToneOptions, 'gainValue'>): LiveToneHandle;

  /** Release all audio resources. */
  dispose(): void;
}

export interface ToneHandle {
  /** Schedule the gain to ramp to `value` at `audioTime`. */
  scheduleGain(value: number, audioTime: number): void;

  /** Schedule an exponential frequency ramp to `hz` at `audioTime`. */
  scheduleFrequency(hz: number, audioTime: number): void;

  /** Start the oscillator at `audioTime` (must be called before scheduleGain). */
  start(audioTime: number): void;

  /** Stop the oscillator at `audioTime`. */
  stop(audioTime: number): void;

  /** Cancel all scheduled events and fade out immediately (~50ms). */
  cancelAndStop(): void;
}
