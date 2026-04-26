#!/usr/bin/env python3
"""
Create Task Script

Helps create new task packets following the standard schema.
"""

import yaml
from datetime import date
from pathlib import Path


def get_next_task_id() -> str:
    """Generate next task packet ID based on existing tasks."""
    task_dir = Path(__file__).parent.parent.parent / "task-packets"
    task_dir.mkdir(exist_ok=True)

    existing_tasks = list(task_dir.glob("TP-*.yaml"))

    if not existing_tasks:
        return f"TP-{date.today().year}-001"

    # Extract numbers from existing task IDs
    numbers = []
    for task_file in existing_tasks:
        parts = task_file.stem.split('-')
        if len(parts) >= 3:
            try:
                numbers.append(int(parts[2]))
            except ValueError:
                continue

    if not numbers:
        return f"TP-{date.today().year}-001"

    next_num = max(numbers) + 1
    return f"TP-{date.today().year}-{next_num:03d}"


def get_user_input(prompt: str, default: str = None) -> str:
    """Get user input with optional default value."""
    if default:
        response = input(f"{prompt} [{default}]: ").strip()
        return response if response else default
    return input(f"{prompt}: ").strip()


def select_option(prompt: str, options: list) -> str:
    """Display options and get user selection."""
    print(f"\n{prompt}")
    for i, option in enumerate(options, 1):
        print(f"  {i}. {option}")

    while True:
        choice = input("Select option (number): ").strip()
        try:
            index = int(choice) - 1
            if 0 <= index < len(options):
                return options[index]
        except ValueError:
            pass
        print("Invalid selection. Try again.")


def create_task_packet():
    """Interactive task packet creation."""
    print("=" * 60)
    print("Orryx Task Packet Creator")
    print("=" * 60)

    task_id = get_next_task_id()
    print(f"\nTask ID: {task_id}")

    # Basic info
    title = get_user_input("Task title")
    created_by = get_user_input("Created by", "founder")
    priority = select_option(
        "Priority",
        ["critical", "high", "medium", "low"]
    )

    # Target
    product = select_option(
        "Target product",
        ["pillarworks", "triora", "orryx", "orryx-flow", "multi-product"]
    )

    # Execution pattern
    execution_pattern = select_option(
        "Execution pattern",
        [
            "standard",
            "deep_research",
            "deep_research_with_ralph",
            "swarming",
            "parallel_tasks",
            "migration",
            "deployment"
        ]
    )

    # Objective
    print("\nObjective (describe what needs to be accomplished):")
    print("(Press Ctrl+D or Ctrl+Z when done)")
    objective_lines = []
    try:
        while True:
            line = input()
            objective_lines.append(line)
    except EOFError:
        pass
    objective = "\n".join(objective_lines)

    # Build task packet structure
    task_packet = {
        "task_id": task_id,
        "title": title,
        "created_by": created_by,
        "created_date": str(date.today()),
        "priority": priority,
        "status": "ready",
        "execution_pattern": execution_pattern,
        "target": {
            "product": product,
            "repo": f"{product}-build-mvp" if product != "multi-product" else "multiple",
            "branch": "main"
        },
        "objective": objective,
        "context_refs": {
            "governance": [],
            "standards": [],
            "knowledge": []
        },
        "requirements": {
            "functional": [],
            "non_functional": []
        },
        "acceptance_criteria": [],
        "quality_requirements": {
            "testing": {
                "unit_tests": True,
                "integration_tests": True,
                "min_coverage": 80
            },
            "security": {
                "security_scan": True,
                "secrets_check": True
            },
            "code_quality": {
                "lint": True,
                "type_check": True
            }
        },
        "reviews": {
            "qa_review": True,
            "security_review": False,
            "architecture_review": False
        },
        "estimated_effort": None,
        "risks": [],
        "dependencies": [],
        "blockers": [],
        "result": {
            "status": None,
            "completed_date": None,
            "execution_time": None,
            "tests_passed": None,
            "coverage_achieved": None,
            "bugs_found": None
        },
        "learnings": {
            "patterns_discovered": [],
            "issues_encountered": [],
            "improvements_suggested": []
        }
    }

    # Save task packet
    task_dir = Path(__file__).parent.parent.parent / "task-packets"
    task_file = task_dir / f"{task_id}-{title.lower().replace(' ', '-')}.yaml"

    with open(task_file, 'w') as f:
        yaml.dump(task_packet, f, default_flow_style=False, sort_keys=False)

    print(f"\n✓ Task packet created: {task_file}")
    print(f"\nNext steps:")
    print(f"1. Edit {task_file} to add:")
    print(f"   - Context references")
    print(f"   - Requirements")
    print(f"   - Acceptance criteria")
    print(f"   - Implementation hints")
    print(f"2. Execute: python scripts/execution/orchestrate.py execute {task_id}")


if __name__ == "__main__":
    try:
        create_task_packet()
    except KeyboardInterrupt:
        print("\n\nTask creation cancelled.")
    except Exception as e:
        print(f"\nError: {e}")
