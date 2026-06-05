import { useMemo, useState } from 'react';
import type { Session } from '../../types';
import styles from './TrendChart.module.css';

const FEELING_VALUE: Record<string, number> = {
  better: 2,
  same: 1,
  worse: 0,
};

const FEELING_LABEL: Record<string, string> = {
  better: 'Better',
  same: 'Same',
  worse: 'Worse',
};

const FEELING_COLOR: Record<string, string> = {
  better: 'var(--color-success)',
  same: 'var(--color-accent)',
  worse: 'var(--color-danger)',
};

interface DataPoint {
  dateIso: string;
  feeling: 'better' | 'same' | 'worse';
  value: number;
  session: Session;
}

const CHART_H = 160;
const CHART_PADDING_Y = 20;
const USABLE_H = CHART_H - CHART_PADDING_Y * 2;
const DOT_R = 5;

type Range = '4w' | '12w' | 'all';

function filterByRange(points: DataPoint[], range: Range): DataPoint[] {
  if (range === 'all') return points;
  const now = Date.now();
  const weeks = range === '4w' ? 4 : 12;
  const cutoff = new Date(now - weeks * 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return points.filter((p) => p.dateIso >= cutoff);
}

interface Props {
  sessions: Session[];
}

export default function TrendChart({ sessions }: Props) {
  const [range, setRange] = useState<Range>('12w');

  const allPoints = useMemo<DataPoint[]>(() => {
    return sessions
      .filter((s) => s.postSessionFeeling !== null)
      .map((s) => ({
        dateIso: s.startedAt.slice(0, 10),
        feeling: s.postSessionFeeling as 'better' | 'same' | 'worse',
        value: FEELING_VALUE[s.postSessionFeeling!],
        session: s,
      }))
      .sort((a, b) => a.dateIso.localeCompare(b.dateIso));
  }, [sessions]);

  const points = filterByRange(allPoints, range);

  if (allPoints.length === 0) {
    return (
      <div className={styles.empty}>
        No perception data yet. After sessions, tap how your tinnitus feels — it'll appear here.
      </div>
    );
  }

  if (points.length === 0) {
    return <div className={styles.empty}>No data in this range.</div>;
  }

  // Build SVG path
  const n = points.length;
  const chartW = Math.max(300, n * 32);

  function xPos(i: number): number {
    if (n === 1) return chartW / 2;
    return (i / (n - 1)) * (chartW - DOT_R * 2) + DOT_R;
  }

  function yPos(value: number): number {
    return CHART_PADDING_Y + USABLE_H - (value / 2) * USABLE_H;
  }

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i)} ${yPos(p.value)}`)
    .join(' ');

  const betterCount = points.filter((p) => p.feeling === 'better').length;
  const sameCount = points.filter((p) => p.feeling === 'same').length;
  const worseCount = points.filter((p) => p.feeling === 'worse').length;

  return (
    <div className={styles.container}>
      <div className={styles.rangeRow}>
        {(['4w', '12w', 'all'] as Range[]).map((r) => (
          <button
            key={r}
            className={`${styles.rangeBtn} ${range === r ? styles.active : ''}`}
            onClick={() => setRange(r)}
          >
            {r === 'all' ? 'All time' : r}
          </button>
        ))}
      </div>

      <div className={styles.chartWrapper}>
        <div className={styles.yLabels}>
          <span className={styles.yLabel}>Better</span>
          <span className={styles.yLabel}>Same</span>
          <span className={styles.yLabel}>Worse</span>
        </div>

        <div className={styles.svgWrapper}>
          <svg
            width={chartW}
            height={CHART_H}
            className={styles.svg}
            overflow="visible"
          >
            {/* Grid lines */}
            {[2, 1, 0].map((v) => (
              <line
                key={v}
                x1={0}
                y1={yPos(v)}
                x2={chartW}
                y2={yPos(v)}
                stroke="var(--color-border)"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}

            {/* Connecting line */}
            {n > 1 && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-accent)"
                strokeWidth={1.5}
                opacity={0.4}
              />
            )}

            {/* Dots */}
            {points.map((p, i) => (
              <circle
                key={p.session.id}
                cx={xPos(i)}
                cy={yPos(p.value)}
                r={DOT_R}
                fill={FEELING_COLOR[p.feeling]}
              />
            ))}
          </svg>
        </div>
      </div>

      <div className={styles.summary}>
        {(['better', 'same', 'worse'] as const).map((f) => {
          const count = f === 'better' ? betterCount : f === 'same' ? sameCount : worseCount;
          const pct = points.length > 0 ? Math.round((count / points.length) * 100) : 0;
          return (
            <div key={f} className={styles.summaryItem}>
              <span className={styles.summaryDot} style={{ background: FEELING_COLOR[f] }} />
              <span className={styles.summaryLabel}>{FEELING_LABEL[f]}</span>
              <span className={styles.summaryPct}>{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
