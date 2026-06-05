import type { Profile } from '../../types';
import styles from './PreScreen.module.css';

const DURATION_OPTIONS = [5, 10, 15, 20, 30];

interface Props {
  profile: Profile;
  durationMinutes: number;
  volumeLevel: number;
  onChangeDuration(minutes: number): void;
  onChangeVolume(level: number): void;
  onStart(): void;
}

function fmtHz(hz: number): string {
  return hz < 1000 ? `${hz} Hz` : `${(hz / 1000).toFixed(2)} kHz`;
}

export default function PreScreen({
  profile,
  durationMinutes,
  volumeLevel,
  onChangeDuration,
  onChangeVolume,
  onStart,
}: Props) {
  const { left, right } = profile.ears;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Ready to train</h1>

      <div className={styles.profileCard}>
        {left && (
          <div className={styles.earRow}>
            <span className={styles.earLabel}>Left</span>
            <span className={styles.earHz}>{fmtHz(left.frequencyHz)}</span>
          </div>
        )}
        {right && (
          <div className={styles.earRow}>
            <span className={styles.earLabel}>Right</span>
            <span className={styles.earHz}>{fmtHz(right.frequencyHz)}</span>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Duration</span>
        <div className={styles.durationPicker}>
          {DURATION_OPTIONS.map((m) => (
            <button
              key={m}
              className={`${styles.durationBtn} ${durationMinutes === m ? styles.selected : ''}`}
              onClick={() => onChangeDuration(m)}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.volumeHeader}>
          <span className={styles.sectionLabel}>Volume</span>
          <span className={styles.volumeValue}>{volumeLevel} / 10</span>
        </div>
        <div className={styles.sliderRow}>
          <span className={styles.sliderCap}>Quiet</span>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={10}
            step={1}
            value={volumeLevel}
            onChange={(e) => onChangeVolume(Number(e.target.value))}
          />
          <span className={styles.sliderCap}>Loud</span>
        </div>
      </div>

      {isIOS && (
        <div className={styles.iosWarning}>
          Keep your screen on during sessions for best results.
        </div>
      )}

      <button className={styles.startBtn} onClick={onStart}>
        Start session
      </button>
    </div>
  );
}
