#!/bin/bash

if [[ "${CONTAINER_MODE}" == "dev" ]]; then
    npm install --silent
fi

if [[ "${BACKEND_MODE}" == "prod" ]]; then
    if [[ "${CONTAINER_MODE}" == "dev" ]]; then
        npm run build
    fi
    npm run prod
elif [ "${BACKEND_MODE}" == "dev" ]; then
    npm run dev -- --legacy-watch --no-stdin
fi
