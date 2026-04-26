#!/usr/bin/env python3
"""
Task Orchestration Script

Coordinates execution of task packets across repos using Claude Code.
"""

import yaml
import json
import subprocess
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, Tuple


class TaskOrchestrator:
    def __init__(self, control_plane_root: Path):
        self.control_plane_root = control_plane_root
        self.task_packets_dir = control_plane_root / "task-packets"
        self.registry_file = control_plane_root / "repos" / "registry.yaml"
        self.context_dir = control_plane_root / "context"

    def load_task_packet(self, task_id: str) -> Dict[str, Any]:
        """Load task packet by ID."""
        task_files = list(self.task_packets_dir.glob(f"{task_id}-*.yaml"))

        if not task_files:
            raise ValueError(f"Task packet {task_id} not found")

        if len(task_files) > 1:
            raise ValueError(f"Multiple task packets found for {task_id}")

        with open(task_files[0], 'r') as f:
            return yaml.safe_load(f)

    def load_registry(self) -> Dict[str, Any]:
        """Load repository registry."""
        with open(self.registry_file, 'r') as f:
            return yaml.safe_load(f)

    def get_repo_path(self, repo_name: str, registry: Dict[str, Any]) -> Path:
        """Get local path for a repository."""
        # Check control repos
        for repo in registry.get('control', []):
            if repo['repo_name'] == repo_name:
                return Path(repo['local_path'])

        # Check product repos
        for repo in registry.get('products', []):
            if repo['repo_name'] == repo_name:
                return Path(repo['local_path'])

        raise ValueError(f"Repository {repo_name} not found in registry")

    def build_context(self, task: Dict[str, Any]) -> str:
        """Build context string from task references."""
        context_parts = []

        context_refs = task.get('context_refs', {})

        # Add governance references
        if context_refs.get('governance'):
            context_parts.append("# Governance Context\n")
            for ref in context_refs['governance']:
                context_parts.append(f"- {ref}")

        # Add standards references
        if context_refs.get('standards'):
            context_parts.append("\n# Standards Context\n")
            for ref in context_refs['standards']:
                context_parts.append(f"- {ref}")

        # Add knowledge references
        if context_refs.get('knowledge'):
            context_parts.append("\n# Knowledge Context\n")
            for ref in context_refs['knowledge']:
                context_parts.append(f"- {ref}")

        return "\n".join(context_parts)

    def build_task_prompt(self, task: Dict[str, Any]) -> str:
        """Build execution prompt for Claude Code."""
        prompt_parts = [
            f"# Task: {task['title']}",
            f"Task ID: {task['task_id']}",
            f"Priority: {task['priority']}",
            f"Execution Pattern: {task['execution_pattern']}",
            "",
            "## Objective",
            task['objective'],
            "",
            "## Context References",
            self.build_context(task),
            "",
            "## Acceptance Criteria",
        ]

        for criterion in task.get('acceptance_criteria', []):
            prompt_parts.append(f"- {criterion}")

        prompt_parts.append("")
        prompt_parts.append("## Quality Requirements")
        prompt_parts.append(f"- Test coverage: >{task['quality_requirements']['testing']['min_coverage']}%")
        prompt_parts.append(f"- Security scan: {'Required' if task['quality_requirements']['security']['security_scan'] else 'Not required'}")
        prompt_parts.append(f"- Secrets check: {'Required' if task['quality_requirements']['security']['secrets_check'] else 'Not required'}")

        if task.get('implementation_hints'):
            prompt_parts.append("")
            prompt_parts.append("## Implementation Hints")
            prompt_parts.append(yaml.dump(task['implementation_hints'], default_flow_style=False))

        if task.get('risks'):
            prompt_parts.append("")
            prompt_parts.append("## Risks")
            for risk in task['risks']:
                prompt_parts.append(f"- Risk: {risk['risk']}")
                prompt_parts.append(f"  Mitigation: {risk['mitigation']}")

        return "\n".join(prompt_parts)

    def execute_task(self, task_id: str, dry_run: bool = False):
        """Execute a task packet."""
        print(f"Loading task packet: {task_id}")
        task = self.load_task_packet(task_id)

        print(f"Task: {task['title']}")
        print(f"Target: {task['target']['product']}")
        print(f"Pattern: {task['execution_pattern']}")

        # Check blockers
        if task.get('blockers'):
            print("\n[WARN]  BLOCKERS DETECTED:")
            for blocker in task['blockers']:
                print(f"  - {blocker['blocker']}")
                print(f"    Resolution: {blocker['resolution']}")
            print("\nCannot execute task with active blockers.")
            return

        # Load registry
        registry = self.load_registry()

        # Get target repo
        repo_name = task['target']['repo']
        repo_path = self.get_repo_path(repo_name, registry)

        print(f"Repository: {repo_path}")

        # Build prompt
        prompt = self.build_task_prompt(task)

        if dry_run:
            print("\n" + "=" * 60)
            print("DRY RUN - Task prompt:")
            print("=" * 60)
            print(prompt)
            print("=" * 60)
            return

        # Save prompt to file for Claude Code
        prompt_file = self.context_dir / f"{task_id}-prompt.md"
        prompt_file.parent.mkdir(exist_ok=True, parents=True)

        with open(prompt_file, 'w') as f:
            f.write(prompt)

        print(f"\n✓ Prompt saved to: {prompt_file}")
        print(f"\nTo execute this task, run Claude Code in {repo_path}:")
        print(f"  cd {repo_path}")
        print(f"  claude-code")
        print(f"\nThen provide this task prompt:")
        print(f"  {prompt_file}")

        # Update task status
        task_file = list(self.task_packets_dir.glob(f"{task_id}-*.yaml"))[0]
        task['status'] = 'in_progress'
        task['started_date'] = str(datetime.now().date())

        with open(task_file, 'w') as f:
            yaml.dump(task, f, default_flow_style=False, sort_keys=False)

        print(f"\n✓ Task status updated to: in_progress")

    def verify_task(self, task_id: str) -> Tuple[bool, Dict[str, Any]]:
        """Verify task quality gates by running tests."""
        print(f"\n{'='*60}")
        print(f"QUALITY GATE VERIFICATION: {task_id}")
        print(f"{'='*60}\n")

        task = self.load_task_packet(task_id)
        registry = self.load_registry()
        repo_name = task['target']['repo']
        repo_path = self.get_repo_path(repo_name, registry)

        quality_reqs = task.get('quality_requirements', {})
        testing_reqs = quality_reqs.get('testing', {})
        security_reqs = quality_reqs.get('security', {})

        verification_results = {
            'tests_run': False,
            'tests_passed': False,
            'test_count': 0,
            'failed_count': 0,
            'coverage_measured': False,
            'coverage_percent': 0.0,
            'min_coverage_required': testing_reqs.get('min_coverage', 80),
            'coverage_met': False,
            'security_scan_run': False,
            'security_issues': 0,
            'secrets_check_run': False,
            'secrets_found': 0,
            'gate_passed': False,
            'errors': [],
        }

        # Navigate to repo
        print(f"Repository: {repo_path}")

        # Check if package.json exists (Node.js project)
        package_json = repo_path / 'package.json'
        if not package_json.exists():
            verification_results['errors'].append("No package.json found - cannot run tests")
            print("[WARN]  No package.json found")
            return False, verification_results

        # Run npm test
        if testing_reqs.get('unit_tests') or testing_reqs.get('integration_tests'):
            print("\n[TESTS] Running tests...")
            try:
                result = subprocess.run(
                    ['npm', 'test', '--', '--reporter=verbose'],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    timeout=300,  # 5 minute timeout
                    shell=True
                )

                verification_results['tests_run'] = True
                output = result.stdout + result.stderr

                # Parse test results (vitest format)
                if 'Test Files' in output:
                    # Extract test counts
                    test_match = re.search(r'(\d+) passed', output)
                    failed_match = re.search(r'(\d+) failed', output)

                    if test_match:
                        verification_results['test_count'] = int(test_match.group(1))
                    if failed_match:
                        verification_results['failed_count'] = int(failed_match.group(1))

                    verification_results['tests_passed'] = result.returncode == 0

                    if verification_results['tests_passed']:
                        print(f"[OK] Tests PASSED ({verification_results['test_count']} tests)")
                    else:
                        print(f"[FAIL] Tests FAILED ({verification_results['failed_count']} failures)")
                        verification_results['errors'].append(f"{verification_results['failed_count']} test(s) failed")
                else:
                    # Fallback: check exit code
                    verification_results['tests_passed'] = result.returncode == 0
                    print(f"{'[OK]' if verification_results['tests_passed'] else '[FAIL]'} Tests {'PASSED' if verification_results['tests_passed'] else 'FAILED'}")

            except subprocess.TimeoutExpired:
                verification_results['errors'].append("Test execution timed out (5 min)")
                print("[FAIL] Tests timed out")
            except FileNotFoundError:
                verification_results['errors'].append("npm command not found")
                print("[FAIL] npm not found")
            except Exception as e:
                verification_results['errors'].append(f"Test execution error: {str(e)}")
                print(f"[FAIL] Error running tests: {e}")

        # Run coverage check
        min_coverage = verification_results['min_coverage_required']
        print(f"\n[COVERAGE] Checking coverage (minimum: {min_coverage}%)...")

        try:
            result = subprocess.run(
                ['npm', 'run', 'coverage'],
                cwd=repo_path,
                capture_output=True,
                text=True,
                timeout=300,
                shell=True
            )

            verification_results['coverage_measured'] = True
            output = result.stdout + result.stderr

            # Parse coverage percentage (vitest format)
            coverage_match = re.search(r'All files\s+\|\s+([\d.]+)', output)
            if coverage_match:
                coverage = float(coverage_match.group(1))
                verification_results['coverage_percent'] = coverage
                verification_results['coverage_met'] = coverage >= min_coverage

                if verification_results['coverage_met']:
                    print(f"[OK] Coverage: {coverage}% (>= {min_coverage}%)")
                else:
                    print(f"[FAIL] Coverage: {coverage}% (< {min_coverage}%)")
                    verification_results['errors'].append(f"Coverage {coverage}% below minimum {min_coverage}%")
            else:
                print("[WARN]  Could not parse coverage percentage")

        except subprocess.TimeoutExpired:
            verification_results['errors'].append("Coverage check timed out")
            print("[FAIL] Coverage check timed out")
        except Exception as e:
            print(f"[WARN]  Coverage check error: {e}")

        # Security scan (npm audit)
        if security_reqs.get('security_scan'):
            print("\n[SECURITY] Running security scan...")
            try:
                result = subprocess.run(
                    ['npm', 'audit', '--json'],
                    cwd=repo_path,
                    capture_output=True,
                    text=True,
                    timeout=60,
                    shell=True
                )

                verification_results['security_scan_run'] = True

                try:
                    audit_data = json.loads(result.stdout)
                    # Count high and critical vulnerabilities
                    metadata = audit_data.get('metadata', {})
                    vulnerabilities = metadata.get('vulnerabilities', {})
                    high = vulnerabilities.get('high', 0)
                    critical = vulnerabilities.get('critical', 0)
                    verification_results['security_issues'] = high + critical

                    if verification_results['security_issues'] == 0:
                        print(f"[OK] No high/critical security issues")
                    else:
                        print(f"[FAIL] {verification_results['security_issues']} high/critical security issues found")
                        verification_results['errors'].append(f"{verification_results['security_issues']} security issues")

                except json.JSONDecodeError:
                    print("[WARN]  Could not parse security scan results")

            except Exception as e:
                print(f"[WARN]  Security scan error: {e}")

        # Determine overall gate status
        gate_checks = []

        if verification_results['tests_run']:
            gate_checks.append(verification_results['tests_passed'])

        if verification_results['coverage_measured']:
            gate_checks.append(verification_results['coverage_met'])

        if verification_results['security_scan_run']:
            gate_checks.append(verification_results['security_issues'] == 0)

        verification_results['gate_passed'] = all(gate_checks) and len(verification_results['errors']) == 0

        # Print summary
        print(f"\n{'='*60}")
        if verification_results['gate_passed']:
            print("[OK] QUALITY GATES: PASSED")
        else:
            print("[FAIL] QUALITY GATES: FAILED")
            print("\nErrors:")
            for error in verification_results['errors']:
                print(f"  - {error}")
        print(f"{'='*60}\n")

        return verification_results['gate_passed'], verification_results

    def complete_task(self, task_id: str, results: Dict[str, Any]):
        """Mark task as completed with results."""
        print(f"Completing task: {task_id}")

        task_file = list(self.task_packets_dir.glob(f"{task_id}-*.yaml"))[0]

        with open(task_file, 'r') as f:
            task = yaml.safe_load(f)

        task['status'] = 'completed'
        task['result'] = results
        task['result']['completed_date'] = str(datetime.now().date())

        with open(task_file, 'w') as f:
            yaml.dump(task, f, default_flow_style=False, sort_keys=False)

        print(f"✓ Task {task_id} marked as completed")

    def list_tasks(self, status_filter: str = None):
        """List all task packets."""
        tasks = []

        for task_file in sorted(self.task_packets_dir.glob("TP-*.yaml")):
            with open(task_file, 'r') as f:
                task = yaml.safe_load(f)
                if status_filter is None or task['status'] == status_filter:
                    tasks.append(task)

        if not tasks:
            print(f"No tasks found{' with status: ' + status_filter if status_filter else ''}")
            return

        print(f"\n{'ID':<15} {'Title':<40} {'Status':<12} {'Priority':<10}")
        print("=" * 80)

        for task in tasks:
            print(f"{task['task_id']:<15} {task['title']:<40} {task['status']:<12} {task['priority']:<10}")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python orchestrate.py list [status]")
        print("  python orchestrate.py execute <task-id> [--dry-run]")
        print("  python orchestrate.py verify <task-id>")
        print("  python orchestrate.py complete <task-id> [--force] [--json '<json-data>']")
        sys.exit(1)

    # Find control plane root
    control_plane_root = Path(__file__).parent.parent.parent

    orchestrator = TaskOrchestrator(control_plane_root)

    command = sys.argv[1]

    if command == "list":
        status_filter = sys.argv[2] if len(sys.argv) > 2 else None
        orchestrator.list_tasks(status_filter)

    elif command == "execute":
        if len(sys.argv) < 3:
            print("Error: Task ID required")
            sys.exit(1)

        task_id = sys.argv[2]
        dry_run = "--dry-run" in sys.argv

        orchestrator.execute_task(task_id, dry_run)

    elif command == "verify":
        if len(sys.argv) < 3:
            print("Error: Task ID required")
            sys.exit(1)

        task_id = sys.argv[2]

        gate_passed, verification_results = orchestrator.verify_task(task_id)

        # Save verification results
        results_file = control_plane_root / "context" / f"{task_id}-verification.json"
        with open(results_file, 'w') as f:
            json.dump(verification_results, f, indent=2)

        print(f"Verification results saved to: {results_file}")

        sys.exit(0 if gate_passed else 1)

    elif command == "complete":
        if len(sys.argv) < 3:
            print("Error: Task ID required")
            sys.exit(1)

        task_id = sys.argv[2]
        force = "--force" in sys.argv

        # Check for --json parameter
        json_data = None
        for i, arg in enumerate(sys.argv):
            if arg == "--json" and i + 1 < len(sys.argv):
                json_data = sys.argv[i + 1]
                break

        # Check if verification has been run
        verification_file = control_plane_root / "context" / f"{task_id}-verification.json"

        if not verification_file.exists() and not force:
            print("[FAIL] ERROR: Quality gates have not been verified")
            print(f"\nRun verification first:")
            print(f"  python scripts/execution/orchestrate.py verify {task_id}")
            print(f"\nOr use --force to bypass verification (NOT RECOMMENDED)")
            sys.exit(1)

        # Load verification results if they exist
        if verification_file.exists():
            with open(verification_file, 'r') as f:
                verification_results = json.load(f)

            if not verification_results.get('gate_passed', False) and not force:
                print("[FAIL] ERROR: Quality gates FAILED")
                print("\nErrors:")
                for error in verification_results.get('errors', []):
                    print(f"  - {error}")
                print(f"\nFix issues and run verification again:")
                print(f"  python scripts/execution/orchestrate.py verify {task_id}")
                print(f"\nOr use --force to complete anyway (NOT RECOMMENDED)")
                sys.exit(1)

        # Get results from user (either from --json flag or interactive input)
        if json_data:
            results = json.loads(json_data)
        else:
            print("Quality gates passed. Enter completion results (as JSON):")
            results_json = input()
            results = json.loads(results_json)

        # Merge verification results if available
        if verification_file.exists():
            with open(verification_file, 'r') as f:
                verification_results = json.load(f)
            results['verification'] = verification_results

        orchestrator.complete_task(task_id, results)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
