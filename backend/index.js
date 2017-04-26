'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const async = require('async');
const fs = require('fs');


const Discord = require("discord.js");
const client = new Discord.Client();
const db = require('./logic/db');
const app = require('./logic/app');
const mail = require('./logic/mail');
const api = require('./logic/api');
const io = require('./logic/io');
const stations = require('./logic/stations');
const songs = require('./logic/songs');
const playlists = require('./logic/playlists');
const cache = require('./logic/cache');
const notifications = require('./logic/notifications');
const punishments = require('./logic/punishments');
const logger = require('./logic/logger');
const tasks = require('./logic/tasks');
const config = require('config');

let currentComponent;
let initializedComponents = [];
let lockdownB = false;

process.on('uncaughtException', err => {
	if (lockdownB || err.code === 'ECONNREFUSED' || err.code === 'UNCERTAIN_STATE') return;
	console.log(`UNCAUGHT EXCEPTION: ${err.stack}`);
});

const getError = (err) => {
	let error = 'An error occurred.';
	if (typeof err === "string") error = err;
	else if (err.message) {
		if (err.message !== 'Validation failed') error = err.message;
		else error = err.errors[Object.keys(err.errors)].message;
	}
	return error;
};

client.on('ready', () => {
	discordClientCBS.forEach((cb) => {
		cb();
	});
	discordClientCBS = [];
	console.log(`Logged in to Discord as ${client.user.username}#${client.user.discriminator}`);
});

client.on('disconnect', (err) => {
	console.log(`Discord disconnected. Code: ${err.code}.`);
});

client.login(config.get('apis.discord.token'));

let discordClientCBS = [];
const getDiscordClient = (cb) => {
	if (client.status === 0) return cb();
	else discordClientCBS.push(cb);
};

const logToDiscord = (message, color, type, critical, extraFields, cb = ()=>{}) => {
	getDiscordClient(() => {
		let richEmbed = new Discord.RichEmbed();
		richEmbed.setAuthor("Musare Logger", config.get("domain")+"/favicon-194x194.png", config.get("domain"));
		richEmbed.setColor(color);
		richEmbed.setDescription(message);
		//richEmbed.setFooter("Footer", "https://musare.com/favicon-194x194.png");
		//richEmbed.setImage("https://musare.com/favicon-194x194.png");
		//richEmbed.setThumbnail("https://musare.com/favicon-194x194.png");
		richEmbed.setTimestamp(new Date());
		richEmbed.setTitle("MUSARE ALERT");
		richEmbed.setURL(config.get("domain"));
		richEmbed.addField("Type:", type, true);
		richEmbed.addField("Critical:", (critical) ? 'True' : 'False', true);
		extraFields.forEach((extraField) => {
			richEmbed.addField(extraField.name, extraField.value, extraField.inline);
		});
		client.channels.get(config.get('apis.discord.loggingChannel')).sendEmbed(richEmbed).then(() => {
			cb();
		}).then((reason) => {
			cb(reason);
		});
	});
};

function lockdown() {
	if (lockdownB) return;
	lockdownB = true;
	initializedComponents.forEach((component) => {
		component._lockdown();
	});
	console.log("Backend locked down.");
}

function errorCb(message, err, component) {
	err = getError(err);
	lockdown();
	logToDiscord(message, "#FF0000", message, true, [{name: "Error:", value: err, inline: false}, {name: "Component:", value: component, inline: true}]);
}

async.waterfall([

	// setup our Redis cache
	(next) => {
		currentComponent = 'Cache';
		cache.init(config.get('redis').url, config.get('redis').password, errorCb, () => {
			next();
		});
	},

	// setup our MongoDB database
	(next) => {
		initializedComponents.push(cache);
		currentComponent = 'DB';
		db.init(config.get("mongo").url, errorCb, next);
	},

	// setup the express server
	(next) => {
		initializedComponents.push(db);
		currentComponent = 'App';
		app.init(next);
	},

	// setup the mail
	(next) => {
		initializedComponents.push(app);
		currentComponent = 'Mail';
		mail.init(next);
	},

	// setup the socket.io server (all client / server communication is done over this)
	(next) => {
		initializedComponents.push(mail);
		currentComponent = 'IO';
		io.init(next);
	},

	// setup the punishment system
	(next) => {
		initializedComponents.push(io);
		currentComponent = 'Punishments';
		punishments.init(next);
	},

	// setup the notifications
	(next) => {
		initializedComponents.push(punishments);
		currentComponent = 'Notifications';
		notifications.init(config.get('redis').url, config.get('redis').password, errorCb, next);
	},

	// setup the stations
	(next) => {
		initializedComponents.push(notifications);
		currentComponent = 'Stations';
		stations.init(next)
	},

	// setup the songs
	(next) => {
		initializedComponents.push(stations);
		currentComponent = 'Songs';
		songs.init(next)
	},

	// setup the playlists
	(next) => {
		initializedComponents.push(songs);
		currentComponent = 'Playlists';
		playlists.init(next)
	},

	// setup the API
	(next) => {
		initializedComponents.push(playlists);
		currentComponent = 'API';
		api.init(next)
	},

	// setup the logger
	(next) => {
		initializedComponents.push(api);
		currentComponent = 'Logger';
		logger.init(next)
	},

	// setup the tasks system
	(next) => {
		initializedComponents.push(logger);
		currentComponent = 'Tasks';
		tasks.init(next)
	},

	// setup the frontend for local setups
	(next) => {
		initializedComponents.push(tasks);
		currentComponent = 'Windows';
		if (!config.get("isDocker")) {
			const express = require('express');
			const app = express();
			app.listen(config.get("frontendPort"));
			const rootDir = __dirname.substr(0, __dirname.lastIndexOf("backend")) + "frontend/build/";

			app.get("/*", (req, res) => {
				const path = req.path;
				fs.access(rootDir + path, function(err) {
					if (!err) {
						res.sendFile(rootDir + path);
					} else {
						res.sendFile(rootDir + "index.html");
					}
				});
			});
		}
		if (lockdownB) return;
		next();
	}
], (err) => {
	if (err && err !== true) {
		lockdown();
		logToDiscord("An error occurred while initializing the backend server.", "#FF0000", "Startup error", true, [{name: "Error:", value: err, inline: false}, {name: "Component:", value: currentComponent, inline: true}]);
		console.error('An error occurred while initializing the backend server');
	} else {
		logToDiscord("The backend server started successfully.", "#00AA00", "Startup", false, []);
		console.info('Backend server has been successfully started');
	}
});
