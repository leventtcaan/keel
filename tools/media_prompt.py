"""The form-image prompt of one move (K-1219, ADR-091 #4): the standard template with the move's slots filled.

    python3 tools/media_prompt.py <exercise_id>     # prints the prompt
    python3 tools/media_prompt.py --all             # checks that all moves fill every slot

Slots come from data/exercises/<id>.yaml, data/copy/en.json and data/exercises/media/poses.json; the template is the block
in data/exercises/media/prompt-template.md. Standard library only; the YAML files are flat, read line by line (as clip.py).
"""
import json
import pathlib
import re
import string
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOG = ROOT / "data" / "exercises"
MEDIA = CATALOG / "media"
COPY = ROOT / "data" / "copy" / "en.json"

BEGIN, END = "<!-- prompt:begin -->", "<!-- prompt:end -->"
POSE_SLOTS = ("apparatus", "view", "start", "end", "path")
CUES = ("cue1", "cue2", "cue3")


def template(media: pathlib.Path = MEDIA) -> str:
    text = (media / "prompt-template.md").read_text(encoding="utf-8")
    if BEGIN not in text or END not in text:
        raise SystemExit("prompt-template.md has no prompt block")
    return text.split(BEGIN, 1)[1].split(END, 1)[0].strip() + "\n"


def move(exercise_id: str, catalog: pathlib.Path = CATALOG) -> dict:
    """equipment, muscles and setup of a move's YAML."""
    path = catalog / f"{exercise_id}.yaml"
    if not path.exists():
        raise SystemExit(f"no move '{exercise_id}' in {catalog}")
    found: dict = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.match(r"^(equipment|muscles|setup):\s*(.*)$", line)
        if match:
            value = match.group(2).strip()
            found[match.group(1)] = [v.strip() for v in value.strip("[]").split(",") if v.strip()] if value.startswith("[") else value
    for key in ("equipment", "muscles", "setup"):
        if key not in found:
            raise SystemExit(f"{path.name}: no {key}")
    return found


def slots(exercise_id: str, catalog: pathlib.Path = CATALOG, media: pathlib.Path = MEDIA, copy: pathlib.Path = COPY) -> dict:
    texts = json.loads(copy.read_text(encoding="utf-8"))
    own = texts.get("exercises", {}).get(exercise_id)
    if own is None:
        raise SystemExit(f"no copy for '{exercise_id}' in en.json")
    poses = json.loads((media / "poses.json").read_text(encoding="utf-8"))
    if exercise_id not in poses:
        raise SystemExit(f"no pose for '{exercise_id}' in poses.json")
    entry = move(exercise_id, catalog)
    filled = {"name": own["name"], "equipment": entry["equipment"]}
    filled.update({cue: own[cue] for cue in CUES})
    filled["muscles"] = " and ".join(texts["demo"]["muscle"][m] for m in entry["muscles"]).lower()
    labels = [texts["exerciseSetup"][f]["label"].lower() for f in entry["setup"]]
    filled["setup"] = ", ".join(labels) if labels else "no machine setup; just the stance and the position of the body"
    filled.update({slot: poses[exercise_id][slot] for slot in POSE_SLOTS})
    return filled


def prompt(exercise_id: str, catalog: pathlib.Path = CATALOG, media: pathlib.Path = MEDIA, copy: pathlib.Path = COPY) -> str:
    """The filled template; a slot with no value stops it instead of leaving a hole."""
    text = template(media)
    values = slots(exercise_id, catalog, media, copy)
    wanted = {name for _, name, _, _ in string.Formatter().parse(text) if name}
    lacking = sorted(w for w in wanted if not str(values.get(w, "")).strip())
    if lacking:
        raise SystemExit(f"{exercise_id}: empty slots {lacking}")
    return text.format(**values)


def ids(catalog: pathlib.Path = CATALOG) -> list[str]:
    return sorted(p.stem for p in catalog.glob("*.yaml"))


def main(argv: list[str]) -> int:
    if len(argv) != 1:
        print(__doc__, file=sys.stderr)
        return 2
    if argv[0] == "--all":
        for exercise_id in ids():
            prompt(exercise_id)
        print(f"{len(ids())} prompts, no empty slot")
        return 0
    sys.stdout.write(prompt(argv[0]))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
