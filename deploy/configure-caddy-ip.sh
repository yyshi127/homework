#!/usr/bin/env bash
set -euo pipefail

stamp="$(date +%Y%m%d-%H%M%S)"
cp -a /etc/caddy/Caddyfile "/etc/caddy/Caddyfile.before-homework-ip-$stamp"
sed 's/^:8088 {/http:\/\/43.167.166.35, :8088 {/' /etc/caddy/Caddyfile > /tmp/Caddyfile.new
caddy validate --config /tmp/Caddyfile.new
install -o root -g caddy -m 0644 /tmp/Caddyfile.new /etc/caddy/Caddyfile
systemctl reload caddy
sleep 2
systemctl is-active caddy
curl -fsS -H 'Host: 43.167.166.35' http://127.0.0.1/api/health
printf '\n'
