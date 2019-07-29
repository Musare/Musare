'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const async = require('async');
const fs = require('fs');

//const Discord = require("discord.js");
//const client = new Discord.Client();
const db = require('./logic/db');
const app = require('./logic/app');
const mail = require('./logic/mail');
const api = require('./logic/api');
const io = require('./logic/io');
const stations = require('./logic/stations');
const songs = require('./logic/songs');
const spotify = require('./logic/spotify');
const playlists = require('./logic/playlists');
const cache = require('./logic/cache');
const discord = require('./logic/discord');
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
	discord.sendAdminAlertMessage(message, "#FF0000", message, true, [{name: "Error:", value: err, inline: false}, {name: "Component:", value: component, inline: true}]); //TODO Maybe due to lockdown this won't work, and what if the Discord module was the one that failed?
}

function moduleStartFunction() {
	logger.info("MODULE_START", `Starting to initialize component '${currentComponent}'`);
}

async.waterfall([

	// setup our Discord module
	(next) => {
		currentComponent = 'Discord';
		moduleStartFunction();
		discord.init(config.get('apis.discord').token, config.get('apis.discord').loggingChannel, errorCb, () => {
			next();
		});
	},

	// setup our Redis cache
	(next) => {
		currentComponent = 'Cache';
		moduleStartFunction();
		cache.init(config.get('redis').url, config.get('redis').password, errorCb, () => {
			next();
		});
	},

	// setup our MongoDB database
	(next) => {
		initializedComponents.push(cache);
		currentComponent = 'DB';
		moduleStartFunction();
		db.init(config.get("mongo").url, errorCb, next);
	},

	// setup the express server
	(next) => {
		initializedComponents.push(db);
		currentComponent = 'App';
		moduleStartFunction();
		app.init(next);
	},

	// setup the mail
	(next) => {
		initializedComponents.push(app);
		currentComponent = 'Mail';
		moduleStartFunction();
		mail.init(next);
	},

	// setup the Spotify
	(next) => {
		initializedComponents.push(mail);
		currentComponent = 'Spotify';
		moduleStartFunction();
		spotify.init(next);
	},

	// setup the socket.io server (all client / server communication is done over this)
	(next) => {
		initializedComponents.push(spotify);
		currentComponent = 'IO';
		moduleStartFunction();
		io.init(next);
	},

	// setup the punishment system
	(next) => {
		initializedComponents.push(io);
		currentComponent = 'Punishments';
		moduleStartFunction();
		punishments.init(next);
	},

	// setup the notifications
	(next) => {
		initializedComponents.push(punishments);
		currentComponent = 'Notifications';
		moduleStartFunction();
		notifications.init(config.get('redis').url, config.get('redis').password, errorCb, next);
	},

	// setup the stations
	(next) => {
		initializedComponents.push(notifications);
		currentComponent = 'Stations';
		moduleStartFunction();
		stations.init(next)
	},

	// setup the songs
	(next) => {
		initializedComponents.push(stations);
		currentComponent = 'Songs';
		moduleStartFunction();
		songs.init(next)
	},

	// setup the playlists
	(next) => {
		initializedComponents.push(songs);
		currentComponent = 'Playlists';
		moduleStartFunction();
		playlists.init(next)
	},

	// setup the API
	(next) => {
		initializedComponents.push(playlists);
		currentComponent = 'API';
		moduleStartFunction();
		api.init(next)
	},

	// setup the logger
	(next) => {
		initializedComponents.push(api);
		currentComponent = 'Logger';
		moduleStartFunction();
		logger.init(next)
	},

	// setup the tasks system
	(next) => {
		initializedComponents.push(logger);
		currentComponent = 'Tasks';
		moduleStartFunction();
		tasks.init(next)
	},

	// setup the frontend for local setups
	(next) => {
		initializedComponents.push(tasks);
		currentComponent = 'Windows';
		moduleStartFunction();
		if (!config.get("isDocker") && !(config.get("mode") === "development" || config.get("mode") === "dev")) {
			const express = require('express');
			const app = express();
			app.listen(config.get("frontendPort"));
			const rootDir = __dirname.substr(0, __dirname.lastIndexOf("backend")) + "frontend/dist/build";

			app.use(express.static(rootDir, {
				setHeaders: function(res, path) {
					if (path.indexOf('.html') !== -1) res.setHeader('Cache-Control', 'public, max-age=0');
					else res.setHeader('Cache-Control', 'public, max-age=2628000');
				}
			}));

			app.get("/*", (req, res) => {
				res.sendFile(`${rootDir}/index.html`);
			});
		}
		if (lockdownB) return;
		next();
	}
], (err) => {
	if (err && err !== true) {
		lockdown();
		discord.sendAdminAlertMessage("An error occurred while initializing the backend server.", "#FF0000", "Startup error", true, [{name: "Error:", value: err, inline: false}, {name: "Component:", value: currentComponent, inline: true}]);
		console.error('An error occurred while initializing the backend server');
	} else {
		discord.sendAdminAlertMessage("The backend server started successfully.", "#00AA00", "Startup", false, []);
		console.info('Backend server has been successfully started');
	}
});
