#!/bin/bash

if [[ "${CONTAINER_MODE}" == "dev" ]]; then
    npm install --silent
    if [[ "${BACKEND_MODE}" == "prod" ]]; then
        npm run build
    fi
fi

npm run "${BACKEND_MODE}"
