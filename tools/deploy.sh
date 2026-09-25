#!/usr/bin/env bash
# Deploy the game to the Raspberry Pi's Apache web root.
#
#   ./tools/deploy.sh
#
# You will be asked for the Pi's SSH password, then its sudo password.
# Override any of these with environment variables, e.g.:
#   HOST=myhost ROOT=/srv/www NAME=smashegg ./tools/deploy.sh
set -euo pipefail

HOST="${HOST:-samuels-raspi}"
ROOT="${ROOT:-/var/www/html}"
NAME="${NAME:-smashegg}"
DOMAIN="${DOMAIN:-samuel-thuis.duckdns.org}"
IP="${IP:-192.168.1.187}"
# verify over public HTTPS: that is what visitors actually get, and it is the
# only way to catch a broken chain or a vhost that serves the wrong document root
URL="https://${DOMAIN}/${NAME}/"

HERE="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> building dist/"
rm -rf "$HERE/dist"
mkdir -p "$HERE/dist"
cp "$HERE/index.html" "$HERE/dist/"
cp -r "$HERE/css" "$HERE/js" "$HERE/dist/"

echo "==> uploading to ${HOST}"
tar -C "$HERE/dist" -czf - . \
  | ssh "$HOST" "mkdir -p ~/${NAME}-deploy && tar -xzf - -C ~/${NAME}-deploy"

echo "==> installing into ${ROOT}/${NAME}/ (sudo on the Pi)"
# -t gives sudo a terminal to prompt on
ssh -t "$HOST" "sudo mkdir -p ${ROOT}/${NAME} \
  && sudo cp -a ~/${NAME}-deploy/. ${ROOT}/${NAME}/ \
  && sudo chown -R root:root ${ROOT}/${NAME}"

echo "==> verifying ${URL}"
probe() { curl -sS -o /dev/null -w '%{http_code} %{content_type}' "$1"; }

js="$(probe "${URL}js/main.js")"
page="$(probe "${URL}")"
lan="$(probe "http://${IP}/${NAME}/js/main.js")"
echo "    ${URL}js/main.js -> ${js}"
echo "    ${URL}            -> ${page}"
echo "    http://${IP}/${NAME}/js/main.js -> ${lan}"

case "$js" in
  200*javascript*) echo "==> live at ${URL}" ;;
  *) echo "!! expected 200 with a javascript content type — ES modules will not load" >&2
     echo "!! got: ${js}" >&2
     exit 1 ;;
esac
[ "${page#200}" = "$page" ] && { echo "!! ${URL} did not return 200" >&2; exit 1; }
echo "==> to list the game on the landing page:"
echo "    scp tools/patch_samsites.py ${HOST}:~"
echo "    ssh -t ${HOST} 'sudo python3 ~/patch_samsites.py'"
