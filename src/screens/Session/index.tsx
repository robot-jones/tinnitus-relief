import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext';
import { SessionService } from '../../services/SessionService';
import { AudioService } from '../../services/AudioService';
import { WebAudioAdapter } from '../../adapters/WebAudioAdapter';
import type { Session } from '../../types';
import PreScreen from './PreScreen';
import ActiveSession from './ActiveSession';
import PostSession from './PostSession';
import styles from './Session.module.css';

type SessionStep =
  | { step: 'pre' }
  | { step: 'active'; session: Session }
  | { step: 'post'; session: Session };

export default function SessionScreen() {
  const navigate = useNavigate();
  const { profile, settings, storage } = useProfile();
  const sessionService = useMemo(() => new SessionService(storage), [storage]);

  const audioRef = useRef<AudioService | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const wakeLockGrantedRef = useRef(false);

  const [step, setStep] = useState<SessionStep>({ step: 'pre' });
  const [durationMinutes, setDurationMinutes] = useState(
    Math.round(settings.defaultSessionDurationS / 60),
  );

  useEffect(() => {
    const adapter = new WebAudioAdapter();
    audioRef.current = new AudioService(adapter);
    return () => {
      audioRef.current?.dispose();
      releaseWakeLock();
    };
  }, []);

  async function requestWakeLock(): Promise<boolean> {
    if (!('wakeLock' in navigator)) return false;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockGrantedRef.current = true;
      return true;
    } catch {
      return false;
    }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
    wakeLockGrantedRef.current = false;
  }

  async function handleStart() {
    if (!profile || !audioRef.current) return;

    const overriddenSettings = {
      ...settings,
      defaultSessionDurationS: durationMinutes * 60,
    };

    const session = await sessionService.startSession(profile, overriddenSettings);
    const wakeLockGranted = await requestWakeLock();

    await audioRef.current.start(session.config, {
      onToneOn() {},
      onToneOff() {},
    });

    const updatedSession = { ...session, wakeLockGranted };
    setStep({ step: 'active', session: updatedSession });
  }

  async function handleStop(elapsedS: number) {
    if (step.step !== 'active') return;
    releaseWakeLock();

    const ended = await sessionService.endSession(
      step.session,
      Math.round(elapsedS),
      wakeLockGrantedRef.current,
    );
    setStep({ step: 'post', session: ended });
  }

  async function handleRecordFeeling(feeling: 'better' | 'same' | 'worse') {
    if (step.step !== 'post') return;
    const updated = await sessionService.recordFeeling(step.session, feeling);
    setStep({ step: 'post', session: updated });
  }

  function handleDone() {
    navigate('/history');
  }

  if (!profile || (!profile.ears.left && !profile.ears.right)) {
    return (
      <div className={styles.notCalibrated}>
        <p>Calibrate at least one ear before starting a session.</p>
        <button className={styles.calibrateBtn} onClick={() => navigate('/calibration')}>
          Go to calibration
        </button>
      </div>
    );
  }

  return (
    <div className={styles.screen}>
      {step.step === 'pre' && (
        <PreScreen
          profile={profile}
          durationMinutes={durationMinutes}
          onChangeDuration={setDurationMinutes}
          onStart={handleStart}
        />
      )}
      {step.step === 'active' && audioRef.current && (
        <ActiveSession
          session={step.session}
          audioService={audioRef.current}
          onStop={handleStop}
        />
      )}
      {step.step === 'post' && (
        <PostSession
          session={step.session}
          onRecordFeeling={handleRecordFeeling}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
