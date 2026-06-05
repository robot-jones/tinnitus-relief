# Tinnitus Relief

A progressive web app for auditory training to help reduce tinnitus perception over time.

## How it works

The app uses gap detection training — playing a tone matched to the user's tinnitus frequency with periodic silences — to help the brain learn to distinguish an external signal from its own internal noise. Over time, this can reduce the perceived loudness and intrusiveness of tinnitus.

The scientific basis draws on:
- **Residual inhibition** — tones near the tinnitus frequency can temporarily suppress perceived ringing after exposure
- **Attention modulation** — tinnitus perception is heavily attention-dependent; training the brain to notice the external/internal distinction reduces salience
- **Gap detection** — periodic silences create the contrast needed for auditory learning

## Features

- **Calibration flow** — multi-pass frequency sweep (coarse → fine-tune → optional precision) per ear, with loudness matching, to build a per-ear hearing profile
- **Training sessions** — configurable tone-on/gap cycles with ambient visual feedback and precise Web Audio API scheduling
- **Progress tracking** — 12-week heatmap calendar, perception trend chart (simple and detailed views), session log
- **Settings** — session defaults, per-ear recalibration, notifications, appearance, advanced audio controls
- **Local-first** — all data stored in IndexedDB on the device, never transmitted anywhere

## Tech stack

- **Framework** — React 18 + TypeScript + Vite
- **PWA** — `vite-plugin-pwa` (Workbox, service worker, offline support)
- **Audio** — Web Audio API with lookahead clock scheduler
- **Storage** — IndexedDB via `idb`
- **Routing** — React Router v6
- **Styling** — Plain CSS with custom properties (no CSS-in-JS)

## Architecture overview

The app is structured in four layers with clean boundaries to support a future Capacitor native wrapper:

```
UI layer (React screens/components)
    ↓
Service layer (AudioService, SessionService, ProfileService)
    ↓
Adapter layer (AudioAdapter, StorageAdapter — swappable interfaces)
    ↓
Platform layer (Web Audio API, IndexedDB today — Capacitor tomorrow)
```

See `CLAUDE.md` for full architectural guidance and conventions.

## Project structure

```
src/
  adapters/
    AudioAdapter.ts          # interface
    WebAudioAdapter.ts       # Web Audio API implementation
    StorageAdapter.ts        # interface
    IdbStorageAdapter.ts     # IndexedDB implementation
  services/
    AudioService.ts          # tone generation, session scheduling, wake lock
    SessionService.ts        # session lifecycle, logging, completion tracking
    ProfileService.ts        # calibration profile CRUD
  contexts/
    SessionContext.tsx        # active session state
    ProfileContext.tsx        # current profile + settings
  screens/
    Calibration/             # multi-pass calibration flow
    Session/                 # active training session
    History/                 # progress tracking + trend charts
    Settings/                # all user preferences
  components/                # shared UI primitives
  db/
    schema.ts                # idb setup and version migrations
    queries.ts               # typed query helpers
  types/
    index.ts                 # all domain types
```

## Getting started

```bash
npm install
npm run dev
```

Requires Node 18+. Open in a browser with headphones connected for the full calibration experience.

## PWA installation

On Android (Chrome): tap the install prompt in the address bar.
On iOS (Safari): tap Share → Add to Home Screen. Note that iOS restricts background audio in PWA context — the app will prompt you to keep your screen on during sessions.

## Capacitor (future)

The adapter layer is designed so that wrapping the app in Capacitor for native iOS/Android distribution requires only:
1. Writing `CapacitorAudioAdapter` implementing `AudioAdapter`
2. Writing `CapacitorStorageAdapter` implementing `StorageAdapter`
3. Swapping adapter registrations at the app root

No screens, services, or business logic need to change.

## Data & privacy

All user data — hearing profile, session history, settings — is stored exclusively in IndexedDB on the user's device. Nothing is transmitted to any server. The app functions fully offline after first load.

Users can export their data as JSON or reset it entirely from Settings → Data.

## License

MIT
