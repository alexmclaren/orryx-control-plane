# Orryx Quick Start Guide

Get started with the Orryx Multi-Repo Autonomous Development Operating System in 15 minutes.

## 1. Initial Setup (5 minutes)

### Verify Repository Structure

All repos should be at the same level:

```bash
cd /c/Users/alexa/OneDrive/Desktop

ls -la
# Should see:
# orryx-control-plane/
# orryx-governance/
# orryx-standards/
# orryx-knowledge/
# pillarworks-build-mvp/
```

If any are missing, clone them first.

### Verify Python

```bash
python --version
# Should be 3.8+
```

---

## 2. Execute Your First Task (10 minutes)

### Example: TP-2026-001 (Logout Functionality)

This task implements logout in Pillarworks using standard execution pattern.

### Step 1: Review the Task

```bash
cd orryx-control-plane
cat task-packets/TP-2026-001-logout-functionality.yaml
```

Key sections:
- **Objective**: Implement logout functionality
- **Acceptance criteria**: What "done" looks like
- **Context refs**: Governance, standards, patterns to reference
- **Implementation hints**: Code examples

### Step 2: Build Context

```bash
python scripts/context/build-context.py build TP-2026-001
```

Output:
```
========================================
Building Context Package
========================================
Building L1 (Immutable) layer...
✓ L1 layer cached (1 files)
Building L2 (Stable) layer...
✓ L2 layer cached (3 files)
Building L3 (Dynamic) layer...
✓ L3 layer cached (2 patterns, 0 lessons, 1 anti-patterns)
Building L4 (Fresh) layer...
✓ L4 layer built
========================================
Context package built
Estimated tokens: ~18,000
========================================
```

### Step 3: Prepare Execution

```bash
python scripts/execution/orchestrate.py execute TP-2026-001
```

Output:
```
Loading task packet: TP-2026-001
Task: Implement logout functionality for Pillarworks
Target: pillarworks
Pattern: standard
Repository: /c/Users/alexa/OneDrive/Desktop/pillarworks-build-mvp

✓ Prompt saved to: context/TP-2026-001-prompt.md

To execute this task, run Claude Code in /c/Users/alexa/OneDrive/Desktop/pillarworks-build-mvp:
  cd /c/Users/alexa/OneDrive/Desktop/pillarworks-build-mvp
  claude-code

Then provide this task prompt:
  /c/Users/alexa/OneDrive/Desktop/orryx-control-plane/context/TP-2026-001-prompt.md

✓ Task status updated to: in_progress
```

### Step 4: Execute with Claude Code

```bash
cd ../pillarworks-build-mvp
claude-code
```

In Claude Code, provide:

```
Please execute the task defined in:
/c/Users/alexa/OneDrive/Desktop/orryx-control-plane/context/TP-2026-001-prompt.md

Context references:
- Governance: orryx-governance/security/security-policy.md (Section 3)
- Standards: orryx-standards/CLAUDE.md (Section 4.1)
- Pattern: orryx-knowledge/patterns/authentication-pattern.md (Logout Flow)
- Pattern: orryx-knowledge/patterns/audit-logging-pattern.md

Follow standard execution pattern. Ensure all acceptance criteria are met.
```

Claude Code will:
1. Enter PLAN MODE (required by CLAUDE.md)
2. Read referenced files
3. Create execution plan
4. Implement logout endpoint (backend)
5. Add logout button (frontend)
6. Add audit logging
7. Write tests
8. Run quality checks
9. Verify acceptance criteria

### Step 5: Review and Complete

After Claude Code finishes:

1. **Review the code**:
   - Check `src/api/auth/logout.ts`
   - Check `src/components/Navigation.tsx`
   - Run tests: `npm test`

2. **Complete the task**:

```bash
cd ../orryx-control-plane

python scripts/execution/orchestrate.py complete TP-2026-001
```

Provide results:
```json
{
  "status": "completed",
  "tests_passed": true,
  "coverage_achieved": 85,
  "bugs_found": 0,
  "execution_time": "3 hours"
}
```

### Step 6: Capture Learnings

```bash
cd ../orryx-knowledge

cp lessons-learned/template.yaml \
   lessons-learned/TP-2026-001-logout.yaml

# Edit the file with what you learned

git add lessons-learned/TP-2026-001-logout.yaml
git commit -m "Capture learnings from TP-2026-001"
```

