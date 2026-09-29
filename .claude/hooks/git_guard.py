#!/usr/bin/env python3
"""PreToolUse(Bash) guard for keel (ADR-019 item 5, CLAUDE.md "Git").

Blocks, with exit code 2 and a reason on stderr (Claude Code shows it to the agent):
- force push that touches main (own task branches may be force-pushed after a rebase)
- git reset --hard, git clean -f, git branch -D, --no-verify
- AI attribution in commit or PR/issue text (G3: no signature, no tool name)
- deleting branch protection or the repository
Everything else exits 0. Tests: tools/test_git_guard.py
"""
import json
import os
import re
import subprocess
import sys

# One shell segment: stop at ;, &&, ||, | or a newline outside quotes is good enough here.
SEG = r"[^;&|\n]*"
ATTRIBUTION = re.compile(r"Co-Authored-By:\s*Claude|noreply@anthropic\.com|Generated with \[?Claude|🤖 Generated",
                         re.IGNORECASE)


DIRECTORY = r"(\"[^\"]+\"|'[^']+'|[^\s;&|]+)"


def branch_in(directory: str) -> str:
    """The branch checked out in `directory` ("." is the hook's own); the hook's own branch if that cannot be read."""
    if "GIT_GUARD_BRANCHES" in os.environ:  # tests: {directory: branch}, "" being the hook's own directory
        branches = json.loads(os.environ["GIT_GUARD_BRANCHES"])
        return branches.get("" if directory == "." else directory, branches.get("", ""))
    try:
        run = subprocess.run(["git", "-C", directory, "branch", "--show-current"], capture_output=True, text=True, timeout=5)
        if run.returncode == 0 or directory == ".":
            return run.stdout.strip()
    except (OSError, subprocess.SubprocessError):
        pass
    return branch_in(".") if directory != "." else ""


def push_directory(cmd: str, push: re.Match) -> str:
    """Where a push runs: `git -C <dir>`, else after the `cd`s before it, in order (a worktree, ADR-019)."""
    here = "."
    for cd in re.finditer(rf"(?:^|[;&|\n])\s*cd\s+{DIRECTORY}", cmd[:push.start()]):
        here = os.path.normpath(os.path.join(here, cd.group(1).strip("\"'")))
    option = re.search(rf"\bgit\s+-C\s+{DIRECTORY}", push.group(0))
    if option:
        here = os.path.normpath(os.path.join(here, option.group(1).strip("\"'")))
    # A directory only the shell can resolve ($VAR, ~) is judged by the hook's own directory.
    return "." if re.search(r"[$~`]", here) else here


def reasons(cmd: str) -> list[str]:
    found = []
    for push in re.finditer(rf"\bgit\b{SEG}\bpush\b{SEG}", cmd):
        seg = push.group(0)
        forced = re.search(r"(--force(-with-lease)?\b|\s-[a-zA-Z]*f\b|\s\+\S)", seg)
        targets_main = re.search(r"\b(main|master)\b", seg) or branch_in(push_directory(cmd, push)) in ("main", "master")
        if forced and targets_main:
            found.append("force push to main is not allowed; ask Levent (ADR-019 item 5)")
    if re.search(rf"\bgit\b{SEG}\breset\b{SEG}--hard", cmd):
        found.append("git reset --hard discards work; use --soft/--mixed or a new commit")
    if re.search(rf"\bgit\b{SEG}\bclean\b{SEG}\s-[a-zA-Z]*f", cmd):
        found.append("git clean -f deletes untracked files; list with -n and remove by name")
    if re.search(rf"\bgit\b{SEG}\bbranch\b{SEG}\s-D\b", cmd):
        found.append("git branch -D drops unmerged work; use -d (merged branches only)")
    if re.search(rf"\bgit\b{SEG}--no-verify", cmd):
        found.append("--no-verify skips the commit-msg check")
    if re.search(r"\b(git\s+commit|gh\s+(pr|issue))\b", cmd) and ATTRIBUTION.search(cmd):
        found.append("AI attribution in commit/PR text is not allowed (CLAUDE.md Git, G3)")
    if re.search(rf"\bgh\b{SEG}-X\s*DELETE{SEG}/protection", cmd):
        found.append("removing branch protection needs Levent (ADR-019)")
    if re.search(rf"\bgh\s+repo\s+delete\b", cmd):
        found.append("deleting the repository needs Levent")
    return found


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except json.JSONDecodeError:
        return 0
    cmd = (payload.get("tool_input") or {}).get("command") or ""
    found = reasons(cmd)
    if not found:
        return 0
    print("Blocked by .claude/hooks/git_guard.py:\n- " + "\n- ".join(found), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
