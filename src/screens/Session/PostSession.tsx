import type { Session } from '../../types';
import styles from './PostSession.module.css';

interface Props {
  session: Session;
  onRecordFeeling(feeling: 'better' | 'same' | 'worse'): void;
  onDone(): void;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Session complete',
  partial: 'Partial session',
  abandoned: 'Session stopped early',
};

const FEELING_OPTIONS: { value: 'better' | 'same' | 'worse'; label: string; emoji: string }[] = [
  { value: 'better', label: 'Better', emoji: '↑' },
  { value: 'same', label: 'Same', emoji: '→' },
  { value: 'worse', label: 'Worse', emoji: '↓' },
];

export default function PostSession({ session, onRecordFeeling, onDone }: Props) {
  const pct = Math.round(session.completionPct * 100);
  const statusLabel = STATUS_LABELS[session.completionStatus] ?? 'Session ended';
  const feelingRecorded = session.postSessionFeeling !== null;

  return (
    <div className={styles.container}>
      <div className={styles.summary}>
        <span className={`${styles.status} ${styles[session.completionStatus]}`}>
          {statusLabel}
        </span>
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{fmtDuration(session.durationActual)}</span>
            <span className={styles.statLabel}>Duration</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{pct}%</span>
            <span className={styles.statLabel}>Complete</span>
          </div>
        </div>
      </div>

      {!feelingRecorded && (
        <div className={styles.feelingSection}>
          <p className={styles.feelingPrompt}>How does your tinnitus feel right now?</p>
          <div className={styles.feelingBtns}>
            {FEELING_OPTIONS.map(({ value, label, emoji }) => (
              <button
                key={value}
                className={styles.feelingBtn}
                onClick={() => onRecordFeeling(value)}
              >
                <span className={styles.feelingEmoji}>{emoji}</span>
                <span className={styles.feelingLabel}>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {feelingRecorded && (
        <p className={styles.feelingThanks}>
          Recorded — thanks for tracking
        </p>
      )}

      <button className={styles.doneBtn} onClick={onDone}>
        {feelingRecorded ? 'Done' : 'Skip and finish'}
      </button>
    </div>
  );
}
