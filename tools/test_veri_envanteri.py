"""The data inventory (docs/yasal/veri-envanteri.json, K-801, ADR-060) is the code's, and the privacy texts are the inventory's:
- every table the migrations create is in the inventory, and every table in the inventory is created by a migration;
- each table's columns are exactly the migrations' (create table + alter table add/drop column);
- each inventory entry points at a section of the privacy policy, and each data section of the policy is pointed at;
- every permission text, Info.plist key, config plugin and Apple Health type the app asks for is in the inventory, and every
  one in the inventory is asked; every runtime dependency is listed with where it sends data, if anywhere;
- health tables are the backend's health schemas; anything with an account goes with the account;
- the App Store label draft names exactly the inventory's Apple data types, all Apple's; every age rating question is answered;
- the recipients, the sections a policy needs and the AI section's "not active yet" follow the inventory and the server's config.

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
APP_CONFIG = ROOT / "apps/mobile/app.config.ts"
COPY = ROOT / "data/copy/en.json"
APP_JSON = ROOT / "apps/mobile/app.json"
LABEL_DRAFT = ROOT / "docs/yasal/app-store-beyanlari.md"
PACKAGE = ROOT / "apps/mobile/package.json"
HEALTHKIT = ROOT / "apps/mobile/src/health/healthKit.ts"
SERVER_CONFIG = ROOT / "backend/src/main/resources/application.yml"
# The schemas whose account rows are health data and go with the HEALTH_DATA consent — the backend's own list
# (ConsentWithdrawalDeletionTests.HEALTH_SCHEMAS).
HEALTH_SCHEMAS = {"measurement", "nutrition", "decision"}
REQUIRED_SECTIONS = {"controller", "recipients", "ai", "automated-calls", "rights", "age", "security", "changes"}

CLASSES = {"health", "training", "account", "subscription", "technical", "reference"}
ERASED_BY = {"account_deletion", "withdraw:HEALTH_DATA", "withdraw:APPLE_HEALTH", "withdraw:THIRD_PARTY_AI", "time", "handled", "never"}
NOT_A_COLUMN = {"primary", "unique", "check", "constraint", "foreign", "exclude"}
NOT_A_TABLE_BODY = {"like"}  # create table … (like other): its columns are another table's


class UnknownSql(ValueError):
    """A statement or an alter action the reader doesn't know: it fails rather than skip what might be a new table or column."""


IDENT = r"[a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?"  # unquoted, lower case: Postgres folds the rest, quoted names are refused
KNOWN_STATEMENTS = [r"create\s+schema\b", r"create\s+(unique\s+)?index\b", rf"create\s+table\s+(if\s+not\s+exists\s+)?{IDENT}\s*\(",
                    rf"alter\s+table\s+{IDENT}\s", rf"drop\s+table\s+(if\s+exists\s+)?{IDENT}\s*$", r"drop\s+index\b",
                    r"insert\s+into\b", rf"update\s+{IDENT}\s+set\b", r"delete\s+from\b", r"comment\s+on\b"]
KNOWN_ACTIONS = [r"add\s+column\s", r"drop\s+column\s", r"rename\s+column\s", r"alter\s+column\s",
                 r"add\s+(constraint|check|primary|unique|foreign)\b", r"drop\s+constraint\b"]


