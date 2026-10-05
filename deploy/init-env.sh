#!/usr/bin/env bash
# Writes the server's secrets to /opt/keel/.env on the VPS (K-901, V5), run by the controller on the Mac:
#   deploy/init-env.sh [ssh host, default keel-vps]
# The random ones are made here (openssl), the Apple ones are asked for; nothing is printed, nothing is written on the Mac.
# It refuses to replace an existing file: PostgreSQL keeps the password it started with (deploy/README.md › Secrets).
set -euo pipefail
host=${1:-keel-vps}

read -rp "Domain (e.g. something.duckdns.org): " domain
read -rp "App bundle ID [dev.leventtcaan.keel]: " client_id
read -rp "Apple Team ID: " team_id
read -rp "Sign in with Apple key ID: " key_id
read -rp "Path to the Sign in with Apple .p8 file: " p8
[[ -f $p8 ]] || { echo "no file at $p8" >&2; exit 1; }
read -rsp "RevenueCat webhook secret (Enter: a random one until RevenueCat is set up): " revenuecat; echo

# Compose's .env reader cuts an unquoted value at " #" and expands "$": refuse what it would change, instead of a server
# that quietly rejects every webhook (security review I8).
[[ $domain =~ ^[a-z0-9.-]+$ ]] || { echo "the domain: lower-case letters, digits, dots and dashes only" >&2; exit 1; }
for value in "${client_id:-x}" "$team_id" "$key_id" "${revenuecat:-x}"; do
  [[ $value =~ ^[A-Za-z0-9._~+/=-]+$ ]] || { echo "a value holds a character the .env file would change; nothing written" >&2; exit 1; }
done

{
  printf "KEEL_DOMAIN=%s\n" "$domain"
  printf "KEEL_DB_PASSWORD=%s\n" "$(openssl rand -hex 32)"
  printf "KEEL_SESSION_SECRET=%s\n" "$(openssl rand -base64 32)"
  printf "KEEL_APPLE_CLIENT_ID=%s\n" "${client_id:-dev.leventtcaan.keel}"
  printf "KEEL_APPLE_TEAM_ID=%s\n" "$team_id"
  printf "KEEL_APPLE_KEY_ID=%s\n" "$key_id"
  # One line, quoted (it holds spaces); the server takes the PEM's whitespace away (AppleClientSecret.parse).
  printf "KEEL_APPLE_PRIVATE_KEY='%s'\n" "$(tr -d '\r\n' < "$p8")"
  printf "KEEL_REVENUECAT_WEBHOOK_SECRET=%s\n" "${revenuecat:-$(openssl rand -hex 32)}"
} | ssh "$host" 'umask 077; [ ! -e /opt/keel/.env ] || { echo "/opt/keel/.env exists: not replaced" >&2; exit 1; }; cat > /opt/keel/.env'
echo "written: /opt/keel/.env on $host (mode 600)"
