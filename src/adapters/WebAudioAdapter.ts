import type { AudioAdapter, LiveToneHandle, ToneHandle, ToneOptions } from './AudioAdapter';

export class WebAudioAdapter implements AudioAdapter {
  private ctx: AudioContext | null = null;
  private merger: ChannelMergerNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.merger = this.ctx.createChannelMerger(2);
      this.merger.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  async resume(): Promise<void> {
    const ctx = this.getContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  }

  currentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  createTone(options: ToneOptions): ToneHandle {
    const ctx = this.getContext();
    const merger = this.merger!;

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = options.frequencyHz;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    oscillator.connect(gainNode);

    if (options.ear === 'both') {
      gainNode.connect(merger, 0, 0);
      gainNode.connect(merger, 0, 1);
    } else {
      const channel = options.ear === 'left' ? 0 : 1;
      gainNode.connect(merger, 0, channel);
    }

    return {
      scheduleGain(value: number, audioTime: number) {
        gainNode.gain.linearRampToValueAtTime(value, audioTime);
      },
      scheduleFrequency(hz: number, audioTime: number) {
        oscillator.frequency.exponentialRampToValueAtTime(hz, audioTime);
      },
      start(audioTime: number) {
        oscillator.start(audioTime);
      },
      stop(audioTime: number) {
        gainNode.gain.linearRampToValueAtTime(0, audioTime);
        oscillator.stop(audioTime + 0.01);
      },
    };
  }

  startLiveTone(options: Omit<ToneOptions, 'gainValue'>): LiveToneHandle {
    const ctx = this.getContext();
    const merger = this.merger!;

    const oscillator = ctx.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = options.frequencyHz;

    const gainNode = ctx.createGain();
    gainNode.gain.value = 0;

    oscillator.connect(gainNode);

    if (options.ear === 'both') {
      gainNode.connect(merger, 0, 0);
      gainNode.connect(merger, 0, 1);
    } else {
      const channel = options.ear === 'left' ? 0 : 1;
      gainNode.connect(merger, 0, channel);
    }

    oscillator.start();

    return {
      setGain(value: number) {
        gainNode.gain.setTargetAtTime(value, ctx.currentTime, 0.02);
      },
      stop() {
        gainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.02);
        oscillator.stop(ctx.currentTime + 0.1);
      },
    };
  }

  dispose(): void {
    this.ctx?.close();
    this.ctx = null;
    this.merger = null;
  }
}