def _statements(sql):
    """Statements split on semicolons outside comments, quoted strings and dollar-quoted bodies."""
    out, current, i = [], "", 0
    while i < len(sql):
        if sql.startswith("--", i):
            i = sql.find("\n", i) if "\n" in sql[i:] else len(sql)
            continue
        if sql.startswith("/*", i):
            i = sql.index("*/", i) + 2
            continue
        if sql[i] == "'":
            j = sql.index("'", i + 1)
            current, i = current + sql[i:j + 1], j + 1
            continue
        if sql.startswith("$$", i):
            j = sql.index("$$", i + 2)
            current, i = current + sql[i:j + 2], j + 2
            continue
        if sql[i] == ";":
            out.append(current)
            current = ""
        else:
            current += sql[i]
        i += 1
    out.append(current)
    return [s.strip() for s in out if s.strip()]


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
    """{schema.table: [column, …]} as the migrations leave the database, applied in version order. Strict: a statement or
    alter action of a shape it doesn't know raises UnknownSql instead of being skipped."""
    files = sorted(directory.glob("V*__*.sql"), key=lambda f: int(re.match(r"V(\d+)__", f.name).group(1)))
    tables = {}
    for file in files:
        for stmt in _statements(file.read_text(encoding="utf-8")):
            if not any(re.match(k, stmt, re.I) for k in KNOWN_STATEMENTS):
                raise UnknownSql(f"{file.name}: {stmt[:80]}")
            if re.match(r"create\s+table\b", stmt, re.I):
                create = re.match(rf"create\s+table\s+(?:if\s+not\s+exists\s+)?({IDENT})\s*\((.*)\)\s*$", stmt, re.S | re.I)
                if not create:
                    raise UnknownSql(f"{file.name}: {stmt[:80]}")
                columns = []
                for part in _top_level_parts(create.group(2)):
                    first = part.split()[0]
                    if first.lower() in NOT_A_TABLE_BODY:
                        raise UnknownSql(f"{file.name}: {part[:80]}")
                    if first.lower() in NOT_A_COLUMN:
                        continue
                    if not re.fullmatch(r"[a-z_][a-z0-9_]*", first):
                        raise UnknownSql(f"{file.name}: column {first}")
                    columns.append(first)
                tables[_qualified(create.group(1))] = columns
                continue
            alter = re.match(rf"alter\s+table\s+({IDENT})\s+(.*)$", stmt, re.S | re.I)
            if alter:
                table = _qualified(alter.group(1))
                for action in _top_level_parts(alter.group(2)):
                    if not any(re.match(a, action, re.I) for a in KNOWN_ACTIONS):
                        raise UnknownSql(f"{file.name}: {action[:80]}")
                    added = re.match(r"add\s+column\s+(?:if\s+not\s+exists\s+)?([a-z_][a-z0-9_]*)\s", action, re.I)
                    dropped = re.match(r"drop\s+column\s+(?:if\s+exists\s+)?([a-z_][a-z0-9_]*)\s*$", action, re.I)
                    renamed = re.match(r"rename\s+column\s+([a-z_][a-z0-9_]*)\s+to\s+([a-z_][a-z0-9_]*)\s*$", action, re.I)
                    if re.match(r"(add|drop|rename)\s+column", action, re.I) and not (added or dropped or renamed):
                        raise UnknownSql(f"{file.name}: {action[:80]}")
                    if added:
                        tables[table].append(added.group(1))
                    elif dropped:
                        tables[table].remove(dropped.group(1))
                    elif renamed:
                        tables[table][tables[table].index(renamed.group(1))] = renamed.group(2)
                continue
            dropped_table = re.match(rf"drop\s+table\s+(?:if\s+exists\s+)?({IDENT})", stmt, re.I)
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


