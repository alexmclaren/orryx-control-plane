#!/usr/bin/env node
// Plan → ledger reconciler — PROPOSAL-ONLY, state-aware.
//
// The daily master-operating-plan is a regenerated whiteboard; queue.yaml is
// the durable human-action ledger. Plan action IDs that never reach the
// ledger die when the plan regenerates. But a BLIND persist is worse: IDs
// already adjudicated in the governance decisions register would re-open as
// fresh CRITICALs (the NEW-22 phantom-CRITICAL class, 3 weeks lost).
//
// This script therefore:
//   1. reads the latest D:\reports\daily\master-operating-plan-*.md
//   2. reads D:\orryx-control-plane\human-actions\queue.yaml (existing IDs)
//   3. reads D:\state\governance-decisions.json (canonical decided register)
//   4. classifies each plan ID missing from the ledger:
//        decided  → proposed as status: resolved (with decision reference)
//        open     → proposed as status: pending (with plan context line)
//   5. writes human-actions\reconcile-proposals-{date}.yaml for HUMAN review.
//
// It NEVER writes queue.yaml (single-writer: the human/compass owns it).

'use strict';
const fs = require('fs');
const path = require('path');

const DAILY_DIR = 'D:\\reports\\daily';
const QUEUE = path.join(__dirname, '..', 'human-actions', 'queue.yaml');
const DECISIONS = 'D:\\state\\governance-decisions.json';
const OUT_DIR = path.join(__dirname, '..', 'human-actions');
const ID_RE = /\b(?:ORC|HA|DO|ESC|NEW|GH|HP|FSA|CI|DR)-\d+\b/g;

function latestPlan() {
  const plans = fs
    .readdirSync(DAILY_DIR)
    .filter((f) => f.startsWith('master-operating-plan-'))
    .sort();
  if (!plans.length) throw new Error('no master-operating-plan-*.md found');
  const file = plans[plans.length - 1];
  return { file, body: fs.readFileSync(path.join(DAILY_DIR, file), 'utf8') };
}

function main() {
  const plan = latestPlan();
  const planDate = (plan.file.match(/(\d{4}-\d{2}-\d{2})/) || [])[1] || 'unknown';
  const queueRaw = fs.readFileSync(QUEUE, 'utf8');
  const ledgerIds = new Set(queueRaw.match(ID_RE) || []);

  let decisionsRaw = '';
  try {
    decisionsRaw = fs.readFileSync(DECISIONS, 'utf8');
  } catch {
    console.warn(`WARN: ${DECISIONS} unreadable — treating all missing IDs as open`);
  }
  const decidedIds = new Set(decisionsRaw.match(ID_RE) || []);
  const decisions = decisionsRaw ? JSON.parse(decisionsRaw).decisions || [] : [];
  const decisionFor = (id) =>
    decisions.find((d) => JSON.stringify(d).includes(id)) || null;

  // first plan line mentioning the ID = human-readable context for the proposal
  const lines = plan.body.split('\n');
  const contextFor = (id) => {
    const l = lines.find((x) => x.includes(id)) || '';
    return l.replace(/\s+/g, ' ').trim().slice(0, 200);
  };

  const planIds = [...new Set(plan.body.match(ID_RE) || [])].sort();
  const missing = planIds.filter((id) => !ledgerIds.has(id));
  const decided = missing.filter((id) => decidedIds.has(id));
  const open = missing.filter((id) => !decidedIds.has(id));

  const today = new Date().toISOString().slice(0, 10);
  const out = [];
  out.push('# Reconcile proposals — plan → ledger (PROPOSAL ONLY, human ratifies)');
  out.push(`# Generated: ${today} from ${plan.file} vs queue.yaml`);
  out.push('# Rule: decided items persist as resolved ONLY — never re-opened.');
  out.push('# To apply: review each item, then copy accepted ones into queue.yaml');
  out.push('# yourself (this script never writes the ledger).');
  out.push(`plan_file: "${plan.file}"`);
  out.push(`plan_date: "${planDate}"`);
  out.push(`generated: "${today}"`);
  out.push('proposals:');
  for (const id of decided) {
    const d = decisionFor(id);
    out.push(`  - id: ${id}`);
    out.push('    proposed_status: resolved');
    out.push(`    decision_ref: "${d ? d.id : 'see governance-decisions.json'}"`);
    out.push(`    decision_title: "${d && d.title ? String(d.title).replace(/"/g, "'").slice(0, 120) : ''}"`);
    out.push(`    plan_context: "${contextFor(id).replace(/"/g, "'")}"`);
  }
  for (const id of open) {
    out.push(`  - id: ${id}`);
    out.push('    proposed_status: pending');
    out.push(`    plan_context: "${contextFor(id).replace(/"/g, "'")}"`);
  }
  const outFile = path.join(OUT_DIR, `reconcile-proposals-${today}.yaml`);
  fs.writeFileSync(outFile, out.join('\n') + '\n');

  console.log(`plan IDs: ${planIds.length} · already in ledger: ${planIds.length - missing.length}`);
  console.log(`missing from ledger: ${missing.length} → ${decided.length} decided (propose resolved) + ${open.length} open (propose pending)`);
  console.log(`proposals written: ${outFile}`);
  console.log('queue.yaml NOT modified (by design).');
}

main();
