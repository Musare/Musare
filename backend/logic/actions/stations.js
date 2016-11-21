'use strict';

const async   = require('async'),
	  request = require('request'),
	  config  = require('config');

const io = require('../io');
const db = require('../db');
const cache = require('../cache');
const notifications = require('../notifications');
const utils = require('../utils');

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
			db.models.station.find({ id: stationId }, next);
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
		let notification = notifications.subscribe(`stations.nextSong?id=${station.id}`, () => {
			// get the station from the cache
			cache.hget('stations', station.id, (err, station) => {
				if (station) {
					// notify all the sockets on this station to go to the next song
					async.waterfall(io.sockets.clients().map((socket) => (next) => {
						// fetch the sockets session
						cache.hget('sessions', socket.sessionId, (err, session) => {
							if (session.stationId == station.id) {
								socket.emit('notification:stations.nextSong');
							}
							next();
						});
					}), (err) => {
						// schedule a notification to be dispatched when the next song ends
						notifications.schedule(`stations.nextSong?id=${station.id}`, 5000);
					});
				}
				// the station doesn't exist anymore, unsubscribe from it
				else {
					notifications.remove(notification);
				}
			});
		}, true);

		cb(null, station);
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
				console.log(prop);
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
		initializeAndReturnStation(stationId, (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while joining the station' });
			}

			if (station) {

				if (session) session.stationId = stationId;

				cache.client.hincrby('station.userCounts', stationId, 1, (err, userCount) => {
					if (err) return cb({ status: 'error', message: 'An error occurred while joining the station' });
					cb({ status: 'success', userCount });
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
					cb({ status: 'success', userCount });
				});
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	},

	addSong: (session, station, song, cb) => {

		// if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });

		const params = [
			'part=snippet,contentDetails,statistics,status',
			`id=${encodeURIComponent(song.id)}`,
			`key=${config.get('apis.youtube.key')}`
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/videos?${params}`, (err, res, body) => {

			if (err) {
				console.error(err);
				return cb({ status: 'error', message: 'Failed to find song from youtube' });
			}

			body = JSON.parse(body);

			const newSong = new db.models.song({
				id: body.items[0].id,
				title: body.items[0].snippet.title,
				duration: utils.convertTime(body.items[0].contentDetails.duration),
				thumbnail: body.items[0].snippet.thumbnails.high.url
			});

			// save the song to the database
			newSong.save(err => {

				if (err) {
					console.error(err);
					return cb({ status: 'error', message: 'Failed to save song from youtube to the database' });
				}

				// stations.getStation(station).playlist.push(newSong);

				// cb({ status: 'success', data: stations.getStation(station.playlist) });
			});
		});
	}

};
