# Orryx Execution Guide

Complete guide for executing tasks using the Orryx Multi-Repo Autonomous Development Operating System.

## Overview

The execution flow:

```
Task Creation → Context Building → Execution → Review → Completion → Learning Capture
```

## Prerequisites

### Required Repos

All repos should be cloned at the same level:

```
Desktop/
├── orryx-control-plane/    (this repo)
├── orryx-governance/       (governance and compliance)
├── orryx-standards/        (master standards)
├── orryx-knowledge/        (domain knowledge and patterns)
├── pillarworks-build-mvp/  (product repo)
├── triora/                 (product repo)
├── orryx/                  (product repo)
└── orryx-flow/             (product repo)
```

### Required Tools

- Python 3.8+
- Claude Code CLI
- Git
- Bash (for sync scripts)

---

## 1. Creating a New Task

### Option A: Interactive Creation

```bash
cd orryx-control-plane
python scripts/task-management/create-task.py
```

Follow the prompts to create a task packet.

### Option B: Manual Creation

Copy an existing task packet from `task-packets/` and modify it:

```bash
cp task-packets/TP-2026-001-logout-functionality.yaml \
   task-packets/TP-2026-006-my-new-task.yaml
```

Edit the file to match your task requirements.

### Task Packet Structure

Required fields:
- `task_id`: Unique ID (TP-YYYY-NNN)
- `title`: Clear task description
- `execution_pattern`: standard | deep_research | swarming | parallel_tasks | migration | deployment
- `target`: Product and repo
- `objective`: What needs to be accomplished
- `acceptance_criteria`: Definition of done
- `quality_requirements`: Testing and security requirements

---

## 2. Building Context

Before executing a task, build the context package:

```bash
python scripts/context/build-context.py build TP-2026-001
```

This creates a multi-layer context package:
- **L1 (Immutable)**: Healthcare domain knowledge (7-day cache)
- **L2 (Stable)**: Standards and governance (1-day cache)
- **L3 (Dynamic)**: Patterns and recent lessons (2-hour cache)
- **L4 (Fresh)**: Task-specific context (no cache)

### Clear Cache

If you need to force-refresh a layer:

```bash
# Clear specific layer
python scripts/context/build-context.py clear L2-stable

# Clear all cache
python scripts/context/build-context.py clear
```

---

## 3. Executing a Task

### Step 1: Prepare Task

```bash
python scripts/execution/orchestrate.py execute TP-2026-001
```

This will:
1. Load the task packet
2. Check for blockers
3. Build the task prompt
4. Save prompt to `context/TP-2026-001-prompt.md`
5. Update task status to `in_progress`

### Step 2: Dry Run (Optional)

Preview the task prompt without executing:

```bash
python scripts/execution/orchestrate.py execute TP-2026-001 --dry-run
```

### Step 3: Execute with Claude Code

Navigate to the target repository:

```bash
cd ../pillarworks-build-mvp
```

Launch Claude Code:

```bash
claude-code
```

Provide the task prompt:

```
Please execute the task defined in:
/c/Users/alexa/OneDrive/Desktop/orryx-control-plane/context/TP-2026-001-prompt.md

Follow the execution pattern specified and ensure all acceptance criteria are met.
```

Claude Code will:
- Enter PLAN MODE (if required by CLAUDE.md)
- Create execution plan
- Execute the task
- Run tests and quality checks
- Generate deliverables

---

## 4. Execution Patterns

### Standard Execution

Simple, well-defined tasks.

**When to use**: Single feature, clear requirements, straightforward implementation.

**Example**: TP-2026-001 (Logout functionality)

### Deep Research

Unknown codebase areas or unclear requirements.

**When to use**: Need to investigate before implementing, multiple unknowns.

**Duration**: 30-60 minutes exploration before implementation.

**Example**: "Find all places where patient matching happens"

### Deep Research + RALPH Loop

Complex tasks requiring iteration.

**RALPH phases**:
1. **Research**: Investigate current state
2. **Analyze**: Identify bottlenecks/issues
3. **Learn**: Research solutions
4. **Plan**: Design approach
5. **Hypothesize**: Predict outcomes
6. **Implement**: Execute
7. **Verify**: Measure results

**Iterations**: 2-5 loops until acceptance criteria met.

**Example**: TP-2026-002 (Patient search optimization)

### Swarming

Large tasks with independent components, executed in parallel.

**When to use**: Task can be split into parallel workstreams.

**Coordination**: Control plane manages agent synchronization.

**Example**: TP-2026-003 (Security audit - 4 agents in parallel)

### Parallel Tasks

Independent tasks across products.

**When to use**: Same change needed in multiple products.

**Max concurrent**: 3

**Example**: TP-2026-004 (Multi-product logout rollout)

### Migration

Database schema changes or data migrations.

**Phases**:
1. Analyze current state
2. Plan migration
3. Test (dev → staging)
4. Execute (production)
5. Validate

**Example**: TP-2026-005 (Database migration)

### Deployment

Staged deployment with gates.

**Environments**: dev → staging → production

**Gates**: Tests, coverage, security scan, human approval

---

## 5. Reviewing Results

### QA Review

After task execution, review:
- All tests pass
- Coverage >80%
- Acceptance criteria met
- No new bugs introduced

### Security Review

For security-sensitive tasks:
- No hardcoded secrets
- Input validation present
- SQL injection prevented
- XSS/CSRF protections in place
- Audit logging added

### Architecture Review

For architectural changes:
- Follows established patterns
- No technical debt introduced
- Scalable and maintainable
- Documented appropriately

