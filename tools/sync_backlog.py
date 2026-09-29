#!/usr/bin/env python3
"""
plan/backlog.yaml → GitHub Issues + Project (ADR-002). The yaml is the single source; GitHub is the view.

  python3 tools/sync_backlog.py --dry-run   # show what would change, touch nothing
  python3 tools/sync_backlog.py --apply     # create/update milestones, labels, issues, project items

Idempotent: a task whose rendered content did not change since the last --apply is skipped (content hash in the
state file). Running --apply twice in a row makes no changes the second time.
Needs: gh CLI logged in with scopes repo + project; PyYAML.
"""
import argparse
import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
CONFIG = yaml.safe_load((ROOT / "tools/github.yaml").read_text(encoding="utf-8"))
OWNER, REPO = CONFIG["owner"], CONFIG["repo"]
FULL_REPO = f"{OWNER}/{REPO}"
STATE_PATH = ROOT / CONFIG["state_file"]
CUSTOM_FIELDS = {"Module": "module", "Work type": "type", "Size": "size"}  # project field → task key ("Type" is reserved by GitHub)


# ───────────────────────── helpers ─────────────────────────
TRANSIENT = ("Something went wrong", "502", "503", "timeout", "was submitted too quickly")


def gh(*args, parse_json=False, attempts=4):
    for attempt in range(1, attempts + 1):
        result = subprocess.run(["gh", *args], capture_output=True, text=True)
        if result.returncode == 0:
            return json.loads(result.stdout) if parse_json else result.stdout.strip()
        if attempt < attempts and any(marker in result.stderr for marker in TRANSIENT):
            time.sleep(2 ** attempt)  # GitHub's transient errors usually clear within seconds
            continue
        sys.exit(f"gh {' '.join(args)}\n{result.stderr.strip()}")


def load_state():
    if STATE_PATH.exists():
        return yaml.safe_load(STATE_PATH.read_text(encoding="utf-8")) or {}
    return {}


def save_state(state):
    header = "# Written by tools/sync_backlog.py — do not edit by hand.\n"
    STATE_PATH.write_text(header + yaml.safe_dump(state, allow_unicode=True, sort_keys=True), encoding="utf-8")


def validate(backlog):
    tasks = backlog["tasks"]
    ids = [t["id"] for t in tasks]
    problems = []
    if len(ids) != len(set(ids)):
        problems.append("duplicate task ids")
    milestones = {m["id"] for m in backlog["milestones"]}
    for t in tasks:
        for field in ("id", "title", "milestone", "module", "type", "size", "status", "why", "acceptance"):
            if not t.get(field):
                problems.append(f"{t.get('id')}: missing {field}")
        if t.get("milestone") not in milestones:
            problems.append(f"{t['id']}: unknown milestone {t.get('milestone')}")
        if t.get("status") not in CONFIG["status_map"]:
            problems.append(f"{t['id']}: unknown status {t.get('status')}")
        for dep in t.get("depends_on", []):
            if dep not in ids:
                problems.append(f"{t['id']}: unknown dependency {dep}")
    if problems:
        sys.exit("backlog.yaml is invalid:\n  " + "\n  ".join(problems))


def file_link(ref):
    path, _, anchor = ref.partition("#")
    url = f"https://github.com/{FULL_REPO}/blob/main/{path}"
    return f"[`{ref}`]({url})" if not anchor else f"[`{path}`]({url}) › {anchor}"


def render_body(task, milestone_titles, issue_numbers):
    deps = [f"#{issue_numbers[d]}" if d in issue_numbers else d for d in task.get("depends_on", [])]
    lines = [
        f"**Kilometre taşı:** {task['milestone']} · {milestone_titles[task['milestone']]}  ",
        f"**Modül:** `{task['module']}` · **Tür:** {task['type']} · **Boyut:** {task['size']}  ",
        f"**Bağımlılık:** {', '.join(deps) if deps else '—'}",
        "",
        "### Neden",
        task["why"],
        "",
        "### Kabul kriterleri",
        *[f"- [{'x' if task['status'] == 'done' else ' '}] {a}" for a in task["acceptance"]],
    ]
    if task.get("tests"):
        lines += ["", "### Kanıt (testler)", *[f"- {x}" for x in task["tests"]]]
    if task.get("refs"):
        lines += ["", "### Kaynaklar", *[f"- {file_link(r)}" for r in task["refs"]]]
    if task.get("learn"):
        lines += ["", "### Öğrenilecekler", *[f"- {x}" for x in task["learn"]]]
    lines += ["", "---", "_Bu issue `plan/backlog.yaml`'dan üretilir (ADR-002). Değişiklik önce yaml'da yapılır._"]
    return "\n".join(lines)


def digest(*parts):
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()[:16]


# ───────────────────────── GitHub setup ─────────────────────────
def ensure_milestones(backlog, apply):
    existing = {m["title"]: m["number"] for m in gh("api", f"repos/{FULL_REPO}/milestones?state=all&per_page=100",
                                                     parse_json=True)}
    titles = {}
    for m in backlog["milestones"]:
        title = f"{m['id']} · {m['title']}"
        titles[m["id"]] = title
        if title not in existing:
            print(f"  + milestone {title}")
            if apply:
                gh("api", f"repos/{FULL_REPO}/milestones", "-f", f"title={title}", "-f", f"description={m['goal']}")
    return titles


def ensure_labels(backlog, apply):
    wanted = sorted({f"module:{t['module']}" for t in backlog["tasks"]} | {f"type:{t['type']}" for t in backlog["tasks"]})
    existing = {label["name"] for label in gh("label", "list", "--repo", FULL_REPO, "--limit", "200",
                                               "--json", "name", parse_json=True)}
    for name in wanted:
        if name not in existing:
            print(f"  + label {name}")
            if apply:
                color = "FF4F12" if name.startswith("type:") else "0E0E0E"
                gh("label", "create", name, "--repo", FULL_REPO, "--color", color)


