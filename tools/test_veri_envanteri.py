"""The data inventory (docs/yasal/veri-envanteri.json, K-801, ADR-060) is the code's, and the privacy texts are the inventory's:
- every table the migrations create is in the inventory, and every table in the inventory is created by a migration;
- each table's columns are exactly the migrations' (create table + alter table add/drop column);
- each inventory entry points at a section of the privacy policy, and each data section of the policy is pointed at;
- every permission text the app asks iOS with is in the inventory, and every one in the inventory is asked;
- the App Store privacy label draft names exactly the Apple data types the inventory gives, all from Apple's own list.

Run: python3 tools/test_veri_envanteri.py
"""
import json
import pathlib
import re
import sys
import unittest

sys.dont_write_bytecode = True  # no __pycache__ in tools/

ROOT = pathlib.Path(__file__).resolve().parent.parent
MIGRATIONS = ROOT / "backend/src/main/resources/db/migration"
INVENTORY = ROOT / "docs/yasal/veri-envanteri.json"
PRIVACY = ROOT / "docs/yasal/site/privacy.md"
LABEL_DRAFT = ROOT / "docs/yasal/app-store-beyanlari.md"
APP_CONFIG = ROOT / "apps/mobile/app.config.ts"
COPY = ROOT / "data/copy/en.json"

CLASSES = {"health", "training", "account", "subscription", "technical", "reference"}
ERASED_BY = {"account_deletion", "withdraw:HEALTH_DATA", "withdraw:APPLE_HEALTH", "withdraw:THIRD_PARTY_AI", "time", "never"}
NOT_A_COLUMN = {"primary", "unique", "check", "constraint", "foreign", "exclude"}


def _statements(sql):
    sql = re.sub(r"--[^\n]*", "", sql)
    return [s.strip() for s in sql.split(";") if s.strip()]


def _top_level_parts(body):
    parts, depth, current = [], 0, ""
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append(current)
            current = ""
        else:
            current += ch
    parts.append(current)
    return [p.strip() for p in parts if p.strip()]


def _qualified(name):
    return name if "." in name else f"public.{name}"


def migration_tables(directory=MIGRATIONS):
    """{schema.table: [column, …]} as the migrations leave the database, applied in version order."""
    files = sorted(directory.glob("V*__*.sql"), key=lambda f: int(re.match(r"V(\d+)__", f.name).group(1)))
    tables = {}
    for file in files:
        for stmt in _statements(file.read_text(encoding="utf-8")):
            create = re.match(r"create\s+table\s+(?:if\s+not\s+exists\s+)?([\w.]+)\s*\((.*)\)\s*$", stmt, re.S | re.I)
            if create:
                columns = [part.split()[0] for part in _top_level_parts(create.group(2))
                           if part.split()[0].lower() not in NOT_A_COLUMN]
                tables[_qualified(create.group(1))] = columns
                continue
            alter = re.match(r"alter\s+table\s+([\w.]+)\s+(.*)$", stmt, re.S | re.I)
            if alter:
                table = _qualified(alter.group(1))
                for action in _top_level_parts(alter.group(2)):
                    added = re.match(r"add\s+column\s+(?:if\s+not\s+exists\s+)?(\w+)", action, re.I)
                    dropped = re.match(r"drop\s+column\s+(?:if\s+exists\s+)?(\w+)", action, re.I)
                    renamed = re.match(r"rename\s+column\s+(\w+)\s+to\s+(\w+)", action, re.I)
                    if added:
                        tables[table].append(added.group(1))
                    elif dropped:
                        tables[table].remove(dropped.group(1))
                    elif renamed:
                        tables[table][tables[table].index(renamed.group(1))] = renamed.group(2)
                continue
            dropped_table = re.match(r"drop\s+table\s+(?:if\s+exists\s+)?([\w.]+)", stmt, re.I)
            if dropped_table:
                del tables[_qualified(dropped_table.group(1))]
    return tables


def policy_anchors(markdown):
    """Heading ids written as kramdown attributes: `## Health data {#data-health}`."""
    return re.findall(r"^#{1,6} .*\{#([a-z0-9-]+)\}\s*$", markdown, re.M)


def label_draft_types(markdown):
    """The Apple data types in the draft's label table: rows of `| Category › Type | …`."""
    section = markdown.split("<!-- label:start -->")[1].split("<!-- label:end -->")[0]
    return {m.strip() for m in re.findall(r"^\|\s*([^|]+›[^|]+?)\s*\|", section, re.M)}


def inventory():
    return json.loads(INVENTORY.read_text(encoding="utf-8"))


