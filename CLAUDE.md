# CLAUDE.md

This file contains architectural guidance, conventions, and context for Claude Code when working in this repository. Read this before making any non-trivial changes.

---

## Project summary

A progressive web app for tinnitus auditory training. Users calibrate their tinnitus frequency per ear, then run daily training sessions that play matched tones with periodic silences. The app tracks perception over time.

The core technical constraint: **audio reliability is the product**. A session that skips, drifts, or fails to play the correct frequency is a broken experience. Every audio-related decision should prioritize correctness and reliability over cleverness.

---

## Architectural principles

### 1. The adapter pattern is non-negotiable

The app is built to wrap in Capacitor later without changing service or UI code. This requires:

- `AudioAdapter` and `StorageAdapter` are **interfaces**, not implementations
- `WebAudioAdapter` and `IdbStorageAdapter` are the current browser implementations
- Services **only import adapter interfaces**, never concrete implementations
- Adapter instances are injected at the app root (`main.tsx`)

When adding features that touch platform APIs (audio, storage, notifications, device info), always go through an adapter. If no adapter interface exists yet, create one.

Never import `window`, `document`, or Web Audio API types directly into service files. Put them in `WebAudioAdapter.ts`.

### 2. Service layer is pure TypeScript

`AudioService`, `SessionService`, and `ProfileService` are plain TypeScript classes. They:
- Accept adapter interfaces via constructor injection
- Return typed domain objects (from `src/types/index.ts`)
- Do not import React, hooks, or any UI library
- Do not access the DOM directly
- Can be unit tested without a browser

### 3. UI layer does not contain business logic

React components and screens handle rendering and user interaction only. They call service methods and display results. They do not:
- Implement audio scheduling logic
- Write directly to IndexedDB
- Contain session state machines

Use context (`SessionContext`, `ProfileContext`) to share service-layer state across components.

---

## Domain types

All domain types live in `src/types/index.ts`. Key types:

```typescript
type Ear = 'left' | 'right';

interface EarProfile {
  frequencyHz: number;
  loudnessLevel: number;        // 1–10 subjective scale
  loudnessDbHL: number | null;
  calibratedAt: string;         // ISO timestamp
  passesCompleted: 1 | 2 | 3;
  validationConfirmed: boolean;
}

interface Profile {
  id: string;                   // uuid
  createdAt: string;
  updatedAt: string;
  ears: {
    left: EarProfile | null;
    right: EarProfile | null;
  };
}

type CompletionStatus = 'completed' | 'partial' | 'abandoned';
// completed = completionPct >= 0.8
// partial   = completionPct >= 0.25
// abandoned = completionPct < 0.25

interface SessionConfig {
  toneOnMs: number;
  toneOffMs: number;
  fadeMs: number;
  frequencyHz: { left?: number; right?: number };
  volumeLevel: number;          // 1–10, derived from calibrated loudness at session start
}

interface SessionEvent {
  type: 'tone_on' | 'tone_off' | 'paused' | 'resumed';
  offsetMs: number;             // ms from session start
}

interface Session {
  id: string;
  startedAt: string;
  completedAt: string | null;
  durationTarget: number;       // seconds
  durationActual: number;
  ears: 'left' | 'right' | 'both';
  config: SessionConfig;        // snapshot at time of session — never a reference to current settings
  completionPct: number;        // 0.0–1.0
  completionStatus: CompletionStatus;
  postSessionFeeling: 'better' | 'same' | 'worse' | null;
  events: SessionEvent[];
  platform: 'ios' | 'android' | 'desktop' | 'unknown';
  wakeLockGranted: boolean;
}

interface Settings {
  sweepSpeedMultiplier: number; // 0.5–2.0 mapped from 1–5 UI steps
  defaultSessionDurationS: number;
  defaultToneOnMs: number;
  defaultToneOffMs: number;
  defaultFadeMs: number;
  theme: 'system' | 'light' | 'dark';
  remindersEnabled: boolean;
  reminderTime: string;         // HH:MM
  streakAlertsEnabled: boolean;
  onboardingComplete: boolean;
}
```

---

## Audio scheduling

**This is the most critical implementation detail in the codebase.**

Do not use `setTimeout` or `setInterval` for tone scheduling. They drift over long sessions and are throttled by browsers in background tabs.

Use the **Web Audio lookahead clock scheduler** pattern:

- `AudioContext.currentTime` is the clock — it runs independently of the JS event loop
- Schedule audio events (gain changes, frequency changes) ahead of time using `AudioParam` methods
- Use a short lookahead (e.g. 100ms) and a scheduling interval (e.g. 50ms via `setTimeout`) to keep scheduling ahead
- The `setTimeout` is only used to trigger the next scheduling pass, not to time individual audio events

```typescript
// Correct pattern
const LOOKAHEAD_S = 0.1;
const SCHEDULE_INTERVAL_MS = 50;

function scheduleNextEvents() {
  const now = audioContext.currentTime;
  while (nextEventTime < now + LOOKAHEAD_S) {
    scheduleEvent(nextEventTime);
    nextEventTime += getNextEventDuration();
  }
  scheduleTimer = window.setTimeout(scheduleNextEvents, SCHEDULE_INTERVAL_MS);
}
```

