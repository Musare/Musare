'use strict';

// This file contains all the logic for Socket.IO

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const notifications = require('./notifications');
const async = require('async');
let skipTimeout = null;

module.exports = {

	init: function(cb) {
		let _this = this;
		db.models.station.find({}, (err, stations) => {
			if (!err) {
				stations.forEach((station) => {
					console.info("Initializing Station: " + station._id);
					_this.initializeAndReturnStation(station._id, (err, station) => {
						//TODO Emit to homepage and admin station list
					});
				});
				cb();
			}
		});
	},

	calculateSongForStation: (station, cb) => {
		let songList = [];
		async.waterfall([

			(next) => {
				let genresDone = [];
				station.genres.forEach((genre) => {
					db.models.song.find({genres: genre}, (err, songs) => {
						if (!err) {
							songs.forEach((song) => {
								if (songList.indexOf(song._id) === -1) songList.push(song._id);
							});
						}
						genresDone.push(genre);
						if (genresDone.length === station.genres.length) {
							next();
						}
					});
				});
			},

			(next) => {
				let playlist = [];
				songList.forEach(function(songId) {
					if(station.playlist.indexOf(songId) === -1) playlist.push(songId);
				});
				station.playlist.filter((songId) => {
					if (songList.indexOf(songId) !== -1) playlist.push(songId);
				});
				db.models.station.update({_id: station._id}, {$set: {playlist: playlist}}, (err, result) => {
					next(err, playlist);
				});
			}

		], (err, newPlaylist) => {
			cb(err, newPlaylist);
		});
	},

	initializeAndReturnStation: function(stationId, cb) {
		let _this = this;
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
			/*let notification = notifications.subscribe(`stations.nextSong?id=${station._id}`, () => {*/
			function skipSongTemp() {
				// get the station from the cache
				//TODO Recalculate songs if the last song of the station playlist is getting played
				cache.hget('stations', station._id, (err, station) => {
					if (station) {
						// notify all the sockets on this station to go to the next song
						async.waterfall([

							(next) => {
								if (station.currentSongIndex < station.playlist.length - 1) {
									station.currentSongIndex++;
									db.models.song.findOne({ _id: station.playlist[station.currentSongIndex] }, (err, song) => {
										if (!err) {
											station.currentSong = {
												_id: song._id,
												title: song.title,
												artists: song.artists,
												duration: song.duration,
												likes: song.likes,
												dislikes: song.dislikes,
												skipDuration: song.skipDuration,
												thumbnail: song.thumbnail
											};
											station.startedAt = Date.now();
											next(null, station);
										}
									});
								} else {
									station.currentSongIndex = 0;
									_this.calculateSongForStation(station, (err, newPlaylist) => {
										console.log('New playlist: ', newPlaylist)
										if (!err) {
											db.models.song.findOne({ _id: newPlaylist[0] }, (err, song) => {
												if (song) {
													station.currentSong = {
														_id: song._id,
														title: song.title,
														artists: song.artists,
														duration: song.duration,
														likes: song.likes,
														dislikes: song.dislikes,
														skipDuration: song.skipDuration,
														thumbnail: song.thumbnail
													};
													station.startedAt = Date.now();
													station.playlist = newPlaylist;
													next(null, station);
												}
											});
										}
									})
								}
							},

							(station, next) => {
								cache.hset('stations', station._id, station, (err) => next(err, station));
								//TODO Also save to DB
							},


						], (err, station) => {
							io.io.to(`station.${stationId}`).emit("event:songs.next", {
								currentSong: station.currentSong,
								startedAt: station.startedAt,
								paused: station.paused,
								timePaused: 0
							});
							// schedule a notification to be dispatched when the next song ends
							notifications.schedule(`stations.nextSong?id=${station.id}`, station.currentSong.duration * 1000);
							skipTimeout = setTimeout(skipSongTemp, station.currentSong.duration * 1000);
						});
					}
					// the station doesn't exist anymore, unsubscribe from it
					else {
						notifications.remove(notification);
					}
				});
			}//, true);

			if (!station.paused) {
				if (!station.startedAt) {
					station.startedAt = Date.now();
					cache.hset('stations', stationId, station);
				}
				//setTimeout(skipSongTemp, station.currentSong.duration * 1000);
				if (skipTimeout === null) {
					skipTimeout = setTimeout(skipSongTemp, 1000);
				}
				notifications.schedule(`stations.nextSong?id=${station.id}`, station.currentSong.duration * 1000);
			}

			return cb(null, station);
		});
	}

};