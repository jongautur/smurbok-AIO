#!/usr/bin/env bash
set -e

echo "==> Building API..."
cd /opt/smurbok/api
npm run build

echo "==> Building web..."
cd /opt/smurbok/web
npm run build

echo "==> Restarting services..."
sudo systemctl restart smurbok-api smurbok-web

echo "==> Done. Status:"
sudo systemctl status smurbok-api smurbok-web --no-pager -l
