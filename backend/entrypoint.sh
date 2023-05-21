#!/bin/bash

if [[ "${CONTAINER_MODE}" == "development" ]]; then
    npm install --silent
    if [[ "${BACKEND_MODE}" == "production" ]]; then
        npm run build
    fi
fi

if [[ "${BACKEND_DEBUG}" == "true" ]]; then
    export INSPECT_BRK="--inspect-brk=0.0.0.0:${BACKEND_DEBUG_PORT:-9229}"
else
    export INSPECT_BRK=""
fi

if [[ "${BACKEND_MODE}" == "production" ]]; then
    npm run prod
else
    npm run dev
fi
