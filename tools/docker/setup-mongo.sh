#!/bin/bash

mongo musare \
        --port ${MONGO_PORT} \
        -u "admin" \
        --authenticationDatabase "admin" \
        -p ${MONGO_ROOT_PASSWORD} \
        --eval "db.createUser({ user: '${MONGO_USER_USERNAME}', pwd: '${MONGO_USER_PASSWORD}', roles:[ { role:'readWrite', db: 'musare' } ] } );"