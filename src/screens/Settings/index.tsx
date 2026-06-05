import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext';
import type { Settings } from '../../types';
import styles from './Settings.module.css';

const SWEEP_STEPS: Record<number, number> = { 1: 0.5, 2: 0.75, 3: 1.0, 4: 1.5, 5: 2.0 };
const MULTIPLIER_TO_STEP: Record<number, number> = Object.fromEntries(
  Object.entries(SWEEP_STEPS).map(([k, v]) => [v, Number(k)]),
);

function multiplierToStep(m: number): number {
  return MULTIPLIER_TO_STEP[m] ?? 3;
}

function fmtHz(hz: number): string {
  return hz < 1000 ? `${hz} Hz` : `${(hz / 1000).toFixed(2)} kHz`;
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { settings, updateSettings, profile, storage } = useProfile();

  const [local, setLocal] = useState<Settings>(settings);
  const [dirty, setDirty] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  // Sync if settings change externally
  useEffect(() => {
    setLocal(settings);
  }, [settings]);

  // Apply theme to root element whenever local theme changes
  useEffect(() => {
    document.documentElement.dataset.theme = local.theme;
  }, [local.theme]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setLocal((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }

  async function save() {
    await updateSettings(local);
    setDirty(false);
  }

  async function handleExport() {
    const [prof, sess, sett] = await Promise.all([
      storage.getProfile(),
      storage.getAllSessions(),
      storage.getSettings(),
    ]);
    const data = { exportedAt: new Date().toISOString(), profile: prof, sessions: sess, settings: sett };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tinnitus-relief-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleReset() {
    await storage.deleteAllData();
    await updateSettings({ ...local, onboardingComplete: false });
    setShowResetConfirm(false);
    setResetDone(true);
    setTimeout(() => navigate('/calibration'), 1500);
  }

  const gapRatioWarning = local.defaultToneOffMs > local.defaultToneOnMs / 2;
  const sweepStep = multiplierToStep(local.sweepSpeedMultiplier);

  return (
    <div className={styles.screen}>
      <h1 className={styles.title}>Settings</h1>

      {/* Appearance */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Theme</span>
          <div className={styles.segmented}>
            {(['system', 'light', 'dark'] as const).map((t) => (
              <button
                key={t}
                className={`${styles.segBtn} ${local.theme === t ? styles.segActive : ''}`}
                onClick={() => update('theme', t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Session defaults */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Session defaults</h2>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Duration</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              className={styles.numInput}
              value={Math.round(local.defaultSessionDurationS / 60)}
              min={1}
              max={60}
              onChange={(e) => update('defaultSessionDurationS', Number(e.target.value) * 60)}
            />
            <span className={styles.unit}>min</span>
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Tone on</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              className={styles.numInput}
              value={local.defaultToneOnMs}
              min={500}
              max={30000}
              step={100}
              onChange={(e) => update('defaultToneOnMs', Number(e.target.value))}
            />
            <span className={styles.unit}>ms</span>
          </div>
        </div>

        <div className={styles.row}>
          <span className={styles.rowLabel}>Gap</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              className={styles.numInput}
              value={local.defaultToneOffMs}
              min={100}
              max={10000}
              step={100}
              onChange={(e) => update('defaultToneOffMs', Number(e.target.value))}
            />
            <span className={styles.unit}>ms</span>
          </div>
        </div>

        {gapRatioWarning && (
          <div className={styles.warning}>
            Gap is more than half the tone duration. Sessions may feel choppy.
          </div>
        )}

        <div className={styles.row}>
          <span className={styles.rowLabel}>Fade</span>
          <div className={styles.inputGroup}>
            <input
              type="number"
              className={styles.numInput}
              value={local.defaultFadeMs}
              min={10}
              max={500}
              step={10}
              onChange={(e) => update('defaultFadeMs', Number(e.target.value))}
            />
            <span className={styles.unit}>ms</span>
          </div>
        </div>

        <div className={styles.rowStack}>
          <div className={styles.rowLabelRow}>
            <span className={styles.rowLabel}>Sweep speed</span>
            <span className={styles.rowValue}>
              {sweepStep === 1 ? 'Slowest' : sweepStep === 5 ? 'Fastest' : sweepStep === 3 ? 'Normal' : `Step ${sweepStep}`}
            </span>
          </div>
          <input
            type="range"
            className={styles.slider}
            min={1}
            max={5}
            step={1}
            value={sweepStep}
            onChange={(e) => update('sweepSpeedMultiplier', SWEEP_STEPS[Number(e.target.value)])}
          />
          <div className={styles.sliderLabels}>
            <span>Slower</span>
            <span>Faster</span>
          </div>
        </div>
      </section>

      {/* Calibration */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Calibration</h2>
        {(['left', 'right'] as const).map((ear) => {
          const ep = profile?.ears[ear];
          return (
            <div key={ear} className={styles.row}>
              <div className={styles.earInfo}>
                <span className={styles.rowLabel}>{ear[0].toUpperCase() + ear.slice(1)} ear</span>
                {ep ? (
                  <span className={styles.earHz}>{fmtHz(ep.frequencyHz)} · Level {ep.loudnessLevel}/10</span>
                ) : (
                  <span className={styles.earNotSet}>Not calibrated</span>
                )}
              </div>
              <button
                className={styles.recalibrateBtn}
                onClick={() => navigate('/calibration')}
              >
                {ep ? 'Recalibrate' : 'Calibrate'}
              </button>
            </div>
          );
        })}
      </section>

      {/* Notifications */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Notifications</h2>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Daily reminders</span>
          <button
            className={`${styles.toggle} ${local.remindersEnabled ? styles.toggleOn : ''}`}
            onClick={() => update('remindersEnabled', !local.remindersEnabled)}
            role="switch"
            aria-checked={local.remindersEnabled}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
        {local.remindersEnabled && (
          <div className={styles.row}>
            <span className={styles.rowLabel}>Reminder time</span>
            <input
              type="time"
              className={styles.timeInput}
              value={local.reminderTime}
              onChange={(e) => update('reminderTime', e.target.value)}
            />
          </div>
        )}
        <div className={styles.row}>
          <span className={styles.rowLabel}>Streak alerts</span>
          <button
            className={`${styles.toggle} ${local.streakAlertsEnabled ? styles.toggleOn : ''}`}
            onClick={() => update('streakAlertsEnabled', !local.streakAlertsEnabled)}
            role="switch"
            aria-checked={local.streakAlertsEnabled}
          >
            <span className={styles.toggleThumb} />
          </button>
        </div>
      </section>

      {/* Data */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Data</h2>
        <button className={styles.actionBtn} onClick={handleExport}>
          Export data as JSON
        </button>
        {!showResetConfirm && !resetDone && (
          <button className={styles.dangerBtn} onClick={() => setShowResetConfirm(true)}>
            Reset all data
          </button>
        )}
        {showResetConfirm && (
          <div className={styles.confirmBox}>
            <p className={styles.confirmText}>
              This permanently deletes your profile, all sessions, and settings. Are you sure?
            </p>
            <div className={styles.confirmActions}>
              <button className={styles.confirmYes} onClick={handleReset}>Yes, delete everything</button>
              <button className={styles.confirmNo} onClick={() => setShowResetConfirm(false)}>Cancel</button>
            </div>
          </div>
        )}
        {resetDone && (
          <p className={styles.resetDone}>All data deleted. Redirecting to calibration…</p>
        )}
      </section>

      {dirty && (
        <div className={styles.saveBar}>
          <button className={styles.saveBtn} onClick={save}>Save changes</button>
          <button className={styles.cancelBtn} onClick={() => { setLocal(settings); setDirty(false); }}>
            Discard
          </button>
        </div>
      )}
    </div>
  );
}
