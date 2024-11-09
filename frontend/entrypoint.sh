#!/bin/sh

if [[ "${CONTAINER_MODE}" == "development" ]]; then
    npm install --silent
fi

if [[ "${FRONTEND_MODE}" == "production" ]]; then
    if [[ "${CONTAINER_MODE}" == "development" ]]; then
        npm run prod
    fi
    nginx -c /opt/app/prod.nginx.conf -g "daemon off;"
elif [ "${FRONTEND_MODE}" == "development" ]; then
    nginx -c /opt/app/dev.nginx.conf
    npm run dev
fi
