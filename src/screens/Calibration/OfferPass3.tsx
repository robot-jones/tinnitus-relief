import type { Ear } from '../../types';
import styles from './OfferPass3.module.css';

interface Props {
  ear: Ear;
  detectedHz: number;
  onAccept(): void;
  onDecline(): void;
}

export default function OfferPass3({ ear, detectedHz, onAccept, onDecline }: Props) {
  const earLabel = ear === 'left' ? 'Left ear' : 'Right ear';
  const hzLabel = detectedHz < 1000
    ? `${Math.round(detectedHz)} Hz`
    : `${(detectedHz / 1000).toFixed(2)} kHz`;

  return (
    <div className={styles.container}>
      <span className={styles.earTag}>{earLabel}</span>
      <h2 className={styles.title}>Detected {hzLabel}</h2>
      <p className={styles.body}>
        Do you want a short precision pass over a tighter range for extra accuracy?
        This takes about 8 seconds.
      </p>
      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onAccept}>
          Yes, precision pass
        </button>
        <button className={styles.secondaryBtn} onClick={onDecline}>
          No, continue
        </button>
      </div>
    </div>
  );
}
