'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const songs = require('./songs');
const notifications = require('./notifications');
const async = require('async');
let skipTimeout = null;

//TEMP
cache.sub('station.pause', (stationId) => {
	notifications.remove(`stations.nextSong?id=${stationId}`);
});

cache.sub('station.resume', (stationId) => {
	module.exports.initializeAndReturnStation(stationId, (err, station) => {})
});

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
		console.log("INITIALIZE", stationId);
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
			let notification = notifications.subscribe(`stations.nextSong?id=${station._id}`, () => {
				console.log("NOTIFICATION!!!");
			//function skipSongTemp() {
				// get the station from the cache
				//TODO Recalculate songs if the last song of the station playlist is getting played
				cache.hget('stations', station._id, (err, station) => {
					if (station) {
						// notify all the sockets on this station to go to the next song
						async.waterfall([

							(next) => {
								if (station.playlist.length > 0) {
									function func() {
										if (station.currentSongIndex < station.playlist.length - 1) {
											station.currentSongIndex++;
											songs.getSong(station.playlist[station.currentSongIndex], (err, song) => {
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
													station.timePaused = 0;
													next(null, station);
												} else {
													station.currentSongIndex++;
													func();
												}
											});
										} else {
											station.currentSongIndex = 0;
											_this.calculateSongForStation(station, (err, newPlaylist) => {
												console.log('New playlist: ', newPlaylist);
												if (!err) {
													songs.getSong(newPlaylist[0], (err, song) => {
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
															station.playlist = newPlaylist;
														} else {
															station.currentSong = _this.defaultSong;
														}
														station.startedAt = Date.now();
														station.timePaused = 0;
														next(null, station);
													});
												} else {
													station.currentSong = _this.defaultSong;
													station.startedAt = Date.now();
													station.timePaused = 0;
													next(null, station);
												}
											})
										}
									}

									func();
								} else {
									_this.calculateSongForStation(station, (err, playlist) => {
										if (!err && playlist.length === 0) {
											station.currentSongIndex = 0;
											station.currentSong = _this.defaultSong;
											station.startedAt = Date.now();
											station.timePaused = 0;
											next(null, station);
										} else {
											songs.getSong(playlist[0], (err, song) => {
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
												} else {
													station.currentSong = _this.defaultSong;
												}
												station.currentSongIndex = 0;
												station.startedAt = Date.now();
												station.timePaused = 0;
												station.playlist = playlist;
												next(null, station);
											});
										}
									});
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
							utils.socketsJoinSongRoom(io.io.to(`station.${stationId}`).sockets, `song.${station.currentSong._id}`);
							// schedule a notification to be dispatched when the next song ends
							console.log("NEXT SONG!!!");
							if (!station.paused) {
								notifications.schedule(`stations.nextSong?id=${station._id}`, station.currentSong.duration * 1000);
							}
							//skipTimeout = setTimeout(skipSongTemp, station.currentSong.duration * 1000);
						});
					}
					// the station doesn't exist anymore or is paused, unsubscribe from it
					else {
						notifications.remove(notification);
					}
				});
			}, true);

			console.log(station.paused);
			if (!station.paused) {
				if (!station.startedAt) {
					station.startedAt = Date.now();
					station.timePaused = 0;
					cache.hset('stations', stationId, station);
				}
				let timeLeft = ((station.currentSong.duration * 1000) - (Date.now() - station.startedAt - station.timePaused));
				console.log(timeLeft);
				if (station.currentSong.duration * 1000 < timeLeft || timeLeft < 0) {
					console.log("Test");
					notifications.schedule(`stations.nextSong?id=${station._id}`, 1);
				} else {
					notifications.schedule(`stations.nextSong?id=${station._id}`, timeLeft);
				}
			} else {
				notifications.unschedule(`stations.nextSong?id${station._id}`);
			}

			return cb(null, station);
		});
	},

	defaultSong: {
		_id: '60ItHLz5WEA',
		title: 'Faded',
		artists: ['Alan Walker'],
		duration: 212,
		skipDuration: 0,
		thumbnail: 'https://i.scdn.co/image/2ddde58427f632037093857ebb71a67ddbdec34b'
	}

};