#!/bin/bash

USERNAME=$1
MONGO_MUSARE_PASSWORD=$2

if [[ -n $USERNAME ]] && [[ -n $MONGO_MUSARE_PASSWORD ]];
then
        echo "Attemtping to make '$USERNAME' an admin"
        docker-compose exec mongo mongo musare -u musare -p $MONGO_MUSARE_PASSWORD --eval "db.users.update({username: '$USERNAME'}, {\$set: {role: 'admin'}})"
else
        echo "Syntax: makeUserAdmin MUSARE_USERNAME MONGO_MUSARE_PASSWORD"
fi