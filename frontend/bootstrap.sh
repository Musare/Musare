#!/bin/bash

if [ "$FRONTEND_MODE" == "prod" ] ; then
	cd /opt/app ; yarn run $FRONTEND_MODE
	nginx -c /opt/app/$FRONTEND_MODE.nginx.conf -g "daemon off;"
elif [ "$FRONTEND_MODE" == "dev" ] ; then
	nginx -c /opt/app/$FRONTEND_MODE.nginx.conf
	cd /opt/app; yarn run $FRONTEND_MODE
fi