import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../contexts/ProfileContext';
import { ProfileService } from '../../services/ProfileService';
import { AudioService } from '../../services/AudioService';
import { WebAudioAdapter } from '../../adapters/WebAudioAdapter';
import type { Ear, EarProfile } from '../../types';
import EarSelector from './EarSelector';
import FrequencyTuner from './FrequencyTuner';
import CalibrationDoneView from './CalibrationDoneView';
import styles from './Calibration.module.css';

type CalibrationStep =
  | { step: 'ear-select' }
  | { step: 'tuning'; ear: Ear; initialHz?: number }
  | { step: 'ear-done'; completedEar: Ear }
  | { step: 'complete' };

export default function CalibrationScreen() {
  const navigate = useNavigate();
  const { storage, settings, profile, refreshProfile } = useProfile();
  const profileService = useRef(new ProfileService(storage));
  const audioServiceRef = useRef<AudioService | null>(null);

  const [phase, setPhase] = useState<CalibrationStep>({ step: 'ear-select' });

  useEffect(() => {
    const adapter = new WebAudioAdapter();
    audioServiceRef.current = new AudioService(adapter);
    return () => {
      audioServiceRef.current?.dispose();
    };
  }, []);

  async function handleConfirmFrequency(ear: Ear, frequencyHz: number) {
    const earProfile: EarProfile = {
      frequencyHz: Math.round(frequencyHz),
      loudnessLevel: 5,
      loudnessDbHL: null,
      calibratedAt: new Date().toISOString(),
      passesCompleted: 1,
      validationConfirmed: true,
    };
    await profileService.current.updateEarProfile(ear, earProfile);
    await refreshProfile();
    setPhase({ step: 'ear-done', completedEar: ear });
  }

  function handleEarDoneContinue(completedEar: Ear) {
    const otherEar: Ear = completedEar === 'left' ? 'right' : 'left';
    const otherCalibrated = profile?.ears[otherEar] != null;
    if (otherCalibrated) {
      setPhase({ step: 'complete' });
    } else {
      setPhase({ step: 'tuning', ear: otherEar });
    }
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
            onSelectEar={(ear) => {
              const existingHz = profile?.ears[ear]?.frequencyHz;
              setPhase({ step: 'tuning', ear, initialHz: existingHz });
            }}
          />
        );

      case 'tuning':
        return (
          <FrequencyTuner
            ear={phase.ear}
            initialHz={phase.initialHz}
            audioService={audioServiceRef.current}
            onConfirm={(hz) => handleConfirmFrequency(phase.ear, hz)}
          />
        );

      case 'ear-done':
        return (
          <CalibrationDoneView
            completedEar={phase.completedEar}
            profile={profile}
            onCalibrateOtherEar={() => handleEarDoneContinue(phase.completedEar)}
            onFinish={() => setPhase({ step: 'complete' })}
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
