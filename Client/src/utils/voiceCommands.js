// Client/src/utils/voiceCommands.js

const TRIGGER_PHRASES = ['navigate to', 'go to', 'show me', 'open', 'show'];
const MUTE_WORDS = ['stop listening', 'mute', 'pause'];
const RESUME_WORDS = ['resume listening', 'start listening', 'resume', 'unmute'];
const FILLER_PHRASES = ['can you', 'could you', 'would you', 'please'];

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

function stripLeadingFiller(normalized) {
  // Recursively strip common leading filler words/phrases to allow natural speech
  // patterns like "please resume listening" or "can you mute". Sort by length
  // descending so "can you" is stripped before "please".
  const sorted = [...FILLER_PHRASES].sort((a, b) => b.length - a.length);
  let stripped = normalized;
  let changed = true;
  while (changed) {
    changed = false;
    for (const phrase of sorted) {
      if (stripped.startsWith(`${phrase} `)) {
        stripped = stripped.slice(phrase.length + 1).trim();
        changed = true;
        break;
      }
    }
  }
  return stripped;
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

  // For mute/resume commands, strip leading filler words to support natural speech
  // ("please resume listening", "can you mute"), then use strict leading-only matching.
  // This avoids false positives from mid-sentence mentions (e.g., "did we get her resume yet"
  // or "let's pause on that") where "resume" or "pause" are nouns/verbs in context, not commands.
  const strippedForMuteResume = stripLeadingFiller(normalized);
  if (matchesLeadingPhrase(strippedForMuteResume, MUTE_WORDS)) {
    return { type: 'mute' };
  }
  if (matchesLeadingPhrase(strippedForMuteResume, RESUME_WORDS)) {
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
