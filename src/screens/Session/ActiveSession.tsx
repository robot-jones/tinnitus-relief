import { useEffect, useRef, useState } from 'react';
import type { Session } from '../../types';
import type { AudioService } from '../../services/AudioService';
import styles from './ActiveSession.module.css';

interface Props {
  session: Session;
  audioService: AudioService;
  onStop(elapsedS: number): void;
}

function fmtTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ActiveSession({ session, audioService, onStop }: Props) {
  const [elapsedS, setElapsedS] = useState(0);
  const [isToneOn, setIsToneOn] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const rafRef = useRef<number>(0);
  const toneTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const progress = Math.min(elapsedS / session.durationTarget, 1);
  const remaining = Math.max(session.durationTarget - elapsedS, 0);

  // rAF timer for elapsed display
  useEffect(() => {
    function tick() {
      setElapsedS(audioService.elapsedSeconds());
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioService]);

  // Wire up tone on/off callbacks — sync visual to audio schedule
  useEffect(() => {
    audioService.setCallbacks({
      onToneOn(audioTimeS: number) {
        const delayMs = Math.max(0, (audioTimeS - audioService.audioCurrentTime()) * 1000);
        const t = setTimeout(() => setIsToneOn(true), delayMs);
        toneTimersRef.current.push(t);
      },
      onToneOff(audioTimeS: number) {
        const delayMs = Math.max(0, (audioTimeS - audioService.audioCurrentTime()) * 1000);
        const t = setTimeout(() => setIsToneOn(false), delayMs);
        toneTimersRef.current.push(t);
      },
    });
    return () => {
      toneTimersRef.current.forEach(clearTimeout);
      toneTimersRef.current = [];
    };
  }, [audioService]);

  // Auto-stop when target duration reached
  useEffect(() => {
    if (elapsedS >= session.durationTarget && !isPaused) {
      handleStop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedS]);

  function handlePauseResume() {
    if (isPaused) {
      audioService.resume();
      setIsPaused(false);
    } else {
      audioService.pause();
      setIsPaused(true);
      setIsToneOn(false);
    }
  }

  function handleStop() {
    audioService.stop();
    setIsToneOn(false);
    cancelAnimationFrame(rafRef.current);
    onStop(audioService.elapsedSeconds());
  }

  return (
    <div className={styles.container}>
      <div className={styles.timerRow}>
        <span className={styles.elapsed}>{fmtTime(elapsedS)}</span>
        <span className={styles.divider}>/</span>
        <span className={styles.remaining}>{fmtTime(remaining)}</span>
      </div>

      <div className={styles.progressTrack}>
        <div className={styles.progressFill} style={{ width: `${progress * 100}%` }} />
      </div>

      <div className={styles.pulseWrapper}>
        <div className={`${styles.pulse} ${isToneOn ? styles.on : styles.off} ${isPaused ? styles.paused : ''}`} />
        {isPaused && <span className={styles.pausedLabel}>Paused</span>}
      </div>

      <div className={styles.controls}>
        <button className={styles.pauseBtn} onClick={handlePauseResume}>
          {isPaused ? 'Resume' : 'Pause'}
        </button>

        {!showStopConfirm ? (
          <button className={styles.stopBtn} onClick={() => setShowStopConfirm(true)}>
            Stop
          </button>
        ) : (
          <div className={styles.confirmStop}>
            <span className={styles.confirmLabel}>End session?</span>
            <button className={styles.confirmYes} onClick={handleStop}>Yes, end</button>
            <button className={styles.confirmNo} onClick={() => setShowStopConfirm(false)}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
