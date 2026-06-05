import { useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '../../contexts/ProfileContext';
import { SessionService } from '../../services/SessionService';
import type { Session } from '../../types';
import HeatmapCalendar from './HeatmapCalendar';
import TrendChart from './TrendChart';
import SessionLog from './SessionLog';
import styles from './History.module.css';

type Tab = 'heatmap' | 'trend' | 'log';

export default function HistoryScreen() {
  const { storage } = useProfile();
  const sessionService = useMemo(() => new SessionService(storage), [storage]);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [streak, setStreak] = useState(0);
  const [tab, setTab] = useState<Tab>('heatmap');
  const [loading, setLoading] = useState(true);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all([sessionService.getAllSessions(), sessionService.getCurrentStreak()])
      .then(([all, s]) => {
        setSessions(all);
        setStreak(s);
      })
      .finally(() => setLoading(false));
  }, [sessionService]);

  const completedCount = sessions.filter((s) => s.completionStatus === 'completed').length;

  return (
    <div className={styles.screen}>
      <div className={styles.header}>
        <h1 className={styles.title}>Progress</h1>
        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{streak}</span>
            <span className={styles.statLabel}>Day streak</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{completedCount}</span>
            <span className={styles.statLabel}>Sessions done</span>
          </div>
          <div className={styles.statDivider} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{sessions.length}</span>
            <span className={styles.statLabel}>Total sessions</span>
          </div>
        </div>
      </div>

      <div className={styles.tabs}>
        {(['heatmap', 'trend', 'log'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.active : ''}`}
            onClick={() => setTab(t)}
          >
            {t === 'heatmap' ? 'Calendar' : t === 'trend' ? 'Trend' : 'Sessions'}
          </button>
        ))}
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.empty}>Loading…</div>
        ) : sessions.length === 0 ? (
          <div className={styles.empty}>No sessions yet. Complete your first session to see progress here.</div>
        ) : (
          <>
            {tab === 'heatmap' && <HeatmapCalendar sessions={sessions} />}
            {tab === 'trend' && <TrendChart sessions={sessions} />}
            {tab === 'log' && <SessionLog sessions={sessions} />}
          </>
        )}
      </div>
    </div>
  );
}
