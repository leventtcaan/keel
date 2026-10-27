#!/usr/bin/env python3
"""PreToolUse(Bash) guard for keel (ADR-019 item 5, CLAUDE.md "Git").

Blocks, with exit code 2 and a reason on stderr (Claude Code shows it to the agent):
- force push that touches main (own task branches may be force-pushed after a rebase)
- git reset --hard, git clean -f, git branch -D, --no-verify and its short form git commit -n
- pointing hooks away from .githooks (git -c / --config-env core.hooksPath, git config core.hooksPath <other>)
- AI attribution in commit or PR/issue text (G3: no signature, no tool name)
- deleting branch protection or the repository
- a payload it cannot read (it fails closed: an unread command does not go through)
Everything else exits 0. Tests: tools/test_git_guard.py
It reads the command's text, so it stops mistakes, not someone set on getting around it: git called through a variable or
an alias is not seen (#612). Branch protection and CI on GitHub are the guard that cannot be talked past.
"""
import json
import os
import re
import shlex
import subprocess
import sys

# One shell segment: stop at ;, &&, ||, | or a newline outside quotes is good enough here.
SEG = r"[^;&|\n]*"
ATTRIBUTION = re.compile(r"Co-Authored-By:\s*Claude|noreply@anthropic\.com|Generated with \[?Claude|🤖 Generated",
                         re.IGNORECASE)


DIRECTORY = r"(\"[^\"]+\"|'[^']+'|[^\s;&|]+)"
# Options of git itself that take the next word, and commit's short options that do (a cluster ends at one of them).
SEPARATORS = ";&|()\n"
GIT_VALUE_OPTIONS = {"-C", "-c", "--config-env", "--git-dir", "--work-tree", "--namespace", "--exec-path"}
COMMIT_VALUE_LETTERS = set("mFcCt")
HOOKS_KEY = "core.hookspath"
CONFIG_READS = {"--get", "--get-all", "--get-regexp", "--get-urlmatch", "-l", "--list", "get", "list"}
CONFIG_REMOVES = {"--unset", "--unset-all", "unset", "--remove-section", "--rename-section", "remove-section",
                  "rename-section", "--edit", "-e", "edit"}


def segments(cmd: str) -> list[list[str]]:
    """The command as the shell splits it: words per simple command, quotes removed the way the shell removes them.
    A newline, ;, &, |, ( and ) end a command; backticks are read as parentheses (a command inside a command)."""
    lexer = shlex.shlex(cmd.replace("`", " ( "), posix=True, punctuation_chars=SEPARATORS)
    lexer.whitespace = " \t\r"
    lexer.whitespace_split = True
    lexer.commenters = ""
    found, current = [], []
    for word in lexer:
        if word and set(word) <= set(SEPARATORS):
            found.append(current)
            current = []
        else:
            current.append(word)
    return [*found, current]


def hook_bypasses(cmd: str) -> list[str]:
    """Ways to run git without .githooks: commit -n, and core.hooksPath set away from .githooks (#612)."""
    if re.search(r"GIT_CONFIG_(KEY_\d+=\s*core\.hookspath|PARAMETERS=.*hookspath)", cmd, re.IGNORECASE):
        return ["core.hooksPath set through the environment skips the commit-msg check"]
    try:
        commands = segments(cmd)
    except ValueError:
        # Quotes the shell would not close either: a git command that cannot be read is not let through.
        return ["could not read this git command (unclosed quotes); nothing was run"] if re.search(r"\bgit\b", cmd) else []
    found = []
    # Every git the shell would run, not only the first word: `x=1 git …`, `$(git …)`, `env git …`.
    calls = [words[at + 1:] for words in commands for at, word in enumerate(words)
             if word.strip("${}").rsplit("/", 1)[-1] == "git"]
    for rest in calls:
        sub, i = None, 0
        while i < len(rest):
            word = rest[i]
            if word in ("-c", "--config-env"):
                setting, i = (rest[i + 1] if i + 1 < len(rest) else ""), i + 2
            elif word.startswith("--config-env="):
                setting, i = word.split("=", 1)[1], i + 1
            elif word.startswith("-c"):
                setting, i = word[2:], i + 1
            elif word in GIT_VALUE_OPTIONS:
                setting, i = "", i + 2
            elif word.startswith("-"):
                setting, i = "", i + 1
            else:
                sub = i
                break
            if setting.split("=", 1)[0].lower() == HOOKS_KEY:
                found.append("pointing core.hooksPath elsewhere skips the commit-msg check")
        if sub is None:
            continue
        name, args = rest[sub], rest[sub + 1:]
        if name == "commit":
            skip = False
            for arg in args:
                if skip:
                    skip = False
                    continue
                if arg.startswith("-") and not arg.startswith("--") and len(arg) > 1:
                    for n, letter in enumerate(arg[1:]):
                        if letter in COMMIT_VALUE_LETTERS:
                            skip = n == len(arg) - 2
                            break
                        if letter == "n":
                            found.append("git commit -n is --no-verify: it skips the commit-msg check")
                            break
                elif arg in ("--message", "--file", "--reuse-message", "--reedit-message", "--template", "--author",
                             "--date", "--fixup", "--squash"):
                    skip = True
        elif name == "config":
            lowered = [a.lower() for a in args]
            removes = any(a in CONFIG_REMOVES for a in lowered)
            if removes and ("core" in lowered or HOOKS_KEY in lowered):
                found.append("core.hooksPath stays .githooks (the commit-msg check lives there)")
                continue
            if HOOKS_KEY not in lowered:
                continue
            after = [a for a in args[lowered.index(HOOKS_KEY) + 1:] if not a.startswith("-")]
            reads = any(a in CONFIG_READS for a in lowered[:lowered.index(HOOKS_KEY)])
            if not reads and after and after[0].rstrip("/") != ".githooks":
                found.append("core.hooksPath stays .githooks (the commit-msg check lives there)")
    return found


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
    found += hook_bypasses(cmd)
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
        cmd = payload["tool_input"].get("command") or ""
        if not isinstance(cmd, str):
            raise TypeError("command is not text")
    except (ValueError, KeyError, TypeError, AttributeError):
        # Claude Code always sends this shape; anything else is a fault, and a fault does not let a command through.
        print("Blocked by .claude/hooks/git_guard.py:\n- could not read the command; nothing was run", file=sys.stderr)
        return 2
    found = reasons(cmd)
    if not found:
        return 0
    print("Blocked by .claude/hooks/git_guard.py:\n- " + "\n- ".join(found), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
