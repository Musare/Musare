#!/bin/bash

if [[ "${CONTAINER_MODE}" == "dev" ]]; then
    npm install --silent
    if [[ "${BACKEND_MODE}" == "prod" ]]; then
        npm run build
    fi
fi

if [[ "${BACKEND_DEBUG}" == "true" ]]; then
    export INSPECT_BRK="--inspect-brk=0.0.0.0:${BACKEND_DEBUG_PORT:-9229}"
else
    export INSPECT_BRK=""
fi

npm run "${BACKEND_MODE}"