def age_draft_answers(markdown):
    """{question: answer} from the draft's age rating table: rows of `| Question | Answer | Why |`."""
    section = markdown.split("<!-- age:start -->")[1].split("<!-- age:end -->")[0]
    rows = re.findall(r"^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|", section, re.M)
    return {q: a for q, a in rows if q not in ("Soru",) and not set(q) <= set("-")}


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

    def test_a_form_it_does_not_know_fails_instead_of_being_skipped(self):
        import tempfile
        forms = ['create table s."Secret" (id uuid);', 'alter table s.t add column "mood" text;',
                 "create table s.w (like s.t including all);", "create table s.w as select * from s.t;",
                 "create unlogged table s.w (id uuid);", "create temporary table w (id uuid);",
                 "alter table s.t add mood text;", "alter table if exists s.t add column mood text;",
                 "alter table only s.t add column mood text;", "alter table s.t rename to w;",
                 "alter table s.t set schema other;", "CREATE TABLE S.MOOD (ID UUID);",
                 "do $$ begin execute 'create table s.dyn (id uuid)'; end $$;",
                 "create materialized view s.mv as select id from s.t;"]
        for form in forms:
            with self.subTest(form=form), tempfile.TemporaryDirectory() as d:
                p = pathlib.Path(d)
                (p / "V1__a.sql").write_text("create schema s;\ncreate table s.t (id uuid primary key);\n")
                (p / "V2__b.sql").write_text(form)
                with self.assertRaises(UnknownSql):
                    migration_tables(p)

    def test_semicolons_in_strings_and_block_comments(self):
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d)
            (p / "V1__a.sql").write_text("/* a; note */ create table s.a (id uuid, c text default ';');\n"
                                         "create table s.b (id uuid);\n")
            self.assertEqual(migration_tables(p), {"s.a": ["id", "c"], "s.b": ["id"]})

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
                # Where in the module's export section the table's rows are (K-802): a dotted path, "[]" for each element
                # of a list. EndToEndDeletionTests requires it to be filled for an account with data everywhere.
                self.assertEqual("export_key" in entry, entry["exported"])
                if entry["exported"]:
                    self.assertRegex(entry["export_key"], r"^[a-zA-Z]+(\[\])?(\.[a-zA-Z]+(\[\])?)*$")
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


    def test_health_is_the_backends_health_schemas(self):
        created = migration_tables()
        for entry in inventory()["server"]:
            with self.subTest(table=entry["table"]):
                health = entry["table"].split(".")[0] in HEALTH_SCHEMAS and "account_id" in created[entry["table"]]
                self.assertEqual(entry["class"] == "health", health)

    def test_a_table_with_an_account_goes_with_the_account(self):
        created = migration_tables()
        for entry in inventory()["server"]:
            if "account_id" in created[entry["table"]]:
                with self.subTest(table=entry["table"]):
                    self.assertIn("account_deletion", entry["erased_by"])

    def test_the_event_registry_is_erased_as_the_server_completes_it(self):
        # "handled" means deleted once every listener has handled it: Modulith's completion-mode delete (K-802). The update
        # mode keeps completed publications, each with a deleted account's id.
        mode = re.search(r"^      completion-mode:\s*(\S+)", SERVER_CONFIG.read_text(encoding="utf-8"), re.M)
        registry = next(e for e in inventory()["server"] if e["table"] == "public.event_publication")
        self.assertEqual("handled" in registry["erased_by"], mode is not None and mode.group(1) == "delete")
        self.assertIn("handled", registry["erased_by"])

    def test_the_refresh_tokens_retention_is_the_servers(self):
        # K-810: how long a refresh token is kept, said in the inventory and the policy, from the server's own settings —
        # its lifetime (keel.session.refresh-ttl) and the night's run (keel.session.expired-cleanup).
        config = SERVER_CONFIG.read_text(encoding="utf-8")
        days = re.search(r"^    refresh-ttl:\s*(\d+)d\s*$", config, re.M).group(1)
        minute, hour = re.search(r'^    expired-cleanup:\s*"0 (\d+) (\d+) \* \* \*"', config, re.M).groups()
        zone = re.search(r"^    expired-cleanup-zone:\s*(\S+)", config, re.M).group(1)
        entry = next(e for e in inventory()["server"] if e["table"] == "identity.refresh_token")
        self.assertIn("time", entry["erased_by"])
        self.assertIn(f"{days} days", entry["kept_for"])
        self.assertIn(f"{int(hour):02d}:{int(minute):02d} {zone}", entry["kept_for"])
        account = _section(PRIVACY.read_text(encoding="utf-8"), "data-account")
        self.assertIn(f"{days} days", account)
        self.assertIn("the night after", account)


def _section(markdown, anchor):
    """The text under the heading with this id, up to the next heading of the same or a higher level."""
    m = re.search(rf"^(#{{1,6}}) .*\{{#{anchor}\}}\s*$", markdown, re.M)
    rest = markdown[m.end():]
    nxt = re.search(rf"^#{{1,{len(m.group(1))}}} ", rest, re.M)
    return rest[:nxt.start()] if nxt else rest


def _coach_provider():
    """keel.coach.provider and provider-name from the server's configuration."""
    text = SERVER_CONFIG.read_text(encoding="utf-8")
    coach = text[text.index("\n  coach:\n"):]
    return (re.search(r"^    provider:\s*(\S+)", coach, re.M).group(1), re.search(r"^    provider-name:\s*(\S+)", coach, re.M).group(1))


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

    def test_every_active_recipient_is_named_where_recipients_are_listed(self):
        recipients = _section(PRIVACY.read_text(encoding="utf-8"), "recipients")
        for flow in inventory()["outbound"]:
            if flow["active"]:
                with self.subTest(recipient=flow["recipient"]):
                    self.assertIn(f"**{flow['recipient']}**", recipients)

    def test_the_sections_a_policy_needs_are_there_and_none_is_empty(self):
        policy = PRIVACY.read_text(encoding="utf-8")
        self.assertEqual(sorted(REQUIRED_SECTIONS - set(self.anchors)), [])
        for anchor in REQUIRED_SECTIONS | set(self.referenced):
            with self.subTest(section=anchor):
                body = [line for line in _section(policy, anchor).splitlines() if line.strip() and not line.startswith("#")]
                self.assertTrue(body)

    def test_the_ai_section_states_the_providers_terms(self):
        # K-806, ADR-041 #71: a provider is used only if its terms say it doesn't train on what it gets and keeps none of it;
        # the terms it is held to are read in docs/yasal/ai-saglayici-sartlari.md.
        section = " ".join(_section(PRIVACY.read_text(encoding="utf-8"), "ai").split())
        self.assertIn("doesn't train", section)
        self.assertIn("zero data retention", section)
        self.assertTrue((ROOT / "docs/yasal/ai-saglayici-sartlari.md").is_file())

    def test_the_ai_section_says_what_the_server_does(self):
        provider, name = _coach_provider()
        ai = [f for f in inventory()["outbound"] if f["policy"] == "ai"]
        self.assertEqual(len(ai), 1)
        section = " ".join(_section(PRIVACY.read_text(encoding="utf-8"), "ai").split())
        self.assertEqual(ai[0]["active"], provider != "fake")
        if provider == "fake":
            self.assertIn("This is not active yet", section)
        else:
            self.assertNotIn("not active", section)
            self.assertIn(name, section)


