'use strict';

// This file contains all the logic for Socket.IO

const cache = require('./cache');
const db = require('./db');
const utils = require('./utils');
const notifications = require('./notifications');
const async = require('async');

module.exports = {

	init: function(cb) {
		let _this = this;
		console.log("Init stations");
		db.models.station.find({}, (err, stations) => {
			if (!err) {
				stations.forEach((station) => {
					console.log("Initing " + station._id);
					_this.initializeAndReturnStation(station._id, (err, station) => {
						console.log(err, station, 123456789);
						//TODO Emit to homepage and admin station list
					});
				});
				cb();
			}
		});
	},

	initializeAndReturnStation: (stationId, cb) => {
		async.waterfall([

			// first check the cache for the station
			(next) => cache.hget('stations', stationId, next),

			// if the cached version exist
			(station, next) => {
				if (station) return next(true, station);
				db.models.station.findOne({ _id: stationId }, next);
			},

			// if the station exists in the DB, add it to the cache
			(station, next) => {
				if (!station) return cb('Station by that id does not exist');
				station = cache.schemas.station(station);
				cache.hset('stations', station._id, station, (err) => next(err, station));
			}

		], (err, station) => {
			if (err && err !== true) return cb(err);

			// get notified when the next song for this station should play, so that we can notify our sockets
			let notification = notifications.subscribe(`stations.nextSong?id=${station._id}`, () => {
				// get the station from the cache
				console.log('NOTIFICATION');
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
					}
				});
			}, true);

			if (!station.paused) {
				console.log(station);
				notifications.schedule(`stations.nextSong?id=${station.id}`, station.currentSong.duration * 1000);
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

};