---

## 3. What Just Happened?

You executed a complete development workflow:

1. ✓ **Loaded task** with clear objectives and acceptance criteria
2. ✓ **Built context** using multi-layer caching (saved ~80% tokens)
3. ✓ **Referenced standards** (CLAUDE.md, security policy, patterns)
4. ✓ **Executed autonomously** with Claude Code
5. ✓ **Met quality gates** (tests, coverage, security)
6. ✓ **Captured learnings** for future tasks

---

## 4. Next Steps

### Try Other Execution Patterns

**Deep Research** (TP-2026-002):
```bash
python scripts/execution/orchestrate.py execute TP-2026-002
```

This task uses:
- Deep codebase exploration (30-60 min)
- RALPH loop (Research → Analyze → Learn → Plan → Hypothesize → Implement → Verify)
- Performance benchmarking

**Swarming** (TP-2026-003):
```bash
# Launch 4 agents in parallel
# See docs/EXECUTION-GUIDE.md section 10
```

**Parallel Tasks** (TP-2026-004):
```bash
# First complete TP-2026-001
# Then roll out to other products in parallel
```

**Migration** (TP-2026-005):
```bash
# Database migration with staged gates
# Test in dev → staging → production
```

### Create Your Own Task

```bash
cd orryx-control-plane
python scripts/task-management/create-task.py
```

Follow prompts to create a custom task packet.

### Sync Standards to Products

After updating `orryx-standards/CLAUDE.md`:

```bash
bash scripts/standards/sync-standards.sh
```

---

## 5. Key Files to Know

### Always Read Before Starting

**orryx-standards/CLAUDE.md**
- Master standards (execution framework, quality gates, domain rules)
- PLAN MODE requirements
- Definition of done

**orryx-governance/security/security-policy.md**
- Non-negotiable security requirements
- MFA, encryption, audit logging
- Data residency

**orryx-knowledge/patterns/**
- Reusable implementation patterns
- Authentication, audit logging, etc.

**orryx-knowledge/anti-patterns/common-mistakes.md**
- Mistakes to avoid
- What NOT to do

### Update After Every Task

**orryx-knowledge/lessons-learned/**
- Capture what you learned
- Patterns discovered
- Issues encountered
- Improvements suggested

---

## 6. Commands Cheat Sheet

```bash
# List all tasks
python scripts/execution/orchestrate.py list

# List ready tasks
python scripts/execution/orchestrate.py list ready

# Build context for a task
python scripts/context/build-context.py build <task-id>

# Execute task (prepare)
python scripts/execution/orchestrate.py execute <task-id>

# Complete task
python scripts/execution/orchestrate.py complete <task-id>

# Sync standards
bash scripts/standards/sync-standards.sh

# Clear cache
python scripts/context/build-context.py clear
```

---

## 7. Troubleshooting

### "Task not found"

Make sure you're in `orryx-control-plane` directory:
```bash
cd /c/Users/alexa/OneDrive/Desktop/orryx-control-plane
```

### "Repository not found"

Check your directory structure matches the expected layout (all repos at Desktop level).

### "Cache seems stale"

Clear and rebuild:
```bash
python scripts/context/build-context.py clear
python scripts/context/build-context.py build <task-id>
```

### "Standards out of sync"

Run sync script:
```bash
bash scripts/standards/sync-standards.sh
```

---

## 8. Getting Help

- **Execution details**: See `docs/EXECUTION-GUIDE.md`
- **Standards**: See `orryx-standards/CLAUDE.md`
- **Patterns**: See `orryx-knowledge/patterns/`
- **Security**: See `orryx-governance/security/`
- **Compliance**: See `orryx-governance/compliance/`

---

## Summary

You now have a complete autonomous development operating system:

✓ **Control plane** orchestrates all work
✓ **Governance** enforces security and compliance
✓ **Standards** ensure consistency
✓ **Knowledge base** captures patterns and learnings
✓ **Task packets** define clear work units
✓ **Execution patterns** handle different complexity levels
✓ **Context caching** optimizes token usage
✓ **Quality gates** ensure production-ready code

**Start executing tasks and building better software!**
