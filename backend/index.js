'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const async = require('async');

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
const config = require('config');

process.on('uncaughtException', err => {
	//console.log(`ERROR: ${err.message}`);
	console.log(`ERROR: ${err.stack}`);
});

async.waterfall([

	// setup our Redis cache
	(next) => {
		cache.init(config.get('redis').url, () => {
			next();
		});
	},

	// setup our MongoDB database
	(next) => db.init(config.get("mongo").url, next),

	// setup the express server
	(next) => app.init(next),

	// setup the mail
	(next) => mail.init(next),

	// setup the socket.io server (all client / server communication is done over this)
	(next) => io.init(next),

	// setup the notifications
	(next) => notifications.init(config.get('redis').url, next),

	// setup the stations
	(next) => stations.init(next),

	// setup the songs
	(next) => songs.init(next),

	// setup the playlists
	(next) => playlists.init(next),

	// setup the API
	(next) => api.init(next),

	// setup the frontend for local setups
	(next) => {
		if (!config.get("isDocker")) {
			const express = require('express');
			const app = express();
			const server = app.listen(80);
			app.use(express.static(__dirname + "/../frontend/build/"));
		}
		next();
	}
], (err) => {
	if (err && err !== true) {
		console.error('An error occurred while initializing the backend server');
		console.error(err);
		process.exit();
	} else {
		console.info('Backend server has been successfully started');
	}
});
