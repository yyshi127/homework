# Self-hosting Guide

This guide describes a generic single-family deployment. It intentionally contains no production hostnames, credentials, or private filesystem paths.

## Security Warning

The current application has no built-in login or tenant isolation. Keep the API bound to `127.0.0.1` and place authentication or an equivalent access-control layer in front of any Internet-facing deployment.

## Build

```bash
npm ci
npm test
npm run build
```

The frontend is generated in `dist/`.

## Run the API

Configure a persistent data directory and start the API:

```bash
PORT=8090 \
DATA_DIR=/var/lib/little-growth-planet \
DB_PATH=/var/lib/little-growth-planet/homework.sqlite \
npm run server
```

The API binds to `127.0.0.1` by design. Run it under a process supervisor such as systemd and grant the service account write access only to the selected data directory.

## Reverse Proxy

Serve `dist/` as static files and proxy `/api/` to the local API. A minimal Nginx layout is:

```nginx
server {
    listen 443 ssl;
    server_name example.com;

    root /opt/little-growth-planet/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8090;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
    }
}
```

Add TLS and authentication before making the service reachable from the Internet.

## AI Configuration

Alibaba Cloud and Baidu credentials can be maintained through the application's AI settings. An OpenAI-compatible fallback can use `OPENAI_API_KEY` and `OPENAI_MODEL`. Never put real credentials in source files or frontend environment variables.

## Backup

Back up the SQLite database before each release. Stop writes while taking a filesystem-level copy, or use SQLite's online backup mechanism. Store backups outside the web root and test restoration periodically.

## Health Check

```bash
curl http://127.0.0.1:8090/api/health
```

A healthy API returns JSON with `"ok": true`.
