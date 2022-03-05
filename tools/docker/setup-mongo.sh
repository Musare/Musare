#!/bin/bash

mongosh musare \
        --port 27017 \
        -u "admin" \
        --authenticationDatabase "admin" \
        -p ${MONGO_ROOT_PASSWORD} \
        --eval "disableTelemetry(); db.createUser({ user: '${MONGO_USER_USERNAME}', pwd: '${MONGO_USER_PASSWORD}', roles:[ { role:'readWrite', db: 'musare' } ] } );"