class MigrationReading(unittest.TestCase):
    """The reader itself, on SQL like the migrations', so the checks below cannot pass on nothing."""

    def test_create_alter_drop(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d)
            (p / "V1__a.sql").write_text(
                "-- a comment; with a semicolon\ncreate schema if not exists s;\n"
                "create table s.t\n(\n    id uuid primary key,\n    n numeric(6, 2) check (n > 0),\n"
                "    tags text[],\n    unique (id, n),\n    check (n < 9)\n);\n"
                "create table if not exists plain (x int, primary key (x));\n")
            (p / "V2__b.sql").write_text(
                "alter table s.t\n    add column a int,\n    add column b text,\n    add check (a > 0);\n"
                "alter table s.t drop column tags;\nalter table s.t rename column b to c;\n"
                "alter table s.t alter column a set not null;\n")
            (p / "V10__c.sql").write_text("drop table plain;\n")
            self.assertEqual(migration_tables(p), {"s.t": ["id", "n", "a", "c"]})

    def test_reads_the_real_migrations(self):
        tables = migration_tables()
        self.assertGreater(len(tables), 30)
        self.assertIn("note", tables["training.workout"])  # V21's alter
        self.assertEqual(tables["public.event_publication"][0], "id")


class InventoryMatchesTheMigrations(unittest.TestCase):
    def test_every_table_both_ways(self):
        listed = {entry["table"] for entry in inventory()["server"]}
        created = set(migration_tables())
        self.assertEqual(sorted(created - listed), [], "created by a migration, missing from the inventory")
        self.assertEqual(sorted(listed - created), [], "in the inventory, created by no migration")

    def test_every_column_both_ways(self):
        created = migration_tables()
        for entry in inventory()["server"]:
            with self.subTest(table=entry["table"]):
                self.assertEqual(sorted(entry["columns"]), sorted(created.get(entry["table"], [])))

    def test_each_entry_is_complete(self):
        for entry in inventory()["server"]:
            with self.subTest(table=entry["table"]):
                self.assertIn(entry["class"], CLASSES)
                self.assertTrue(entry["purpose"].strip())
                self.assertTrue(set(entry["erased_by"]) <= ERASED_BY, entry["erased_by"])
                self.assertTrue(entry["erased_by"])
                self.assertIsInstance(entry["exported"], bool)
                if "time" in entry["erased_by"]:
                    self.assertTrue(entry.get("kept_for", "").strip(), "a time-based purge says how long")

    def test_health_data_needs_its_consent_and_goes_with_it(self):
        for entry in inventory()["server"]:
            if entry["class"] == "health":
                with self.subTest(table=entry["table"]):
                    self.assertEqual(entry["gated_by"], "HEALTH_DATA")
                    self.assertIn("withdraw:HEALTH_DATA", entry["erased_by"])

    def test_user_data_goes_with_the_account(self):
        for entry in inventory()["server"]:
            if entry["class"] in {"health", "training", "account", "subscription"}:
                with self.subTest(table=entry["table"]):
                    self.assertIn("account_deletion", entry["erased_by"])


class PolicyMatchesTheInventory(unittest.TestCase):
    def setUp(self):
        self.anchors = policy_anchors(PRIVACY.read_text(encoding="utf-8"))
        data = inventory()
        self.referenced = ([e["policy"] for e in data["server"]] + [p["policy"] for p in data["phone"]["permissions"]]
                           + [s["policy"] for s in data["phone"]["stored"]] + [o["policy"] for o in data["outbound"]])

    def test_every_entry_points_at_a_section(self):
        self.assertEqual(sorted(set(self.referenced) - set(self.anchors)), [])

    def test_every_data_section_is_pointed_at(self):
        data_sections = {a for a in self.anchors if a.startswith("data-")}
        self.assertGreater(len(data_sections), 3)
        self.assertEqual(sorted(data_sections - set(self.referenced)), [])

    def test_every_recipient_is_named_in_the_policy(self):
        policy = PRIVACY.read_text(encoding="utf-8")
        for flow in inventory()["outbound"]:
            with self.subTest(recipient=flow["recipient"]):
                self.assertIn(flow["recipient"], policy)


class PermissionsMatchTheApp(unittest.TestCase):
    def test_every_permission_text_both_ways(self):
        asked = set(re.findall(r"en\.permissions\.(\w+)", APP_CONFIG.read_text(encoding="utf-8")))
        self.assertGreater(len(asked), 2)
        listed = {p["copy_key"] for p in inventory()["phone"]["permissions"]}
        self.assertEqual(sorted(asked ^ listed), [])

    def test_the_copy_has_them(self):
        texts = json.loads(COPY.read_text(encoding="utf-8"))["permissions"]
        for permission in inventory()["phone"]["permissions"]:
            self.assertIn(permission["copy_key"], texts)


class LabelDraftMatchesTheInventory(unittest.TestCase):
    def test_types_are_apples(self):
        data = inventory()
        apple = set(data["apple_data_types"]["types"])
        self.assertIn("Health & Fitness › Health", apple)
        used = {t for e in data["server"] + data["outbound"] for t in e.get("app_privacy", [])}
        self.assertTrue(used)
        self.assertEqual(sorted(used - apple), [])

    def test_draft_names_exactly_the_inventorys_types(self):
        data = inventory()
        used = {t for e in data["server"] + data["outbound"] for t in e.get("app_privacy", [])}
        self.assertEqual(sorted(label_draft_types(LABEL_DRAFT.read_text(encoding="utf-8")) ^ used), [])


if __name__ == "__main__":
    unittest.main()
