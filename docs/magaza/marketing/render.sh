#!/bin/sh
# Render panorama.html headless, then slice into out/01..06.png + out/preview.png
cd "$(dirname "$0")" || exit 1
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --window-size=7920,2868 --screenshot=out/panorama.png "file://$PWD/panorama.html" >/dev/null 2>&1
python3 slice.py
