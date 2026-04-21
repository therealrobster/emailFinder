#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EXT_DIR="$ROOT_DIR/emailFinder"
MANIFEST="$EXT_DIR/manifest.json"
TMP_DIR="$ROOT_DIR/.build-emailfinder-tmp"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Error: manifest not found at $MANIFEST" >&2
  exit 1
fi

VERSION="$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]\+\)".*/\1/p' "$MANIFEST" | head -n 1)"
if [[ -z "$VERSION" ]]; then
  echo "Error: could not read version from manifest.json" >&2
  exit 1
fi

BASE_NAME="emailFinder-v${VERSION}"
ZIP_OUT="$ROOT_DIR/${BASE_NAME}.zip"
XPI_OUT="$ROOT_DIR/${BASE_NAME}.xpi"

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
cp -R "$EXT_DIR"/. "$TMP_DIR"/

(
  cd "$TMP_DIR"
  zip -r "$ZIP_OUT" . -x "*.DS_Store"
)

cp "$ZIP_OUT" "$XPI_OUT"
rm -rf "$TMP_DIR"

echo "Built packages:"
echo "- $ZIP_OUT"
echo "- $XPI_OUT"
