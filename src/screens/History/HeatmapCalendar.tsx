import type { Session } from '../../types';
import styles from './HeatmapCalendar.module.css';

const WEEKS = 12;
const DAYS = WEEKS * 7;
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DayData {
  date: Date;
  iso: string;
  completedCount: number;
  partialCount: number;
}

function buildDayMap(sessions: Session[]): Map<string, { completed: number; partial: number }> {
  const map = new Map<string, { completed: number; partial: number }>();
  for (const s of sessions) {
    const key = s.startedAt.slice(0, 10);
    const entry = map.get(key) ?? { completed: 0, partial: 0 };
    if (s.completionStatus === 'completed') entry.completed++;
    else if (s.completionStatus === 'partial') entry.partial++;
    map.set(key, entry);
  }
  return map;
}

function buildGrid(dayMap: Map<string, { completed: number; partial: number }>): DayData[][] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // End on today, start DAYS-1 days ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - (DAYS - 1));

  const allDays: DayData[] = [];
  for (let i = 0; i < DAYS; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const counts = dayMap.get(iso) ?? { completed: 0, partial: 0 };
    allDays.push({ date: d, iso, completedCount: counts.completed, partialCount: counts.partial });
  }

  // Group into week columns (7 rows each)
  const weeks: DayData[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(allDays.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

function cellClass(day: DayData): string {
  if (day.completedCount > 0) return styles.completed;
  if (day.partialCount > 0) return styles.partial;
  return styles.empty;
}

function monthLabels(weeks: DayData[][]): { label: string; colIndex: number }[] {
  const seen = new Set<string>();
  const labels: { label: string; colIndex: number }[] = [];
  weeks.forEach((week, i) => {
    const firstDay = week[0];
    const key = `${firstDay.date.getFullYear()}-${firstDay.date.getMonth()}`;
    if (!seen.has(key)) {
      seen.add(key);
      labels.push({ label: MONTH_ABBR[firstDay.date.getMonth()], colIndex: i });
    }
  });
  return labels;
}

interface Props {
  sessions: Session[];
}

export default function HeatmapCalendar({ sessions }: Props) {
  const dayMap = buildDayMap(sessions);
  const weeks = buildGrid(dayMap);
  const mLabels = monthLabels(weeks);

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {/* Day-of-week labels column */}
        <div className={styles.dayLabels}>
          <div className={styles.monthLabelSpacer} />
          {DAY_LABELS.map((d, i) => (
            <div key={d} className={`${styles.dayLabel} ${i % 2 === 0 ? '' : styles.hidden}`}>
              {d.slice(0, 1)}
            </div>
          ))}
        </div>

        {/* Week columns */}
        <div className={styles.weeksWrapper}>
          {/* Month labels row */}
          <div className={styles.monthLabelsRow}>
            {mLabels.map(({ label, colIndex }) => (
              <div key={label + colIndex} className={styles.monthLabel} style={{ gridColumn: colIndex + 1 }}>
                {label}
              </div>
            ))}
          </div>

          {/* Cells */}
          <div className={styles.weeks}>
            {weeks.map((week, wi) => (
              <div key={wi} className={styles.week}>
                {week.map((day) => (
                  <div
                    key={day.iso}
                    className={`${styles.cell} ${cellClass(day)}`}
                    title={`${day.iso}: ${day.completedCount} completed, ${day.partialCount} partial`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.legend}>
        <span className={styles.legendLabel}>Less</span>
        <div className={`${styles.legendCell} ${styles.empty}`} />
        <div className={`${styles.legendCell} ${styles.partial}`} />
        <div className={`${styles.legendCell} ${styles.completed}`} />
        <span className={styles.legendLabel}>More</span>
      </div>
    </div>
  );
}
