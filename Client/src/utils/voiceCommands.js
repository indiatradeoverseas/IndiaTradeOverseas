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
  return words.some((word) => normalized === word || normalized.startsWith(`${word} `) || normalized.includes(` ${word}`));
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
