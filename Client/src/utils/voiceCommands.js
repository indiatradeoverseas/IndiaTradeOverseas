// Client/src/utils/voiceCommands.js

const TRIGGER_PHRASES = ['navigate to', 'go to', 'show me', 'open', 'show'];
const MUTE_WORDS = ['stop listening', 'mute', 'pause'];
const RESUME_WORDS = ['resume listening', 'start listening', 'resume', 'unmute'];
const FILLER_PHRASES = ['can you', 'could you', 'would you', 'please'];

// Accidental navigation from an always-hot mic is the main risk here, so
// fuzzy matching is deliberately conservative: exact/substring matches are
// free, anything else must be within this many character edits of a real
// label - and even that ceiling is further scaled down for short labels in
// bestLabelMatch (see below), since e.g. "leads" vs "leave" is only 2 edits
// apart and a fixed budget of 2 would let them cross-match.
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
    } else if (target.includes(label) && target.split(' ').length <= label.split(' ').length + 2) {
      // "go to the leads page" -> target "the leads page" contains label "leads",
      // and the remainder isn't wildly longer than the label, so this is still
      // likely a genuine (if wordy) command rather than an unrelated sentence
      // that happens to mention the label somewhere in the middle.
      score = 1;
    } else if (label.includes(target)) {
      // Reverse direction (typed/spoken command shorter than the real label,
      // e.g. "lead" for "Leads") is not risky the same way - target is short
      // and fully contained in the label, so no length bound needed here.
      score = 1;
    } else {
      // Scale the fuzzy budget to label length so short labels (e.g. "Leave",
      // 5 chars) don't cross-match other short-but-different labels (e.g.
      // "Leads", edit distance 2) under a fixed budget - only longer labels
      // can absorb a 2-edit typo.
      const maxDist = Math.min(MAX_FUZZY_DISTANCE, Math.floor(label.length / 4));
      const dist = levenshtein(target, label);
      if (maxDist > 0 && dist <= maxDist) score = 2 + dist;
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

  // Strip leading filler words to support natural speech ("please resume
  // listening", "can you mute", "please go to dashboard", "can you open
  // leads"), then use strict leading-only matching for both the mute/resume
  // words and the navigation trigger phrases below. This avoids false
  // positives from mid-sentence mentions (e.g., "did we get her resume yet"
  // or "let's pause on that") where "resume" or "pause" are nouns/verbs in
  // context, not commands - stripping only ever removes a LEADING filler
  // phrase, it never searches mid-sentence.
  const stripped = stripLeadingFiller(normalized);

  if (matchesLeadingPhrase(stripped, MUTE_WORDS)) {
    return { type: 'mute' };
  }
  if (matchesLeadingPhrase(stripped, RESUME_WORDS)) {
    return { type: 'resume' };
  }

  const trigger = [...TRIGGER_PHRASES]
    .sort((a, b) => b.length - a.length)
    .find((phrase) => stripped === phrase || stripped.startsWith(`${phrase} `));

  if (!trigger) return null;

  const remainder = stripped.slice(trigger.length).trim();
  const match = bestLabelMatch(remainder, flattenNavItems(navItems || []));

  return match ? { type: 'navigate', to: match.to, label: match.label } : null;
}
