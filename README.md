# Orryx Control Plane

Central orchestration and task management for the Orryx multi-repo development system.

## Purpose

The control plane orchestrates work across all Orryx repositories:
- Creates and manages task packets
- Coordinates agent execution
- Tracks repo registry and health
- Generates execution reports
- Maintains cross-repo workflows

## Structure

- `/repos/` - Repository registry and configs
- `/task-packets/` - Task definitions and queue
- `/agents/` - Agent definitions and prompts
- `/workflows/` - Standard workflows
- `/reports/` - Execution reports and audits
- `/decisions/` - Architecture Decision Records
- `/context/` - Product context cache (token optimization)
- `/scripts/` - Automation and tooling

## Quick Start

### Create a task
```bash
python scripts/task-management/create-task.py
```

### Execute a task
```bash
python scripts/execution/orchestrate.py execute TP-2026-001
```

### Generate daily report
```bash
python scripts/reporting/daily-report.py
```

## Principles

- **Orchestrate, don't implement**: Control plane coordinates, products execute
- **Cross-repo visibility**: Single source of truth for all work
- **Pattern-based execution**: Use proven patterns (deep research, swarming, RALPH)
- **Evidence-based**: All decisions backed by reports and data

## Integration

Control plane references:
- **orryx-governance**: Security policies and compliance
- **orryx-standards**: Technical standards and patterns
- **orryx-knowledge**: Domain knowledge and lessons learned
- **Product repos**: pillarworks, triora, orryx, orryx-flow

## Getting Started

1. Clone all Orryx repos to same parent directory
2. Install dependencies: `pip install pyyaml`
3. Create your first task: `python scripts/task-management/create-task.py`
4. Execute: `python scripts/execution/orchestrate.py execute <task-id>`
