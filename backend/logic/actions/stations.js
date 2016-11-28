'use strict';

const async   = require('async'),
	  request = require('request'),
	  config  = require('config');

const io = require('../io');
const db = require('../db');
const cache = require('../cache');
const notifications = require('../notifications');
const utils = require('../utils');
const stations = require('../stations');

const defaultSong = {
	_id: '60ItHLz5WEA',
	title: 'Faded',
	artists: ['Alan Walker'],
	duration: 212,
	skipDuration: 0,
	likes: 0,
	dislikes: 0,
	thumbnail: 'https://i.scdn.co/image/2ddde58427f632037093857ebb71a67ddbdec34b'
};

cache.sub('station.locked', stationName => {
	io.to(`station.${stationName}`).emit("event:station.locked");
});

cache.sub('station.unlocked', stationName => {
	io.to(`station.${stationName}`).emit("event:station.unlocked");
});

cache.sub('station.pause', stationName => {
	io.to(`station.${stationName}`).emit("event:station.pause");
});

cache.sub('station.resume', stationName => {
	io.to(`station.${stationName}`).emit("event:station.resume");
});

cache.sub('station.create', stationId => {
	stations.initializeAndReturnStation(stationId, (err, station) => {
		//TODO Emit to homepage and admin station page
		if (!err) {
			io.io.to('home').emit("event:stations.created", station);
		}
	});
});

module.exports = {

	/**
	 * Get a list of all the stations
	 *
	 * @param session
	 * @param cb
	 * @return {{ status: String, stations: Array }}
	 */
	index: (session, cb) => {
		// TODO: the logic should be a bit more personalized to the users preferred genres
		// and it should probably just a different cache table then 'stations'
		cache.hgetall('stations', (err, stations) => {

			if (err && err !== true) {
				return cb({
					status: 'error',
					message: 'An error occurred while obtaining the stations'
				});
			}

			let arr = [];
			for (let prop in stations) {
				arr.push(stations[prop]);
			}

			cb({ status: 'success', stations: arr });
		});
	},

	/**
	 * Joins the station by its id
	 *
	 * @param sessionId
	 * @param stationId - the station id
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	join: (sessionId, stationId, cb) => {

		stations.initializeAndReturnStation(stationId, (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while joining the station' });
			}

			if (station) {

				//TODO Loop through all sockets, see if socket with same session exists, and if so leave all other station rooms and join this stationRoom

				cache.client.hincrby('station.userCounts', stationId, 1, (err, userCount) => {
					if (err) return cb({ status: 'error', message: 'An error occurred while joining the station' });
					utils.socketJoinRoom(sessionId, `station.${stationId}`);
					//TODO Emit to cache, listen on cache
					cb({ status: 'success', currentSong: station.currentSong, startedAt: station.startedAt, paused: station.paused, timePaused: station.timePaused });
				});
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
			}
		});
	},

	/**
	 * Skips the users current station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 * @return {{ status: String, skipCount: Integer }}
	 */
	skip: (session, stationId, cb) => {

		if (!session) return cb({ status: 'failure', message: 'You must be logged in to skip a song!' });

		stations.initializeAndReturnStation(stationId, (err, station) => {
			
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while skipping the station' });
			}

			if (station) {
				cache.client.hincrby('station.skipCounts', session.stationId, 1, (err, skipCount) => {

					session.skippedSong = true;

					if (err) return cb({ status: 'error', message: 'An error occurred while skipping the station' });

					cache.hget('station.userCounts', session.stationId, (err, userCount) => {
						cb({ status: 'success', skipCount });
					});
				});
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
			}
		});
	},

	/**
	 * Leaves the users current station
	 *
	 * @param session
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	leave: (session, cb) => {
		let stationId = "edm";
		stations.initializeAndReturnStation(stationId, (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while leaving the station' });
			}

			if (session) session.stationId = null;
			else if (station) {
				cache.client.hincrby('station.userCounts', stationId, -1, (err, userCount) => {
					if (err) return cb({ status: 'error', message: 'An error occurred while leaving the station' });
					utils.socketLeaveRooms(session);
					cb({ status: 'success', userCount });
				});
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	lock: (sessionId, stationId, cb) => {
		//TODO Require admin
		stations.initializeAndReturnStation(stationId, (err, station) => {
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while locking the station' });
			} else if (station) {
				// Add code to update Mongo and Redis
				cb({ status: 'success' });
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	unlock: (sessionId, stationId, cb) => {
		//TODO Require admin
		stations.initializeAndReturnStation(stationId, (err, station) => {
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while unlocking the station' });
			} else if (station) {
				// Add code to update Mongo and Redis
				cb({ status: 'success' });
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	remove: (sessionId, stationId, cb) => {
		cache.hdel('stations', stationId, () => {
			// TODO: Update Mongo
			return cb({ status: 'success', message: 'Station successfully removed' });
		});
	},

	create: (sessionId, data, cb) => {
		//TODO Require admin
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			// check the cache for the station
			(next) => cache.hget('stations', data.name, next),

			// if the cached version exist
			(station, next) => {
				if (station) return next({ 'status': 'failure', 'message': 'A station with that name already exists' });
				db.models.station.findOne({ _id: data.name }, next);
			},

			(station, next) => {
				if (station) return next({ 'status': 'failure', 'message': 'A station with that name already exists' });
				const { _id, displayName, description, genres, playlist } = data;
				db.models.station.create({
					_id,
					displayName,
					description,
					type: "official",
					playlist,
					genres,
					currentSong: defaultSong
				}, next);
			}

		], (err, station) => {
			if (err) throw err;
			stations.calculateSongForStation(station, () => {
				cache.pub('station.create', data.name);
				return cb(null, { 'status': 'success', 'message': 'Successfully created station.' });
			});
		});
	},

};
