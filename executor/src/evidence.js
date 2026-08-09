// Evidence manifest.
//
// The manifest is what adjudication reads. It is deliberately NOT the executor's
// summary of what it did: every entry is a named gate with an outcome and a
// content hash, so a claim without a corresponding artifact is detectable.
//
// Provenance rule: `produced_by` records which executor emitted the entry, and
// adjudication never treats a self-reported pass as sufficient on its own — see
// adjudicate.js.

import { createHash } from 'node:crypto';
import { redact } from './redact.js';

export const EVIDENCE_SCHEMA_VERSION = '1.0.0';

export const EVIDENCE_KINDS = Object.freeze([
  'test',
  'security_scan',
  'lint',
  'type_check',
  'coverage',
  'artifact',
  'diff',
]);

export const OUTCOMES = Object.freeze(['pass', 'fail', 'error', 'skipped']);

export function sha256(content) {
  return createHash('sha256')
    .update(typeof content === 'string' ? content : JSON.stringify(content))
    .digest('hex');
}

export class EvidenceManifest {
  #entries = [];
  #clock;
  #workOrder;

  constructor(workOrder, { clock = () => new Date().toISOString() } = {}) {
    this.#workOrder = workOrder;
    this.#clock = clock;
  }

  /**
   * @param {object} entry
   * @param {string} entry.kind      one of EVIDENCE_KINDS
   * @param {string} entry.name      the gate's name, matched against required_evidence
   * @param {string} entry.outcome   one of OUTCOMES
   * @param {string} [entry.content] raw output; hashed, redacted, and stored
   * @param {string} entry.produced_by  executor id
   */
  add(entry) {
    if (!EVIDENCE_KINDS.includes(entry.kind)) {
      throw new Error(`Unknown evidence kind: ${entry.kind}`);
    }
    if (!OUTCOMES.includes(entry.outcome)) {
      throw new Error(`Unknown evidence outcome: ${entry.outcome}`);
    }
    if (!entry.name || !entry.produced_by) {
      throw new Error('Evidence entries require both `name` and `produced_by`');
    }

    const content = entry.content ?? null;
    const record = Object.freeze({
      kind: entry.kind,
      name: entry.name,
      outcome: entry.outcome,
      produced_by: entry.produced_by,
      at: this.#clock(),
      content_sha256: content === null ? null : sha256(content),
      content_excerpt:
        content === null ? null : redact(String(content)).slice(0, 4000),
      exit_code: entry.exit_code ?? null,
      command: entry.command ? redact(entry.command) : null,
    });
    this.#entries.push(record);
    return record;
  }

  /**
   * Re-admit entries from a previous run of the same work order, verbatim.
   *
   * Deliberately not routed through add(): re-hashing a stored excerpt would
   * produce a different digest from the original content, and a resumed run
   * would then present evidence whose hash matches nothing. Provenance survives
   * a resume or it is not provenance.
   */
  restoreEntries(entries = []) {
    for (const entry of entries) {
      this.#entries.push(Object.freeze({ ...entry }));
    }
    return this;
  }

  get entries() {
    return [...this.#entries];
  }

  find(name) {
    return this.#entries.filter((entry) => entry.name === name);
  }

  build({ events = [], budget = null } = {}) {
    const manifest = {
      schema_version: EVIDENCE_SCHEMA_VERSION,
      work_order_id: this.#workOrder.work_order_id,
      repository: this.#workOrder.repository,
      risk_tier: this.#workOrder.risk_tier,
      executor_trust_level: this.#workOrder.executor_trust_level,
      generated_at: this.#clock(),
      required_evidence: this.#workOrder.required_evidence,
      entries: this.entries,
      budget_spent: budget,
      event_count: events.length,
      // Hash over the entries only. Timestamps and budget move between runs;
      // the gate results are what a reviewer is being asked to trust.
      entries_sha256: sha256(this.entries),
    };
    return Object.freeze(manifest);
  }
}
