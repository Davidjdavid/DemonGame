// Thin wrappers around the claude.ai artifact runtime (window.claude.use).
// Every function resolves null when the capability is unavailable (local dev, tests,
// signed-out viewers), so callers design for absence.

const cache = new Map();

export function hasRuntime() {
  return typeof window !== 'undefined' && !!window.claude && typeof window.claude.use === 'function';
}

export function useCapability(name) {
  if (!hasRuntime()) return Promise.resolve(null);
  if (!cache.has(name)) {
    cache.set(name, window.claude.use(name).catch(() => null));
  }
  return cache.get(name);
}

// Viewer-facing copy for sample() error codes. Never retry automatically.
export function sampleErrorCopy(code) {
  switch (code) {
    case 'not_granted':
    case 'sampling_disabled':
    case 'not_declared':
    case 'capability_disabled':
    case 'capability_removed':
      return 'Live Claude is turned off for this page, so demons use scripted replies.';
    case 'rate_limited':
      return 'Too many messages too fast. Wait a moment, then send again.';
    case 'session_expired':
      return 'Your claude.ai session expired. Sign in again, then send again.';
    case 'refused':
      return 'Claude declined that message. Try saying it differently.';
    case 'invalid_json':
    case 'empty_completion':
      return 'The demon lost his train of thought. Send your message again.';
    case 'cancelled':
      return '';
    default:
      return 'The connection hiccuped. Send your message again.';
  }
}

// Codes after which live Claude should be considered off for the rest of this view.
export function isPermanentSampleError(code) {
  return ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'].includes(code);
}
