#!/bin/sh
# Remakes the scan code on /download/ (public/assets/download-qr-20261127.svg).
# It holds the App Store link for the "site_download_qr" placement, the same
# link lib/appstore.ts builds. Needs qrencode. Check it with a phone camera.
set -eu
url='https://apps.apple.com/app/apple-store/id6773492861?pt=128800181&ct=site_download_qr&mt=8'
qrencode -t SVG -l M -m 2 --foreground=071426 --background=F3E7D3 --svg-path --rle \
  -o "$(dirname "$0")/../public/assets/download-qr-20261127.svg" "$url"
