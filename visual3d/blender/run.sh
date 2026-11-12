#!/usr/bin/env bash
# Run a Blender Python script headless with the isolated install (.cache3d/blender) and a private config dir.
# Usage: visual3d/blender/run.sh path/to/script.py [-- script args]
set -eu
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
export BLENDER_USER_CONFIG="$ROOT/.cache3d/blender-config" BLENDER_USER_SCRIPTS="$ROOT/.cache3d/blender-scripts" BLENDER_USER_DATAFILES="$ROOT/.cache3d/blender-data"
mkdir -p "$BLENDER_USER_CONFIG" "$BLENDER_USER_SCRIPTS" "$BLENDER_USER_DATAFILES"
SCRIPT="$1"; shift
exec "$ROOT/.cache3d/blender/blender" --background --factory-startup --python "$SCRIPT" "$@"
