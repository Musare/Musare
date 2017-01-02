'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const logger = require('./logger');
const songs = require('./songs');
const notifications = require('./notifications');
const async = require('async');

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

cache.sub('station.newOfficialPlaylist', (stationId) => {
	cache.hget("officialPlaylists", stationId, (err, playlistObj) => {
		if (!err && playlistObj) {
			utils.emitToRoom(`station.${stationId}`, "event:newOfficialPlaylist", playlistObj.songs);
		}
	})
});

module.exports = {

	init: function(cb) {
		async.waterfall([
			(next) => {
				cache.hgetall('stations', next);
			},

			(stations, next) => {
				if (!stations) return next();
				let stationIds = Object.keys(stations);
				async.each(stationIds, (stationId, next) => {
					db.models.station.findOne({_id: stationId}, (err, station) => {
						if (err) next(err);
						else if (!station) {
							cache.hdel('stations', stationId, next);
						} else next();
					});
				}, next);
			},

			(next) => {
				db.models.station.find({}, next);
			},

			(stations, next) => {
				async.each(stations, (station, next) => {
					async.waterfall([
						(next) => {
							cache.hset('stations', station._id, cache.schemas.station(station), next);
						},

						(station, next) => {
							this.initializeStation(station._id, next);
						}
					], (err) => {
						next(err);
					});
				}, next);
			}
		], (err) => {
			if (err) {
				console.log(`FAILED TO INITIALIZE STATIONS. ABORTING. "${err.message}"`);
				process.exit();
			} else cb();
		});
	},

	initializeStation: function(stationId, cb) {
		if (typeof cb !== 'function') cb = ()=>{};
		let _this = this;
		_this.getStation(stationId, (err, station) => {
			if (!err) {
				if (station) {
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
								this.skipStation(station._id)((err, station) => {
									cb(err, station);
								});
							} else {
								notifications.schedule(`stations.nextSong?id=${station._id}`, timeLeft);
								cb(null, station);
							}
						} else {
							_this.skipStation(station._id)((err, station) => {
								cb(err, station);
							});
						}
					} else {
						notifications.unschedule(`stations.nextSong?id${station._id}`);
						cb(null, station);
					}
				} else cb("Station not found");
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
									});
									if (!found) {
										songList.push(song._id);
									}
								}
							});
						}
						genresDone.push(genre);
						if (genresDone.length === station.genres.length) next();
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

				playlist = utils.shuffle(playlist);

				_this.calculateOfficialPlaylistList(station._id, playlist, () => {
					next(null, playlist);
				});
			},

			(playlist, next) => {
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
		let _this = this;
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
					if (station.type === 'official') {
						_this.calculateOfficialPlaylistList(station._id, station.playlist, ()=>{});
					}
					station = cache.schemas.station(station);
					cache.hset('stations', stationId, station);
					next(true, station);
				} else next('Station not found');
			},

		], (err, station) => {
			if (err && err !== true) cb(err);
			cb(null, station);
		});
	},

	updateStation: function(stationId, cb) {
		let _this = this;
		async.waterfall([

			(next) => {
				db.models.station.findOne({ _id: stationId }, next);
			},

			(station, next) => {
				if (!station) {
					cache.hdel('stations', stationId);
					return next('Station not found');
				}
				cache.hset('stations', stationId, station, next);
			}

		], (err, station) => {
			if (err && err !== true) return cb(err);
			cb(null, station);
		});
	},

	calculateOfficialPlaylistList: (stationId, songList, cb) => {
		let lessInfoPlaylist = [];

		function getSongInfo(index) {
			if (songList.length > index) {
				songs.getSong(songList[index], (err, song) => {
					if (!err && song) {
						let newSong = {
							_id: song._id,
							title: song.title,
							artists: song.artists,
							duration: song.duration
						};
						lessInfoPlaylist.push(newSong);
					}
					getSongInfo(index + 1);
				})
			} else {
				cache.hset("officialPlaylists", stationId, cache.schemas.officialPlaylist(stationId, lessInfoPlaylist), () => {
					cache.pub("station.newOfficialPlaylist", stationId);
					cb();
				});
			}
		}
		getSongInfo(0);
	},

	skipStation: function(stationId) {
		console.log("SKIP!", stationId);
		let _this = this;
		return (cb) => {
			if (typeof cb !== 'function') cb = ()=>{};
			_this.getStation(stationId, (err, station) => {
				if (station) {
					// notify all the sockets on this station to go to the next song
					async.waterfall([

						(next) => {
							if (station.type === "official") {
								if (station.playlist.length > 0) {
									function setCurrentSong() {
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
													db.models.station.update({ _id: station._id }, { $inc: { currentSongIndex: 1 } }, (err) => {
														_this.updateStation(station._id, () => {
															setCurrentSong();
														});
													});
												}
											});
										} else {
											db.models.station.update({_id: station._id}, {$set: {currentSongIndex: 0}}, (err) => {
												_this.updateStation(station._id, (err, station) => {
													_this.calculateSongForStation(station, (err, newPlaylist) => {
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
																} else $set.currentSong = _this.defaultSong;
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

									setCurrentSong();
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
								if (station.partyMode === true) if (station.queue.length > 0) {
										db.models.station.update({ _id: stationId }, { $pull: { queue: { _id: station.queue[0]._id } } }, (err) => {
											if (err) return next(err);
											let $set = {};
											$set.currentSong = station.queue[0];
											$set.startedAt = Date.now();
											$set.timePaused = 0;
											if (station.paused) $set.pausedAt = Date.now();
											next(null, $set);
										});
									} else next(null, {currentSong: null});
								else {
									db.models.playlist.findOne({_id: station.privatePlaylist}, (err, playlist) => {
										if (err || !playlist) return next(null, {currentSong: null});
										playlist = playlist.songs;
										if (playlist.length > 0) {
											let $set = {};
											if (station.currentSongIndex < playlist.length - 1) $set.currentSongIndex = station.currentSongIndex + 1;
											else $set.currentSongIndex = 0;
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
										} else next(null, {currentSong: null});
									});
								}
							}
						},

						($set, next) => {
							db.models.station.update({_id: station._id}, {$set}, (err) => {
								_this.updateStation(station._id, (err, station) => {
									if (station.type === 'community' && station.partyMode === true)
										cache.pub('station.queueUpdate', stationId);
									next(null, station);
								});
							});
						},


					], (err, station) => {
						if (!err) {
							if (station.currentSong !== null && station.currentSong._id !== undefined) {
								station.currentSong.skipVotes = 0;
							}
							//TODO Pub/Sub this
							utils.emitToRoom(`station.${station._id}`, "event:songs.next", {
								currentSong: station.currentSong,
								startedAt: station.startedAt,
								paused: station.paused,
								timePaused: 0
							});

							if (station.privacy === 'public') utils.emitToRoom('home', "event:station.nextSong", station._id, station.currentSong);
							else {
								let sockets = utils.getRoomSockets('home');
								for (let socketId in sockets) {
									let socket = sockets[socketId];
									let session = sockets[socketId].session;
									if (session.sessionId) {
										cache.hget('sessions', session.sessionId, (err, session) => {
											if (!err && session) {
												db.models.user.findOne({_id: session.userId}, (err, user) => {
													if (!err && user) {
														if (user.role === 'admin') socket.emit("event:station.nextSong", station._id, station.currentSong);
														else if (station.type === "community" && station.owner === session.userId) socket.emit("event:station.nextSong", station._id, station.currentSong);
													}
												});
											}
										});
									}
								}
							}
							console.log(
								Date.now(),
								(station) ? station._id : "STATION_NULL",
								station.currentSong !== null && station.currentSong._id !== undefined,
								station.currentSong !== null,
								(station.currentSong) ? station.currentSong._id !== undefined : "CURRENTSONG_NULL"
							);
							if (station.currentSong !== null && station.currentSong._id !== undefined) {
								utils.socketsJoinSongRoom(utils.getRoomSockets(`station.${station._id}`), `song.${station.currentSong._id}`);
								if (!station.paused) {
									notifications.schedule(`stations.nextSong?id=${station._id}`, station.currentSong.duration * 1000);
								}
							} else {
								utils.socketsLeaveSongRooms(utils.getRoomSockets(`station.${station._id}`));
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
		title: 'Faded - Alan Walker',
		duration: 212,
		likes: -1,
		dislikes: -1
	}

};