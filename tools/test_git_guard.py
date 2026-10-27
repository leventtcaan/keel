"""Table tests for .claude/hooks/git_guard.py (ADR-019 item 5, CLAUDE.md "Git").

Run: python3 tools/test_git_guard.py
Each row: (command, current branch, expected exit code). 2 = blocked, 0 = allowed. The branch is either one name (the
directory the hook runs in) or a map from directory to branch, "" being the hook's own directory: a push after
`cd <dir>` or with `git -C <dir>` is judged by the branch checked out there (a worktree, ADR-019).
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
    # the short form skips the same hook (#612), alone or in a cluster; a "-n" inside the message is text
    ("git commit -n -m 'x'", "main", 2),
    ("git commit -anm 'x'", "main", 2),
    ("git commit -m 'run it with -n first'", "main", 0),
    ("git log -n 5", "main", 0),
    # pointing hooks elsewhere skips commit-msg (#612); setting them to the repository's own folder is the setup step
    ("git -c core.hooksPath=/dev/null commit -m 'x'", "main", 2),
    ("git -c core.hookspath /tmp commit -m 'x'", "main", 2),
    ("git --config-env=core.hooksPath=HOOKS commit -m 'x'", "main", 2),
    ("git config core.hooksPath /tmp/none", "main", 2),
    ("git config --unset core.hooksPath", "main", 2),
    ("git config core.hooksPath .githooks", "main", 0),
    ("git config --get core.hooksPath", "main", 0),
    ("git config core.hooksPath", "main", 0),
    # read the way the shell reads them: quotes do not hide a key, and only real options and subcommands count
    ("git -c \"core.hooksPath=/tmp\" commit -m 'x'", "main", 2),
    ("git config unset core.hooksPath", "main", 2),
    ("git config core.hooksPath /tmp/--get", "main", 2),
    ("git config --remove-section core", "main", 2),
    ("GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=core.hooksPath GIT_CONFIG_VALUE_0=/tmp git commit -m 'x'", "main", 2),
    ("git config get core.hooksPath", "main", 0),
    ("git config core.hooksPath get", "main", 2),
    ("git commit -nm 'x'", "main", 2),
    ("git commit -mn", "main", 0),
    # every git the shell would run: after a newline, inside ( ) or $( ) or backticks, a second git in one line
    ("git status\ngit commit -n -m 'x'", "main", 2),
    ("(git commit -n -m 'x')", "main", 2),
    ("echo $(git -c core.hooksPath=/tmp commit -m 'x')", "main", 2),
    ("echo `git commit -n -m x`", "main", 2),
    # quotes the shell cannot close: a git command is blocked rather than read half-way
    ("git commit -n -m 'x", "main", 2),
    # a backslash-newline continues the command; a $( ) inside the arguments does not end the outer git
    ("git commit \\\n-n -m 'x'", "main", 2),
    ("git commit -m $(echo x) -n", "main", 2),
    # an escaped backslash before the newline is a backslash, not a continuation: the next line is its own command
    ("echo a\\\\\ngit commit -n -m x", "main", 2),
    # AI attribution in commit and PR text
    ("git commit -m \"feat: x\n\nCo-Authored-By: Claude <noreply@anthropic.com>\"", "main", 2),
    ("gh pr create --title t --body 'Generated with [Claude Code](https://claude.com/claude-code)'", "x/1-y", 2),
    ("git commit -m 'docs: close M0 (#11)'", "main", 0),
    # branch protection and repo deletion
    ("gh api -X DELETE repos/leventtcaan/keel/branches/main/protection", "main", 2),
    ("gh repo delete leventtcaan/keel --yes", "main", 2),
    ("gh api repos/leventtcaan/keel/branches/main/protection", "main", 0),
    # a push from another worktree is judged by that worktree's branch, not the main checkout's
    ("cd ../keel-k113 && git push --force-with-lease origin engine/24-golden-scenarios",
     {"": "main", "../keel-k113": "engine/24-golden-scenarios"}, 0),
    ("cd ../keel-k113 && git push --force-with-lease", {"": "engine/41-types", "../keel-k113": "main"}, 2),
    ("git -C ../keel-k113 push -f", {"": "engine/41-types", "../keel-k113": "main"}, 2),
    ("git -C ../keel-k113 push -f", {"": "main", "../keel-k113": "engine/24-golden-scenarios"}, 0),
    ("cd ../keel-k113 && ls && cd ../keel && git push -f",
     {"": "engine/41-types", "../keel-k113": "x/1-y", "../keel": "main"}, 2),
    # a directory the hook cannot read is judged by its own directory (the safe side when that is main)
    ("cd $SOMEWHERE && git push -f", {"": "main"}, 2),
    # chained commands are checked as a whole
    ("git add -A && git commit -m ok && git push --force origin main", "main", 2),
    # not git at all
    ("ls -la", "main", 0),
]


def run(command: str, branch, payload: str | None = None) -> int:
    payload = payload if payload is not None else json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    branches = branch if isinstance(branch, dict) else {"": branch}
    env = {"GIT_GUARD_BRANCHES": json.dumps(branches), "PATH": "/usr/bin:/bin"}
    r = subprocess.run([sys.executable, str(HOOK)], input=payload, text=True, capture_output=True, env=env)
    # A missing or crashing hook also exits 2 under Python; count a block only when the hook says so.
    if r.returncode == 2 and "Blocked by" not in r.stderr:
        return -1
    return r.returncode


# Payloads the hook cannot read: it blocks rather than letting an unread command through (#612).
UNREADABLE = ["not json", "[]", '{"tool_input": "git push -f"}']


def main() -> int:
    failures = [(c, b, want, got) for c, b, want in ROWS if (got := run(c, b)) != want]
    failures += [(p, "main", 2, got) for p in UNREADABLE if (got := run("", "main", payload=p)) != 2]
    for c, b, want, got in failures:
        print(f"FAIL [{b}] {c!r}: want {want}, got {got}")
    total = len(ROWS) + len(UNREADABLE)
    print(f"{total - len(failures)}/{total} passed")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
