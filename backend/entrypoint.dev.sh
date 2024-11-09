#!/bin/sh

set -e

# Install node modules if not found
if [ ! -d node_modules ]; then
    npm install
fi

if [[ "${APP_ENV}" == "development" ]]; then
    npm run dev
else
    npm run prod
fi
