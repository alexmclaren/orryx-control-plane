// The executor→control-plane event stream.
//
// An adapter returns events, not prose. Terminal output is an artifact; it is
// not a result. Everything the control plane acts on must arrive as one of
// these, so that a harness swap changes nothing upstream.

export const EVENT_SCHEMA_VERSION = '1.0.0';

export const EVENT_TYPES = Object.freeze([
  'accepted',
  'planning',
  'progressing',
  'heartbeat',
  'blocked',
  'evidence_produced',
  'gate_failed',
  'budget_warning',
  'approval_required',
  'stopped',
  'completed',
  'crashed',
  'resumable',
]);

/**
 * Events after which no further event may be emitted for a run.
 * `completed` is terminal for the EXECUTOR only — it is a claim of work done,
 * never a verdict. Adjudication happens in adjudicate.js, on evidence.
 */
export const TERMINAL_EVENTS = Object.freeze([
  'stopped',
  'completed',
  'crashed',
]);

export function isTerminal(type) {
  return TERMINAL_EVENTS.includes(type);
}

/**
 * Monotonic, timestamped event emitter with a strict terminal rule.
 * The clock is injected so tests are deterministic and so a run's timeline
 * cannot be forged by an adapter reaching for Date.now() itself.
 */
export class EventStream {
  #seq = 0;
  #events = [];
  #terminated = null;
  #clock;
  #onEmit;

  constructor({ clock = () => new Date().toISOString(), onEmit = null } = {}) {
    this.#clock = clock;
    this.#onEmit = onEmit;
  }

  emit(type, payload = {}) {
    if (!EVENT_TYPES.includes(type)) {
      throw new Error(`Unknown event type: ${type}`);
    }
    if (this.#terminated) {
      throw new Error(
        `Cannot emit '${type}' after terminal event '${this.#terminated}'`,
      );
    }
    const event = Object.freeze({
      schema_version: EVENT_SCHEMA_VERSION,
      seq: this.#seq++,
      type,
      at: this.#clock(),
      ...payload,
    });
    this.#events.push(event);
    if (isTerminal(type)) this.#terminated = type;
    if (this.#onEmit) this.#onEmit(event);
    return event;
  }

  get events() {
    return [...this.#events];
  }

  get terminated() {
    return this.#terminated;
  }

  /** Last event of a given type, or null. */
  last(type) {
    for (let i = this.#events.length - 1; i >= 0; i--) {
      if (this.#events[i].type === type) return this.#events[i];
    }
    return null;
  }

  /**
   * Rehydrate a stream from persisted events so an interrupted run resumes with
   * its sequence numbering intact rather than restarting at 0.
   *
   * `resuming` exists because the two callers want opposite things from the same
   * data. An auditor rebuilding a finished run wants the terminal state honoured.
   * A resumed run is by definition continuing past its terminal event — that
   * event is the crash it is recovering from — so it must be allowed to emit.
   * Getting this wrong turns every resume into a second crash, silently.
   */
  static restore(events, { resuming = false, ...opts } = {}) {
    const stream = new EventStream(opts);
    for (const event of events) {
      stream.#events.push(Object.freeze({ ...event }));
      stream.#seq = Math.max(stream.#seq, event.seq + 1);
      if (!resuming && isTerminal(event.type)) stream.#terminated = event.type;
    }
    return stream;
  }
}
