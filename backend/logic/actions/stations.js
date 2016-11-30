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
const songs = require('../songs');

cache.sub('station.locked', stationId => {
	io.io.to(`station.${stationId}`).emit("event:stations.locked");
});

cache.sub('station.unlocked', stationId => {
	io.io.to(`station.${stationId}`).emit("event:stations.unlocked");
});

cache.sub('station.pause', stationId => {
	io.io.to(`station.${stationId}`).emit("event:stations.pause");
});

cache.sub('station.resume', stationId => {
	stations.initializeAndReturnStation(stationId, (err, station) => {
		io.io.to(`station.${stationId}`).emit("event:stations.resume", {timePaused: station.timePaused});
	});
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
					utils.socketJoinSongRoom(sessionId, `song.${station.currentSong._id}`);
					//TODO Emit to cache, listen on cache
					songs.getSong(station.currentSong._id, (err, song) => {
						if (!err) {
							station.currentSong.likes = song.likes;
							station.currentSong.dislikes = song.dislikes;
						} else {
							station.currentSong.likes = -1;
							station.currentSong.dislikes = -1;
						}
						cb({ status: 'success', currentSong: station.currentSong, startedAt: station.startedAt, paused: station.paused, timePaused: station.timePaused });
					});
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

	pause: (sessionId, stationId, cb) => {
		//TODO Require admin
		stations.initializeAndReturnStation(stationId, (err, station) => {
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while pausing the station' });
			} else if (station) {
				if (!station.paused) {
					station.paused = true;
					station.pausedAt = Date.now();
					cache.hset('stations', stationId, station, (err) => {
						if (!err) {
							db.models.station.update({_id: stationId}, {$set: {paused: true}}, () => {
								cache.pub('station.pause', stationId);
								notifications.unschedule(stationId);
								cb({ status: 'success' });
							});
						} else {
							cb({ status: 'failure', message: 'An error occurred while pausing the station.' });
						}
					});
				} else {
					cb({ status: 'failure', message: 'That station was already paused.' });
				}
				cb({ status: 'success' });
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	resume: (sessionId, stationId, cb) => {
		//TODO Require admin
		stations.initializeAndReturnStation(stationId, (err, station) => {
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while resuming the station' });
			} else if (station) {
				if (station.paused) {
					station.paused = false;
					station.timePaused += (Date.now() - station.pausedAt);
					cache.hset('stations', stationId, station, (err) => {
						if (!err) {
							db.models.station.update({_id: stationId}, {$set: {paused: false, timePaused: station.timePaused}}, () => {
								cache.pub('station.resume', stationId);
								cb({ status: 'success' });
							});
						} else {
							cb({ status: 'failure', message: 'An error occurred while resuming the station.' });
						}
					});
				} else {
					cb({ status: 'failure', message: 'That station is not paused.' });
				}
				cb({ status: 'success' });
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	remove: (sessionId, _id, cb) => {
		db.models.station.find({ _id }).remove().exec();
		cache.hdel('stations', _id, () => {
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
			(next) => cache.hget('stations', data._id, next),

			// if the cached version exist
			(station, next) => {
				if (station) return next({ 'status': 'failure', 'message': 'A station with that id already exists' });
				db.models.station.findOne({ _id: data._id }, next);
			},

			(station, next) => {
				if (station) return next({ 'status': 'failure', 'message': 'A station with that id already exists' });
				const { _id, displayName, description, genres, playlist } = data;
				db.models.station.create({
					_id,
					displayName,
					description,
					type: "official",
					playlist,
					genres,
					currentSong: stations.defaultSong
				}, next);
			}

		], (err, station) => {
			if (err) throw err;
			stations.calculateSongForStation(station, () => {
				cache.pub('station.create', data._id);
				return cb(null, { 'status': 'success', 'message': 'Successfully created station.' });
			});
		});
	},

};
