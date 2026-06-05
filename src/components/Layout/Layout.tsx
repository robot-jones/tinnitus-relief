import type { ReactNode } from 'react';
import BottomNav from '../BottomNav/BottomNav';
import styles from './Layout.module.css';

interface Props {
  children: ReactNode;
  hideNav?: boolean;
}

export default function Layout({ children, hideNav }: Props) {
  return (
    <div className={styles.layout}>
      <main className={styles.main}>{children}</main>
      {!hideNav && <BottomNav />}
    </div>
  );
}
