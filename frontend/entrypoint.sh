#!/bin/bash

if [[ "${CONTAINER_MODE}" == "dev" ]]; then
    npm install --silent
fi

if [[ "${FRONTEND_MODE}" == "prod" ]]; then
    if [[ "${CONTAINER_MODE}" == "dev" ]]; then
        npm run prod
    fi
    nginx -c /opt/app/prod.nginx.conf -g "daemon off;"
elif [ "${FRONTEND_MODE}" == "dev" ]; then
    nginx -c /opt/app/dev.nginx.conf
    npm run dev
fi
