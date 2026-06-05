import { useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { Ear } from '../../types';
import type { AudioService } from '../../services/AudioService';
import type { SweepParams } from './index';
import styles from './SweepView.module.css';

interface Props {
  ear: Ear;
  pass: 1 | 2 | 3;
  sweepParamsRef: MutableRefObject<SweepParams>;
  audioService: AudioService | null;
  onTap(): void;
}

function freqAtProgress(p: SweepParams, audioTime: number): number {
  const elapsed = audioTime - p.startAudioTime;
  const t = Math.min(Math.max(elapsed / p.durationS, 0), 1);
  return p.startHz * Math.pow(p.endHz / p.startHz, t);
}

function logProgress(p: SweepParams, freq: number): number {
  return Math.log(freq / p.startHz) / Math.log(p.endHz / p.startHz);
}

const PASS_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Pass 1 of 2 — coarse sweep',
  2: 'Pass 2 — narrowing in',
  3: 'Pass 3 — precision',
};

export default function SweepView({ ear, pass, sweepParamsRef, audioService, onTap }: Props) {
  const [currentHz, setCurrentHz] = useState(sweepParamsRef.current.startHz);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    function tick() {
      if (!audioService) return;
      const t = audioService.audioCurrentTime();
      const p = sweepParamsRef.current;
      const hz = freqAtProgress(p, t);
      const prog = logProgress(p, hz);
      setCurrentHz(Math.round(hz));
      setProgress(Math.max(0, Math.min(prog, 1)));
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [audioService, sweepParamsRef]);

  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.earTag}>{earLabel}</span>
        <span className={styles.passTag}>{PASS_LABELS[pass]}</span>
      </div>

      <p className={styles.instruction}>
        Tap the button when you hear your tinnitus tone
      </p>

      <div className={styles.sweepTrack}>
        <div className={styles.sweepBar} style={{ width: `${progress * 100}%` }} />
        <div className={styles.sweepHead} style={{ left: `${progress * 100}%` }} />
      </div>

      <div className={styles.freqLabels}>
        <span>{sweepParamsRef.current.startHz < 1000
          ? `${Math.round(sweepParamsRef.current.startHz)} Hz`
          : `${(sweepParamsRef.current.startHz / 1000).toFixed(1)} kHz`}
        </span>
        <span>{sweepParamsRef.current.endHz < 1000
          ? `${Math.round(sweepParamsRef.current.endHz)} Hz`
          : `${(sweepParamsRef.current.endHz / 1000).toFixed(1)} kHz`}
        </span>
      </div>

      <div className={styles.currentHz}>
        {currentHz < 1000 ? `${currentHz} Hz` : `${(currentHz / 1000).toFixed(2)} kHz`}
      </div>

      <button className={styles.tapBtn} onPointerDown={onTap}>
        TAP
      </button>

      <p className={styles.hint}>
        Tap as soon as you hear it — the sweep loops automatically
      </p>
    </div>
  );
}
