import type { Session } from '../../types';
import styles from './SessionLog.module.css';

const STATUS_LABEL: Record<string, string> = {
  completed: 'Complete',
  partial: 'Partial',
  abandoned: 'Stopped',
};

const FEELING_SYMBOL: Record<string, string> = {
  better: '↑',
  same: '→',
  worse: '↓',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m ${s}s`;
}

interface Props {
  sessions: Session[];
}

export default function SessionLog({ sessions }: Props) {
  const sorted = [...sessions].reverse(); // newest first

  return (
    <div className={styles.container}>
      {sorted.map((s) => (
        <div key={s.id} className={`${styles.row} ${styles[s.completionStatus]}`}>
          <div className={styles.left}>
            <span className={styles.date}>{fmtDate(s.startedAt)}</span>
            <div className={styles.meta}>
              <span className={`${styles.status} ${styles[s.completionStatus]}`}>
                {STATUS_LABEL[s.completionStatus]}
              </span>
              <span className={styles.dot}>·</span>
              <span className={styles.duration}>{fmtDuration(s.durationActual)}</span>
              <span className={styles.dot}>·</span>
              <span className={styles.ear}>{s.ears === 'both' ? 'Both ears' : `${s.ears[0].toUpperCase()}${s.ears.slice(1)} ear`}</span>
            </div>
          </div>
          <div className={styles.right}>
            {s.postSessionFeeling && (
              <span className={`${styles.feeling} ${styles['feeling_' + s.postSessionFeeling]}`}>
                {FEELING_SYMBOL[s.postSessionFeeling]}
              </span>
            )}
            <span className={styles.pct}>{Math.round(s.completionPct * 100)}%</span>
          </div>
        </div>
      ))}
    </div>
  );
}
