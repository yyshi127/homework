#!/usr/bin/env bash
set -euo pipefail

archive="${1:?runtime archive path is required}"
release_stamp="$(date +%Y%m%d-%H%M%S)"
release_dir="/opt/little-growth-planet/releases/$release_stamp"

test -f "$archive"
test -f /tmp/homework-api.service
test -f /tmp/Caddyfile.homework

if ! id homework >/dev/null 2>&1; then
  useradd --system --home-dir /opt/little-growth-planet --shell /usr/sbin/nologin homework
fi

install -d -m 0755 /opt/little-growth-planet/releases
install -d -o homework -g homework -m 0750 /var/lib/little-growth-planet
install -d -m 0755 "$release_dir"
tar -xzf "$archive" -C "$release_dir"

cd "$release_dir"
npm ci --omit=dev --no-audit --no-fund
chown -R root:root "$release_dir"
find "$release_dir" -type d -exec chmod 0755 {} +
find "$release_dir" -type f -exec chmod 0644 {} +
ln -sfn "$release_dir" /opt/little-growth-planet/current

install -m 0644 /tmp/homework-api.service /etc/systemd/system/homework-api.service
systemctl daemon-reload
systemctl enable homework-api.service
systemctl restart homework-api.service

if ! grep -q ':8088 {' /etc/caddy/Caddyfile; then
  cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.before-homework-$release_stamp"
  cp /etc/caddy/Caddyfile /tmp/Caddyfile.merged
  printf '\n' >> /tmp/Caddyfile.merged
  cat /tmp/Caddyfile.homework >> /tmp/Caddyfile.merged
  caddy validate --config /tmp/Caddyfile.merged
  install -o root -g caddy -m 0644 /tmp/Caddyfile.merged /etc/caddy/Caddyfile
fi

caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

if command -v ufw >/dev/null 2>&1 && ufw status | grep -q '^Status: active'; then
  ufw allow 8088/tcp
fi

sleep 3
systemctl is-active homework-api.service
systemctl is-active caddy
curl -fsS http://127.0.0.1:8090/api/health
printf '\n'
curl -fsS http://127.0.0.1:8088/api/health
printf '\n'
curl -fsS http://127.0.0.1:8088/ | head -n 12
printf 'RELEASE_DIR=%s\n' "$release_dir"
