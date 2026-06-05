import type { Profile, Ear } from '../../types';
import styles from './EarSelector.module.css';

interface Props {
  profile: Profile | null;
  onSelectEar(ear: Ear): void;
}

export default function EarSelector({ profile, onSelectEar }: Props) {
  const leftDone = profile?.ears.left != null;
  const rightDone = profile?.ears.right != null;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Calibrate your tinnitus</h1>
      <p className={styles.subtitle}>
        We'll sweep through frequencies and you tap when you hear your tinnitus tone.
        Do each ear separately with one earbud at a time.
      </p>

      <div className={styles.earButtons}>
        <button className={styles.earBtn} onClick={() => onSelectEar('left')}>
          <span className={styles.earLabel}>Left ear</span>
          {leftDone && (
            <span className={styles.doneTag}>
              {profile!.ears.left!.frequencyHz} Hz — recalibrate
            </span>
          )}
          {!leftDone && <span className={styles.newTag}>Not calibrated</span>}
        </button>

        <button className={styles.earBtn} onClick={() => onSelectEar('right')}>
          <span className={styles.earLabel}>Right ear</span>
          {rightDone && (
            <span className={styles.doneTag}>
              {profile!.ears.right!.frequencyHz} Hz — recalibrate
            </span>
          )}
          {!rightDone && <span className={styles.newTag}>Not calibrated</span>}
        </button>
      </div>

      {(leftDone || rightDone) && (
        <p className={styles.note}>
          Tap an ear to recalibrate it, or use the back button to skip.
        </p>
      )}
    </div>
  );
}
