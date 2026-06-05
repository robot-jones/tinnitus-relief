import { useEffect, useRef, useState } from 'react';
import type { Ear } from '../../types';
import type { AudioService } from '../../services/AudioService';
import styles from './ValidationView.module.css';

interface Props {
  ear: Ear;
  frequencyHz: number;
  passesCompleted: 1 | 2 | 3;
  audioService: AudioService | null;
  onConfirm(): void;
  onResweep(): void;
}

const VALIDATION_GAIN = 0.3;
const VALIDATION_DURATION_S = 3;

export default function ValidationView({
  ear,
  frequencyHz,
  passesCompleted: _passesCompleted,
  audioService,
  onConfirm,
  onResweep,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';
  const hzLabel = frequencyHz < 1000
    ? `${Math.round(frequencyHz)} Hz`
    : `${(frequencyHz / 1000).toFixed(2)} kHz`;

  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function playTone() {
    if (playing || !audioService) return;
    setPlaying(true);
    await audioService.playValidationTone({
      ear,
      frequencyHz,
      durationS: VALIDATION_DURATION_S,
      gainValue: VALIDATION_GAIN,
    });
    playTimerRef.current = setTimeout(() => setPlaying(false), VALIDATION_DURATION_S * 1000);
  }

  useEffect(() => {
    playTone();
    return () => {
      if (playTimerRef.current) clearTimeout(playTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.container}>
      <span className={styles.earTag}>{earLabel}</span>
      <h2 className={styles.title}>Does this sound like your tinnitus?</h2>

      <div className={styles.freqDisplay}>
        <span className={styles.freqValue}>{hzLabel}</span>
        <button
          className={`${styles.playBtn} ${playing ? styles.playing : ''}`}
          onClick={playTone}
          disabled={playing}
        >
          {playing ? 'Playing…' : 'Play again'}
        </button>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onConfirm}>
          Yes, that's it
        </button>
        <button className={styles.secondaryBtn} onClick={onResweep}>
          No, re-sweep
        </button>
      </div>
    </div>
  );
}
