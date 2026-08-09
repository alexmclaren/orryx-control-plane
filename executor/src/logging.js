// Structured JSONL logging. One line per record, redacted, no interleaved prose.
//
// The sink is injectable so tests capture records instead of writing files, and
// so a future control plane can ship these straight to the delivery dashboard
// without the runner knowing anything about transport.

import { redact } from './redact.js';

export const LEVELS = Object.freeze(['debug', 'info', 'warn', 'error']);

export class StructuredLogger {
  #sink;
  #clock;
  #base;
  #minLevel;

  constructor({
    sink = (line) => process.stdout.write(`${line}\n`),
    clock = () => new Date().toISOString(),
    base = {},
    minLevel = 'info',
  } = {}) {
    if (!LEVELS.includes(minLevel)) throw new Error(`Unknown level: ${minLevel}`);
    this.#sink = sink;
    this.#clock = clock;
    this.#base = base;
    this.#minLevel = minLevel;
  }

  child(extra) {
    return new StructuredLogger({
      sink: this.#sink,
      clock: this.#clock,
      base: { ...this.#base, ...extra },
      minLevel: this.#minLevel,
    });
  }

  log(level, message, fields = {}) {
    if (!LEVELS.includes(level)) throw new Error(`Unknown level: ${level}`);
    if (LEVELS.indexOf(level) < LEVELS.indexOf(this.#minLevel)) return null;
    const record = redact({
      ts: this.#clock(),
      level,
      message,
      ...this.#base,
      ...fields,
    });
    this.#sink(JSON.stringify(record));
    return record;
  }

  debug(message, fields) {
    return this.log('debug', message, fields);
  }
  info(message, fields) {
    return this.log('info', message, fields);
  }
  warn(message, fields) {
    return this.log('warn', message, fields);
  }
  error(message, fields) {
    return this.log('error', message, fields);
  }
}
