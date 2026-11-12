#!/usr/bin/env bash
# Run a Blender Python script headless with the isolated install (.cache25d/blender) and a private config dir.
# Usage: visual25d/blender/run.sh path/to/script.py [-- script args]
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export BLENDER_USER_CONFIG="$ROOT/.cache25d/blender-config" BLENDER_USER_SCRIPTS="$ROOT/.cache25d/blender-scripts" BLENDER_USER_DATAFILES="$ROOT/.cache25d/blender-data"
mkdir -p "$BLENDER_USER_CONFIG" "$BLENDER_USER_SCRIPTS" "$BLENDER_USER_DATAFILES"
SCRIPT="$1"; shift
exec "$ROOT/.cache25d/blender/blender" --background --factory-startup --python "$SCRIPT" "$@"
