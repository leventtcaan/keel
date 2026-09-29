"""Table tests for .claude/hooks/git_guard.py (ADR-019 item 5, CLAUDE.md "Git").

Run: python3 tools/test_git_guard.py
Each row: (command, current branch, expected exit code). 2 = blocked, 0 = allowed.
"""
import json
import pathlib
import subprocess
import sys

HOOK = pathlib.Path(__file__).resolve().parent.parent / ".claude" / "hooks" / "git_guard.py"

ROWS = [
    # force push: blocked on main, allowed on a task branch (own rebase)
    ("git push --force origin main", "engine/41-types", 2),
    ("git push -f", "main", 2),
    ("git push --force-with-lease origin main", "main", 2),
    ("git push origin +main", "engine/41-types", 2),
    ("git push --force-with-lease origin engine/41-types", "engine/41-types", 0),
    # normal pushes stay allowed (ADR-002: docs go straight to main)
    ("git push", "main", 0),
    ("git push -u origin engine/41-types", "engine/41-types", 0),
    # destructive local commands
    ("git reset --hard HEAD~1", "engine/41-types", 2),
    ("git reset --soft HEAD~1", "engine/41-types", 0),
    ("git clean -fd", "main", 2),
    ("git clean -n", "main", 0),
    ("git branch -D engine/41-types", "main", 2),
    ("git branch -d engine/41-types", "main", 0),
    ("git commit --no-verify -m 'x'", "main", 2),
    # AI attribution in commit and PR text
    ("git commit -m \"feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\"", "main", 2),
    ("gh pr create --title t --body 'Generated with [Claude Code](https://claude.com/claude-code)'", "x/1-y", 2),
    ("git commit -m 'docs: close M0 (#11)'", "main", 0),
    # branch protection and repo deletion
    ("gh api -X DELETE repos/leventtcaan/keel/branches/main/protection", "main", 2),
    ("gh repo delete leventtcaan/keel --yes", "main", 2),
    ("gh api repos/leventtcaan/keel/branches/main/protection", "main", 0),
    # chained commands are checked as a whole
    ("git add -A && git commit -m ok && git push --force origin main", "main", 2),
    # not git at all
    ("ls -la", "main", 0),
]


def run(command: str, branch: str) -> int:
    payload = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    env = {"GIT_GUARD_BRANCH": branch, "PATH": "/usr/bin:/bin"}
    r = subprocess.run([sys.executable, str(HOOK)], input=payload, text=True, capture_output=True, env=env)
    # A missing or crashing hook also exits 2 under Python; count a block only when the hook says so.
    if r.returncode == 2 and "Blocked by" not in r.stderr:
        return -1
    return r.returncode


def main() -> int:
    failures = [(c, b, want, got) for c, b, want in ROWS if (got := run(c, b)) != want]
    for c, b, want, got in failures:
        print(f"FAIL [{b}] {c!r}: want {want}, got {got}")
    print(f"{len(ROWS) - len(failures)}/{len(ROWS)} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