def ensure_project(state, backlog, apply):
    projects = gh("project", "list", "--owner", OWNER, "--format", "json", parse_json=True)["projects"]
    project = next((p for p in projects if p["title"] == CONFIG["project_title"]), None)
    if project is None:
        print(f"  + project {CONFIG['project_title']}")
        if not apply:
            return None
        project = gh("project", "create", "--owner", OWNER, "--title", CONFIG["project_title"], "--format", "json",
                     parse_json=True)
        gh("project", "link", str(project["number"]), "--owner", OWNER, "--repo", FULL_REPO)
    number = project["number"]
    view = gh("project", "view", str(number), "--owner", OWNER, "--format", "json", parse_json=True)
    state["project"] = {"number": number, "id": view["id"], "url": view.get("url", "")}

    fields = {f["name"]: f for f in gh("project", "field-list", str(number), "--owner", OWNER, "--format", "json",
                                       parse_json=True)["fields"]}
    for field_name, key in CUSTOM_FIELDS.items():
        options = sorted({t[key] for t in backlog["tasks"]})
        if field_name not in fields:
            print(f"  + project field {field_name}: {', '.join(options)}")
            if apply:
                gh("project", "field-create", str(number), "--owner", OWNER, "--name", field_name,
                   "--data-type", "SINGLE_SELECT", "--single-select-options", ",".join(options))
        else:
            missing = set(options) - {o["name"] for o in fields[field_name].get("options", [])}
            if missing:
                sys.exit(f"Project field {field_name} lacks options {sorted(missing)}; add them in the project UI.")
    if apply:
        fields = {f["name"]: f for f in gh("project", "field-list", str(number), "--owner", OWNER, "--format", "json",
                                           parse_json=True)["fields"]}
    return {name: {"id": f["id"], "options": {o["name"]: o["id"] for o in f.get("options", [])}}
            for name, f in fields.items() if name in (*CUSTOM_FIELDS, "Status")}


# ───────────────────────── issues ─────────────────────────
def sync_issue(task, body, milestone_title, state, apply):
    tasks_state = state.setdefault("tasks", {})
    entry = tasks_state.get(task["id"], {})
    title = f"{task['id']} · {task['title']}"
    labels = [f"module:{task['module']}", f"type:{task['type']}"]
    content_hash = digest(title, body, milestone_title, ",".join(labels), task["status"])

    if "issue" not in entry:
        print(f"  + issue {title}")
        if not apply:
            return
        url = gh("issue", "create", "--repo", FULL_REPO, "--title", title, "--body", body,
                 "--milestone", milestone_title, *sum((["--label", label] for label in labels), []))
        entry = {"issue": int(url.rstrip("/").split("/")[-1]), "url": url}
    elif entry.get("hash") != content_hash:
        print(f"  ~ issue #{entry['issue']} {title}")
        if not apply:
            return
        gh("issue", "edit", str(entry["issue"]), "--repo", FULL_REPO, "--title", title, "--body", body,
           "--milestone", milestone_title, *sum((["--add-label", label] for label in labels), []))
    else:
        return

    closed = task["status"] == "done"
    current = gh("issue", "view", str(entry["issue"]), "--repo", FULL_REPO, "--json", "state", parse_json=True)["state"]
    if closed and current == "OPEN":
        gh("issue", "close", str(entry["issue"]), "--repo", FULL_REPO, "--reason", "completed")
    elif not closed and current == "CLOSED":
        gh("issue", "reopen", str(entry["issue"]), "--repo", FULL_REPO)
    entry["hash"] = content_hash
    entry["project_fields_synced"] = False
    tasks_state[task["id"]] = entry


def sync_project_item(task, state, fields, apply):
    entry = state["tasks"].get(task["id"])
    if not entry or entry.get("project_fields_synced") or not apply or fields is None:
        return
    project = state["project"]
    if "item" not in entry:
        item = gh("project", "item-add", str(project["number"]), "--owner", OWNER, "--url", entry["url"],
                  "--format", "json", parse_json=True)
        entry["item"] = item["id"]
    values = {"Status": CONFIG["status_map"][task["status"]],
              **{name: task[key] for name, key in CUSTOM_FIELDS.items()}}
    for field_name, value in values.items():
        field = fields[field_name]
        gh("project", "item-edit", "--id", entry["item"], "--project-id", project["id"],
           "--field-id", field["id"], "--single-select-option-id", field["options"][value])
    entry["project_fields_synced"] = True


# ───────────────────────── main ─────────────────────────
def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    backlog = yaml.safe_load((ROOT / "plan/backlog.yaml").read_text(encoding="utf-8"))
    validate(backlog)
    state = load_state()
    print(f"{len(backlog['tasks'])} tasks · {'APPLY' if args.apply else 'DRY RUN'} → {FULL_REPO}")

    milestone_titles = ensure_milestones(backlog, args.apply)
    ensure_labels(backlog, args.apply)
    fields = ensure_project(state, backlog, args.apply)

    # Two passes: dependency references render as #issue once every issue exists.
    for _ in range(2):
        numbers = {tid: e["issue"] for tid, e in state.get("tasks", {}).items() if "issue" in e}
        for task in backlog["tasks"]:
            body = render_body(task, milestone_titles, numbers)
            sync_issue(task, body, milestone_titles[task["milestone"]], state, args.apply)
            sync_project_item(task, state, fields, args.apply)
            if args.apply:
                save_state(state)
        if not args.apply:
            break
    if args.apply:
        print(f"done · project: {state.get('project', {}).get('url', '')}")


if __name__ == "__main__":
    main()
