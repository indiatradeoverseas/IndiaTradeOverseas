# Voice Assistant — Phase 1 (Navigation-Only) Design

**Date:** 2026-08-12
**Status:** Approved, ready for implementation planning
**Scope:** CRM portal only (Admin + Employee logins). Public site, distributor/Prakriti marketplace portal are untouched.

## Background

A prior session (2026-07-31) settled the overall long-term architecture for a full voice-controlled CRM assistant: browser Web Speech API for STT/TTS (free), Anthropic Claude for intent parsing/free-form action execution (paid, ongoing dependency), and a declarative "voice action registry" so new voice-controllable actions are additive later. That plan is still the long-term direction — see the `voice-command-feature` memory.

The Claude API billing/key has not yet been approved by the founder, so any action requiring free-form natural-language understanding (e.g. "create a lead for Acme Corp, phone...") cannot be built yet — there's no model to parse the transcript against. Free-form data-entry actions (lead creation, exports, etc.) are explicitly **out of scope** for this phase and remain blocked on that billing decision.

This phase delivers the part that doesn't need Claude at all: always-on listening for the full CRM session, and a closed, deterministic set of **navigation** commands matched by trigger-phrase + fuzzy label matching against the CRM's existing page registry. No AI involved, zero ongoing cost, fully working today.

## Requirements

- The moment an Admin or Employee logs into the CRM, voice recognition starts automatically — no button/click needed.
- Recognition keeps running continuously for the entire session, including through the browser's natural silence-timeout behavior (must self-restart, not require the user to notice and re-trigger it).
- Saying "mute" stops the assistant from acting on anything except "resume" — but the underlying recognition engine keeps running (it must still be able to hear "resume"). Only logout actually stops the engine.
- Saying a trigger phrase ("go to…", "open…", "navigate to…", "show…") followed by a CRM page name navigates there. A page name mentioned without a trigger phrase (e.g. incidental mention in normal conversation) must **not** trigger navigation — mitigates false positives from an always-hot mic capturing ordinary office conversation.
- Must not require an Anthropic API key or any paid service.
- Must not break any existing login, logout, routing, or CRM functionality. No changes to `AuthContext`, `authApi.logout()`, or any existing login page.

## Architecture

### New files

- **`Client/src/hooks/useVoiceRecognition.js`** — low-level wrapper around `SpeechRecognition`/`webkitSpeechRecognition`. Responsibilities:
  - Owns a `desiredState` ref: `'listening' | 'muted' | 'off'` — the source of truth for what *should* be happening, independent of what the flaky browser engine actually reports.
  - `onend` handler: if `desiredState !== 'off'`, restart via `.start()` after a short (~250ms) backoff delay, wrapped in try/catch to swallow `InvalidStateError` from start/stop races (the next `onend` cycle retries).
  - `onerror` classification:
    - Transient (`no-speech`, `network`, `aborted`) — no user-visible effect, let the `onend` restart handle it.
    - Fatal (`audio-capture`, `not-allowed`, `service-not-allowed`) — set status `'blocked'`, stop auto-retrying, surface a manual retry affordance (see UI section).
  - No knowledge of React Router, CRM nav, or the command grammar — purely manages the mic engine.
  - Exposes: `{ status, lastTranscript, start(), stop(), setMuted(bool) }`.

- **`Client/src/utils/voiceCommands.js`** — pure function `matchCommand(transcript, navItems)`:
  - Lowercases/trims the transcript.
  - Checks for "mute"/"pause"/"stop listening" and "resume"/"unmute"/"resume listening" independently of trigger-phrase logic — these work in any state except `off`.
  - Otherwise, checks whether the transcript *starts with* a trigger phrase: `go to`, `open`, `navigate to`, `show` (+ minor aliases like "show me"). If not, returns `null` (no-op).
  - If it does, fuzzy-matches the remainder against `navItems[].label` (normalized substring / light Levenshtein tolerance — "go to leads page" should still match "Leads").
  - Returns `{ type: 'navigate', to } | { type: 'mute' } | { type: 'resume' } | null`.
  - Pure, no browser APIs, no side effects — straightforward to reason about and unit test with plain string fixtures.

