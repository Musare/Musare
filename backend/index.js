'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const async = require('async');

const db = require('./logic/db');
const app = require('./logic/app');
const io = require('./logic/io');
const cache = require('./logic/cache');
// const scheduler = require('./logic/scheduler');

async.waterfall([

	// setup our Redis cache
	(next) => {
		cache.init('redis://redis:6379/0', () => {
			// load some test stations into the cache
			async.waterfall([
				(next) => cache.hset('stations', '7dbf25fd-b10d-6863-2f48-637f6014b162', cache.schemas.station({
					name: 'edm',
					genres: ['edm'],
					displayName: 'EDM',
					description: 'EDM Music',
					playlist: [
						'gCYcHz2k5x0'
					]
				}), next),
				(next) => cache.hset('stations', '79cedff1-5341-7f0e-6542-50491c4797b4', cache.schemas.station({
					name: 'chill',
					genres: ['chill'],
					displayName: 'Chill',
					description: 'Chill Music',
					playlist: [
						'gCYcHz2k5x0'
					]
				}), next),
			], next);
		});
	},

	// setup our MongoDB database
	(next) => db.init('mongodb://mongo:27017/musare', next),

	// setup the express server (not used right now, but may be used for OAuth stuff later, or for an API)
	(next) => app.init(next),

	// setup the socket.io server (all client / server communication is done over this)
	(next) => io.init(next)
], (err) => {
	if (err && err !== true) {
		console.error('An error occurred while initializing the backend server');
		console.error(err);
	}
	else {
		console.log('Backend server has been successfully started');
	}
});
