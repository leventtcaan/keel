#!/usr/bin/env python3
"""deploy/ (K-901, ADR-065): what the server runs, checked without a server.

The compose file is read by Docker Compose itself (`docker compose config`, no daemon needed), not by a YAML reader of
ours. Images by version and digest (K6), PostgreSQL the version catalog's; only Caddy opens ports; PostgreSQL has no way
out; every log goes to journald, kept LOG_KEEP_DAYS; the backend runs the `prod` profile (K-907); the secrets' names are
exactly what the server reads; the retention numbers live only in deploy/retention.env; scripts parse and stop on errors.

    python3 tools/test_deploy.py
"""
import json
import os
import re
import subprocess
import tempfile
import textwrap
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEPLOY = ROOT / "deploy"
PINNED = re.compile(r"^[a-z0-9./_-]+:[A-Za-z0-9._-]+@sha256:[0-9a-f]{64}$")


def retention():
    return {k: int(v) for k, v in re.findall(r"^([A-Z_]+)=(\d+)$", (DEPLOY / "retention.env").read_text(), re.M)}


def catalog(name):
    return re.search(rf'^{name} = "([^"]+)"', (ROOT / "backend/gradle/libs.versions.toml").read_text(), re.M).group(1)


def compose():
    """The compose file as Docker Compose resolves it, with placeholder values for the two names it requires."""
    with tempfile.TemporaryDirectory() as project:
        Path(project, ".env").write_text("")
        out = subprocess.run(["docker", "compose", "--project-directory", project, "-f", str(DEPLOY / "compose.yaml"), "config", "--format", "json"],
                             env={"PATH": "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin", "KEEL_DB_PASSWORD": "x", "KEEL_DOMAIN": "example.org"},
                             capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


class TheServices(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = compose()
        cls.services = cls.config["services"]

    def test_three_services(self):
        self.assertEqual(sorted(self.services), ["backend", "caddy", "postgres"])

    def test_images_by_version_and_digest_and_the_backend_is_the_released_one(self):
        self.assertEqual(self.services["backend"]["image"], "keel-backend:current")  # deploy/release.sh tags it
        for name in ("postgres", "caddy"):
            with self.subTest(service=name):
                self.assertRegex(self.services[name]["image"], PINNED)

    def test_postgresql_is_the_version_catalogs(self):
        self.assertTrue(self.services["postgres"]["image"].startswith(f"postgres:{catalog('postgres-image')}@"))

    def test_only_caddy_opens_ports_and_only_web_ones(self):
        for name, service in self.services.items():
            if name != "caddy":
                with self.subTest(service=name):
                    self.assertFalse(service.get("ports"))
        opened = {(p["published"], p["protocol"]) for p in self.services["caddy"]["ports"]}
        self.assertEqual(opened, {("80", "tcp"), ("443", "tcp"), ("443", "udp")})

    def test_postgresql_is_on_the_internal_network_only_which_has_no_way_out(self):
        self.assertEqual(set(self.services["postgres"]["networks"]), {"internal"})
        self.assertTrue(self.config["networks"]["internal"].get("internal"))
        self.assertFalse(self.config["networks"]["edge"].get("internal"))

    def test_every_log_goes_to_journald(self):
        for name, service in self.services.items():
            with self.subTest(service=name):
                self.assertEqual(service.get("logging", {}).get("driver"), "journald")

    def test_the_backend_runs_the_vps_profile_and_restarts(self):
        backend = self.services["backend"]
        self.assertEqual(backend["environment"]["SPRING_PROFILES_ACTIVE"], "prod")
        for name, service in self.services.items():
            with self.subTest(service=name):
                self.assertEqual(service.get("restart"), "unless-stopped")

    def test_the_secrets_names_are_what_the_server_and_compose_read(self):
        resources = ROOT / "backend/src/main/resources"
        read = set()
        for yml in resources.glob("application*.yml"):
            read |= set(re.findall(r"\$\{(KEEL_[A-Z0-9_]+)}", yml.read_text()))
        read -= set(self.services["backend"]["environment"])  # compose sets these itself
        read |= set(re.findall(r"\$\{(KEEL_[A-Z0-9_]+):\?", (DEPLOY / "compose.yaml").read_text()))
        listed = set(re.findall(r"^(KEEL_[A-Z0-9_]+)=$", (DEPLOY / "env.example").read_text(), re.M))
        self.assertEqual(sorted(listed), sorted(read))
        written = set(re.findall(r'printf "(KEEL_[A-Z0-9_]+)=', (DEPLOY / "init-env.sh").read_text()))
        self.assertEqual(sorted(written), sorted(listed), "init-env.sh writes every one")


class TheImage(unittest.TestCase):
    def setUp(self):
        self.dockerfile = (DEPLOY / "backend.Dockerfile").read_text()

    def test_base_images_by_version_and_digest_on_the_catalogs_java(self):
        froms = re.findall(r"^FROM (\S+)", self.dockerfile, re.M)
        self.assertEqual(len(froms), 2)
        java = catalog("java")
        for image in froms:
            with self.subTest(image=image):
                self.assertRegex(image, PINNED)
                self.assertRegex(image, rf"^eclipse-temurin:{java}\.")
        self.assertIn("-jdk-", froms[0])
        self.assertIn("-jre-", froms[1], "the server runs a JRE, not the compiler")

    def test_it_runs_as_a_user_not_root(self):
        users = re.findall(r"^USER (\S+)", self.dockerfile, re.M)
        self.assertEqual(users, ["keel"])

    def test_the_build_context_lets_in_only_data_and_backend(self):
        ignore = [l.strip() for l in (ROOT / ".dockerignore").read_text().splitlines() if l.strip() and not l.startswith("#")]
        self.assertEqual(ignore[0], "*", "everything is left out first")
        self.assertIn("!data/", ignore)
        self.assertIn("!backend/", ignore)


class Retention(unittest.TestCase):
    def test_the_numbers_are_written_once(self):
        days = retention()
        self.assertEqual(set(days), {"BACKUP_KEEP_DAYS_SERVER", "BACKUP_KEEP_DAYS_MAC", "BACKUP_ALERT_HOURS", "LOG_KEEP_DAYS"})
        self.assertLessEqual(days["BACKUP_KEEP_DAYS_SERVER"], days["BACKUP_KEEP_DAYS_MAC"])

    def test_journald_keeps_the_logs_that_long(self):
        conf = (DEPLOY / "journald-keel.conf").read_text()
        self.assertEqual(re.findall(r"^MaxRetentionSec=(\S+)$", conf, re.M), [f"{retention()['LOG_KEEP_DAYS']}day"])

    def test_the_scripts_read_retention_env_and_write_no_number_of_days(self):
        for script, name in (("backup.sh", "BACKUP_KEEP_DAYS_SERVER"), ("mac/pull-backups.sh", "BACKUP_KEEP_DAYS_MAC")):
            text = (DEPLOY / script).read_text()
            with self.subTest(script=script):
                self.assertIn("retention.env", text)
                self.assertRegex(text, rf"-mmin \+\$\(\({name} \* 24 \* 60\)\)")
                self.assertNotRegex(text, r"-mtime")

    def test_caddy_keeps_no_access_log(self):
        caddyfile = (DEPLOY / "Caddyfile").read_text()
        directives = [l.strip() for l in caddyfile.splitlines() if l.strip() and not l.strip().startswith("#")]
        self.assertFalse([d for d in directives if re.match(r"log\b", d)])
        self.assertIn("reverse_proxy backend:8080", directives)

    def test_caddy_imports_other_sites_read_only(self):
        caddyfile = (DEPLOY / "Caddyfile").read_text()
        self.assertIn("import /etc/caddy/sites/*.caddy", caddyfile.splitlines())
        mounts = {(v["source"], v["target"], v.get("read_only")) for v in compose()["services"]["caddy"]["volumes"]}
        self.assertIn(("/opt/sites", "/etc/caddy/sites", True), mounts)

    def test_the_backup_runs_daily_and_catches_up(self):
        timer = (DEPLOY / "keel-backup.timer").read_text()
        self.assertRegex(timer, r"(?m)^OnCalendar=\*-\*-\* \d\d:\d\d:00 UTC$")
        self.assertIn("Persistent=true", timer)

    def test_the_backup_is_encrypted_before_it_is_written(self):
        backup = (DEPLOY / "backup.sh").read_text()
        self.assertRegex(backup, r"pg_dump [^|\n]*\| age -R /opt/keel/backup-recipient\.txt > ")


class Scripts(unittest.TestCase):
    SCRIPTS = sorted([p for p in DEPLOY.rglob("*.sh")] + [DEPLOY / "kc"])

    def test_they_parse_and_stop_on_the_first_error(self):
        self.assertGreater(len(self.SCRIPTS), 8)
        for script in self.SCRIPTS:
            with self.subTest(script=script.name):
                subprocess.run(["bash", "-n", str(script)], check=True)
                self.assertTrue(script.stat().st_mode & 0o111, "executable")
                if script.name != "kc":  # one exec line
                    self.assertIn("set -euo pipefail", script.read_text())

    def test_ssh_by_key_only_and_never_as_root(self):
        harden = (DEPLOY / "harden-ssh.sh").read_text()
        for line in ("PasswordAuthentication no", "KbdInteractiveAuthentication no", "PermitRootLogin no"):
            self.assertIn(line, harden)
        self.assertIn("sshd -t", harden, "a broken config is caught before the restart")

    def test_the_backup_user_can_only_read_the_backups(self):
        self.assertIn('restrict,command=\\"$rrsync -ro /var/backups/keel\\"', (DEPLOY / "provision.sh").read_text())

    def test_init_env_sends_every_value_down_ssh_and_prints_none(self):
        text = (DEPLOY / "init-env.sh").read_text()
        group = re.search(r"(?ms)^\{\n(.*?)^\} \| ssh ", text)
        self.assertIsNotNone(group, "the values are written inside one { … } | ssh group")
        outside = text[:group.start()] + text[group.end():]
        self.assertEqual(len(re.findall(r'printf "KEEL_', group.group(1))), 8)
        self.assertNotIn('printf "KEEL_', outside)
        self.assertIn("read -rsp", text, "the RevenueCat secret is not echoed while typed")
        self.assertIn("umask 077", text)

class TheReviewsFindings(unittest.TestCase):
    """K-901 security review (5 Oct): each finding is a test."""

    def test_the_container_user_can_read_the_food_data(self):
        # C1: the backend runs as uid 10001 (backend.Dockerfile), neither owner nor group of the bind mount.
        provision = (DEPLOY / "provision.sh").read_text()
        self.assertRegex(provision, r"install -d -m 755 [^\n]*/opt/keel/fdc")
        self.assertNotRegex(provision, r"install -d -m 750 [^\n]*/opt/keel/fdc")

    def test_journald_is_the_only_log_and_drops_old_entries_daily(self):
        # C2: Ubuntu forwards journald to rsyslog (/var/log/syslog, weeks); the live journal file rotates monthly.
        conf = (DEPLOY / "journald-keel.conf").read_text()
        self.assertIn("ForwardToSyslog=no", conf)
        self.assertIn("MaxFileSec=1day", conf)
        provision = (DEPLOY / "provision.sh").read_text()
        target = re.search(r"/etc/systemd/journald\.conf\.d/(\S+\.conf)", provision).group(1)
        self.assertGreater(target, "syslog.conf", "drop-ins apply in name order; ours must come after Ubuntu's syslog.conf")
        self.assertIn("purge rsyslog", provision)
        self.assertIn("rm -f /var/log/syslog", provision)

    def test_postgresql_logs_no_row_and_no_statement(self):
        # I1: a failed insert's DETAIL holds the row (health values); the statement holds what was sent.
        command = compose()["services"]["postgres"].get("command") or []
        self.assertIn("log_error_verbosity=terse", command)
        self.assertIn("log_min_error_statement=panic", command)

    def test_ssh_is_hardened_only_after_a_key_login_worked(self):
        # I9: provision.sh copies keys but cannot know the Mac holds one; hardening is its own step, run after a check.
        self.assertNotIn("PermitRootLogin no", (DEPLOY / "provision.sh").read_text())
        harden = (DEPLOY / "harden-ssh.sh").read_text()
        self.assertIn("PermitRootLogin no", harden)
        self.assertIn("ssh -o BatchMode=yes", harden, "it logs in as keel with a key before closing anything")

    def test_init_env_refuses_values_compose_would_mangle(self):
        # I8: an unquoted $ or ' #' cuts the value in compose's .env parser.
        self.assertIn("^[A-Za-z0-9._~+/=-]+$", (DEPLOY / "init-env.sh").read_text())
        self.assertIn("^[a-z0-9.-]+$", (DEPLOY / "init-env.sh").read_text(), "the domain too")

    def test_the_mac_copies_stay_out_of_time_machine_and_a_stale_backup_is_told(self):
        # I5, I6.
        pull = (DEPLOY / "mac/pull-backups.sh").read_text()
        self.assertIn("tmutil addexclusion", pull)
        self.assertIn("BACKUP_ALERT_HOURS", pull)
        self.assertIn("osascript", pull)

    def test_the_drill_compares_with_the_counts_taken_at_the_backup(self):
        # I7: live counts move after 02:30; the backup writes its own counts beside it.
        self.assertIn(".counts", (DEPLOY / "backup.sh").read_text())
        drill = (DEPLOY / "restore-drill.sh").read_text()
        self.assertIn(".counts", drill)
        self.assertIn("pg_isready -h 127.0.0.1", drill, "the image's first, socket-only server is not the real one")
        self.assertRegex(drill, r"--tmpfs /var/lib/postgresql:size=")
        self.assertIn("--memory", drill)


class Release(unittest.TestCase):
    """deploy/release.sh run for real against stand-ins for docker, curl, compose and sudo (I2, I3, I4)."""

    DOCKER = textwrap.dedent('''\
        #!/usr/bin/env python3
        import json, os, sys
        state_file = os.environ["FAKE_STATE"]
        state = json.load(open(state_file))
        a = sys.argv[1:]
        def save(): json.dump(state, open(state_file, "w"))
        def resolve(name): return state["tags"].get(name) or (name if name in state["tags"].values() else None)
        if a[:2] == ["image", "inspect"]:
            ref = resolve(a[-1])
            if not ref: sys.exit(1)
            if "-f" in a: print(ref)
            sys.exit(0)
        if a[0] == "tag":
            state["tags"][a[2]] = resolve(a[1]); save(); sys.exit(0)
        if a[0] == "rmi":
            state["tags"].pop(a[-1], None); save(); sys.exit(0)
        if a[0] == "images":
            print("\\n".join(t for t in state["tags"] if t.startswith("keel-backend:"))); sys.exit(0)
        if a[0] == "inspect":
            # A backend that crashes after /health answered restarts: each look sees one more restart.
            crashing = os.path.join(os.environ["FAKE_HOME"], "crashing")
            restarts = int(open(crashing).read() or 0) + 1 if os.path.exists(crashing) else 0
            if os.path.exists(crashing): open(crashing, "w").write(str(restarts))
            print(f"running {restarts}"); sys.exit(0)
        sys.exit(0)  # prune
        ''')

    def setUp(self):
        self.home = Path(tempfile.mkdtemp())
        (self.home / "deploy").mkdir()
        (self.home / "bin").mkdir()
        (self.home / "etc/systemd/system").mkdir(parents=True)
        (self.home / "etc/systemd/journald.conf.d").mkdir(parents=True)
        for name in ("release.sh", "Caddyfile", "keel-backup.service", "keel-backup.timer", "journald-keel.conf", "ci-deploy.sh"):
            (self.home / "deploy" / name).write_bytes((DEPLOY / name).read_bytes())
        (self.home / ".env").write_text("KEEL_DOMAIN=example.org\n")
        self.log = self.home / "calls.log"
        self.state = self.home / "state.json"
        self.state.write_text(json.dumps({"tags": {}}))
        self.stub("docker", self.DOCKER)
        self.stub("curl", '#!/bin/sh\n[ -e "$FAKE_HOME/down" ] && exit 22; exit 0\n')
        # sudo: logged, then run without the owner flags (the test is not root).
        self.stub("sudo", '#!/bin/bash\necho "sudo $*" >> "$FAKE_HOME/calls.log"\nargs=(); skip=0; for a in "$@"; do '
                          'if ((skip)); then skip=0; continue; fi; case $a in -o|-g) skip=1;; *) args+=("$a");; esac; done; "${args[@]}"\n')
        self.stub("flock", "#!/bin/sh\nexit 0\n")  # the server's util-linux; one release at a time is its job
        (self.home / "lib").mkdir()
        self.stub("systemctl", '#!/bin/sh\necho "systemctl $*" >> "$FAKE_HOME/calls.log"\n')
        kc = self.home / "deploy/kc"
        kc.write_text('#!/bin/sh\necho "kc $*" >> "$FAKE_HOME/calls.log"\n')
        kc.chmod(0o755)

    def stub(self, name, text):
        path = self.home / "bin" / name
        path.write_text(text)
        path.chmod(0o755)

    def tags(self):
        return json.loads(self.state.read_text())["tags"]

    def load(self, tag):
        """An image arrives just before its release (built by deploy.sh, loaded by K-902)."""
        state = json.loads(self.state.read_text())
        state["tags"][tag] = "sha256:" + tag.split(":")[1]
        self.state.write_text(json.dumps(state))

    def run_release(self, *args, down=False):
        if args and args[0].startswith("keel-backend:"):
            self.load(args[0])
        (self.home / "down").unlink(missing_ok=True)
        if down:
            (self.home / "down").write_text("")
        env = {"PATH": f"{self.home / 'bin'}:/usr/bin:/bin", "FAKE_STATE": str(self.state), "FAKE_HOME": str(self.home), "KEEL_HOME": str(self.home),
               "KEEL_ETC": str(self.home / "etc"), "KEEL_LIB": str(self.home / "lib"), "KEEL_RELEASE_WAIT": "5", "KEEL_RELEASE_SETTLE": "0", "KEEL_RELEASE_POLL": "0"}
        return subprocess.run(["bash", str(self.home / "deploy/release.sh"), *args], env=env, capture_output=True, text=True)

    def test_a_first_release_has_no_previous(self):
        self.assertEqual(self.run_release("keel-backend:new").returncode, 0)
        self.assertEqual(self.tags()["keel-backend:current"], "sha256:new")
        self.assertNotIn("keel-backend:previous", self.tags())

    def test_a_release_keeps_what_was_current_as_previous_and_prunes_the_rest(self):
        self.run_release("keel-backend:older")
        self.run_release("keel-backend:old")
        self.load("keel-backend:stale")  # built once, never released
        self.assertEqual(self.run_release("keel-backend:new").returncode, 0)
        tags = self.tags()
        self.assertEqual((tags["keel-backend:current"], tags["keel-backend:previous"]), ("sha256:new", "sha256:old"))
        self.assertNotIn("keel-backend:older", tags, "images neither current nor previous are removed (disk)")
        self.assertNotIn("keel-backend:stale", tags)

    def test_releasing_the_current_image_again_keeps_the_previous(self):
        self.run_release("keel-backend:old")
        self.run_release("keel-backend:new")
        self.run_release("keel-backend:new")
        self.assertEqual(self.tags()["keel-backend:previous"], "sha256:old")

    def test_a_failed_release_leaves_current_and_previous_as_they_were(self):
        self.run_release("keel-backend:older")
        self.run_release("keel-backend:old")
        self.assertNotEqual(self.run_release("keel-backend:new", down=True).returncode, 0)
        tags = self.tags()
        self.assertEqual((tags["keel-backend:current"], tags["keel-backend:previous"]), ("sha256:old", "sha256:older"))

    def test_a_backend_that_restarts_after_answering_fails_the_release(self):
        # I2: /health answers before the start's own work is done; a crash after it shows as a restart.
        self.run_release("keel-backend:old")
        (self.home / "crashing").write_text("")
        self.assertNotEqual(self.run_release("keel-backend:new").returncode, 0)
        self.assertEqual(self.tags()["keel-backend:current"], "sha256:old")

    def test_a_rollback_swaps_so_it_can_be_undone(self):
        self.run_release("keel-backend:old")
        self.run_release("keel-backend:new")
        self.assertEqual(self.run_release("--rollback").returncode, 0)
        tags = self.tags()
        self.assertEqual((tags["keel-backend:current"], tags["keel-backend:previous"]), ("sha256:old", "sha256:new"))

    def test_caddy_is_recreated_when_its_file_changed_and_only_then(self):
        self.run_release("keel-backend:old")
        self.log.write_text("")
        self.run_release("keel-backend:new")
        self.assertNotIn("--force-recreate", self.log.read_text())
        (self.home / "deploy/Caddyfile").write_text("changed\n")
        self.run_release("keel-backend:old")
        self.assertIn("up -d --force-recreate --no-deps caddy", self.log.read_text())

    def test_one_release_at_a_time(self):
        self.assertIn("flock", (DEPLOY / "release.sh").read_text())

    def test_what_runs_is_written_down_for_the_next_deploy(self):
        self.run_release("keel-backend:old")
        self.run_release("keel-backend:new")
        self.assertEqual((self.home / "release-current").read_text().strip(), "keel-backend:new")
        self.run_release("keel-backend:newer", down=True)
        self.assertEqual((self.home / "release-current").read_text().strip(), "keel-backend:new", "a failed release changes nothing")
        self.run_release("--rollback")
        self.assertEqual((self.home / "release-current").read_text().strip(), "keel-backend:old")

    def test_host_files_reach_the_host_when_they_change(self):
        self.run_release("keel-backend:new")
        self.assertEqual((self.home / "etc/systemd/journald.conf.d/zz-keel.conf").read_text(), (DEPLOY / "journald-keel.conf").read_text())
        self.assertTrue((self.home / "etc/systemd/system/keel-backup.timer").is_file())
        self.assertIn("systemctl daemon-reload", self.log.read_text())
        forced = self.home / "lib/ci-deploy"
        self.assertEqual(forced.read_bytes(), (DEPLOY / "ci-deploy.sh").read_bytes())
        self.assertTrue(forced.stat().st_mode & 0o111)


class TheLiveRunsFindings(unittest.TestCase):
    """What the first real run on the VPS found (6 Oct): each finding is a test."""

    def test_the_table_counts_query_is_written_once_and_never_nests_dollar_quotes(self):
        # The first backup wrote an empty .counts: $$…$$ inside $$…$$ closed early, and psql still exited 0.
        query = (DEPLOY / "table-counts.sql").read_text()
        self.assertNotIn("$$", query, "one tag per level: $f$ outside, $s$ inside")
        self.assertIn("\\gexec", query)
        for script in ("backup.sh", "restore-drill.sh"):
            with self.subTest(script=script):
                text = (DEPLOY / script).read_text()
                self.assertIn("table-counts.sql", text)
                self.assertNotIn("select format(", text, "the query lives in table-counts.sql only")

    def test_every_psql_stops_on_the_first_error(self):
        for script in ("backup.sh", "restore-drill.sh"):
            text = (DEPLOY / script).read_text()
            for call in re.findall(r"psql[^\n]*", text):
                with self.subTest(script=script, call=call):
                    self.assertIn("-v ON_ERROR_STOP=1", call)

    def test_an_empty_count_fails_the_backup(self):
        self.assertRegex((DEPLOY / "backup.sh").read_text(), r"\[\[ -s [^\]]*counts\.part\" \]\]")

    def test_the_mac_pulls_with_rsync_3_not_openrsync(self):
        # macOS's /usr/bin/rsync is openrsync (protocol 29); the server's rrsync refuses its command line.
        pull = (DEPLOY / "mac/pull-backups.sh").read_text()
        self.assertIn("/opt/homebrew/bin/rsync", pull)
        self.assertIn("version 3", pull)
        self.assertNotRegex(pull, r"(?m)^rsync ")
        # Under pipefail, `rsync --version | head -1` fails: head closes the pipe early and rsync dies of SIGPIPE.
        self.assertNotRegex(pull, r"--version[^\n]*\| *head")

    def test_the_backend_has_room_above_its_idle_memory(self):
        # Idle after the first start: 918 MiB of a 1 GiB limit (the JVM keeps what it took).
        limit = compose()["services"]["backend"]["mem_limit"]
        self.assertGreaterEqual(int(limit), 1536 * 1024 * 1024)

    @unittest.skipUnless(os.environ.get("CI") or subprocess.run(["docker", "info"], capture_output=True).returncode == 0,
                         "needs a Docker daemon (CI has one)")
    def test_the_table_counts_query_runs_on_the_real_postgresql(self):
        image = re.search(r"image: (postgres:\S+)", (DEPLOY / "compose.yaml").read_text()).group(1)
        name = "keel-counts-test"
        subprocess.run(["docker", "rm", "-f", name], capture_output=True)
        subprocess.run(["docker", "run", "-d", "--rm", "--name", name, "-e", "POSTGRES_HOST_AUTH_METHOD=trust", image], check=True, capture_output=True)
        try:
            for _ in range(60):
                if subprocess.run(["docker", "exec", name, "pg_isready", "-h", "127.0.0.1", "-q"]).returncode == 0:
                    break
                subprocess.run(["sleep", "1"])
            setup = "create schema s; create table s.t (x int); insert into s.t values (1), (2); create table public.u (y int);"
            subprocess.run(["docker", "exec", name, "psql", "-h", "127.0.0.1", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", setup], check=True, capture_output=True)
            out = subprocess.run(["docker", "exec", "-i", name, "psql", "-h", "127.0.0.1", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-At"],
                                 input=(DEPLOY / "table-counts.sql").read_text(), capture_output=True, text=True, check=True).stdout
            self.assertEqual(out.split(), ["public.u|0", "s.t|2"])
        finally:
            subprocess.run(["docker", "rm", "-f", name], capture_output=True)

class ContinuousDeployment(unittest.TestCase):
    """K-902: a merge to main → CI green → image → the VPS, through a key that can do only that."""

    def setUp(self):
        self.workflow = (ROOT / ".github/workflows/deploy.yml").read_text()

    def test_it_runs_only_after_ci_passed_on_a_push_to_main(self):
        self.assertRegex(self.workflow, r"(?ms)^on:\n  workflow_run:\n    workflows: \[CI\]\n    types: \[completed\]\n    branches: \[main\]\n")
        self.assertIn("github.event.workflow_run.conclusion == 'success'", self.workflow)
        self.assertIn("github.event.workflow_run.event == 'push'", self.workflow)
        self.assertIn("ref: ${{ github.event.workflow_run.head_sha }}", self.workflow, "the commit CI tested, not main's newest")

    def test_one_at_a_time_never_cancelled_halfway(self):
        self.assertRegex(self.workflow, r"(?m)^concurrency:\n  group: deploy\n  cancel-in-progress: false$")

    def test_its_secrets_live_in_the_production_environment_and_reach_no_command_line(self):
        self.assertIn("environment: production", self.workflow)
        self.assertRegex(self.workflow, r"(?m)^permissions:\n  contents: read$")
        runs = re.findall(r"(?ms)^ +run: \|\n(.*?)(?=^ +- |\Z)", self.workflow)
        self.assertTrue(runs)
        for run in runs:
            self.assertNotIn("${{", run, "contexts and secrets go through env:, never pasted into a script")
            self.assertNotIn("set -x", run)
        self.assertEqual(sorted(set(re.findall(r"secrets\.([A-Z_]+)", self.workflow))), ["KEEL_DEPLOY_SSH_KEY"])
        self.assertEqual(sorted(set(re.findall(r"vars\.([A-Z_]+)", self.workflow))), ["KEEL_DEPLOY_HOST", "KEEL_DEPLOY_KNOWN_HOSTS"])
        self.assertIn("StrictHostKeyChecking=yes", self.workflow, "the server's key is pinned")

    def test_actions_are_pinned_to_a_commit(self):
        for uses in re.findall(r"uses: (\S+)", self.workflow):
            with self.subTest(uses=uses):
                self.assertRegex(uses, r"@[0-9a-f]{40}$")

    def test_the_ci_key_can_run_the_forced_command_only_from_a_place_it_cannot_write(self):
        authorize = (DEPLOY / "authorize-ci.sh").read_text()
        self.assertIn('restrict,command=\\"/usr/local/lib/keel/ci-deploy\\"', authorize)
        self.assertIn("sudo install -o root -g root -m 755", authorize)
        self.assertIn("host_file ci-deploy.sh \"$lib/ci-deploy\" 755", (DEPLOY / "release.sh").read_text(), "a merged change reaches it, as root's")

    def test_the_runner_sends_an_image_and_a_commit_id_only(self):
        self.assertNotIn("git archive", self.workflow)
        self.assertIn('| ssh vps deploy "$COMMIT"', self.workflow)

    def test_every_step_stops_on_a_broken_pipe(self):
        self.assertRegex(self.workflow, r"(?m)^defaults:\n  run:\n    shell: bash$")

    def test_an_unreadable_running_commit_fails_the_job_instead_of_skipping(self):
        self.assertRegex(self.workflow, r"merge-base --is-ancestor[^\n]*\|\| status=\$\?")
        self.assertIn('[ "$status" -eq 1 ]', self.workflow)

    def test_an_older_commit_is_not_deployed_over_a_newer_one(self):
        self.assertIn("git merge-base --is-ancestor", self.workflow)

    def test_a_commit_that_changes_nothing_the_server_runs_is_not_deployed(self):
        # Plans and documents go to main directly (CLAUDE.md › Git): they restart nothing.
        self.assertIn('git diff --quiet "$released" "$COMMIT" -- backend data deploy', self.workflow)


class CiDeployCommand(unittest.TestCase):
    """deploy/ci-deploy.sh, the CI key's forced command, run for real: a local git repository stands in for GitHub, stand-ins
    for docker and release.sh record what is called. The CI key sends only an image and a commit id (K-902 security review)."""

    def setUp(self):
        self.home = Path(tempfile.mkdtemp())
        (self.home / "bin").mkdir()
        self.log = self.home / "calls.log"
        self.log.write_text("")
        self.stub("docker", '#!/bin/sh\necho "docker $*" >> "$FAKE_HOME/calls.log"; cat >/dev/null; exit 0\n')
        # The "GitHub" repository: main with two commits, and a branch that is not main.
        self.origin = self.home / "origin"
        self.git("init", "-q", "-b", "main", str(self.origin))
        self.first = self.commit("one")
        self.second = self.commit("two")
        self.git("-C", str(self.origin), "checkout", "-q", "-b", "elsewhere")
        self.stray = self.commit("stray")
        self.git("-C", str(self.origin), "checkout", "-q", "main")

    def git(self, *args):
        return subprocess.run(["git", "-c", "user.name=t", "-c", "user.email=t@t", *args], check=True, capture_output=True, text=True).stdout.strip()

    def commit(self, marker):
        deploy = self.origin / "deploy"
        deploy.mkdir(exist_ok=True)
        (deploy / "marker").write_text(marker)
        release = deploy / "release.sh"
        release.write_text(f'#!/bin/sh\necho "release {marker} $*" >> "$FAKE_HOME/calls.log"\n')
        release.chmod(0o755)
        self.git("-C", str(self.origin), "add", "-A")
        self.git("-C", str(self.origin), "commit", "-q", "-m", marker)
        return self.git("-C", str(self.origin), "rev-parse", "HEAD")

    def stub(self, name, text):
        path = self.home / "bin" / name
        path.write_text(text)
        path.chmod(0o755)

    def image(self, *tags):
        """`docker save | gzip` of an image with these tags: what matters is its manifest."""
        folder = Path(tempfile.mkdtemp())
        (folder / "manifest.json").write_text(json.dumps([{"Config": "c.json", "RepoTags": list(tags), "Layers": []}]))
        tar = subprocess.run(["tar", "-c", "-C", str(folder), "manifest.json"], capture_output=True, check=True).stdout
        return subprocess.run(["gzip", "-c"], input=tar, capture_output=True, check=True).stdout

    def run_command(self, command, stdin=b""):
        env = {"PATH": f"{self.home / 'bin'}:/usr/bin:/bin:/opt/homebrew/bin", "FAKE_HOME": str(self.home), "KEEL_HOME": str(self.home),
               "KEEL_REPOSITORY": str(self.origin), "SSH_ORIGINAL_COMMAND": command}
        return subprocess.run(["bash", str(DEPLOY / "ci-deploy.sh")], env=env, input=stdin, capture_output=True)

    def calls(self):
        return self.log.read_text().splitlines()

    def test_anything_but_its_two_commands_is_refused_before_anything_runs(self):
        sha = self.second
        for command in ("", "bash", "deploy", "deploy 123", f"deploy {sha} extra", f"deploy {sha};id", "deploy $(id)",
                        f"deploy {sha.upper()}", "released x", f"files {sha}", f"image {sha}"):
            with self.subTest(command=command):
                self.assertNotEqual(self.run_command(command).returncode, 0)
        self.assertEqual(self.calls(), [], "nothing was called")

    def test_released_names_only_a_commit(self):
        self.assertEqual(self.run_command("released").stdout, b"")
        (self.home / "release-current").write_text(f"keel-backend:{self.second}\n")
        self.assertEqual(self.run_command("released").stdout.decode().strip(), self.second)
        (self.home / "release-current").write_text("keel-backend:previous\n")
        self.assertNotEqual(self.run_command("released").returncode, 0, "a name that is not a commit is an error, not a skip")

    def test_deploy_takes_deploy_from_main_on_the_server_and_releases_with_it(self):
        result = self.run_command(f"deploy {self.second}", self.image(f"keel-backend:{self.second}"))
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual((self.home / "deploy/marker").read_text(), "two")
        self.assertEqual(self.calls(), ["docker load -q -i " + str(self.home / ".incoming-image.tar"), f"release two keel-backend:{self.second}"])

    def test_a_commit_not_on_main_is_refused(self):
        self.assertNotEqual(self.run_command(f"deploy {self.stray}", self.image(f"keel-backend:{self.stray}")).returncode, 0)
        self.assertNotEqual(self.run_command(f"deploy {'a' * 40}", self.image(f"keel-backend:{'a' * 40}")).returncode, 0)
        self.assertEqual(self.calls(), [])
        self.assertFalse((self.home / "deploy").exists())

    def test_an_older_commit_than_the_running_one_is_refused(self):
        (self.home / "release-current").write_text(f"keel-backend:{self.second}\n")
        self.assertNotEqual(self.run_command(f"deploy {self.first}", self.image(f"keel-backend:{self.first}")).returncode, 0)
        self.assertEqual(self.calls(), [])

    def test_an_image_carrying_any_other_tag_is_not_loaded(self):
        for tags in ([f"keel-backend:{self.second}", "keel-backend:previous"], ["keel-backend:current"], [], [f"keel-backend:{self.first}"]):
            with self.subTest(tags=tags):
                self.assertNotEqual(self.run_command(f"deploy {self.second}", self.image(*tags)).returncode, 0)
        self.assertEqual(self.calls(), [])


if __name__ == "__main__":
    unittest.main()
