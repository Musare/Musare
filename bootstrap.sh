#!/usr/bin/env bash

function command_exists { type "$1" &> /dev/null; }

# install mosh
if command_exists "mosh"; then
	echo "Skipping mosh install"
else
	echo "Installing mosh"
	sudo apt-get install -y mosh
fi

# install NodeJS
if command_exists "nodejs"; then
	echo "Skipping nodejs install"
else
	echo "Installing nodejs"
	curl -sL https://deb.nodesource.com/setup_6.x | sudo -E bash -
	sudo apt-get install -y nodejs
fi

# install mongodb
if command_exists "mongo"; then
	echo "Skipping mongodb install"
else
	echo "Installing mongodb"
	sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
	echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.2 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.2.list
	sudo apt-get update
	sudo apt-get install -y mongodb-org
fi

# setup a service for mongodb
if [ -f /etc/init/mongodb.conf ]; then
	echo "Skipping mongodb service"
else
	echo "Setting up mongoDB service"
	sudo tee -a /etc/init/mongodb.conf > /dev/null <<EOF
description "Service file for starting / stopping mongodb"
author "Musare Developers"
start on filesystem
stop on shutdown
console log
script
	exec mongod
end script
pre-start script
	echo "[\`date\`] mongodb starting" >> /var/log/mongodb.log
end script
pre-stop script
	rm /var/run/mongodb.pid
	echo "[\`date\`] mongodb stopping" >> /var/log/mongodb.log
end script
EOF
fi

# setup a service for Musare
if [ -f /etc/init/musare.conf ]; then
	echo "Skipping musare service"
else
	echo "Setting up musare service"
	sudo tee -a /etc/init/musare.conf > /dev/null <<EOF
description "Service file for starting / stopping musare"
author "Musare Developers"

start on filesystem
stop on shutdown

setgid www-data
console log

script
	until mountpoint -q /musare; do sleep 1; done
	echo \$\$ > /var/run/musare.pid
	cd /musare
	nodemon -L backend/app.js
end script

pre-start script
	echo "[\`date\`] musare starting" >> /var/log/musare.log
end script

pre-stop script
	rm /var/run/musare.pid
	echo "[\`date\`] musare stopping" >> /var/log/musare.log
end script
EOF
fi

# automatically install all of our dependencies
cd /musare

cd backend
rm -rf node_modules/
npm install --no-bin-links
cd ../

cd frontend
rm -rf node_modules/
npm install --no-bin-links
npm run development-watch
cd ../

sudo npm install -g nodemon
sudo npm install -g webpack

sudo mkdir -p /data/db
