#!/usr/bin/env bash
# Run this once to install and enable the systemd services.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "==> Installing unit files..."
sudo cp "$SCRIPT_DIR/smurbok-api.service" /etc/systemd/system/
sudo cp "$SCRIPT_DIR/smurbok-web.service" /etc/systemd/system/
sudo systemctl daemon-reload

echo "==> Building API..."
cd /opt/smurbok/api && npm run build

echo "==> Building web..."
cd /opt/smurbok/web && npm run build

echo "==> Enabling and starting services..."
sudo systemctl enable --now smurbok-api smurbok-web

echo ""
echo "Done! Both services are running and will start on boot."
echo ""
echo "Useful commands:"
echo "  sudo systemctl status smurbok-api smurbok-web"
echo "  sudo journalctl -u smurbok-api -f"
echo "  sudo journalctl -u smurbok-web -f"
echo "  bash /opt/smurbok/deploy.sh   # rebuild + restart both"
