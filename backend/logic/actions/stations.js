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
const hooks = require('./hooks');

cache.sub('station.updatePartyMode', data => {
	utils.emitToRoom(`station.${data.stationId}`, "event:partyMode.updated", data.partyMode);
});

cache.sub('privatePlaylist.selected', data => {
	utils.emitToRoom(`station.${data.stationId}`, "event:privatePlaylist.selected", data.playlistId);
});

cache.sub('station.pause', stationId => {
	utils.emitToRoom(`station.${stationId}`, "event:stations.pause");
});

cache.sub('station.resume', stationId => {
	stations.getStation(stationId, (err, station) => {
		utils.emitToRoom(`station.${stationId}`, "event:stations.resume", { timePaused: station.timePaused });
	});
});

cache.sub('station.queueUpdate', stationId => {
	stations.getStation(stationId, (err, station) => {
		if (!err) utils.emitToRoom(`station.${stationId}`, "event:queue.update", station.queue);
	});
});

cache.sub('station.voteSkipSong', stationId => {
	utils.emitToRoom(`station.${stationId}`, "event:song.voteSkipSong");
});

cache.sub('station.remove', stationId => {
	utils.emitToRoom('admin.stations', 'event:admin.station.removed', stationId);
});

cache.sub('station.create', stationId => {
	stations.initializeStation(stationId, (err, station) => {
		if (err) console.error(err);
		utils.emitToRoom('admin.stations', 'event:admin.station.added', station);
		// TODO If community, check if on whitelist
		if (station.privacy === 'public') utils.emitToRoom('home', "event:stations.created", station);
		else {
			let sockets = utils.getRoomSockets('home');
			for (let socketId in sockets) {
				let socket = sockets[socketId];
				let session = sockets[socketId].session;
				if (session.sessionId) {
					cache.hget('sessions', session.sessionId, (err, session) => {
						if (!err && session) {
							db.models.user.findOne({_id: session.userId}, (err, user) => {
								if (user.role === 'admin') socket.emit("event:stations.created", station);
								else if (station.type === "community" && station.owner === session.userId) socket.emit("event:stations.created", station);
							});
						}
					});
				}
			}
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
		cache.hgetall('stations', (err, stations) => {

			if (err && err !== true) {
				return cb({
					status: 'error',
					message: 'An error occurred while obtaining the stations'
				});
			}

			let arr = [];
			let done = 0;
			for (let prop in stations) {
				// TODO If community, check if on whitelist
				let station = stations[prop];
				if (station.privacy === 'public') add(true, station);
				else if (!session.sessionId) add(false);
				else {
					cache.hget('sessions', session.sessionId, (err, session) => {
						if (err || !session) {
							add(false);
						} else {
							db.models.user.findOne({_id: session.userId}, (err, user) => {
								if (err || !user) add(false);
								else if (user.role === 'admin') add(true, station);
								else if (station.type === 'official') add(false);
								else if (station.owner === session.userId) add(true, station);
								else add(false);
							});
						}
					});
				}
			}

			function add(add, station) {
				if (add) arr.push(station);
				done++;
				if (done === Object.keys(stations).length) {
					cb({ status: 'success', stations: arr });
				}
			}
		});
	},

	find: (session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err) cb({ status: 'error', message: err });
			else if (station) cb({ status: 'success', data: station });
		});
	},

	getPlaylist: (session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when getting the station.' });
			if (!station) return cb({ status: 'failure', message: 'Station not found..' });
			if (station.type === 'official') {
				cache.hget("officialPlaylists", stationId, (err, playlist) => {
					if (err) return cb({ status: 'failure', message: 'Something went wrong when getting the playlist.' });
					if (!playlist) return cb({ status: 'failure', message: 'Playlist not found.' });
					cb({ status: 'success', data: playlist.songs })
				})
			} else cb({ status: 'failure', message: 'This is not an official station.' })
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

		stations.getStation(stationId, (err, station) => {

			if (err && err !== true) return cb({ status: 'error', message: 'An error occurred while joining the station' });

			if (station) {

				if (station.privacy !== 'private') joinStation();
				else {
					// TODO If community, check if on whitelist
					if (!session.userId) return cb({ status: 'error', message: 'An error occurred while joining the station1' });
					db.models.user.findOne({_id: session.userId}, (err, user) => {
						if (err || !user) return cb({ status: 'error', message: 'An error occurred while joining the station2' });
						if (user.role === 'admin') return joinStation();
						if (station.type === 'official') return cb({ status: 'error', message: 'An error occurred while joining the station3' });
						if (station.owner === session.userId) return joinStation();
						return cb({ status: 'error', message: 'An error occurred while joining the station4' });
					});
				}

				function joinStation() {
					utils.socketJoinRoom(session.socketId, `station.${stationId}`);
					if (station.currentSong) {
						utils.socketJoinSongRoom(session.socketId, `song.${station.currentSong._id}`);
						//TODO Emit to cache, listen on cache
						songs.getSong(station.currentSong._id, (err, song) => {
							if (!err && song) {
								station.currentSong.likes = song.likes;
								station.currentSong.dislikes = song.dislikes;
							} else {
								station.currentSong.likes = -1;
								station.currentSong.dislikes = -1;
							}
							station.currentSong.skipVotes = station.currentSong.skipVotes.length;
							cb({
								status: 'success',
								data: {
									type: station.type,
									currentSong: station.currentSong,
									startedAt: station.startedAt,
									paused: station.paused,
									timePaused: station.timePaused,
									description: station.description,
									displayName: station.displayName,
									privacy: station.privacy,
									partyMode: station.partyMode,
									owner: station.owner,
									privatePlaylist: station.privatePlaylist
								}
							});
						});
					} else {
						cb({
							status: 'success',
							data: {
								type: station.type,
								currentSong: null,
								startedAt: station.startedAt,
								paused: station.paused,
								timePaused: station.timePaused,
								description: station.description,
								displayName: station.displayName,
								privacy: station.privacy,
								partyMode: station.partyMode,
								owner: station.owner,
								privatePlaylist: station.privatePlaylist
							}
						});
					}
				}
			} else {
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
	 */
	voteSkip: hooks.loginRequired((session, stationId, cb, userId) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
			if (!station.currentSong) return cb({ status: 'failure', message: 'There is currently no song to skip.' });
			if (station.currentSong.skipVotes.indexOf(userId) !== -1) return cb({ status: 'failure', message: 'You have already voted to skip this song.' });
			db.models.station.update({_id: stationId}, {$push: {"currentSong.skipVotes": userId}}, (err) => {
				if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
				stations.updateStation(stationId, (err, station) => {
					cache.pub('station.voteSkipSong', stationId);
					if (station.currentSong && station.currentSong.skipVotes.length >= 3) stations.skipStation(stationId)();
					cb({ status: 'success', message: 'Successfully voted to skip the song.' });
				})
			});
		});
	}),

	forceSkip: hooks.ownerRequired((session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {

			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while skipping the station' });
			}

			if (station) {
				notifications.unschedule(`stations.nextSong?id=${stationId}`);
				//notifications.schedule(`stations.nextSong?id=${stationId}`, 100);
				stations.skipStation(stationId)();
			}
			else {
				cb({ status: 'failure', message: `That station doesn't exist` });
			}
		});
	}),

	/**
	 * Leaves the users current station
	 *
	 * @param session
	 * @param stationId
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	leave: (session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {

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

	updateDisplayName: hooks.ownerRequired((session, stationId, newDisplayName, cb) => {
		db.models.station.update({_id: stationId}, {$set: {displayName: newDisplayName}}, (err) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
			stations.updateStation(stationId, () => {
				//TODO Pub/sub for displayName change
				cb({ status: 'success', message: 'Successfully updated the display name.' });
			})
		});
	}),

	updateDescription: hooks.ownerRequired((session, stationId, newDescription, cb) => {
		db.models.station.update({_id: stationId}, {$set: {description: newDescription}}, (err) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
			stations.updateStation(stationId, () => {
				//TODO Pub/sub for description change
				cb({ status: 'success', message: 'Successfully updated the description.' });
			})
		});
	}),

	updatePrivacy: hooks.ownerRequired((session, stationId, newPrivacy, cb) => {
		db.models.station.update({_id: stationId}, {$set: {privacy: newPrivacy}}, (err) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
			stations.updateStation(stationId, () => {
				//TODO Pub/sub for privacy change
				cb({ status: 'success', message: 'Successfully updated the privacy.' });
			})
		});
	}),

	updatePartyMode: hooks.ownerRequired((session, stationId, newPartyMode, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb({ status: 'failure', message: err });
			if (station.partyMode === newPartyMode) return cb({ status: 'failure', message: 'The party mode was already ' + ((newPartyMode) ? 'enabled.' : 'disabled.') });
			db.models.station.update({_id: stationId}, {$set: {partyMode: newPartyMode}}, (err) => {
				if (err) return cb({ status: 'failure', message: 'Something went wrong when saving the station.' });
				stations.updateStation(stationId, () => {
					//TODO Pub/sub for privacy change
					cache.pub('station.updatePartyMode', {stationId: stationId, partyMode: newPartyMode});
					stations.skipStation(stationId)();
					cb({ status: 'success', message: 'Successfully updated the party mode.' });
				})
			});
		});
	}),

	pause: hooks.ownerRequired((session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err && err !== true) {
				return cb({ status: 'error', message: 'An error occurred while pausing the station' });
			} else if (station) {
				if (!station.paused) {
					station.paused = true;
					station.pausedAt = Date.now();
					db.models.station.update({_id: stationId}, {$set: {paused: true, pausedAt: Date.now()}}, () => {
						if (err) return cb({ status: 'failure', message: 'An error occurred while pausing the station.' });
						stations.updateStation(stationId, () => {
							cache.pub('station.pause', stationId);
							notifications.unschedule(`stations.nextSong?id=${stationId}`);
							cb({ status: 'success' });
						});
					});
				} else {
					cb({ status: 'failure', message: 'That station was already paused.' });
				}
				cb({ status: 'success' });
			} else {
				cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
			}
		});
	}),

	resume: hooks.ownerRequired((session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err && err !== true) return cb({ status: 'error', message: 'An error occurred while resuming the station' });
			else if (station) {
				if (station.paused) {
					station.paused = false;
					station.timePaused += (Date.now() - station.pausedAt);
					db.models.station.update({ _id: stationId }, { $set: { paused: false }, $inc: { timePaused: Date.now() - station.pausedAt } }, () => {
						stations.updateStation(stationId, (err, station) => {
							cache.pub('station.resume', stationId);
							cb({ status: 'success' });
						});
					});
				} else cb({ status: 'failure', message: 'That station is not paused.' });
			} else cb({ status: 'failure', message: `That station doesn't exist, it may have been deleted` });
		});
	}),

	remove: hooks.ownerRequired((session, stationId, cb) => {
		db.models.station.remove({ _id: stationId }, (err) => {
			if (err) return cb({ status: 'failure', message: 'Something went wrong when deleting that station' });
			cache.hdel('stations', stationId, () => {
				cache.pub('station.remove', stationId);
				return cb({ status: 'success', message: 'Station successfully removed' });
			});
		});
	}),

	create: hooks.loginRequired((session, data, cb) => {
		data._id = data._id.toLowerCase();
		let blacklist = ["country", "edm", "musare", "hip-hop", "rap", "top-hits", "todays-hits", "old-school", "christmas", "about", "support", "staff", "help", "news", "terms", "privacy", "profile", "c", "community", "tos", "login", "register", "p", "official", "o", "trap", "faq", "team", "donate", "buy", "shop", "forums", "explore", "settings", "admin", "auth", "reset_password"];
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			(next) => {
				db.models.station.findOne({ $or: [{_id: data._id}, {displayName: new RegExp(`^${data.displayName}$`, 'i')}] }, next);
			},

			(station, next) => {
				if (station) return next({ 'status': 'failure', 'message': 'A station with that name or display name already exists' });
				const { _id, displayName, description, genres, playlist, type, blacklistedGenres } = data;
				cache.hget('sessions', session.sessionId, (err, session) => {
					if (type === 'official') {
						db.models.user.findOne({_id: session.userId}, (err, user) => {
							if (err) return next({ 'status': 'failure', 'message': 'Something went wrong when getting your user info.' });
							if (!user) return next({ 'status': 'failure', 'message': 'User not found.' });
							if (user.role !== 'admin') return next({ 'status': 'failure', 'message': 'Admin required.' });
							db.models.station.create({
								_id,
								displayName,
								description,
								type,
								privacy: 'private',
								playlist,
								genres,
								blacklistedGenres,
								currentSong: stations.defaultSong
							}, next);
						});
					} else if (type === 'community') {
						if (blacklist.indexOf(_id) !== -1) return next({ 'status': 'failure', 'message': 'That id is blacklisted. Please use a different id.' });
						db.models.station.create({
							_id,
							displayName,
							description,
							type,
							privacy: 'private',
							owner: session.userId,
							queue: [],
							currentSong: null
						}, next);
					}
				});
			}

		], (err, station) => {
			if (err) {
				console.error(err);
				return cb({ 'status': 'failure', 'message': err.message});
			} else {
				cache.pub('station.create', data._id);
				cb({ 'status': 'success', 'message': 'Successfully created station' });
			}
		});
	}),

	addToQueue: hooks.loginRequired((session, stationId, songId, cb, userId) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb(err);
			if (station.type === 'community') {
				let has = false;
				station.queue.forEach(queueSong => {
					if (queueSong._id === songId) has = true;
				});
				if (has) return cb({'status': 'failure', 'message': 'That song has already been added to the queue'});
				if (station.currentSong && station.currentSong._id === songId) return cb({'status': 'failure', 'message': 'That song is currently playing'});

				songs.getSong(songId, (err, song) => {
					if (err) {
						utils.getSongFromYouTube(songId, (song) => {
							song.artists = [];
							song.skipDuration = 0;
							song.likes = -1;
							song.dislikes = -1;
							song.thumbnail = "empty";
							song.explicit = false;
							cont(song);
						});
					} else cont(song);
					function cont(song) {
						song.requestedBy = userId;
						db.models.station.update({ _id: stationId }, { $push: { queue: song } }, (err) => {
							if (err) return cb({'status': 'failure', 'message': 'Something went wrong'});
							stations.updateStation(stationId, (err, station) => {
								if (err) return cb(err);
								cache.pub('station.queueUpdate', stationId);
								cb({ 'status': 'success', 'message': 'Added that song to the queue' });
							});
						});
					}
				});
			} else cb({'status': 'failure', 'message': 'That station is not a community station'});
		});
	}),

	removeFromQueue: hooks.ownerRequired((session, stationId, songId, cb, userId) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb(err);
			if (station.type === 'community') {
				let has = false;
				station.queue.forEach((queueSong) => {
					if (queueSong._id === songId) {
						has = true;
					}
				});
				if (!has) return cb({'status': 'failure', 'message': 'That song is not in the queue.'});
				db.models.update({_id: stationId}, {$pull: {queue: {songId: songId}}}, (err) => {
					if (err) return cb({'status': 'failure', 'message': 'Something went wrong.'});
					stations.updateStation(stationId, (err, station) => {
						if (err) return cb(err);
						cache.pub('station.queueUpdate', stationId);
					});
				});
			} else cb({'status': 'failure', 'message': 'That station is not a community station.'});
		});
	}),

	getQueue: hooks.adminRequired((session, stationId, cb) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb(err);
			if (!station) return cb({'status': 'failure', 'message': 'Station not found.'});
			if (station.type === 'community') {
				cb({'status': 'success', queue: station.queue});
			} else cb({'status': 'failure', 'message': 'That station is not a community station.'});
		});
	}),

	selectPrivatePlaylist: hooks.ownerRequired((session, stationId, playlistId, cb, userId) => {
		stations.getStation(stationId, (err, station) => {
			if (err) return cb(err);
			if (station.type === 'community') {
				if (station.privatePlaylist === playlistId) return cb({'status': 'failure', 'message': 'That playlist is already selected.'});
				db.models.playlist.findOne({ _id: playlistId }, (err, playlist) => {
					if (err) return cb(err);
					if (playlist) {
						let currentSongIndex = (playlist.songs.length > 0) ? playlist.songs.length - 1 : 0;
						db.models.station.update({_id: stationId}, { $set: { privatePlaylist: playlistId, currentSongIndex: currentSongIndex } }, (err) => {
							if (err) return cb(err);
							stations.updateStation(stationId, (err, station) => {
								if (err) return cb(err);
								if (!station.partyMode) stations.skipStation(stationId)();
								cache.pub('privatePlaylist.selected', {playlistId, stationId});
								cb({'status': 'success', 'message': 'Playlist selected.'});
							});
						});
					} else cb({'status': 'failure', 'message': 'Playlist not found.'});
				});
			} else cb({'status': 'failure', 'message': 'That station is not a community station.'});
		});
	}),

};
