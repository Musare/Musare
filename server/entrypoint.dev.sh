#!/bin/sh

set -e

# Install node modules if not found
if [ ! -d node_modules ]; then
    npm install
fi

if [ "${SERVER_DEBUG}" = "true" ]; then
    export INSPECT_BRK="--inspect-brk=0.0.0.0:${SERVER_DEBUG_PORT:-9228}"
else
    export INSPECT_BRK=""
fi

if [ "${APP_ENV}" = "development" ]; then
    npm run dev
else
    npm run compile
    npm run migrate
    npm start
fi
