#!/bin/bash

if [ "$FRONTEND_MODE" == "prod" ] ; then
	nginx -c /opt/app/$FRONTEND_MODE.nginx.conf -g "daemon off;"
	cd /opt/app ; npm run $FRONTEND_MODE
elif [ "$FRONTEND_MODE" == "dev" ] ; then
	nginx -c /opt/app/$FRONTEND_MODE.nginx.conf
	cd /opt/app; npm run $FRONTEND_MODE
fi