- **`Client/src/context/VoiceAssistantContext.jsx`** — `VoiceAssistantProvider` + `useVoiceAssistant()` hook (mirrors the existing `AuthContext`/`useAuth` pattern):
  - Calls `useVoiceRecognition()`.
  - On each final transcript, sources nav items from `getCrmCommandItems(user)` (`Client/src/config/crmNav.js` — the same role-aware registry already powering `CommandPalette`, so voice navigation automatically respects the same per-role visibility with no duplicate list to maintain) and runs `matchCommand`.
  - On a `navigate` match: calls `useNavigate()` and fires a `react-hot-toast` confirmation (reusing the existing toast pattern already used across the CRM — no TTS in this phase, to stay unobtrusive over a full-day session).
  - On `mute`/`resume`: flips `desiredState` between `'listening'`/`'muted'` via `setMuted()`.
  - Provides `{ status, lastCommand }` via context.

### Mount point

Wrap the existing `isCRM && user` branch in `Client/src/App.jsx` (the block returning `<PortalLayout>…</PortalLayout>`, ~line 197) with `<VoiceAssistantProvider>`. This branch already only renders for a genuine logged-in CRM Admin/Employee (client/distributor accounts redirect away earlier in the same function), so the provider mounts exactly on login and unmounts exactly on logout as a natural consequence of React mount/unmount — **no changes to `AuthContext.jsx`, `authApi.logout()`, `Sidebar.jsx`, or any login page.**

### UI

A small status pill added to `PortalLayout.jsx`'s existing desktop utility bar, next to `CommandPalette` (same row, same visual language — CSS vars, mono labels — so it reads as native rather than bolted on). States:

| Status | Pill shows |
|---|---|
| `listening` | active/listening indicator |
| `muted` | muted indicator |
| `blocked` | "Mic access needed — click to retry" (click re-invokes `.start()` as a direct user gesture, covering browsers/cases that need one) |
| `unsupported` | hidden or disabled state — browsers without `SpeechRecognition` (Firefox etc.) never attempt to start, and the rest of the CRM is completely unaffected |

### Data flow

```
mic audio → SpeechRecognition.onresult (final transcripts only)
          → matchCommand(transcript, getCrmCommandItems(user))
          → navigate(to)  |  setMuted(true/false)  |  no-op (dropped silently)
```

Interim (non-final) transcripts are not matched against — only settled/final results are checked, to avoid acting on a still-changing partial phrase.

## Out of scope (deferred, needs Claude billing)

- Any data-entry action (lead creation, employee creation, exports, etc.) — these need free-form NLU to extract parameters from arbitrary phrasing, which keyword/regex matching cannot reliably do.
- TTS spoken confirmations (visual toast only in this phase).
- Wake-word support (not needed — the trigger-phrase + closed nav-label matching already keeps false-positive risk low given the CRM's finite page set).
- Cross-browser support beyond Chromium (Firefox/Safari `SpeechRecognition` support is weak/absent — `unsupported` state degrades gracefully, doesn't block CRM usage).

## Testing plan

No test suite exists in `Client/` — verification is manual:

1. Log in as Admin — confirm recognition auto-starts (mic indicator in browser tab).
2. Log in as Employee — same.
3. Say a handful of trigger phrases ("go to leads", "open dashboard", "show distributors") against real nav items — confirm correct navigation + toast.
4. As an Employee without a role-gated page (e.g. `/crm/employees`, Admin-only), say a trigger phrase targeting it — confirm no match/no navigation, since `getCrmCommandItems(user)` is already role-scoped.
5. Say a page name *without* a trigger phrase mid-sentence — confirm no navigation.
6. Say "mute" — confirm subsequent trigger phrases are ignored. Say "resume" — confirm they work again.
7. Leave the tab open and silent for several minutes — confirm it's still listening afterward (no manual restart needed).
8. Log out — confirm the mic indicator turns off and recognition has stopped.
9. Regression pass: login/logout flows (Admin, Employee, Google login), CRM routing, `CommandPalette` (⌘K), all still work unaffected.
