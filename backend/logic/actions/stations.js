'use strict';

const async   = require('async'),
	  request = require('request'),
	  config  = require('config');

const io = require('../io');
const db = require('../db');
const cache = require('../cache');
const notifications = require('../notifications');
const utils = require('../utils');

let stationsLoaded = {};

notifications.subscribe('station.locked', function(stationName) {
	io.to(`station.${stationName}`).emit("event:station.locked");
});

notifications.subscribe('station.unlocked', function(stationName) {
	io.to(`station.${stationName}`).emit("event:station.unlocked");
});

notifications.subscribe('station.pause', function(stationName) {
	io.to(`station.${stationName}`).emit("event:station.pause");
});

notifications.subscribe('station.resume', function(stationName) {
	io.to(`station.${stationName}`).emit("event:station.resume");
});

/**
 * Loads a station into the cache, and sets up all the related logic
 *
 * @param {String} stationId - the id of the station
 * @param {Function} cb - gets called when this function completes
 */
function initializeAndReturnStation (stationId, cb) {
	async.waterfall([

		// first check the cache for the station
		(next) => cache.hget('stations', stationId, next),

		// if the cached version exist
		(station, next) => {
			if (station) return next(true, station);
			db.models.station.findOne({ id: stationId }, next);
		},

		// if the station exists in the DB, add it to the cache
		(station, next) => {
			if (!station) return cb('Station by that id does not exist');
			station = cache.schemas.station(station);
			cache.hset('stations', station.id, station, (err) => next(err, station));
		}

	], (err, station) => {
		if (err && err !== true) return cb(err);

		// get notified when the next song for this station should play, so that we can notify our sockets
		if (stationsLoaded[stationId] === undefined) {
			stationsLoaded[stationId] = 1;
			let notification = notifications.subscribe(`stations.nextSong?id=${station.id}`, () => {
				// get the station from the cache
				cache.hget('stations', station.name, (err, station) => {
					if (station) {
						console.log(777);
						// notify all the sockets on this station to go to the next song
						io.to(`station.${stationId}`).emit("event:songs.next", {
							currentSong: station.currentSong,
							startedAt: station.startedAt,
							paused: station.paused,
							timePaused: 0
						});
						// schedule a notification to be dispatched when the next song ends
						notifications.schedule(`stations.nextSong?id=${station.id}`, station.currentSong.duration * 1000);
					}
					// the station doesn't exist anymore, unsubscribe from it
					else {
						console.log(888);
						notifications.remove(notification);
						delete stationsLoaded[stationId];
					}
				});
			}, true);

			if (!station.paused) {
				console.log(station);
				notifications.schedule(`stations.nextSong?id=${station.id}`, station.currentSong.duration * 1000);
			}
		}

		return cb(null, station);

		// will need to be added once station namespace thing is decided
		// function generatePlaylist(arr) {
		// 	station.playlist = [];
		// 	return arr.reduce((promise, id) => {
		// 		return promise.then(() => {
		// 			return globals.db.models.song.findOne({ id }, (err, song) => {
		// 				if (err) throw err;
		// 				station.playlist.push(song);
		// 			});
		// 		});
		// 	}, Promise.resolve());
		// }

		// generatePlaylist(station.playlist).then(() => {
		// 	cb(null, station);
		// });
	});
}

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
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	join: (session, stationId, cb) => {
		let ns = io.io.of("/");
		if (ns) {
			for (let id in ns.connected) {
				console.log(ns.connected[id]);
				console.log(ns.connected[id].testProp);
			}
		}


		initializeAndReturnStation(stationId, (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while joining the station' });
			}

			if (station) {

				if (session) session.stationId = stationId;

				//TODO Loop through all sockets, see if socket with same session exists, and if so leave all other station rooms and join this stationRoom

				cache.client.hincrby('station.userCounts', stationId, 1, (err, userCount) => {
					if (err) return cb({ status: 'error', message: 'An error occurred while joining the station' });
					utils.socketJoinRoom(session);
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

		initializeAndReturnStation(stationId, (err, station) => {

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
		initializeAndReturnStation(stationId, (err, station) => {

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

	lock: (session, stationId, cb) => {
		//TODO Require admin
		initializeAndReturnStation(stationId, (err, station) => {
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

	unlock: (session, stationId, cb) => {
		//TODO Require admin
		initializeAndReturnStation(stationId, (err, station) => {
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

};
