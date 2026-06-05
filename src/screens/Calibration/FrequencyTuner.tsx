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
    liveHandleRef.current?.setGain(value / 10);
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
          <span className={styles.sliderIcon}>Vol</span>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={10}
            step={1}
            value={volume}
            onChange={handleVolumeChange}
          />
        </div>
        <div className={styles.sliderEndLabels}>
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