class PermissionsMatchTheApp(unittest.TestCase):
    def test_every_permission_text_both_ways(self):
        asked = set(re.findall(r"en\.permissions\.(\w+)", APP_CONFIG.read_text(encoding="utf-8")))
        self.assertGreater(len(asked), 2)
        listed = {p["copy_key"] for p in inventory()["phone"]["permissions"]}
        self.assertEqual(sorted(asked ^ listed), [])

    def test_no_permission_text_is_written_in_the_config(self):
        # Texts come from the copy file (K2); a literal here would be a permission the inventory never saw.
        for file in (APP_CONFIG, APP_JSON):
            with self.subTest(file=file.name):
                self.assertEqual(re.findall(r"(?:UsageDescription|Permission)\w*[\"']?\s*:\s*[\"'`]", file.read_text(encoding="utf-8")), [])

    def test_info_plist_keys_and_plugins_both_ways(self):
        app = json.loads(APP_JSON.read_text(encoding="utf-8"))["expo"]
        phone = inventory()["phone"]
        self.assertEqual(sorted(app.get("ios", {}).get("infoPlist", {})), sorted(phone["info_plist"]))
        plugins = {p if isinstance(p, str) else p[0] for p in app.get("plugins", [])}
        # app.config.ts adds its plugins as `['name', { … }]`, the name on the bracket's line or the next.
        config = APP_CONFIG.read_text(encoding="utf-8")
        plugins |= {a or b for a, b in re.findall(r"^\s*\['(@?[\w./-]+)',|^\s*'(@?[\w./-]+)',\s*$", config, re.M)}
        self.assertEqual(sorted(plugins), sorted(phone["plugins"]))

    def test_health_types_both_ways(self):
        asked = set(re.findall(r"HK(?:Quantity|Category)TypeIdentifier(\w+)|HK(Workout)TypeIdentifier", HEALTHKIT.read_text(encoding="utf-8")))
        asked = {a or b for a, b in asked}
        phone = inventory()["phone"]
        self.assertEqual(sorted(asked), sorted(set(phone["health_read"]) | set(phone["health_write"])))

    def test_every_runtime_dependency_is_listed_with_where_it_sends(self):
        deps = set(json.loads(PACKAGE.read_text(encoding="utf-8"))["dependencies"])
        listed = inventory()["phone"]["dependencies"]
        self.assertEqual(sorted(deps ^ set(listed)), [])
        recipients = {f["recipient"] for f in inventory()["outbound"] if f["active"]} | {"our server"}
        for name, sends_to in listed.items():
            with self.subTest(dependency=name):
                self.assertTrue(sends_to is None or sends_to in recipients, sends_to)

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
        later = {t for e in data["outbound"] for t in e.get("app_privacy_when_active", [])}
        self.assertEqual(sorted(later - apple), [])

    def test_draft_names_exactly_the_inventorys_types(self):
        data = inventory()
        used = {t for e in data["server"] + data["outbound"] for t in e.get("app_privacy", [])}
        self.assertEqual(sorted(label_draft_types(LABEL_DRAFT.read_text(encoding="utf-8")) ^ used), [])


    def test_every_age_question_is_answered(self):
        data = inventory()
        answers = age_draft_answers(LABEL_DRAFT.read_text(encoding="utf-8"))
        self.assertEqual(sorted(answers), sorted(data["apple_age_questions"]["questions"]))

    def test_the_rating_is_overridden_to_the_terms_minimum_age(self):
        # Apple: a EULA whose minimum age exceeds the calculated rating must override to it; the terms say 18 (K-225).
        draft = LABEL_DRAFT.read_text(encoding="utf-8")
        self.assertIn("Override to Higher Age Rating → 18+", draft)
        self.assertIn("18 or older", (ROOT / "docs/yasal/site/terms.md").read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
