import { useEffect, useRef, useState } from 'react';
import type { Ear } from '../../types';
import type { AudioService } from '../../services/AudioService';
import type { LiveToneHandle } from '../../adapters/AudioAdapter';
import styles from './FrequencyTuner.module.css';

const MIN_HZ = 250;
const MAX_HZ = 12000;
const SLIDER_MAX = 1000;

function sliderToHz(value: number): number {
  const t = value / SLIDER_MAX;
  return MIN_HZ * Math.pow(MAX_HZ / MIN_HZ, t);
}

function hzToSlider(hz: number): number {
  return Math.round((Math.log(hz / MIN_HZ) / Math.log(MAX_HZ / MIN_HZ)) * SLIDER_MAX);
}

function fmtHz(hz: number): string {
  return hz < 1000
    ? `${Math.round(hz)} Hz`
    : `${(hz / 1000).toFixed(2)} kHz`;
}

interface Props {
  ear: Ear;
  initialHz?: number;
  audioService: AudioService | null;
  onConfirm(frequencyHz: number): void;
}

export default function FrequencyTuner({ ear, initialHz = 4000, audioService, onConfirm }: Props) {
  const [sliderValue, setSliderValue] = useState(() => hzToSlider(initialHz));
  const [volume, setVolume] = useState(5);
  const [muted, setMuted] = useState(false);
  const liveHandleRef = useRef<LiveToneHandle | null>(null);

  const currentHz = sliderToHz(sliderValue);
  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';

  useEffect(() => {
    // Local variables — each effect invocation has its own closure,
    // so StrictMode's double-invoke can't cross-contaminate the flag.
    let cancelled = false;
    let handle: LiveToneHandle | null = null;

    audioService?.startLoudnessCalibration({
      ear,
      frequencyHz: sliderToHz(hzToSlider(initialHz)),
      initialGain: volume / 10,
    }).then((h) => {
      if (cancelled) { h.stop(); return; }
      handle = h;
      liveHandleRef.current = h;
    });

    return () => {
      cancelled = true;
      handle?.stop();
      liveHandleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioService, ear]);

  function handleFrequencyChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setSliderValue(value);
    liveHandleRef.current?.setFrequency(sliderToHz(value));
  }

  function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setVolume(value);
    if (!muted) liveHandleRef.current?.setGain(value / 10);
  }

  function handleMuteToggle() {
    const nextMuted = !muted;
    setMuted(nextMuted);
    liveHandleRef.current?.setGain(nextMuted ? 0 : volume / 10);
  }

  return (
    <div className={styles.container}>
      <span className={styles.earTag}>{earLabel}</span>
      <h2 className={styles.title}>Tune to your tinnitus</h2>
      <p className={styles.subtitle}>
        Drag the sliders until the tone matches what you hear. Take your time.
      </p>

      <div className={styles.freqDisplay}>
        <span className={styles.freqValue}>{fmtHz(currentHz)}</span>
      </div>

      <div className={styles.sliderWrapper}>
        <div className={styles.sliderRow}>
          <span className={styles.sliderIcon}>Hz</span>
          <input
            type="range"
            className={styles.slider}
            min={0}
            max={SLIDER_MAX}
            step={1}
            value={sliderValue}
            onChange={handleFrequencyChange}
          />
        </div>
        <div className={styles.sliderEndLabels}>
          <span>{fmtHz(MIN_HZ)}</span>
          <span>{fmtHz(MAX_HZ)}</span>
        </div>
      </div>

      <div className={styles.sliderWrapper}>
        <div className={styles.sliderRow}>
          <button
            className={styles.muteBtn}
            onClick={handleMuteToggle}
            aria-label={muted ? 'Unmute' : 'Mute'}
            aria-pressed={muted}
          >
            {muted ? (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path d="M3.63 3.63a1 1 0 0 0 0 1.41L7.29 8.7 7 9H4a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3l4 4a1 1 0 0 0 1.7-.7v-2.83l4.3 4.3a1 1 0 0 0 1.41-1.41L5.05 3.63a1 1 0 0 0-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53A8.9 8.9 0 0 0 21 12c0-4.28-3-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zm-7-8l-1.88 1.88L12 7.76zm4.5 8c0-1.77-1.02-3.29-2.5-4.03v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            )}
          </button>
          <input
            type="range"
            className={`${styles.slider}${muted ? ` ${styles.sliderMuted}` : ''}`}
            min={1}
            max={10}
            step={1}
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>
        <div className={`${styles.sliderEndLabels} ${styles.sliderEndLabelsIndented}`}>
          <span>Quiet</span>
          <span>Loud</span>
        </div>
      </div>

      <button
        className={styles.confirmBtn}
        onClick={() => onConfirm(currentHz)}
      >
        This matches my tinnitus
      </button>
    </div>
  );
}
