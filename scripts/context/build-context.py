#!/usr/bin/env python3
"""
Context Building Script

Builds optimized context packages for Claude Code using multi-layer caching strategy.
"""

import yaml
import hashlib
import json
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, List, Any


class ContextBuilder:
    def __init__(self, control_plane_root: Path):
        self.control_plane_root = control_plane_root
        self.context_cache_dir = control_plane_root / "context" / "cache"
        self.context_cache_dir.mkdir(parents=True, exist_ok=True)

        # Layer TTLs (time-to-live)
        self.layer_ttls = {
            "immutable": timedelta(days=7),    # L1: Healthcare domain
            "stable": timedelta(days=1),       # L2: Standards
            "dynamic": timedelta(hours=2),     # L3: Patterns/lessons
            "fresh": timedelta(minutes=0),     # L4: Task-specific
        }

    def get_cache_key(self, content: str) -> str:
        """Generate cache key from content hash."""
        return hashlib.sha256(content.encode()).hexdigest()[:16]

    def is_cache_valid(self, cache_file: Path, ttl: timedelta) -> bool:
        """Check if cache is still valid based on TTL."""
        if not cache_file.exists():
            return False

        cache_time = datetime.fromtimestamp(cache_file.stat().st_mtime)
        return datetime.now() - cache_time < ttl

    def load_file(self, file_path: Path) -> str:
        """Load file content."""
        if not file_path.exists():
            return ""

        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()

    def build_immutable_layer(self) -> Dict[str, Any]:
        """
        Layer 1 (Immutable): Healthcare domain knowledge
        TTL: 7 days
        """
        cache_file = self.context_cache_dir / "L1-immutable.yaml"

        if self.is_cache_valid(cache_file, self.layer_ttls["immutable"]):
            with open(cache_file, 'r') as f:
                return yaml.safe_load(f)

        print("Building L1 (Immutable) layer...")

        # Load healthcare domain knowledge
        knowledge_root = self.control_plane_root.parent / "orryx-knowledge"
        domain_dir = knowledge_root / "domain"

        content = {
            "layer": "L1-immutable",
            "description": "Healthcare domain knowledge (AU)",
            "ttl_days": 7,
            "built_at": datetime.now().isoformat(),
            "content": {}
        }

        if domain_dir.exists():
            for md_file in domain_dir.glob("*.md"):
                content["content"][md_file.stem] = self.load_file(md_file)

        # Save cache
        with open(cache_file, 'w') as f:
            yaml.dump(content, f, default_flow_style=False, sort_keys=False)

        print(f"✓ L1 layer cached ({len(content['content'])} files)")
        return content

    def build_stable_layer(self) -> Dict[str, Any]:
        """
        Layer 2 (Stable): Standards and governance
        TTL: 1 day
        """
        cache_file = self.context_cache_dir / "L2-stable.yaml"

        if self.is_cache_valid(cache_file, self.layer_ttls["stable"]):
            with open(cache_file, 'r') as f:
                return yaml.safe_load(f)

        print("Building L2 (Stable) layer...")

        content = {
            "layer": "L2-stable",
            "description": "Standards and governance policies",
            "ttl_days": 1,
            "built_at": datetime.now().isoformat(),
            "content": {}
        }

        # Load standards
        standards_root = self.control_plane_root.parent / "orryx-standards"
        if (standards_root / "CLAUDE.md").exists():
            content["content"]["CLAUDE"] = self.load_file(standards_root / "CLAUDE.md")

        # Load key governance docs
        governance_root = self.control_plane_root.parent / "orryx-governance"
        governance_files = [
            "security/security-policy.md",
            "compliance/au-privacy-act.md",
        ]

        for rel_path in governance_files:
            file_path = governance_root / rel_path
            if file_path.exists():
                key = rel_path.replace('/', '-').replace('.md', '')
                content["content"][key] = self.load_file(file_path)

        # Save cache
        with open(cache_file, 'w') as f:
            yaml.dump(content, f, default_flow_style=False, sort_keys=False)

        print(f"✓ L2 layer cached ({len(content['content'])} files)")
        return content

    def build_dynamic_layer(self) -> Dict[str, Any]:
        """
        Layer 3 (Dynamic): Patterns and recent lessons
        TTL: 2 hours
        """
        cache_file = self.context_cache_dir / "L3-dynamic.yaml"

        if self.is_cache_valid(cache_file, self.layer_ttls["dynamic"]):
            with open(cache_file, 'r') as f:
                return yaml.safe_load(f)

        print("Building L3 (Dynamic) layer...")

        content = {
            "layer": "L3-dynamic",
            "description": "Patterns and recent lessons learned",
            "ttl_hours": 2,
            "built_at": datetime.now().isoformat(),
            "content": {
                "patterns": {},
                "lessons": {},
                "anti_patterns": {}
            }
        }

        knowledge_root = self.control_plane_root.parent / "orryx-knowledge"

        # Load patterns
        patterns_dir = knowledge_root / "patterns"
        if patterns_dir.exists():
            for md_file in patterns_dir.glob("*.md"):
                content["content"]["patterns"][md_file.stem] = self.load_file(md_file)

        # Load recent lessons (last 30 days)
        lessons_dir = knowledge_root / "lessons-learned"
        if lessons_dir.exists():
            cutoff_date = datetime.now() - timedelta(days=30)
            for yaml_file in lessons_dir.glob("*.yaml"):
                if yaml_file.stem == "template":
                    continue
                file_time = datetime.fromtimestamp(yaml_file.stat().st_mtime)
                if file_time > cutoff_date:
                    with open(yaml_file, 'r') as f:
                        content["content"]["lessons"][yaml_file.stem] = yaml.safe_load(f)

        # Load anti-patterns
        anti_patterns_dir = knowledge_root / "anti-patterns"
        if anti_patterns_dir.exists():
            for md_file in anti_patterns_dir.glob("*.md"):
                content["content"]["anti_patterns"][md_file.stem] = self.load_file(md_file)

        # Save cache
        with open(cache_file, 'w') as f:
            yaml.dump(content, f, default_flow_style=False, sort_keys=False)

        pattern_count = len(content["content"]["patterns"])
        lesson_count = len(content["content"]["lessons"])
        anti_pattern_count = len(content["content"]["anti_patterns"])

        print(f"✓ L3 layer cached ({pattern_count} patterns, {lesson_count} lessons, {anti_pattern_count} anti-patterns)")
        return content

    def build_fresh_layer(self, task_id: str = None) -> Dict[str, Any]:
        """
        Layer 4 (Fresh): Task-specific context
        No cache (always fresh)
        """
        print("Building L4 (Fresh) layer...")

        content = {
            "layer": "L4-fresh",
            "description": "Task-specific context",
            "built_at": datetime.now().isoformat(),
            "content": {}
        }

        if task_id:
            # Load specific task packet
            task_packets_dir = self.control_plane_root / "task-packets"
            task_files = list(task_packets_dir.glob(f"{task_id}-*.yaml"))

            if task_files:
                with open(task_files[0], 'r') as f:
                    content["content"]["task"] = yaml.safe_load(f)

        print(f"✓ L4 layer built")
        return content

    def build_context_package(self, task_id: str = None, output_file: Path = None) -> Dict[str, Any]:
        """Build complete context package with all layers."""
        print("=" * 60)
        print("Building Context Package")
        print("=" * 60)

        package = {
            "built_at": datetime.now().isoformat(),
            "task_id": task_id,
            "layers": {}
        }

        # Build each layer
        package["layers"]["L1_immutable"] = self.build_immutable_layer()
        package["layers"]["L2_stable"] = self.build_stable_layer()
        package["layers"]["L3_dynamic"] = self.build_dynamic_layer()
        package["layers"]["L4_fresh"] = self.build_fresh_layer(task_id)

        # Calculate token estimate (rough: 1 token ≈ 4 characters)
        total_chars = len(json.dumps(package))
        estimated_tokens = total_chars // 4

        package["metadata"] = {
            "total_characters": total_chars,
            "estimated_tokens": estimated_tokens,
        }

        print("=" * 60)
        print(f"Context package built")
        print(f"Estimated tokens: ~{estimated_tokens:,}")
        print("=" * 60)

        # Save if output file specified
        if output_file:
            with open(output_file, 'w') as f:
                yaml.dump(package, f, default_flow_style=False, sort_keys=False)
            print(f"✓ Saved to: {output_file}")

        return package

    def clear_cache(self, layer: str = None):
        """Clear context cache."""
        if layer:
            cache_file = self.context_cache_dir / f"{layer}.yaml"
            if cache_file.exists():
                cache_file.unlink()
                print(f"✓ Cleared {layer} cache")
        else:
            for cache_file in self.context_cache_dir.glob("*.yaml"):
                cache_file.unlink()
            print("✓ Cleared all cache")


def main():
    import sys

    control_plane_root = Path(__file__).parent.parent.parent
    builder = ContextBuilder(control_plane_root)

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python build-context.py build [task-id] [output-file]")
        print("  python build-context.py clear [layer]")
        sys.exit(1)

    command = sys.argv[1]

    if command == "build":
        task_id = sys.argv[2] if len(sys.argv) > 2 else None
        output_file = Path(sys.argv[3]) if len(sys.argv) > 3 else None

        builder.build_context_package(task_id, output_file)

    elif command == "clear":
        layer = sys.argv[2] if len(sys.argv) > 2 else None
        builder.clear_cache(layer)

    else:
        print(f"Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
