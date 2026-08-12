# Voice Assistant — Phase 1 (Navigation-Only) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add always-on voice navigation to the CRM — recognition starts automatically on Admin/Employee login, keeps running for the whole session (self-restarting past the browser's natural silence timeout), and navigates to a CRM page when the user says a trigger phrase ("go to…", "open…", "navigate to…", "show…") followed by a page name. "Mute"/"resume" pause and resume command execution without stopping the underlying mic engine. No AI/Claude dependency — pure browser API + deterministic string matching.

**Architecture:** Three new isolated modules — a pure command-matcher (`voiceCommands.js`), a browser-API wrapper hook (`useVoiceRecognition.js`), and a context provider (`VoiceAssistantContext.jsx`) that wires the two together with `react-router-dom`'s `useNavigate` and the existing role-aware nav registry (`getCrmCommandItems`). The provider mounts around the existing CRM-authenticated route branch in `App.jsx`, so it starts/stops as a natural side effect of that branch mounting/unmounting on login/logout — no changes to `AuthContext`, `authApi.logout()`, or any login page. A small status pill in `PortalLayout`'s existing utility bar surfaces state and offers a manual retry when mic permission is blocked.

**Tech Stack:** React 18, `react-router-dom` v7, `react-hot-toast` (already a dependency), browser `SpeechRecognition`/`webkitSpeechRecognition` Web Speech API (no new npm dependency).

## Global Constraints

- No new npm dependencies — Web Speech API is a browser global, not a package.
- No changes to `Client/src/context/AuthContext.jsx`, `Client/src/api/auth.js`, or any login page (`AdminLogin.jsx`, `EmployeeLogin.jsx`, `ClientLogin.jsx`).
- No test framework exists in `Client/` (confirmed: no Jest/Vitest/testing-library in `package.json`) and none is being introduced by this plan — verification is manual via the dev server, plus ad hoc `node` sanity checks for pure logic (not committed as a test suite).
- Must not affect the public marketing site, distributor/Prakriti marketplace portal, or the `⌘K` `CommandPalette` — this feature only mounts inside the CRM-authenticated branch (`isCRM && user` in `App.jsx`).
- Out of scope (per the approved spec): any data-entry/free-form action (lead creation, exports, etc.), TTS spoken confirmations, wake-word support. These stay blocked on pending Claude API billing approval and are not touched by this plan.
- Trigger phrases: `go to`, `open`, `navigate to`, `show` (+ `show me`). A page name mentioned without one of these leading phrases must never trigger navigation.
- Mute words: `mute`, `pause`, `stop listening`. Resume words: `resume`, `unmute`, `resume listening`, `start listening`. These work in any state except fully stopped (logged out), independent of trigger-phrase matching.

---

### Task 1: Command matcher (`voiceCommands.js`)

**Files:**
- Create: `Client/src/utils/voiceCommands.js`

**Interfaces:**
- Consumes: nothing (pure module, no imports beyond none needed).
- Produces: `matchCommand(transcript: string, navItems: Array<{to: string, label: string, children?: Array<{to: string, label: string}>}>) => { type: 'mute' } | { type: 'resume' } | { type: 'navigate', to: string, label: string } | null`. Later tasks (Task 3) call this exact signature with the array returned by `getCrmCommandItems(user)`.

- [ ] **Step 1: Write the module**