Tone fades use `gainNode.gain.linearRampToValueAtTime` — never set gain abruptly to avoid clicks.

---

## Calibration flow

The calibration uses a bracketing approach across up to 3 passes:

| Pass | Range | Trigger |
|------|-------|---------|
| 1 | 250–12,000 Hz | Auto-start |
| 2 | ±18% of pass 1 result | Auto-start after pass 1 tap |
| 3 | ±5% of pass 2 result | Opt-in |

After pitch passes: validation playback (user confirms or re-sweeps), then loudness matching via slider.

Sweep uses exponential frequency ramps via `AudioParam.exponentialRampToValueAtTime` — not linear. Linear sweeps sound uneven because human pitch perception is logarithmic.

Fade in/out at sweep range boundaries to avoid jarring edges when the sweep restarts.

---

## Storage (IndexedDB via `idb`)

Three object stores:

| Store | Key | Notes |
|-------|-----|-------|
| `profile` | `id` | Single record in practice |
| `sessions` | `id` | Append-only log |
| `settings` | `'singleton'` | Single record |

Schema version and migrations live in `src/db/schema.ts`. When adding fields to existing types, always write a migration that sets sensible defaults for existing records. Never assume a field exists on a record read from storage — use nullish coalescing.

Typed query helpers live in `src/db/queries.ts`. All IndexedDB access should go through these helpers, not through raw `idb` calls scattered in services.

---

## Routing and onboarding gate

Four top-level routes:

| Route | Screen |
|-------|--------|
| `/calibration` | Calibration flow |
| `/session` | Session pre-screen + active session |
| `/history` | Progress tracking |
| `/settings` | Settings |

Root route `/` redirects to `/calibration` if `settings.onboardingComplete === false`, otherwise to `/session`.

Do not add nested routing unless a screen genuinely requires it. Keep the route structure flat.

---

## PWA and service worker

Managed by `vite-plugin-pwa`. Configuration in `vite.config.ts`.

Cache strategy: `StaleWhileRevalidate` for all static assets. The app is fully local-first — there is no API to call, so `NetworkFirst` is never appropriate.

The service worker should precache all app assets. Test offline behavior before shipping any release.

---

## Session completion thresholds

These thresholds determine `completionStatus` from `completionPct`:

```typescript
function deriveCompletionStatus(pct: number): CompletionStatus {
  if (pct >= 0.8) return 'completed';
  if (pct >= 0.25) return 'partial';
  return 'abandoned';
}
```

Only `completed` sessions (pct >= 0.8) count toward streaks. This threshold is defined once in `SessionService` — do not hardcode it in UI components.

---

## Platform detection

Detect platform at session start for the `platform` field on Session records:

```typescript
function detectPlatform(): Session['platform'] {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  if (/Mobi/.test(ua)) return 'android'; // fallback for other mobile
  return 'desktop';
}
```

---

## Wake Lock

Request at session start, release at session end or pause:

```typescript
let wakeLock: WakeLockSentinel | null = null;

async function requestWakeLock(): Promise<boolean> {
  if (!('wakeLock' in navigator)) return false;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    return true;
  } catch {
    return false;
  }
}
```

Store the result as `wakeLockGranted` on the Session record. On iOS, the Wake Lock API is not supported — show a soft inline message on the session pre-screen: "Keep your screen on during sessions for best results." Do not block the session start.

---

## Gap ratio warning

Show a warning when `toneOffMs > toneOnMs / 2`. This logic lives in the Settings screen component — it is a UI concern, not a service-layer validation. Do not prevent the user from saving the values; the warning is advisory only.

---

## Styling conventions

- CSS custom properties for all colors and spacing tokens — defined in `src/styles/tokens.css`
- No CSS-in-JS libraries
- No inline `style` props except for dynamic values (e.g. animation progress percentages)
- Component styles in `.module.css` files co-located with their component
- Responsive design mobile-first — the app is primarily a mobile experience

---

## Things to avoid

- Do not use `localStorage` — everything goes through `StorageAdapter` → IndexedDB
- Do not add Redux, Zustand, or any external state management library — React context is sufficient
- Do not import Web Audio API types into service files
- Do not schedule audio events with `setTimeout` — use `AudioContext.currentTime`
- Do not store session config as a reference to current Settings — always snapshot it at session start
- Do not hardcode the streak completion threshold (0.8) outside `SessionService`
- Do not use gradients, shadows, or blur in UI — the design language is flat
- Do not add third-party analytics or tracking of any kind — this is a health-adjacent app and user trust depends on it

---

## Capacitor migration checklist (future)

When wrapping in Capacitor:
- [ ] Write `CapacitorAudioAdapter` implementing `AudioAdapter`
- [ ] Write `CapacitorStorageAdapter` implementing `StorageAdapter` (likely using `@capacitor-community/sqlite`)
- [ ] Swap adapter registrations in `main.tsx`
- [ ] Add `@capacitor/local-notifications` for streak reminders
- [ ] Add background audio entitlement in `Info.plist` (iOS)
- [ ] Test audio context behavior on real iOS hardware
- [ ] Remove PWA install prompt UI (not needed in native wrapper)
