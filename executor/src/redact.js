// Secret redaction for anything that leaves the runner: logs, events, evidence.
//
// This is defence in depth, not the control. The control is that secrets are
// never handed to an experimental executor in the first place (secrets_policy
// defaults to 'none'). This catches the case where a harness prints something
// it found in the environment of the machine it runs on.

const PATTERNS = Object.freeze([
  // Provider keys, longest/most specific first so a broader rule cannot eat them.
  [/sk-ant-[A-Za-z0-9_-]{16,}/g, 'sk-ant-***REDACTED***'],
  [/sk-[A-Za-z0-9]{20,}/g, 'sk-***REDACTED***'],
  [/ghp_[A-Za-z0-9]{20,}/g, 'ghp_***REDACTED***'],
  [/github_pat_[A-Za-z0-9_]{20,}/g, 'github_pat_***REDACTED***'],
  [/AKIA[0-9A-Z]{16}/g, 'AKIA***REDACTED***'],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, 'xox*-***REDACTED***'],
  // JWTs.
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '***REDACTED-JWT***'],
  // PEM blocks.
  [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
    '***REDACTED-PRIVATE-KEY***',
  ],
  // key=value / "key": "value" forms for anything that smells sensitive.
  [
    /\b(password|passwd|secret|token|api[_-]?key|authorization|bearer)\b(\s*[:=]\s*)(['"]?)([^\s'",}]{6,})\3/gi,
    (_m, key, sep, quote) => `${key}${sep}${quote}***REDACTED***${quote}`,
  ],
]);

/** Redact a string. Non-strings are returned untouched. */
export function redactString(value) {
  if (typeof value !== 'string') return value;
  let out = value;
  for (const [pattern, replacement] of PATTERNS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/**
 * Recursively redact a structure. Cycles are tolerated: an adapter handing back
 * a self-referencing object should produce a redacted log, not a stack overflow.
 */
export function redact(value, seen = new WeakSet()) {
  if (typeof value === 'string') return redactString(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '***CYCLE***';
  seen.add(value);

  if (Array.isArray(value)) return value.map((item) => redact(item, seen));

  const out = {};
  for (const [key, item] of Object.entries(value)) {
    // Key-driven redaction catches values our value-patterns would miss,
    // e.g. a short or unusually-formatted password.
    out[key] = /pass|secret|token|key|credential|auth/i.test(key)
      ? typeof item === 'object' && item !== null
        ? redact(item, seen)
        : '***REDACTED***'
      : redact(item, seen);
  }
  return out;
}
