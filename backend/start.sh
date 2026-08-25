#!/bin/sh
set -e

npm ci --omit=dev

exec node dist/app.js