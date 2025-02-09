#!/bin/sh

set -e

# Install node modules if not found
if [ ! -d node_modules ]; then
    npm install
fi

if [ "${BACKEND_DEBUG}" = "true" ]; then
    export INSPECT_BRK="--inspect-brk=0.0.0.0:${BACKEND_DEBUG_PORT:-9229}"
else
    export INSPECT_BRK=""
fi

if [ "${APP_ENV}" = "development" ]; then
    npm run dev
else
    npm run prod
fi
