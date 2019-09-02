'use strict';

const coreClass = require("../core");

const async = require('async');

let subscription = null;

module.exports = class extends coreClass {
	constructor(name, moduleManager) {
		super(name, moduleManager);

		this.dependsOn = ["cache", "db", "utils"];
	}

	initialize() {
		return new Promise(async (resolve, reject) => {
			this.setStage(1);

			this.cache = this.moduleManager.modules["cache"];
			this.db = this.moduleManager.modules["db"];
			this.utils = this.moduleManager.modules["utils"];
			this.songs = this.moduleManager.modules["songs"];
			this.notifications = this.moduleManager.modules["notifications"];

			this.defaultSong = {
				songId: '60ItHLz5WEA',
				title: 'Faded - Alan Walker',
				duration: 212,
				skipDuration: 0,
				likes: -1,
				dislikes: -1
			};

			//TEMP
			this.cache.sub('station.pause', async (stationId) => {
				try { await this._validateHook(); } catch { return; }

				this.notifications.remove(`stations.nextSong?id=${stationId}`);
			});

			this.cache.sub('station.resume', async (stationId) => {
				try { await this._validateHook(); } catch { return; }

				this.initializeStation(stationId)
			});

			this.cache.sub('station.queueUpdate', async (stationId) => {
				try { await this._validateHook(); } catch { return; }

				this.getStation(stationId, (err, station) => {
					if (!station.currentSong && station.queue.length > 0) {
						this.initializeStation(stationId);
					}
				});
			});

			this.cache.sub('station.newOfficialPlaylist', async (stationId) => {
				try { await this._validateHook(); } catch { return; }

				this.cache.hget("officialPlaylists", stationId, (err, playlistObj) => {
					if (!err && playlistObj) {
						this.utils.emitToRoom(`station.${stationId}`, "event:newOfficialPlaylist", playlistObj.songs);
					}
				})
			});


			async.waterfall([
				(next) => {
					this.setStage(2);
					this.cache.hgetall('stations', next);
				},
	
				(stations, next) => {
					this.setStage(3);
					if (!stations) return next();
					let stationIds = Object.keys(stations);
					async.each(stationIds, (stationId, next) => {
						this.db.models.station.findOne({_id: stationId}, (err, station) => {
							if (err) next(err);
							else if (!station) {
								this.cache.hdel('stations', stationId, next);
							} else next();
						});
					}, next);
				},
	
				(next) => {
					this.setStage(4);
					this.db.models.station.find({}, next);
				},
	
				(stations, next) => {
					this.setStage(4);
					async.each(stations, (station, next) => {
						async.waterfall([
							(next) => {
								this.cache.hset('stations', station._id, this.cache.schemas.station(station), next);
							},
	
							(station, next) => {
								this.initializeStation(station._id, next);
							}
						], (err) => {
							next(err);
						});
					}, next);
				}
			], async (err) => {
				if (err) {
					err = await this.utils.getError(err);
					reject(err);
				} else {
					resolve();
				}
			});
		});
	}

	async initializeStation(stationId, cb) {
		try { await this._validateHook(); } catch { return; }

		if (typeof cb !== 'function') cb = ()=>{};

		async.waterfall([
			(next) => {
				this.getStation(stationId, next);
			},
			(station, next) => {
				if (!station) return next('Station not found.');
				this.notifications.unschedule(`stations.nextSong?id=${station._id}`);
				subscription = this.notifications.subscribe(`stations.nextSong?id=${station._id}`, this.skipStation(station._id), true, station);
				if (station.paused) return next(true, station);
				next(null, station);
			},
			(station, next) => {
				if (!station.currentSong) {
					return this.skipStation(station._id)((err, station) => {
						if (err) return next(err);
						return next(true, station);
					});
				}
				let timeLeft = ((station.currentSong.duration * 1000) - (Date.now() - station.startedAt - station.timePaused));
				if (isNaN(timeLeft)) timeLeft = -1;
				if (station.currentSong.duration * 1000 < timeLeft || timeLeft < 0) {
					this.skipStation(station._id)((err, station) => {
						next(err, station);
					});
				} else {
					this.notifications.schedule(`stations.nextSong?id=${station._id}`, timeLeft, null, station);
					next(null, station);
				}
			}
		], (err, station) => {
			if (err && err !== true) return cb(err);
			cb(null, station);
		});
	}

	async calculateSongForStation(station, cb) {
		try { await this._validateHook(); } catch { return; }

		let songList = [];
		async.waterfall([
			(next) => {
				let genresDone = [];
				station.genres.forEach((genre) => {
					this.db.models.song.find({genres: genre}, (err, songs) => {
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

				this.utils.shuffle(playlist).then((playlist) => {
					next(null, playlist);
				});
			},

			(playlist, next) => {
				this.calculateOfficialPlaylistList(station._id, playlist, () => {
					next(null, playlist);
				});
			},

			(playlist, next) => {
				this.db.models.station.updateOne({_id: station._id}, {$set: {playlist: playlist}}, {runValidators: true}, (err) => {
					this.updateStation(station._id, () => {
						next(err, playlist);
					});
				});
			}

		], (err, newPlaylist) => {
			cb(err, newPlaylist);
		});
	}

	// Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
	async getStation(stationId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([
			(next) => {
				this.cache.hget('stations', stationId, next);
			},

			(station, next) => {
				if (station) return next(true, station);
				this.db.models.station.findOne({ _id: stationId }, next);
			},

			(station, next) => {
				if (station) {
					if (station.type === 'official') {
						this.calculateOfficialPlaylistList(station._id, station.playlist, () => {});
					}
					station = this.cache.schemas.station(station);
					this.cache.hset('stations', stationId, station);
					next(true, station);
				} else next('Station not found');
			},

		], (err, station) => {
			if (err && err !== true) return cb(err);
			cb(null, station);
		});
	}

	// Attempts to get the station from Redis. If it's not in Redis, get it from Mongo and add it to Redis.
	async getStationByName(stationName, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				this.db.models.station.findOne({ name: stationName }, next);
			},

			(station, next) => {
				if (station) {
					if (station.type === 'official') {
						this.calculateOfficialPlaylistList(station._id, station.playlist, ()=>{});
					}
					station = this.cache.schemas.station(station);
					this.cache.hset('stations', station._id, station);
					next(true, station);
				} else next('Station not found');
			},

		], (err, station) => {
			if (err && err !== true) return cb(err);
			cb(null, station);
		});
	}

	async updateStation(stationId, cb) {
		try { await this._validateHook(); } catch { return; }

		async.waterfall([

			(next) => {
				this.db.models.station.findOne({ _id: stationId }, next);
			},

			(station, next) => {
				if (!station) {
					this.cache.hdel('stations', stationId);
					return next('Station not found');
				}
				this.cache.hset('stations', stationId, station, next);
			}

		], (err, station) => {
			if (err && err !== true) return cb(err);
			cb(null, station);
		});
	}

	async calculateOfficialPlaylistList(stationId, songList, cb) {
		try { await this._validateHook(); } catch { return; }

		let lessInfoPlaylist = [];
		async.each(songList, (song, next) => {
			this.songs.getSong(song, (err, song) => {
				if (!err && song) {
					let newSong = {
						songId: song.songId,
						title: song.title,
						artists: song.artists,
						duration: song.duration
					};
					lessInfoPlaylist.push(newSong);
				}
				next();
			});
		}, () => {
			this.cache.hset("officialPlaylists", stationId, this.cache.schemas.officialPlaylist(stationId, lessInfoPlaylist), () => {
				this.cache.pub("station.newOfficialPlaylist", stationId);
				cb();
			});
		});
	}

	skipStation(stationId) {
		this.logger.info("STATION_SKIP", `Skipping station ${stationId}.`, false);
		return async (cb) => {
			try { await this._validateHook(); } catch { return; }

			if (typeof cb !== 'function') cb = ()=>{};

			async.waterfall([
				(next) => {
					this.getStation(stationId, next);
				},
				(station, next) => {
					if (!station) return next('Station not found.');
					if (station.type === 'community' && station.partyMode && station.queue.length === 0) return next(null, null, -11, station); // Community station with party mode enabled and no songs in the queue
					if (station.type === 'community' && station.partyMode && station.queue.length > 0) { // Community station with party mode enabled and songs in the queue
						return this.db.models.station.updateOne({_id: stationId}, {$pull: {queue: {_id: station.queue[0]._id}}}, (err) => {
							if (err) return next(err);
							next(null, station.queue[0], -12, station);
						});
					}
					if (station.type === 'community' && !station.partyMode) {
						return this.db.models.playlist.findOne({_id: station.privatePlaylist}, (err, playlist) => {
							if (err) return next(err);
							if (!playlist) return next(null, null, -13, station);
							playlist = playlist.songs;
							if (playlist.length > 0) {
								let currentSongIndex;
								if (station.currentSongIndex < playlist.length - 1) currentSongIndex = station.currentSongIndex + 1;
								else currentSongIndex = 0;
								let callback = (err, song) => {
									if (err) return next(err);
									if (song) return next(null, song, currentSongIndex, station);
									else {
										let song = playlist[currentSongIndex];
										let currentSong = {
											songId: song.songId,
											title: song.title,
											duration: song.duration,
											likes: -1,
											dislikes: -1
										};
										return next(null, currentSong, currentSongIndex, station);
									}
								};
								if (playlist[currentSongIndex]._id) this.songs.getSong(playlist[currentSongIndex]._id, callback);
								else this.songs.getSongFromId(playlist[currentSongIndex].songId, callback);
							} else return next(null, null, -14, station);
						});
					}
					if (station.type === 'official' && station.playlist.length === 0) {
						return this.calculateSongForStation(station, (err, playlist) => {
							if (err) return next(err);
							if (playlist.length === 0) return next(null, this.defaultSong, 0, station);
							else {
								this.songs.getSong(playlist[0], (err, song) => {
									if (err || !song) return next(null, this.defaultSong, 0, station);
									return next(null, song, 0, station);
								});
							}
						});
					}
					if (station.type === 'official' && station.playlist.length > 0) {
						async.doUntil((next) => {
							if (station.currentSongIndex < station.playlist.length - 1) {
								this.songs.getSong(station.playlist[station.currentSongIndex + 1], (err, song) => {
									if (!err) return next(null, song, station.currentSongIndex + 1);
									else {
										station.currentSongIndex++;
										next(null, null);
									}
								});
							} else {
								this.calculateSongForStation(station, (err, newPlaylist) => {
									if (err) return next(null, this.defaultSong, 0);
									this.songs.getSong(newPlaylist[0], (err, song) => {
										if (err || !song) return next(null, this.defaultSong, 0);
										station.playlist = newPlaylist;
										next(null, song, 0);
									});
								});
							}
						}, (song, currentSongIndex, next) => {
							if (!!song) return next(null, true, currentSongIndex);
							else return next(null, false);
						}, (err, song, currentSongIndex) => {
							return next(err, song, currentSongIndex, station);
						});
					}
				},
				(song, currentSongIndex, station, next) => {
					let $set = {};
					if (song === null) $set.currentSong = null;
					else if (song.likes === -1 && song.dislikes === -1) {
						$set.currentSong = {
							songId: song.songId,
							title: song.title,
							duration: song.duration,
							skipDuration: 0,
							likes: -1,
							dislikes: -1
						};
					} else {
						$set.currentSong = {
							songId: song.songId,
							title: song.title,
							artists: song.artists,
							duration: song.duration,
							likes: song.likes,
							dislikes: song.dislikes,
							skipDuration: song.skipDuration,
							thumbnail: song.thumbnail
						};
					}
					if (currentSongIndex >= 0) $set.currentSongIndex = currentSongIndex;
					$set.startedAt = Date.now();
					$set.timePaused = 0;
					if (station.paused) $set.pausedAt = Date.now();
					next(null, $set, station);
				},

				($set, station, next) => {
					this.db.models.station.updateOne({_id: station._id}, {$set}, (err) => {
						this.updateStation(station._id, (err, station) => {
							if (station.type === 'community' && station.partyMode === true)
								this.cache.pub('station.queueUpdate', stationId);
							next(null, station);
						});
					});
				},
			], async (err, station) => {
				if (!err) {
					if (station.currentSong !== null && station.currentSong.songId !== undefined) {
						station.currentSong.skipVotes = 0;
					}
					//TODO Pub/Sub this
					this.utils.emitToRoom(`station.${station._id}`, "event:songs.next", {
						currentSong: station.currentSong,
						startedAt: station.startedAt,
						paused: station.paused,
						timePaused: 0
					});

					if (station.privacy === 'public') this.utils.emitToRoom('home', "event:station.nextSong", station._id, station.currentSong);
					else {
						let sockets = await this.utils.getRoomSockets('home');
						for (let socketId in sockets) {
							let socket = sockets[socketId];
							let session = sockets[socketId].session;
							if (session.sessionId) {
								this.cache.hget('sessions', session.sessionId, (err, session) => {
									if (!err && session) {
										this.db.models.user.findOne({_id: session.userId}, (err, user) => {
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
					if (station.currentSong !== null && station.currentSong.songId !== undefined) {
						this.utils.socketsJoinSongRoom(await this.utils.getRoomSockets(`station.${station._id}`), `song.${station.currentSong.songId}`);
						if (!station.paused) {
							this.notifications.schedule(`stations.nextSong?id=${station._id}`, station.currentSong.duration * 1000, null, station);
						}
					} else {
						this.utils.socketsLeaveSongRooms(await this.utils.getRoomSockets(`station.${station._id}`));
					}
					cb(null, station);
				} else {
					err = await this.utils.getError(err);
					logger.error('SKIP_STATION', `Skipping station "${stationId}" failed. "${err}"`);
					cb(err);
				}
			});
		}
	}
}