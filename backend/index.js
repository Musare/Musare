'use strict';

process.env.NODE_CONFIG_DIR = `${__dirname}/config`;

const async = require('async');

const db = require('./logic/db');
const app = require('./logic/app');
const io = require('./logic/io');
const cache = require('./logic/cache');
const scheduler = require('./logic/scheduler');

// setup our cache with the tables we need
cache.addTable('sessions');
cache.addTable('stations');

async.waterfall([

	// connect to our database
	(next) => db.init('mongodb://mongo:27017/musare', next),

	// load all the stations from the database into the cache (we won't actually do this in the future)
	(next) => {

		// this represents data directly from the DB (for now, lets just add some dummy stations)
		let stations = [
			{
				id: '7dbf25fd-b10d-6863-2f48-637f6014b162',
				name: 'edm',
				genres: ['edm'],
				displayName: 'EDM',
				description: 'EDM Music',
				playlist: [
					'gCYcHz2k5x0'
				]
			},
			{
				id: '79cedff1-5341-7f0e-6542-50491c4797b4',
				genres: ['chill'],
				displayName: 'Chill',
				description: 'Chill Music',
				playlist: [
					'gCYcHz2k5x0'
				]
			}
		];

		stations.forEach((station) => {
			// add the station to the cache, adding the temporary data
			cache.addRow('stations', Object.assign(station, {
				skips: 0,
				userCount: 0,
				currentSongIndex: 0,
				paused: false
			}));
		});

		next();
	},

	// setup the express server (not used right now, but may be used for OAuth stuff later, or for an API)
	(next) => app.init(next),

	// setup the socket.io server (all client / server communication is done over this)
	(next) => io.init(next)
], (err) => {
	if (err) return console.error(err);
	console.log('Backend has been started');
});
