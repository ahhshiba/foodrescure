#!/bin/sh
# Generate the Mosquitto password file from env vars at container start.
# Keeps credentials out of the repo (they live only in .env) and avoids
# committing a hashed password file.
set -e

PASSWD_FILE=/mosquitto/config/passwd

if [ -z "$MQTT_USER" ] || [ -z "$MQTT_PASSWORD" ]; then
  echo "[mosquitto-entrypoint] ERROR: MQTT_USER / MQTT_PASSWORD not set" >&2
  exit 1
fi

echo "[mosquitto-entrypoint] (re)generating password file for user '$MQTT_USER'"
# -c creates/overwrites; -b takes the password on the command line (non-interactive)
mosquitto_passwd -b -c "$PASSWD_FILE" "$MQTT_USER" "$MQTT_PASSWORD"
# The broker drops privileges to the 'mosquitto' user, so it must own + be able
# to read the pwfile (mosquitto refuses files it cannot open).
chown mosquitto:mosquitto "$PASSWD_FILE"
chmod 0700 "$PASSWD_FILE"

echo "[mosquitto-entrypoint] starting broker"
exec mosquitto -c /mosquitto/config/mosquitto.conf
