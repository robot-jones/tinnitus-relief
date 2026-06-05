import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import App from './App';
import { ProfileProvider } from './contexts/ProfileContext';
import { SessionProvider } from './contexts/SessionContext';
import { IdbStorageAdapter } from './adapters/IdbStorageAdapter';

const storage = new IdbStorageAdapter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProfileProvider storage={storage}>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ProfileProvider>
  </StrictMode>,
);
