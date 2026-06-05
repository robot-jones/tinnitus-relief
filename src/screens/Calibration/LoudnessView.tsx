import { useEffect, useRef, useState } from 'react';
import type { Ear } from '../../types';
import type { AudioService } from '../../services/AudioService';
import type { LiveToneHandle } from '../../adapters/AudioAdapter';
import styles from './LoudnessView.module.css';

interface Props {
  ear: Ear;
  frequencyHz: number;
  passesCompleted: 1 | 2 | 3;
  audioService: AudioService | null;
  onSave(loudnessLevel: number): void;
}

function levelToGain(level: number): number {
  return level / 10;
}

export default function LoudnessView({ ear, frequencyHz, audioService, onSave }: Props) {
  const [level, setLevel] = useState(5);
  const liveToneRef = useRef<LiveToneHandle | null>(null);
  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';
  const hzLabel = frequencyHz < 1000
    ? `${Math.round(frequencyHz)} Hz`
    : `${(frequencyHz / 1000).toFixed(2)} kHz`;

  useEffect(() => {
    let handle: LiveToneHandle | null = null;
    audioService?.startLoudnessCalibration({
      ear,
      frequencyHz,
      initialGain: levelToGain(5),
    }).then((h) => {
      handle = h;
      liveToneRef.current = h;
    });
    return () => {
      handle?.stop();
      liveToneRef.current = null;
    };
  }, [audioService, ear, frequencyHz]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newLevel = Number(e.target.value);
    setLevel(newLevel);
    liveToneRef.current?.setGain(levelToGain(newLevel));
  }

  return (
    <div className={styles.container}>
      <span className={styles.earTag}>{earLabel}</span>
      <h2 className={styles.title}>Match the loudness</h2>
      <p className={styles.subtitle}>
        Adjust until the tone is as loud as your tinnitus
      </p>

      <div className={styles.freqNote}>{hzLabel}</div>

      <div className={styles.sliderWrapper}>
        <span className={styles.sliderLabel}>Quiet</span>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          value={level}
          onChange={handleChange}
          className={styles.slider}
        />
        <span className={styles.sliderLabel}>Loud</span>
      </div>

      <div className={styles.levelDisplay}>{level} / 10</div>

      <button className={styles.primaryBtn} onClick={() => onSave(level)}>
        Save and continue
      </button>
    </div>
  );
}