```js
// Client/src/utils/voiceCommands.js

const TRIGGER_PHRASES = ['navigate to', 'go to', 'show me', 'open', 'show'];
const MUTE_WORDS = ['stop listening', 'mute', 'pause'];
const RESUME_WORDS = ['resume listening', 'start listening', 'resume', 'unmute'];

// Accidental navigation from an always-hot mic is the main risk here, so
// fuzzy matching is deliberately conservative: exact/substring matches are
// free, anything else must be within 2 character edits of a real label.
const MAX_FUZZY_DISTANCE = 2;

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

function matchesLeadingPhrase(normalized, words) {
  return words.some((word) => normalized === word || normalized.startsWith(`${word} `));
}

function flattenNavItems(navItems) {
  const flat = [];
  for (const item of navItems) {
    if (item && item.to && item.label) {
      flat.push({ to: item.to, label: item.label });
    }
    if (item && Array.isArray(item.children)) {
      for (const child of item.children) {
        if (child && child.to && child.label) {
          flat.push({ to: child.to, label: child.label });
        }
      }
    }
  }
  return flat;
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function bestLabelMatch(remainder, flatItems) {
  const target = normalize(remainder);
  if (!target) return null;

  let best = null;
  let bestScore = Infinity;

  for (const item of flatItems) {
    const label = normalize(item.label);
    let score = Infinity;

    if (label === target) {
      score = 0;
    } else if (label.includes(target) || target.includes(label)) {
      score = 1;
    } else {
      const dist = levenshtein(target, label);
      if (dist <= MAX_FUZZY_DISTANCE) score = 2 + dist;
    }

    if (score < bestScore) {
      bestScore = score;
      best = item;
    }
  }

  return bestScore < Infinity ? best : null;
}

export function matchCommand(transcript, navItems) {
  const normalized = normalize(transcript || '');
  if (!normalized) return null;

  if (matchesLeadingPhrase(normalized, MUTE_WORDS)) {
    return { type: 'mute' };
  }
  if (matchesLeadingPhrase(normalized, RESUME_WORDS)) {
    return { type: 'resume' };
  }

  const trigger = [...TRIGGER_PHRASES]
    .sort((a, b) => b.length - a.length)
    .find((phrase) => normalized === phrase || normalized.startsWith(`${phrase} `));

  if (!trigger) return null;

  const remainder = normalized.slice(trigger.length).trim();
  const match = bestLabelMatch(remainder, flattenNavItems(navItems || []));

  return match ? { type: 'navigate', to: match.to, label: match.label } : null;
}
```

- [ ] **Step 2: Sanity-check it manually with Node**

This module has zero React/browser dependencies, so it can be checked directly with plain `node` before it's ever wired into the app. Run this from `Client/`:

```bash
node --input-type=module -e "
import { matchCommand } from './src/utils/voiceCommands.js';

const navItems = [
  { to: '/crm/dashboard', label: 'Dashboard' },
  { to: '/crm/leads', label: 'Leads' },
  {
    to: '/crm/distributors', label: 'Distributors',
    children: [{ to: '/crm/distributors/tea', label: 'Tea Orders' }]
  }
];

console.log(matchCommand('go to leads', navItems));
console.log(matchCommand('open the leads page', navItems));
console.log(matchCommand('navigate to tea orders', navItems));
console.log(matchCommand('we should go to lunch later', navItems));
console.log(matchCommand('mute', navItems));
console.log(matchCommand('please resume listening', navItems));
console.log(matchCommand('leads', navItems));
"
```

