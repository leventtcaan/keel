#!/usr/bin/env bash
# Prepares a fresh Ubuntu LTS VPS once, as root (K-901, ADR-065). deploy/README.md › "First setup" says when to run it:
#   ssh keel-vps 'bash /opt/keel/deploy/provision.sh "<the Mac's backup-pull public key>"'
# Safe to run again. It does not touch SSH's own settings: deploy/harden-ssh.sh does, from the Mac, once a key login as
# keel has worked.
set -euo pipefail

backup_pubkey=${1:?usage: provision.sh "<ssh-ed25519 public key of the Mac's backup pull>"}
[[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 1; }
# keel gets root's keys: without one, keel could not log in at all.
[[ -s /root/.ssh/authorized_keys ]] || { echo "no key in /root/.ssh/authorized_keys: add yours first (ssh-copy-id)" >&2; exit 1; }

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get -y upgrade
apt-get -y install ca-certificates curl ufw unattended-upgrades age rsync unzip

# Docker from Docker's own repository (docs.docker.com/engine/install/ubuntu, read 5 Oct 2026).
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
cat > /etc/apt/sources.list.d/docker.sources <<SOURCES
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
SOURCES
apt-get update
apt-get -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Security updates install themselves (Ubuntu's unattended-upgrades: security pocket only by default).
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'CONF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
CONF

# keel: runs the server. In the docker group, which is root in all but name — so it has sudo too, and logs in by key only.
id keel &>/dev/null || useradd --create-home --shell /bin/bash keel
usermod -aG docker keel
echo 'keel ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/keel
chmod 440 /etc/sudoers.d/keel
install -d -m 700 -o keel -g keel /home/keel/.ssh
install -m 600 -o keel -g keel /root/.ssh/authorized_keys /home/keel/.ssh/authorized_keys

# keel-backup: may only read the encrypted backups, nothing else (rrsync -ro, the key's forced command).
id keel-backup &>/dev/null || useradd --create-home --shell /bin/sh keel-backup
install -d -m 750 -o root -g keel-backup /var/backups/keel
install -d -m 700 -o keel-backup -g keel-backup /home/keel-backup/.ssh
rrsync=$(command -v rrsync || echo /usr/share/doc/rsync/scripts/rrsync)
[[ -x $rrsync ]] || { echo "rrsync not found" >&2; exit 1; }
echo "restrict,command=\"$rrsync -ro /var/backups/keel\" $backup_pubkey" > /home/keel-backup/.ssh/authorized_keys
chown keel-backup:keel-backup /home/keel-backup/.ssh/authorized_keys
chmod 600 /home/keel-backup/.ssh/authorized_keys

# /opt/keel: the compose project (deploy/ synced in, .env written by init-env.sh, fdc/ by fetch-fdc.sh). fdc/ is read
# through a bind mount by the backend's user (uid 10001, backend.Dockerfile), neither owner nor group: 755 (public data).
install -d -m 750 -o keel -g keel /opt/keel
install -d -m 755 -o keel -g keel /opt/keel/fdc
chown -R keel:keel /opt/keel/deploy

# Logs: every container's goes to journald (compose.yaml) and only there; kept LOG_KEEP_DAYS (retention.env). Ubuntu
# forwards journald to rsyslog (/var/log/syslog, rotated over weeks): rsyslog goes, and our drop-in comes after Ubuntu's
# syslog.conf (drop-ins apply in name order) so ForwardToSyslog=no wins. release.sh keeps it in step later.
apt-get -y purge rsyslog
rm -f /var/log/syslog /var/log/syslog.* /var/log/kern.log* /var/log/auth.log*
install -d /etc/systemd/journald.conf.d
install -m 644 /opt/keel/deploy/journald-keel.conf /etc/systemd/journald.conf.d/zz-keel.conf
systemctl restart systemd-journald

# The daily backup (02:30 UTC): deploy/backup.sh through a systemd timer.
install -m 644 /opt/keel/deploy/keel-backup.service /opt/keel/deploy/keel-backup.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now keel-backup.timer

# Firewall: SSH, HTTP (certificate + redirect), HTTPS and HTTP/3. Docker publishes only Caddy's ports (compose.yaml).
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable
echo "provisioned. Next, from the Mac: deploy/harden-ssh.sh (SSH by key only, no root)"
