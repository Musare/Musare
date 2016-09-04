#!/usr/bin/env bash

function command_exists { type "$1" &> /dev/null; }

# install NodeJS
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

# install RethinkDB
if command_exists "rethinkdb"; then
	echo "Skipping rethinkdb install"
else
	echo "Installing rethinkdb"
	source /etc/lsb-release && echo "deb http://download.rethinkdb.com/apt $DISTRIB_CODENAME main" | sudo tee /etc/apt/sources.list.d/rethinkdb.list
	wget -qO- https://download.rethinkdb.com/apt/pubkey.gpg | sudo apt-key add -
	sudo apt-get update
	sudo apt-get install -y rethinkdb
fi

# setup a service for RethinkDB
if [ -f /etc/init/rethinkdb.conf ]; then
	echo "Skipping up rethinkdb service"
else
	echo "Setting up rethinkdb service"
	sudo tee -a /etc/init/rethinkdb.conf > /dev/null <<EOF
description "Service file for starting / stopping rethinkdb"
author "Musare Developers"

start on filesystem
stop on shutdown

setgid rethinkdb
console log

script
	echo \$\$ > /var/run/rethinkdb.pid
	cd /musare
	exec rethinkdb --bind all
end script

pre-start script
	echo "[\`date\`] rethinkdb starting" >> /var/log/rethinkdb.log
end script

pre-stop script
	rm /var/run/rethinkdb.pid
	echo "[\`date\`] rethinkdb stopping" >> /var/log/rethinkdb.log
end script
EOF
fi

# setup a service for Musare
if [ -f /etc/init/musare.conf ]; then
	echo "Skipping up musare service"
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
	exec gulp
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
npm install --no-bin-links
