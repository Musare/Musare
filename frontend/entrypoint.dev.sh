#!/bin/sh

set -e

# Install node modules if not found
if [ ! -d node_modules ]; then
    npm install
fi

if [ "${APP_ENV}" = "development" ]; then
    ln -sf /opt/app/nginx.dev.conf /etc/nginx/http.d/default.conf
    nginx

    npm run dev
else
    ln -sf /opt/app/nginx.prod.conf /etc/nginx/http.d/default.conf
    nginx -g "daemon off;"
fi
