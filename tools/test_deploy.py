#!/usr/bin/env python3
"""deploy/ (K-901, ADR-065): what the server runs, checked without a server.

The compose file is read by Docker Compose itself (`docker compose config`, no daemon needed), not by a YAML reader of
ours. Images by version and digest (K6), PostgreSQL the version catalog's; only Caddy opens ports; PostgreSQL has no way
out; every log goes to journald, kept LOG_KEEP_DAYS; the backend runs the `prod` profile (K-907); the secrets' names are
exactly what the server reads; the retention numbers live only in deploy/retention.env; scripts parse and stop on errors.

    python3 tools/test_deploy.py
"""
import json
import re
import subprocess
import tempfile
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
        self.assertEqual(set(days), {"BACKUP_KEEP_DAYS_SERVER", "BACKUP_KEEP_DAYS_MAC", "LOG_KEEP_DAYS"})
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
        provision = (DEPLOY / "provision.sh").read_text()
        for line in ("PasswordAuthentication no", "KbdInteractiveAuthentication no", "PermitRootLogin no"):
            self.assertIn(line, provision)
        self.assertIn("sshd -t", provision, "a broken config is caught before the restart")

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

if __name__ == "__main__":
    unittest.main()
