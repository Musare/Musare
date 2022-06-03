#!/bin/bash

if [[ "${FRONTEND_MODE}" = "prod" ]]; then
    nginx -c /opt/app/prod.nginx.conf -g "daemon off;"
elif [ "${FRONTEND_MODE}" == "dev" ]; then
    nginx -c /opt/app/dev.nginx.conf
    npm run dev
fi
