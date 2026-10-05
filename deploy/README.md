# deploy/ — the server on the VPS (K-901, ADR-065)

One Ubuntu LTS VPS (Contabo, Germany — ADR-013, ADR-064) runs `compose.yaml`: PostgreSQL (internal network only), the
backend (`prod` profile, K-907) and Caddy (HTTPS, the only open ports). Everything here is checked by `tools/test_deploy.py`.

| File | What it is |
|---|---|
| `backend.Dockerfile` | The backend image, built from the repository root (`data/` goes into the jar) |
| `compose.yaml`, `Caddyfile`, `kc` | The services; `kc` is `docker compose` for `/opt/keel` |
| `env.example` | The names of the secrets in `/opt/keel/.env` (never the values — V5) |
| `retention.env` | How long backups and logs are kept — the policy states these numbers |
| `provision.sh` | Prepares a fresh server once (Docker, users, firewall, journald only — no rsyslog, backup timer) |
| `harden-ssh.sh` | From the Mac, after a key login as `keel` worked: SSH by key only, no root |
| `init-env.sh` | Writes `/opt/keel/.env` from the Mac without printing a value |
| `deploy.sh` → `release.sh` | Deploys a commit of `main`; puts the old image back if `/health` does not answer and stay up; keeps host files and Caddy in step; prunes old images |
| `backup.sh`, `keel-backup.*` | Daily encrypted backup on the server (02:30 UTC) |
| `mac/pull-backups.sh`, `mac/install-pull.sh` | The Mac pulls the encrypted backups hourly while awake (out of Time Machine); a notification when the newest is over 26 h old |
| `restore-drill.sh` | Restores the newest backup into a throwaway database and compares every table's row count with the counts the backup took |
| `fetch-fdc.sh` | Downloads FoodData Central's releases (ADR-008) for the backend to import |

## First setup (once)
On the Mac (`~/.ssh/config` has `keel-vps` → root at first, `keel` after provisioning; `keel-backup` → the backup user):
1. `brew install age` · `mkdir -m 700 ~/.keel-backup && age-keygen -o ~/.keel-backup/age-key.txt` — keep a copy of this
   file offline (password manager): without it no backup can be read. Its public key (`age1…`) is not secret.
2. `ssh-keygen -t ed25519 -N '' -C keel-backup-pull -f ~/.ssh/keel_backup` — no passphrase (launchd runs it unattended);
   on the server it can only read the encrypted backups.
3. `git archive origin/main deploy | ssh keel-vps 'mkdir -p /opt/keel && tar -x -C /opt/keel'`, then
   `ssh keel-vps "bash /opt/keel/deploy/provision.sh '$(cat ~/.ssh/keel_backup.pub)'"`, then `deploy/harden-ssh.sh`
   (it logs in as `keel` first; only then closes root and passwords). From now on `keel-vps` logs in as `keel`.
4. `age-keygen -y ~/.keel-backup/age-key.txt | ssh keel-vps 'cat > /opt/keel/backup-recipient.txt'`
5. `deploy/init-env.sh` (domain, Apple Team ID, key ID, `.p8` path) · `ssh keel-vps /opt/keel/deploy/fetch-fdc.sh`
6. `deploy/deploy.sh` · `deploy/mac/install-pull.sh` · after the first backup: `deploy/restore-drill.sh`

## Every day
- **Deploy:** `deploy/deploy.sh [commit]` (K-902: CI does it on every merge to `main`).
- **Roll back:** `ssh keel-vps /opt/keel/deploy/release.sh --rollback` (the image before the last release). A migration
  already applied stays (Flyway does not undo). The previous image runs on the newer schema only if that migration added
  without dropping or renaming; a release whose migration drops or renames needs a fix forward, not a rollback.
- **Logs:** `ssh keel-vps 'journalctl CONTAINER_NAME=keel-backend-1 --since today'`. They hold no account, no request
  body, no health data (V3, `LogWhitelistTests`; PostgreSQL logs terse, without rows or statements); only in journald
  (no rsyslog), kept 14 days (`retention.env`).
- **Backups:** `ssh keel-vps 'ls -l /var/backups/keel'` · `systemctl list-timers keel-backup.timer` · on the Mac
  `~/KeelBackups`, `~/Library/Logs/keel-backup-pull.log`.

## Secrets
`/opt/keel/.env`, owner `keel`, mode 600. To change one, edit it on the server and `ssh keel-vps '/opt/keel/deploy/kc up -d'`.
`KEEL_DB_PASSWORD` is the exception: PostgreSQL keeps the password it was created with — change it with
`ALTER USER keel PASSWORD …` first, then in the file.

## A restore, for real
Restoring loses what happened after the backup (≤ 24 h) — **a deletion too**: an account deleted in that window comes back.
The privacy policy says so (`#data-backups`).