Expected output: the first three lines are `{ type: 'navigate', to: '/crm/leads', label: 'Leads' }`, `{ type: 'navigate', to: '/crm/leads', label: 'Leads' }`, `{ type: 'navigate', to: '/crm/distributors/tea', label: 'Tea Orders' }`. The 4th line (no trigger phrase, "lunch" isn't a nav label) and the last line ("leads" alone, no trigger phrase) must both print `null` — this is the false-positive guard working. Line 5 is `{ type: 'mute' }`, line 6 is `{ type: 'resume' }`.

If any line doesn't match, fix `voiceCommands.js` before moving on — this module is the correctness core of the whole feature.

- [ ] **Step 3: Commit**

```bash
git add Client/src/utils/voiceCommands.js
git commit -m "feat: add voice command matcher for CRM navigation"
```

---

### Task 2: Recognition engine hook (`useVoiceRecognition.js`)

**Files:**
- Create: `Client/src/hooks/useVoiceRecognition.js`

**Interfaces:**
- Consumes: nothing from other new files (only React + the browser's global `SpeechRecognition`/`webkitSpeechRecognition`).
- Produces: `useVoiceRecognition({ onFinalTranscript?: (transcript: string) => void }) => { status: 'off'|'listening'|'muted'|'blocked'|'unsupported', lastTranscript: string, start: () => void, stop: () => void, setMuted: (muted: boolean) => void }`. Task 3 calls this exact shape.

- [ ] **Step 1: Write the hook**

```js
// Client/src/hooks/useVoiceRecognition.js
import { useCallback, useEffect, useRef, useState } from 'react';

const RESTART_DELAY_MS = 250;
const FATAL_ERRORS = new Set(['not-allowed', 'service-not-allowed', 'audio-capture']);

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function useVoiceRecognition({ onFinalTranscript } = {}) {
  const SpeechRecognitionCtor = getSpeechRecognitionCtor();
  const [status, setStatus] = useState(SpeechRecognitionCtor ? 'off' : 'unsupported');
  const [lastTranscript, setLastTranscript] = useState('');

  const recognitionRef = useRef(null);
  // Source of truth for what SHOULD be happening, independent of what the
  // (often flaky) browser engine actually reports via onend/onerror.
  const desiredStateRef = useRef('off');
  const restartTimeoutRef = useRef(null);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  const clearRestartTimeout = useCallback(() => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  }, []);

  const ensureEngine = useCallback(() => {
    if (!SpeechRecognitionCtor || recognitionRef.current) return recognitionRef.current;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      if (result && result.isFinal) {
        const transcript = result[0].transcript;
        setLastTranscript(transcript);
        if (onFinalTranscriptRef.current) onFinalTranscriptRef.current(transcript);
      }
    };

    recognition.onerror = (event) => {
      if (FATAL_ERRORS.has(event.error)) {
        desiredStateRef.current = 'off';
        clearRestartTimeout();
        setStatus('blocked');
      }
      // Transient errors (no-speech, network, aborted) are left to onend's
      // restart logic below — that's the actual fix for the silence-timeout
      // problem, not anything done here.
    };

    recognition.onend = () => {
      if (desiredStateRef.current === 'off') return;
      clearRestartTimeout();
      restartTimeoutRef.current = setTimeout(() => {
        try {
          recognitionRef.current && recognitionRef.current.start();
        } catch {
          // InvalidStateError from a start/stop race - next onend retries.
        }
      }, RESTART_DELAY_MS);
    };

    recognitionRef.current = recognition;
    return recognition;
  }, [SpeechRecognitionCtor, clearRestartTimeout]);

  const start = useCallback(() => {
    if (!SpeechRecognitionCtor) return;
    desiredStateRef.current = 'listening';
    setStatus('listening');
    const recognition = ensureEngine();
    try {
      recognition.start();
    } catch {
      // Already started - ignore, the existing session continues.
    }
  }, [SpeechRecognitionCtor, ensureEngine]);

  const stop = useCallback(() => {
    desiredStateRef.current = 'off';
    clearRestartTimeout();
    setStatus('off');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [clearRestartTimeout]);

  const setMuted = useCallback((muted) => {
    if (desiredStateRef.current === 'off') return;
    desiredStateRef.current = muted ? 'muted' : 'listening';
    setStatus(muted ? 'muted' : 'listening');
  }, []);

  useEffect(() => clearRestartTimeout, [clearRestartTimeout]);

  return { status, lastTranscript, start, stop, setMuted };
}
```

- [ ] **Step 2: Manual verification in the browser**

There's no automated way to exercise real `SpeechRecognition` outside a browser, so this is checked once Task 3/4 wire it into the app (see Task 6). For now, just confirm the file has no syntax errors:

```bash
cd Client && node --check src/hooks/useVoiceRecognition.js
```

Expected: no output (exit code 0). Note `node --check` only validates syntax, not JSX-free — this file is plain JS (no JSX), so this works directly.

- [ ] **Step 3: Commit**

```bash
git add Client/src/hooks/useVoiceRecognition.js
git commit -m "feat: add browser SpeechRecognition wrapper hook with auto-restart"
```

---

### Task 3: `VoiceAssistantProvider` context

**Files:**
- Create: `Client/src/context/VoiceAssistantContext.jsx`

**Interfaces:**
- Consumes:
  - `useVoiceRecognition({ onFinalTranscript }) => { status, lastTranscript, start, stop, setMuted }` (Task 2)
  - `matchCommand(transcript, navItems) => { type, to?, label? } | null` (Task 1)
  - `getCrmCommandItems(user)` from `Client/src/config/crmNav.js` (existing)
  - `useAuth()` from `Client/src/hooks/useAuth.js` (existing) → `{ user }`
  - `useNavigate()` from `react-router-dom` (existing dependency)
  - `toast` default export from `react-hot-toast` (existing dependency, same import style as `Client/src/components/Layout/Sidebar.jsx:12`)
- Produces:
  - `VoiceAssistantProvider` component (wraps `children`)
  - `useVoiceAssistant() => { status: 'off'|'listening'|'muted'|'blocked'|'unsupported', lastTranscript: string, retryListening: () => void }`. Task 5 (status pill) calls this exact hook/shape.

- [ ] **Step 1: Write the provider**

```jsx
// Client/src/context/VoiceAssistantContext.jsx
import React, { createContext, useCallback, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { matchCommand } from '../utils/voiceCommands';
import { getCrmCommandItems } from '../config/crmNav';

const VoiceAssistantContext = createContext(null);

export function VoiceAssistantProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // setMuted only exists once useVoiceRecognition below has been called, but
  // handleTranscript (passed INTO that same call) needs to invoke it - a ref
  // breaks the circular dependency without relying on stale closures.
  const setMutedRef = useRef(() => {});

  const handleTranscript = useCallback((transcript) => {
    const navItems = getCrmCommandItems(user);
    const command = matchCommand(transcript, navItems);
    if (!command) return;

    if (command.type === 'mute') {
      setMutedRef.current(true);
      toast('Voice assistant muted. Say "resume" to continue.');
      return;
    }

    if (command.type === 'resume') {
      setMutedRef.current(false);
      toast.success('Voice assistant listening again.');
      return;
    }

    if (command.type === 'navigate') {
      navigate(command.to);
      toast.success(`Voice: opening ${command.label}`);
    }
  }, [user, navigate]);

  const { status, lastTranscript, start, stop, setMuted } = useVoiceRecognition({
    onFinalTranscript: handleTranscript
  });

  useEffect(() => {
    setMutedRef.current = setMuted;
  }, [setMuted]);

  // This provider only exists while a CRM user is logged in (see the mount
  // point in App.jsx), so mount/unmount IS login/logout - no separate
  // logout wiring needed.
  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = { status, lastTranscript, retryListening: start };

  return (
    <VoiceAssistantContext.Provider value={value}>
      {children}
    </VoiceAssistantContext.Provider>
  );
}

export function useVoiceAssistant() {
  const context = useContext(VoiceAssistantContext);
  if (!context) {
    throw new Error('useVoiceAssistant must be used within VoiceAssistantProvider');
  }
  return context;
}
```

- [ ] **Step 2: Syntax check**

```bash
cd Client && npx vite build --mode development 2>&1 | head -50
```

This is a full build rather than a targeted check because there's no test runner or standalone JSX syntax checker configured in this project — a dev-mode build is the fastest way to catch a JSX/import error in the new file without waiting on the full production build (prerendering etc.). Expected: build succeeds (no errors mentioning `VoiceAssistantContext.jsx`). It's fine if this build isn't the one you ship — Task 6 does a real `npm run dev` walkthrough.

- [ ] **Step 3: Commit**

```bash
git add Client/src/context/VoiceAssistantContext.jsx
git commit -m "feat: add VoiceAssistantProvider wiring recognition to CRM navigation"
```

---

### Task 4: Mount the provider in `App.jsx`

**Files:**
- Modify: `Client/src/App.jsx:60` (imports area) and `Client/src/App.jsx:192-298` (the `isCRM && user` branch)

**Interfaces:**
- Consumes: `VoiceAssistantProvider` from `Client/src/context/VoiceAssistantContext.jsx` (Task 3).
- Produces: nothing new for other tasks — this is the activation point.

- [ ] **Step 1: Add the import**

In `Client/src/App.jsx`, alongside the existing layout imports (around line 60-62):

```js
import PortalLayout from './components/Layout/PortalLayout';
import Footer from './components/Layout/Footer';
import ChatWidget from './components/Chat/ChatWidget';
import { VoiceAssistantProvider } from './context/VoiceAssistantContext';
```

- [ ] **Step 2: Wrap the CRM-authenticated branch**

Find this block (currently at `Client/src/App.jsx:192-298`):

```jsx
  if (isCRM && user) {
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    if (isClient) {
      return <Navigate to="/" replace />;
    }
    return (
      <PortalLayout>
        <ScrollToTop /> {/* <-- INJECTED TO HANDLE CRM DASHBOARD CHANNELS */}
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ...all the existing <Route> entries, unchanged... */}
        </Routes>
        </Suspense>
        <ChatWidget />
      </PortalLayout>
    );
  }
```

Change only the `return (...)` wrapping — leave every `<Route>` entry inside completely untouched:

```jsx
  if (isCRM && user) {
    const isClient = user.employeeId && user.employeeId.startsWith('CL_');
    if (isClient) {
      return <Navigate to="/" replace />;
    }
    return (
      <VoiceAssistantProvider>
        <PortalLayout>
          <ScrollToTop /> {/* <-- INJECTED TO HANDLE CRM DASHBOARD CHANNELS */}
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* ...all the existing <Route> entries, unchanged... */}
          </Routes>
          </Suspense>
          <ChatWidget />
        </PortalLayout>
      </VoiceAssistantProvider>
    );
  }
```

Concretely: add `<VoiceAssistantProvider>` immediately before `<PortalLayout>` and its matching `</VoiceAssistantProvider>` immediately after `</PortalLayout>`. Do not touch anything between `<Routes>` and `</Routes>`.

- [ ] **Step 3: Verify the app still boots**

```bash
cd Client && npm run dev
```

Open the printed local URL, log in as an Admin or Employee, and confirm the CRM dashboard loads exactly as before (no visible change yet — the status pill isn't added until Task 5). Check the browser console for errors mentioning `VoiceAssistantContext` or `useVoiceAssistant`. Stop the dev server (Ctrl+C) once confirmed.

- [ ] **Step 4: Commit**

```bash
git add Client/src/App.jsx
git commit -m "feat: mount VoiceAssistantProvider around the CRM-authenticated routes"
```

---

### Task 5: Status pill in the CRM utility bar

**Files:**
- Create: `Client/src/components/Layout/VoiceStatusPill.jsx`
- Modify: `Client/src/components/Layout/PortalLayout.jsx:104-109`

**Interfaces:**
- Consumes: `useVoiceAssistant()` from `Client/src/context/VoiceAssistantContext.jsx` (Task 3) → `{ status, retryListening }`.
- Produces: nothing consumed by later tasks — this is the last piece of Phase 1.

- [ ] **Step 1: Write the pill component**

Follows the same CSS-variable/mono-label visual language as `CommandPalette.jsx` (`Client/src/components/Layout/CommandPalette.jsx`) so it reads as part of the same utility bar, not a bolted-on widget.

```jsx
// Client/src/components/Layout/VoiceStatusPill.jsx
import React from 'react';
import { FiMic, FiMicOff, FiAlertCircle } from 'react-icons/fi';
import { useVoiceAssistant } from '../../context/VoiceAssistantContext';

const STATUS_CONFIG = {
  listening: { icon: FiMic, label: 'Listening', color: 'var(--crm-accent)' },
  muted: { icon: FiMicOff, label: 'Muted', color: 'var(--crm-ink-faint)' },
  blocked: { icon: FiAlertCircle, label: 'Mic blocked - click to retry', color: '#ef4444' },
  off: null,
  unsupported: null
};

export default function VoiceStatusPill() {
  const { status, retryListening } = useVoiceAssistant();
  const config = STATUS_CONFIG[status];

  if (!config) return null;

  const Icon = config.icon;
  const clickable = status === 'blocked';

  return (
    <button
      type="button"
      onClick={clickable ? retryListening : undefined}
      disabled={!clickable}
      className="hidden md:flex items-center gap-1.5 text-[10px] uppercase tracking-wide px-3 py-1.5 rounded-sm border transition-all"
      style={{
        fontFamily: 'var(--crm-font-mono)',
        color: config.color,
        borderColor: 'var(--crm-line)',
        background: 'var(--crm-bg-raised)',
        cursor: clickable ? 'pointer' : 'default'
      }}
      aria-label={config.label}
      title={config.label}
    >
      <Icon size={12} />
      <span>{config.label}</span>
    </button>
  );
}
```

- [ ] **Step 2: Render it in `PortalLayout`'s utility bar**

In `Client/src/components/Layout/PortalLayout.jsx`, add the import near the other component imports (currently line 4-5):

```jsx
import Sidebar from './Sidebar';
import CommandPalette from './CommandPalette';
import VoiceStatusPill from './VoiceStatusPill';
```

Then in the desktop utility bar block (currently `Client/src/components/Layout/PortalLayout.jsx:104-109`):

```jsx
          <div
            className="hidden md:flex items-center justify-end px-8 py-3 border-b"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <CommandPalette />
          </div>
```

change to:

```jsx
          <div
            className="hidden md:flex items-center justify-end gap-3 px-8 py-3 border-b"
            style={{ borderColor: 'var(--crm-line)' }}
          >
            <VoiceStatusPill />
            <CommandPalette />
          </div>
```

(Adds `gap-3` so the two pills don't sit flush against each other.)

- [ ] **Step 3: Verify in the browser**

```bash
cd Client && npm run dev
```

Log in as Admin or Employee. Grant microphone permission when the browser prompts. Confirm a "Listening" pill appears in the desktop utility bar (next to the `⌘K` search button). Stop the dev server once confirmed.

- [ ] **Step 4: Commit**

```bash
git add Client/src/components/Layout/VoiceStatusPill.jsx Client/src/components/Layout/PortalLayout.jsx
git commit -m "feat: add voice assistant status pill to CRM utility bar"
```

---

### Task 6: End-to-end manual verification

**Files:** none (verification only, no code changes expected — if any step fails, go back and fix the relevant task above, then re-run this whole task).

**Interfaces:** N/A.

- [ ] **Step 1: Start the dev server**

```bash
cd Client && npm run dev
```

- [ ] **Step 2: Admin login walkthrough**

Log in as an Admin. Confirm:
- The status pill shows "Listening" shortly after login (may briefly show a browser mic-permission prompt first — accept it).
- Say "go to leads" — confirm it navigates to `/crm/leads` and a toast confirms it.
- Say "open dashboard" — confirm it navigates to `/crm/dashboard`.
- Say "show distributors" — confirm it navigates (Admin has access to `/crm/distributors`).

- [ ] **Step 3: Mute/resume**

Say "mute". Confirm the pill switches to "Muted". Say "go to leads" — confirm it does NOT navigate (still muted). Say "resume". Confirm the pill switches back to "Listening", then say "go to leads" again and confirm it now navigates.

- [ ] **Step 4: False-positive guard**

While on any CRM page, say a sentence that mentions a page name without a trigger phrase, e.g. "the leads look good today" — confirm it does NOT navigate anywhere.

- [ ] **Step 5: Silence-restart check**

Stay on a CRM page without speaking for at least 2-3 minutes (past whatever silence timeout the browser would normally apply). Afterward, say "go to dashboard" — confirm it still navigates, proving the auto-restart-on-`onend` logic in `useVoiceRecognition.js` kept the engine alive.

- [ ] **Step 6: Employee role-scoping check**

Log out, then log in as a non-Admin Employee (one without `leadPermission`, if available in your test data). Say "go to leads" — confirm it does NOT navigate, since `getCrmCommandItems(user)` (the existing role-aware registry) wouldn't have included Leads for this user in the first place — matching how `⌘K` already behaves for the same user.

- [ ] **Step 7: Logout check**

Click logout. Confirm the browser's mic-in-use indicator (tab icon or OS-level indicator) turns off, and the status pill is gone (since `PortalLayout`/`VoiceAssistantProvider` have unmounted).

- [ ] **Step 8: Regression pass**

Confirm unaffected by this feature:
- Admin login, Employee login, and Google OAuth login all still work.
- `⌘K` `CommandPalette` still opens and navigates correctly.
- CRM sidebar navigation still works.
- The public marketing site (`/`, `/products`, etc.) shows no voice UI and has no console errors related to `VoiceAssistantContext`.

- [ ] **Step 9: Final commit (if any fixes were needed during this task)**

```bash
git add -A
git commit -m "fix: address issues found during voice assistant e2e verification"
```

(Skip this step entirely if no fixes were needed.)
