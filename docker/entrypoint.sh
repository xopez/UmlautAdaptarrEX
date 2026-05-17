#!/bin/sh
# Entrypoint shim: fix /data ownership, then drop privileges to PUID:PGID.
set -e

# Strip whitespace (incl. CR from Windows-edited compose files) so a stray
# space in `- PUID=99 ` does not turn into `chown 99 :100`, which BusyBox
# chown cannot resolve.
PUID=$(printf '%s' "${PUID:-1000}" | tr -d '[:space:]')
PGID=$(printf '%s' "${PGID:-1000}" | tr -d '[:space:]')

mkdir -p /data
chown -R "$PUID:$PGID" /data

exec su-exec "$PUID:$PGID" "$@"
