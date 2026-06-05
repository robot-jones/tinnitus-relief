import { useEffect, useRef, useState } from 'react';
import type { Ear } from '../../types';
import type { AudioService } from '../../services/AudioService';
import type { LiveToneHandle } from '../../adapters/AudioAdapter';
import styles from './FrequencyTuner.module.css';

const MIN_HZ = 250;
const MAX_HZ = 12000;
const SLIDER_MAX = 1000;
const CALIBRATION_GAIN = 0.3;

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
  const liveHandleRef = useRef<LiveToneHandle | null>(null);
  const cancelledRef = useRef(false);

  const currentHz = sliderToHz(sliderValue);
  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';

  useEffect(() => {
    cancelledRef.current = false;

    audioService?.startLoudnessCalibration({
      ear,
      frequencyHz: sliderToHz(hzToSlider(initialHz)),
      initialGain: CALIBRATION_GAIN,
    }).then((handle) => {
      if (cancelledRef.current) {
        handle.stop();
        return;
      }
      liveHandleRef.current = handle;
    });

    return () => {
      cancelledRef.current = true;
      liveHandleRef.current?.stop();
      liveHandleRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioService, ear]);

  function handleSliderChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = Number(e.target.value);
    setSliderValue(value);
    liveHandleRef.current?.setFrequency(sliderToHz(value));
  }

  return (
    <div className={styles.container}>
      <span className={styles.earTag}>{earLabel}</span>
      <h2 className={styles.title}>Tune to your tinnitus</h2>
      <p className={styles.subtitle}>
        Drag the slider until the tone matches what you hear. Take your time.
      </p>

      <div className={styles.freqDisplay}>
        <span className={styles.freqValue}>{fmtHz(currentHz)}</span>
      </div>

      <div className={styles.sliderWrapper}>
        <input
          type="range"
          className={styles.slider}
          min={0}
          max={SLIDER_MAX}
          step={1}
          value={sliderValue}
          onChange={handleSliderChange}
        />
        <div className={styles.sliderEndLabels}>
          <span>{fmtHz(MIN_HZ)}</span>
          <span>{fmtHz(MAX_HZ)}</span>
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
