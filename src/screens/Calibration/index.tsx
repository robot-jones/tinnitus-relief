import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext';
import { ProfileService } from '../../services/ProfileService';
import { AudioService } from '../../services/AudioService';
import { WebAudioAdapter } from '../../adapters/WebAudioAdapter';
import type { Ear, EarProfile } from '../../types';
import EarSelector from './EarSelector';
import SweepView from './SweepView';
import OfferPass3 from './OfferPass3';
import ValidationView from './ValidationView';
import LoudnessView from './LoudnessView';
import CalibrationDoneView from './CalibrationDoneView';
import styles from './Calibration.module.css';

type CalibrationStep =
  | { step: 'ear-select' }
  | { step: 'sweeping'; ear: Ear; pass: 1 | 2 | 3; passFreqs: number[] }
  | { step: 'offer-pass3'; ear: Ear; detectedHz: number }
  | { step: 'validating'; ear: Ear; frequencyHz: number; passesCompleted: 1 | 2 | 3 }
  | { step: 'loudness'; ear: Ear; frequencyHz: number; passesCompleted: 1 | 2 | 3 }
  | { step: 'ear-done'; completedEar: Ear }
  | { step: 'complete' };

export interface SweepParams {
  startHz: number;
  endHz: number;
  durationS: number;
  startAudioTime: number;
}

function getSweepRange(pass: 1 | 2 | 3, prevHz: number, multiplier: number) {
  const baseDurations = { 1: 20, 2: 12, 3: 8 };
  const durationS = baseDurations[pass] / multiplier;
  if (pass === 1) return { startHz: 250, endHz: 12000, durationS };
  if (pass === 2) return { startHz: prevHz * 0.82, endHz: prevHz * 1.18, durationS };
  return { startHz: prevHz * 0.95, endHz: prevHz * 1.05, durationS };
}

const SWEEP_GAIN = 0.3;

