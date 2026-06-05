import type { Ear, Profile } from '../../types';
import styles from './CalibrationDoneView.module.css';

interface Props {
  completedEar: Ear;
  profile: Profile | null;
  onCalibrateOtherEar(): void;
  onFinish(): void;
}

export default function CalibrationDoneView({ completedEar, profile, onCalibrateOtherEar, onFinish }: Props) {
  const otherEar: Ear = completedEar === 'left' ? 'right' : 'left';
  const otherEarLabel = otherEar === 'left' ? 'Left ear' : 'Right ear';
  const completedEarLabel = completedEar === 'left' ? 'Left ear' : 'Right ear';
  const otherDone = profile?.ears[otherEar] != null;

  const earProfile = profile?.ears[completedEar];
  const hzLabel = earProfile
    ? earProfile.frequencyHz < 1000
      ? `${earProfile.frequencyHz} Hz`
      : `${(earProfile.frequencyHz / 1000).toFixed(2)} kHz`
    : '';

  return (
    <div className={styles.container}>
      <div className={styles.checkmark}>✓</div>
      <h2 className={styles.title}>{completedEarLabel} calibrated</h2>
      {hzLabel && <p className={styles.hz}>{hzLabel}</p>}

      {!otherDone && (
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onCalibrateOtherEar}>
            Calibrate {otherEarLabel} too
          </button>
          <button className={styles.secondaryBtn} onClick={onFinish}>
            Skip, just one ear
          </button>
        </div>
      )}

      {otherDone && (
        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onFinish}>
            Both ears done — finish
          </button>
        </div>
      )}
    </div>
  );
}
