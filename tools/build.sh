#!/bin/bash
# compiles Tailwind for the classes used in src/, then builds dist/
# TAILWIND=/path/to/tailwindcss uses a standalone binary instead of npx
set -e
cd "$(dirname "$0")/.."
if [ -n "$TAILWIND" ]; then TW="$TAILWIND"; else TW="npx --yes tailwindcss@3.4.17"; fi
TWSRC="$(pwd)/src/*" $TW -c tools/tailwind.config.js -i tools/in.css -o tools/app.css --minify
python3 tools/build.py