export default function CalibrationScreen() {
  const navigate = useNavigate();
  const { storage, settings, profile, refreshProfile } = useProfile();
  const profileService = useRef(new ProfileService(storage));
  const audioServiceRef = useRef<AudioService | null>(null);

  const [phase, setPhase] = useState<CalibrationStep>({ step: 'ear-select' });

  // Sweep state shared between CalibrationScreen and SweepView
  const sweepActiveRef = useRef(false);
  const sweepParamsRef = useRef<SweepParams>({ startHz: 250, endHz: 12000, durationS: 20, startAudioTime: 0 });
  const currentSweepStopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const adapter = new WebAudioAdapter();
    audioServiceRef.current = new AudioService(adapter);
    return () => {
      sweepActiveRef.current = false;
      audioServiceRef.current?.dispose();
    };
  }, []);

  const startSweepLoop = useCallback(async (ear: Ear, params: Omit<SweepParams, 'startAudioTime'>) => {
    const svc = audioServiceRef.current;
    if (!svc || !sweepActiveRef.current) return;

    const startAudioTime = svc.audioCurrentTime() + 0.05;
    sweepParamsRef.current = { ...params, startAudioTime };

    const handle = await svc.startCalibrationSweep({
      ear,
      startHz: params.startHz,
      endHz: params.endHz,
      durationS: params.durationS,
      gainValue: SWEEP_GAIN,
      onComplete: () => {
        if (sweepActiveRef.current) startSweepLoop(ear, params);
      },
    });
    currentSweepStopRef.current = handle.stop;
  }, []);

  function stopSweep() {
    sweepActiveRef.current = false;
    currentSweepStopRef.current?.();
    currentSweepStopRef.current = null;
  }

  async function beginSweep(ear: Ear, pass: 1 | 2 | 3, passFreqs: number[]) {
    const prevHz = passFreqs[passFreqs.length - 1] ?? 3000;
    const params = getSweepRange(pass, prevHz, settings.sweepSpeedMultiplier);
    sweepActiveRef.current = true;
    setPhase({ step: 'sweeping', ear, pass, passFreqs });
    await startSweepLoop(ear, params);
  }

  function handleTap(ear: Ear, pass: 1 | 2 | 3, passFreqs: number[]) {
    const svc = audioServiceRef.current;
    if (!svc) return;

    // Compute frequency at tap moment using exponential interpolation
    const { startHz, endHz, durationS, startAudioTime } = sweepParamsRef.current;
    const elapsed = svc.audioCurrentTime() - startAudioTime;
    const t = Math.min(Math.max(elapsed / durationS, 0), 1);
    const detectedHz = startHz * Math.pow(endHz / startHz, t);

    stopSweep();

    const newPassFreqs = [...passFreqs, detectedHz];

    if (pass === 1) {
      // Auto-start pass 2
      beginSweep(ear, 2, newPassFreqs);
    } else if (pass === 2) {
      setPhase({ step: 'offer-pass3', ear, detectedHz });
    } else {
      // Pass 3 done → validate
      setPhase({ step: 'validating', ear, frequencyHz: detectedHz, passesCompleted: 3 });
    }
  }

  function handleSelectEar(ear: Ear) {
    beginSweep(ear, 1, []);
  }

  function handlePass3Accept(ear: Ear, prevHz: number) {
    beginSweep(ear, 3, [0, prevHz]);
  }

  function handlePass3Decline(ear: Ear, detectedHz: number) {
    setPhase({ step: 'validating', ear, frequencyHz: detectedHz, passesCompleted: 2 });
  }

  function handleValidationConfirm(ear: Ear, frequencyHz: number, passesCompleted: 1 | 2 | 3) {
    setPhase({ step: 'loudness', ear, frequencyHz, passesCompleted });
  }

  function handleValidationResweep(ear: Ear) {
    beginSweep(ear, 1, []);
  }

  async function handleLoudnessSave(
    ear: Ear,
    frequencyHz: number,
    passesCompleted: 1 | 2 | 3,
    loudnessLevel: number,
  ) {
    const earProfile: EarProfile = {
      frequencyHz: Math.round(frequencyHz),
      loudnessLevel,
      loudnessDbHL: null,
      calibratedAt: new Date().toISOString(),
      passesCompleted,
      validationConfirmed: true,
    };
    await profileService.current.updateEarProfile(ear, earProfile);
    await refreshProfile();
    setPhase({ step: 'ear-done', completedEar: ear });
  }

  function handleEarDoneContinue(completedEar: Ear) {
    const otherEar: Ear = completedEar === 'left' ? 'right' : 'left';
    const otherCalibrated = profile?.ears[otherEar] !== null && profile?.ears[otherEar] !== undefined;
    if (otherCalibrated) {
      setPhase({ step: 'complete' });
    } else {
      beginSweep(otherEar, 1, []);
    }
  }

  function handleEarDoneFinish() {
    setPhase({ step: 'complete' });
  }

  async function handleCompleteFinish() {
    await storage.putSettings({ ...settings, onboardingComplete: true });
    await refreshProfile();
    navigate('/session');
  }

  function renderStep() {
    switch (phase.step) {
      case 'ear-select':
        return (
          <EarSelector
            profile={profile}
            onSelectEar={handleSelectEar}
          />
        );

      case 'sweeping':
        return (
          <SweepView
            ear={phase.ear}
            pass={phase.pass}
            sweepParamsRef={sweepParamsRef}
            audioService={audioServiceRef.current}
            onTap={() => handleTap(phase.ear, phase.pass, phase.passFreqs)}
          />
        );

      case 'offer-pass3':
        return (
          <OfferPass3
            ear={phase.ear}
            detectedHz={phase.detectedHz}
            onAccept={() => handlePass3Accept(phase.ear, phase.detectedHz)}
            onDecline={() => handlePass3Decline(phase.ear, phase.detectedHz)}
          />
        );

      case 'validating':
        return (
          <ValidationView
            ear={phase.ear}
            frequencyHz={phase.frequencyHz}
            passesCompleted={phase.passesCompleted}
            audioService={audioServiceRef.current}
            onConfirm={() => handleValidationConfirm(phase.ear, phase.frequencyHz, phase.passesCompleted)}
            onResweep={() => handleValidationResweep(phase.ear)}
          />
        );

      case 'loudness':
        return (
          <LoudnessView
            ear={phase.ear}
            frequencyHz={phase.frequencyHz}
            passesCompleted={phase.passesCompleted}
            audioService={audioServiceRef.current}
            onSave={(loudnessLevel) =>
              handleLoudnessSave(phase.ear, phase.frequencyHz, phase.passesCompleted, loudnessLevel)
            }
          />
        );

      case 'ear-done':
        return (
          <CalibrationDoneView
            completedEar={phase.completedEar}
            profile={profile}
            onCalibrateOtherEar={() => handleEarDoneContinue(phase.completedEar)}
            onFinish={handleEarDoneFinish}
          />
        );

      case 'complete':
        return (
          <div className={styles.complete}>
            <h1>All done!</h1>
            <p>Your hearing profile is saved. Ready to start training.</p>
            <button className={styles.primaryBtn} onClick={handleCompleteFinish}>
              Start first session
            </button>
          </div>
        );
    }
  }

  return (
    <div className={styles.screen}>
      {renderStep()}
    </div>
  );
}
