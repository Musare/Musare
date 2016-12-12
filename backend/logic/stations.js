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
	module.exports.initializeStation(stationId)
});

cache.sub('station.queueUpdate', (stationId) => {
	module.exports.getStation(stationId, (err, station) => {
		if (!station.currentSong && station.queue.length > 0) {
			module.exports.initializeStation(stationId);
		}
	});
});

module.exports = {

	init: function(cb) {
		let _this = this;
		//TODO Add async waterfall
		db.models.station.find({}, (err, stations) => {
			if (!err) {
				stations.forEach((station) => {
					console.info("Initializing Station: " + station._id);
					_this.initializeStation(station._id);
				});
				cb();
			}
		});
	},

	initializeStation: function(stationId, cb) {
		console.log(112233, stationId, cb);
		if (typeof cb !== 'function') cb = ()=>{};
		let _this = this;
		_this.getStation(stationId, (err, station) => {
			if (!err) {
				console.log("###");
				if (station) {
					console.log("###1");
					let notification = notifications.subscribe(`stations.nextSong?id=${station._id}`, _this.skipStation(station._id), true);
					if (!station.paused ) {
						/*if (!station.startedAt) {
							station.startedAt = Date.now();
							station.timePaused = 0;
							cache.hset('stations', stationId, station);
						}*/
						if (station.currentSong) {
							let timeLeft = ((station.currentSong.duration * 1000) - (Date.now() - station.startedAt - station.timePaused));
							if (isNaN(timeLeft)) timeLeft = -1;
							if (station.currentSong.duration * 1000 < timeLeft || timeLeft < 0) {
								console.log("Test");
								this.skipStation(station._id)((err, station) => {
									console.log(45, err, station);
									cb(err, station);
								});
							} else {
								notifications.schedule(`stations.nextSong?id=${station._id}`, timeLeft);
								cb(null, station);
							}
						} else {
							_this.skipStation(station._id)((err, station) => {
								console.log(47, err, station);
								cb(err, station);
							});
						}
					} else {
						notifications.unschedule(`stations.nextSong?id${station._id}`);
						cb(null, station);
					}
				} else cb("Station not found.");
			} else cb(err);
		});
	},

	calculateSongForStation: function(station, cb) {
		let _this = this;
		let songList = [];
		async.waterfall([

			(next) => {
				let genresDone = [];
				station.genres.forEach((genre) => {
					db.models.song.find({genres: genre}, (err, songs) => {
						if (!err) {
							songs.forEach((song) => {
								if (songList.indexOf(song._id) === -1) {
									let found = false;
									song.genres.forEach((songGenre) => {
										if (station.blacklistedGenres.indexOf(songGenre) !== -1) found = true;
										console.log(songGenre, station.blacklistedGenres, station.blacklistedGenres.indexOf(songGenre), found);
									});
									if (!found) {
										songList.push(song._id);
									}
								}
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
				db.models.station.update({_id: station._id}, {$set: {playlist: playlist}}, (err) => {
					_this.updateStation(station._id, () => {
						next(err, playlist);
					});
				});
			}

		], (err, newPlaylist) => {
			cb(err, newPlaylist);
		});
	},

	// Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
	getStation: function(stationId, cb) {
		async.waterfall([

			(next) => {
				cache.hget('stations', stationId, next);
			},

			(station, next) => {
				if (station) return next(true, station);

				db.models.station.findOne({ _id: stationId }, next);
			},

			(station, next) => {
				if (station) {
					station = cache.schemas.station(station);
					console.log(1234321, stationId);
					cache.hset('stations', stationId, station);
					next(true, station);
				} else next('Station not found.');
			},

		], (err, station) => {
			if (err && err !== true) cb(err);

			cb(null, station);
		});
	},

	updateStation: (stationId, cb) => {
		async.waterfall([

			(next) => {
				db.models.station.findOne({ _id: stationId }, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				console.log(123444321, stationId);
				cache.hset('stations', stationId, station, (err) => {
					if (err) return next(err);
					next(null, station);
				});
			}

		], (err, station) => {
			if (err && err !== true) cb(err);

			cb(null, station);
		});
	},

	skipStation: function(stationId) {
		let _this = this;
		return (cb) => {
			if (typeof cb !== 'function') cb = ()=>{};
			console.log("###2");
			console.log("NOTIFICATION!!!");
			_this.getStation(stationId, (err, station) => {
				console.log("###3");
				if (station) {
					console.log("###4");
					// notify all the sockets on this station to go to the next song
					async.waterfall([

						(next) => {
							console.log("###5");
							if (station.type === "official") {
								if (station.playlist.length > 0) {
									function func() {
										if (station.currentSongIndex < station.playlist.length - 1) {
											songs.getSong(station.playlist[station.currentSongIndex + 1], (err, song) => {
												if (!err) {
													let $set = {};

													$set.currentSong = {
														_id: song._id,
														title: song.title,
														artists: song.artists,
														duration: song.duration,
														likes: song.likes,
														dislikes: song.dislikes,
														skipDuration: song.skipDuration,
														thumbnail: song.thumbnail
													};
													$set.startedAt = Date.now();
													$set.timePaused = 0;
													$set.currentSongIndex = station.currentSongIndex + 1;
													next(null, $set);
												} else {
													db.models.station.update({_id: station._id}, {$inc: {currentSongIndex: 1}}, (err) => {
														_this.updateStation(station._id, () => {
															func();
														});
													});
												}
											});
										} else {
											db.models.station.update({_id: station._id}, {$set: {currentSongIndex: 0}}, (err) => {
												_this.updateStation(station._id, (err, station) => {
													console.log(12345678, err, station);
													_this.calculateSongForStation(station, (err, newPlaylist) => {
														console.log('New playlist: ', newPlaylist);
														if (!err) {
															songs.getSong(newPlaylist[0], (err, song) => {
																let $set = {};
																if (song) {
																	$set.currentSong = {
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
																	$set.currentSong = _this.defaultSong;
																}
																$set.startedAt = Date.now();
																$set.timePaused = 0;
																next(null, $set);
															});
														} else {
															let $set = {};
															$set.currentSong = _this.defaultSong;
															$set.startedAt = Date.now();
															$set.timePaused = 0;
															next(null, $set);
														}
													})
												});
											});
										}
									}

									func();
								} else {
									_this.calculateSongForStation(station, (err, playlist) => {
										if (!err && playlist.length === 0) {
											let $set = {};
											$set.currentSongIndex = 0;
											$set.currentSong = _this.defaultSong;
											$set.startedAt = Date.now();
											$set.timePaused = 0;
											next(null, $set);
										} else {
											songs.getSong(playlist[0], (err, song) => {
												let $set = {};
												if (!err) {
													$set.currentSong = {
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
													$set.currentSong = _this.defaultSong;
												}
												$set.currentSongIndex = 0;
												$set.startedAt = Date.now();
												$set.timePaused = 0;
												next(null, $set);
											});
										}
									});
								}
							} else {
								if (station.partyMode === true) {
									if (station.queue.length > 0) {
										console.log("##");
										db.models.station.update({_id: stationId}, {$pull: {queue: {songId: station.queue[0]._id}}}, (err) => {
											console.log("##1", err);
											if (err) return next(err);
											let $set = {};
											$set.currentSong = station.queue[0];
											$set.startedAt = Date.now();
											$set.timePaused = 0;
											if (station.paused) {
												$set.pausedAt = Date.now();
											}
											next(null, $set);
										});
									} else {
										console.log("##2");
										next(null, {currentSong: null});
									}
								} else {
									db.models.playlist.findOne({_id: station.privatePlaylist}, (err, playlist) => {
										console.log(station.privatePlaylist, err, playlist);
										if (err || !playlist) return next(null, {currentSong: null});
										playlist = playlist.songs;
										if (playlist.length > 0) {
											let $set = {};
											if (station.currentSongIndex < playlist.length - 1) {
												$set.currentSongIndex = station.currentSongIndex + 1;
											} else {
												$set.currentSongIndex = 0;
											}
											songs.getSong(playlist[$set.currentSongIndex]._id, (err, song) => {
												if (!err && song) {
													$set.currentSong = {
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
													let song = playlist[$set.currentSongIndex];
													$set.currentSong = {
														_id: song._id,
														title: song.title,
														duration: song.duration,
														likes: -1,
														dislikes: -1
													};
												}
												$set.startedAt = Date.now();
												$set.timePaused = 0;
												next(null, $set);
											});
										} else {
											next(null, {currentSong: null});
										}
									});
								}
							}
						},

						($set, next) => {
							console.log("$set", $set);
							db.models.station.update({_id: station._id}, {$set}, (err) => {
								console.log("##2.5", err);
								_this.updateStation(station._id, (err, station) => {
									console.log("##2.6", err);
									if (station.type === 'community' && station.partyMode === true) {
										cache.pub('station.queueUpdate', stationId);
									}
									next(null, station);
								});
							});
						},


					], (err, station) => {
						console.log("##3", err);
						if (!err) {
							if (station.currentSong !== null && station.currentSong._id !== undefined) {
								station.currentSong.skipVotes = 0;
							}
							utils.emitToRoom(`station.${station._id}`, "event:songs.next", {
								currentSong: station.currentSong,
								startedAt: station.startedAt,
								paused: station.paused,
								timePaused: 0
							});
							if (station.currentSong !== null && station.currentSong._id !== undefined) {
								utils.socketsJoinSongRoom(utils.getRoomSockets(`station.${station._id}`), `song.${station.currentSong._id}`);
								console.log("NEXT SONG!!!", station.currentSong);
								if (!station.paused) {
									notifications.schedule(`stations.nextSong?id=${station._id}`, station.currentSong.duration * 1000);
								}
							} else {
								console.log("22", !!(station.currentSong));
								utils.socketsLeaveSongRooms(utils.getRoomSockets(`station.${station._id}`), `song.${station.currentSong._id}`);
							}
							cb(null, station);
						} else cb(err);
					});
				}
				// the station doesn't exist anymore, unsubscribe from it
				else {
					cb("Station not found.");
				}
			});
		}
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