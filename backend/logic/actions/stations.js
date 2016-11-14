'use strict';

const async = require('async');
const request = require('request');

const db = require('../db');
const cache = require('../cache');
const utils = require('../utils');

module.exports = {

	index: (session, cb) => {
		cb(cache.getAllRows('stations'));
	},

	join: (session, stationId, cb) => {

		async.waterfall([

			// first check the cache for the station
			(next) => next(null, cache.findRow('stations', 'id', stationId)),

			// if the cached version exist use it, otherwise check the DB for it
			(station, next) => {
				if (station) return next(true, station);
				db.models.station.find({ id: stationId }, next);
			},

			// add the station from the DB to the cache, adding the temporary data
			(station, next) => {
				cache.addRow('stations', Object.assign(station, {
					skips: 0,
					userCount: 0,
					currentSongIndex: 0,
					paused: false
				}));
				next(null, station);
			}

		], (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while joining the station' });
			}

			if (station) {
				if (session) session.stationId = stationId;
				station.userCount++;
				cb({ status: 'success', userCount: station.userCount });
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
			}
		});
	},

	skip: (session, cb) => {

		if (!session) return cb({ status: 'failure', message: 'You must be logged in to skip a song!' });

		async.waterfall([

			// first check the cache for the station
			(next) => next(null, cache.findRow('stations', 'id', session.stationId)),

			// if the cached version exist use it, otherwise check the DB for it
			(station, next) => {
				if (station) return next(true, station);
				db.models.station.find({ id: session.stationId }, next);
			},

			// add the station from the DB to the cache, adding the temporary data
			(station, next) => {
				cache.addRow('stations', Object.assign(station, {
					skips: 0,
					userCount: 0,
					currentSongIndex: 0,
					paused: false
				}));
				next(null, station);
			}

		], (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while skipping the station' });
			}

			if (station) {
				station.skips++;
				if (station.skips > Math.floor(station.userCount / 2)) {
					// TODO: skip to the next song if the skips is higher then half the total users
				}
				cb({ status: 'success', skips: station.skips });
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
			}
		});
	},

	// leaves the users current station
	// returns the count of users that are still in that station
	leave: (session, cb) => {

		// if they're not logged in, we don't need to do anything below
		if (!session) return cb({ status: 'success' });

		async.waterfall([

			// first check the cache for the station
			(next) => next(null, cache.findRow('stations', 'id', session.stationId)),

			// if the cached version exist use it, otherwise check the DB for it
			(station, next) => {
				if (station) return next(true, station);
				db.models.station.find({ id: session.stationId }, next);
			},

			// add the station from the DB to the cache, adding the temporary data
			(station, next) => {
				cache.addRow('stations', Object.assign(station, {
					skips: 0,
					userCount: 0,
					currentSongIndex: 0,
					paused: false
				}));
				next(null, station);
			}

		], (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while leaving the station' });
			}

			session.stationId = null;

			if (station) {
				station.userCount--;
				cb({ status: 'success', userCount: station.userCount });
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
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

			const newSong = new db.models.song({
				id: json.items[0].id,
				title: json.items[0].snippet.title,
				duration: utils.convertTime(json.items[0].contentDetails.duration),
				thumbnail: json.items[0].snippet.thumbnails.high.url
			});

			// save the song to the database
			newSong.save(err => {

				if (err) {
					console.error(err);
					return cb({ status: 'error', message: 'Failed to save song from youtube to the database' });
				}

				stations.getStation(station).playlist.push(newSong);

				cb({ status: 'success', data: stations.getStation(station.playlist) });
			});
		});
	}

};
