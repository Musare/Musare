#!/bin/bash

MONGO_VERSION_INT=${MONGO_VERSION:0:1}
if [[ $MONGO_VERSION_INT -ge 5 ]]; then
        mongosh musare \
                --port 27017 \
                -u "admin" \
                --authenticationDatabase "admin" \
                -p ${MONGO_ROOT_PASSWORD} \
                --eval "disableTelemetry(); db.createUser({ user: '${MONGO_USER_USERNAME}', pwd: '${MONGO_USER_PASSWORD}', roles:[ { role:'readWrite', db: 'musare' } ] } );"
else
        mongo musare \
                --port 27017 \
                -u "admin" \
                --authenticationDatabase "admin" \
                -p ${MONGO_ROOT_PASSWORD} \
                --eval "db.createUser({ user: '${MONGO_USER_USERNAME}', pwd: '${MONGO_USER_PASSWORD}', roles:[ { role:'readWrite', db: 'musare' } ] } );"
fi