---

## 6. Completing a Task

Mark task as completed:

```bash
python scripts/execution/orchestrate.py complete TP-2026-001
```

Provide results as JSON:

```json
{
  "status": "completed",
  "tests_passed": true,
  "coverage_achieved": 85,
  "bugs_found": 0,
  "execution_time": "3.5 hours"
}
```

---

## 7. Capturing Learnings

After completing a task, capture learnings:

### Step 1: Copy Template

```bash
cd ../orryx-knowledge
cp lessons-learned/template.yaml \
   lessons-learned/TP-2026-001-logout-learnings.yaml
```

### Step 2: Fill in Learnings

Edit the file with:
- What went well
- Patterns discovered
- Issues encountered
- Improvements suggested
- Anti-patterns identified

### Step 3: Update Knowledge Base

If new patterns discovered:

```bash
# Create new pattern file
code patterns/new-pattern.md
```

If anti-patterns identified:

```bash
# Add to anti-patterns
code anti-patterns/common-mistakes.md
```

### Step 4: Commit Learnings

```bash
git add lessons-learned/ patterns/ anti-patterns/
git commit -m "Capture learnings from TP-2026-001"
```

---

## 8. Syncing Standards

After updating standards in `orryx-standards`, sync to all products:

```bash
cd orryx-control-plane
bash scripts/standards/sync-standards.sh
```

This copies:
- `CLAUDE.md` → all product repos
- `AGENTS.md` → all product repos

Verify sync:

```bash
cat ../pillarworks-build-mvp/.orryx-standards-sync
```

---

## 9. Listing Tasks

### All Tasks

```bash
python scripts/execution/orchestrate.py list
```

### By Status

```bash
# Ready to execute
python scripts/execution/orchestrate.py list ready

# In progress
python scripts/execution/orchestrate.py list in_progress

# Completed
python scripts/execution/orchestrate.py list completed

# Blocked
python scripts/execution/orchestrate.py list blocked
```

---

## 10. Multi-Agent Execution

For swarming or parallel task patterns:

### Swarming Example (TP-2026-003: Security Audit)

Launch 4 Claude Code instances in parallel:

**Terminal 1** (Pillarworks security):
```bash
cd pillarworks-build-mvp
claude-code
# Provide: TP-2026-003, scope: Pillarworks security
```

**Terminal 2** (Triora security):
```bash
cd triora
claude-code
# Provide: TP-2026-003, scope: Triora security
```

**Terminal 3** (Infrastructure):
```bash
cd orryx-infrastructure
claude-code
# Provide: TP-2026-003, scope: Infrastructure security
```

**Terminal 4** (Compliance):
```bash
cd orryx-governance
claude-code
# Provide: TP-2026-003, scope: Compliance check
```

Aggregate findings manually or use merge script (future).

---

## 11. Troubleshooting

### Task Blocked

If a task has blockers:

```yaml
blockers:
  - blocker: "TP-2026-001 not yet complete"
    resolution: "Wait for TP-2026-001 to finish"
```

Resolve the blocker first, then update the task:

```bash
# Edit task-packets/TP-2026-004-*.yaml
# Remove or update blockers section
```

### Cache Issues

If context seems stale:

```bash
# Clear all cache
python scripts/context/build-context.py clear

# Rebuild
python scripts/context/build-context.py build TP-2026-001
```

### Standards Out of Sync

If product repos have outdated standards:

```bash
bash scripts/standards/sync-standards.sh
```

Review changes in each product repo before committing.

---

## 12. Best Practices

### Before Execution

1. ✓ Read task packet thoroughly
2. ✓ Check blockers and dependencies
3. ✓ Build fresh context
4. ✓ Review related knowledge (patterns, lessons)

### During Execution

1. ✓ Follow execution pattern (PLAN MODE first if non-trivial)
2. ✓ Reference governance and standards
3. ✓ Run tests continuously
4. ✓ Document as you go

### After Execution

1. ✓ All acceptance criteria met
2. ✓ All tests pass (>80% coverage)
3. ✓ Security scan clean
4. ✓ Human review if required
5. ✓ Capture learnings
6. ✓ Update knowledge base

---

## 13. Quick Reference

### Common Commands

```bash
# Create task
python scripts/task-management/create-task.py

# Build context
python scripts/context/build-context.py build <task-id>

# Execute task
python scripts/execution/orchestrate.py execute <task-id>

# List tasks
python scripts/execution/orchestrate.py list [status]

# Complete task
python scripts/execution/orchestrate.py complete <task-id>

# Sync standards
bash scripts/standards/sync-standards.sh

# Clear cache
python scripts/context/build-context.py clear
```

### File Locations

- Task packets: `orryx-control-plane/task-packets/`
- Task prompts: `orryx-control-plane/context/`
- Cache: `orryx-control-plane/context/cache/`
- Standards: `orryx-standards/CLAUDE.md`
- Governance: `orryx-governance/security/`, `orryx-governance/compliance/`
- Knowledge: `orryx-knowledge/patterns/`, `orryx-knowledge/lessons-learned/`

---

## 14. What's Next?

After completing initial tasks:

1. **Refine execution patterns** based on learnings
2. **Build automation** for repetitive tasks
3. **Enhance context caching** for better token efficiency
4. **Develop custom agents** for specialized tasks
5. **Scale to more products** as needed

---

For questions or issues, refer to:
- `orryx-standards/CLAUDE.md` - Master standards
- `orryx-knowledge/` - Domain knowledge and patterns
- `orryx-governance/` - Security and compliance policies
