'use strict';

const async   = require('async'),
	  request = require('request'),
	  config  = require('config'),
	  _		  =  require('underscore')._;

const io = require('../io');
const db = require('../db');
const cache = require('../cache');
const notifications = require('../notifications');
const utils = require('../utils');
const logger = require('../logger');
const stations = require('../stations');
const songs = require('../songs');
const hooks = require('./hooks');
let userList = {};
let usersPerStation = {};
let usersPerStationCount = {};

setInterval(() => {
	let stationsCountUpdated = [];
	let stationsUpdated = [];

	let oldUsersPerStation = usersPerStation;
	usersPerStation = {};

	let oldUsersPerStationCount = usersPerStationCount;
	usersPerStationCount = {};

	async.each(Object.keys(userList), function(socketId, next) {
		let socket = utils.socketFromSession(socketId);
		let stationId = userList[socketId];
		if (!socket || Object.keys(socket.rooms).indexOf(`station.${stationId}`) === -1) {
			if (stationsCountUpdated.indexOf(stationId) === -1) stationsCountUpdated.push(stationId);
			if (stationsUpdated.indexOf(stationId) === -1) stationsUpdated.push(stationId);
			delete userList[socketId];
			return next();
		}
		if (!usersPerStationCount[stationId]) usersPerStationCount[stationId] = 0;
		usersPerStationCount[stationId]++;
		if (!usersPerStation[stationId]) usersPerStation[stationId] = [];

		async.waterfall([
			(next) => {
				if (!socket.session || !socket.session.sessionId) return next('No session found.');
				cache.hget('sessions', socket.session.sessionId, next);
			},

			(session, next) => {
				if (!session) return next('Session not found.');
				db.models.user.findOne({_id: session.userId}, next);
			},

			(user, next) => {
				if (!user) return next('User not found.');
				if (usersPerStation[stationId].indexOf(user.username) !== -1) return next('User already in the list.');
				next(null, user.username);
			}
		], (err, username) => {
			if (!err) {
				usersPerStation[stationId].push(username);
			}
			next();
		});
		//TODO Code to show users
	}, (err) => {
		for (let stationId in usersPerStationCount) {
			if (oldUsersPerStationCount[stationId] !== usersPerStationCount[stationId]) {
				if (stationsCountUpdated.indexOf(stationId) === -1) stationsCountUpdated.push(stationId);
			}
		}

		for (let stationId in usersPerStation) {
			if (_.difference(usersPerStation[stationId], oldUsersPerStation[stationId]).length > 0 || _.difference(oldUsersPerStation[stationId], usersPerStation[stationId]).length > 0) {
				if (stationsUpdated.indexOf(stationId) === -1) stationsUpdated.push(stationId);
			}
		}

		stationsCountUpdated.forEach((stationId) => {
			console.log("Updating count of ", stationId);
			cache.pub('station.updateUserCount', stationId);
		});

		stationsUpdated.forEach((stationId) => {
			console.log("Updating ", stationId);
			cache.pub('station.updateUsers', stationId);
		});

		//console.log("Userlist", usersPerStation);
	});
}, 3000);

cache.sub('station.updateUsers', stationId => {
	let list = usersPerStation[stationId] || [];
	utils.emitToRoom(`station.${stationId}`, "event:users.updated", list);
});

cache.sub('station.updateUserCount', stationId => {
	let count = usersPerStationCount[stationId] || 0;
	utils.emitToRoom(`station.${stationId}`, "event:userCount.updated", count);
	stations.getStation(stationId, (err, station) => {
		if (station.privacy === 'public') utils.emitToRoom('home', "event:userCount.updated", stationId, count);
		else {
			let sockets = utils.getRoomSockets('home');
			for (let socketId in sockets) {
				let socket = sockets[socketId];
				let session = sockets[socketId].session;
				if (session.sessionId) {
					cache.hget('sessions', session.sessionId, (err, session) => {
						if (!err && session) {
							db.models.user.findOne({_id: session.userId}, (err, user) => {
								if (user.role === 'admin') socket.emit("event:userCount.updated", stationId, count);
								else if (station.type === "community" && station.owner === session.userId) socket.emit("event:userCount.updated", stationId, count);
							});
						}
					});
				}
			}
		}
	})
});

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
	utils.emitToRoom(`station.${stationId}`, 'event:stations.remove');
	utils.emitToRoom('admin.stations', 'event:admin.station.removed', stationId);
});

cache.sub('station.create', stationId => {
	stations.initializeStation(stationId, (err, station) => {
		station.userCount = usersPerStationCount[stationId] || 0;
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
		async.waterfall([
			(next) => {
				cache.hgetall('stations', next);
			},

			(stations, next) => {
				let resultStations = [];
				for (let id in stations) {
					resultStations.push(stations[id]);
				}
				next(null, stations);
			},

			(stations, next) => {
				let resultStations = [];
				async.each(stations, (station, next) => {
					async.waterfall([
						(next) => {
							if (station.privacy === 'public') return next(true);
							if (!session.sessionId) return next(`Insufficient permissions.`);
							cache.hget('sessions', session.sessionId, next);
						},

						(session, next) => {
							if (!session) return next(`Insufficient permissions.`);
							db.models.user.findOne({_id: session.userId}, next);
						},

						(user, next) => {
							if (!user) return next(`Insufficient permissions.`);
							if (user.role === 'admin') return next(true);
							if (station.type === 'official') return next(`Insufficient permissions.`);
							if (station.owner === session.userId) return next(true);
							next(`Insufficient permissions.`);
						}
					], (err) => {
						station.userCount = usersPerStationCount[station._id] || 0;
						if (err === true) resultStations.push(station);
						next();
					});
				}, () => {
					next(null, resultStations);
				});
			}
		], (err, stations) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_INDEX", `Indexing stations failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_INDEX", `Indexing stations successful.`);
			return cb({'status': 'success', 'stations': stations});
		});
	},

	/**
	 * Finds a station by name
	 *
	 * @param session
	 * @param stationName - the station name
	 * @param cb
	 */
	findByName: (session, stationName, cb) => {
		async.waterfall([
			(next) => {
				stations.getStationByName(stationName, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				next(null, station);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_FIND_BY_NAME", `Finding station "${stationName}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_FIND_BY_NAME", `Found station "${stationName}" successfully.`);
			cb({status: 'success', data: station});
		});
	},

	/**
	 * Gets the official playlist for a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	getPlaylist: (session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type !== 'official') return next('This is not an official station.');
				next();
			},

			(next) => {
				cache.hget("officialPlaylists", stationId, next);
			},

			(playlist, next) => {
				if (!playlist) return next('Playlist not found.');
				next(null, playlist);
			}
		], (err, playlist) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_GET_PLAYLIST", `Getting playlist for station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_GET_PLAYLIST", `Got playlist for station "${stationId}" successfully.`);
			cb({status: 'success', data: playlist.songs})
		});
	},

	/**
	 * Joins the station by its name
	 *
	 * @param session
	 * @param stationName - the station name
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	join: (session, stationName, cb) => {
		async.waterfall([
			(next) => {
				stations.getStationByName(stationName, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				async.waterfall([
					(next) => {
						if (station.privacy !== 'private') return next(true);
						if (!session.userId) return next('An error occurred while joining the station.');
						next();
					},

					(next) => {
						db.models.user.findOne({_id: session.userId}, next);
					},

					(user, next) => {
						if (!user) return next('An error occurred while joining the station.');
						if (user.role === 'admin') return next(true);
						if (station.type === 'official') return next('An error occurred while joining the station.');
						if (station.owner === session.userId) return next(true);
						next('An error occurred while joining the station.');
					}
				], (err) => {
					if (err === true) return next(null, station);
					next(utils.getError(err));
				});
			},

			(station, next) => {
				utils.socketJoinRoom(session.socketId, `station.${station._id}`);
				let data = {
					_id: station._id,
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
				};
				userList[session.socketId] = station._id;
				next(null, data);
			},

			(data, next) => {
				data.userCount = usersPerStationCount[data._id] || 0;
				data.users = usersPerStation[data._id] || [];
				if (!data.currentSong || !data.currentSong.title) return next(null, data);
				utils.socketJoinSongRoom(session.socketId, `song.${data.currentSong.songId}`);
				data.currentSong.skipVotes = data.currentSong.skipVotes.length;
				songs.getSongFromId(data.currentSong.songId, (err, song) => {
					if (!err && song) {
						data.currentSong.likes = song.likes;
						data.currentSong.dislikes = song.dislikes;
					} else {
						data.currentSong.likes = -1;
						data.currentSong.dislikes = -1;
					}
					next(null, data);
				});
			}
		], (err, data) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_JOIN", `Joining station "${stationName}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_JOIN", `Joined station "${data._id}" successfully.`);
			cb({status: 'success', data});
		});
	},

	/**
	 * Votes to skip a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 * @param userId
	 */
	voteSkip: hooks.loginRequired((session, stationId, cb, userId) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (!station.currentSong) return next('There is currently no song to skip.');
				if (station.currentSong.skipVotes.indexOf(userId) !== -1) return next('You have already voted to skip this song.');
				next(null, station);
			},

			(station, next) => {
				db.models.station.update({_id: stationId}, {$push: {"currentSong.skipVotes": userId}}, next)
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				next(null, station);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_VOTE_SKIP", `Vote skipping station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_VOTE_SKIP", `Vote skipping "${stationId}" successful.`);
			cache.pub('station.voteSkipSong', stationId);
			if (station.currentSong && station.currentSong.skipVotes.length >= 3) stations.skipStation(stationId)();
			cb({ status: 'success', message: 'Successfully voted to skip the song.' });
		});
	}),

	/**
	 * Force skips a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	forceSkip: hooks.ownerRequired((session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				next();
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_FORCE_SKIP", `Force skipping station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			notifications.unschedule(`stations.nextSong?id=${stationId}`);
			stations.skipStation(stationId)();
			logger.success("STATIONS_FORCE_SKIP", `Force skipped station "${stationId}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully skipped station.'});
		});
	}),

	/**
	 * Leaves the user's current station
	 *
	 * @param session
	 * @param stationId
	 * @param cb
	 * @return {{ status: String, userCount: Integer }}
	 */
	leave: (session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				next();
			},

			(next) => {
				cache.client.hincrby('station.userCounts', stationId, -1, next);
			}
		], (err, userCount) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_LEAVE", `Leaving station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_LEAVE", `Left station "${stationId}" successfully.`);
			utils.socketLeaveRooms(session);
			delete userList[session.socketId];
			return cb({'status': 'success', 'message': 'Successfully left station.', userCount});
		});
	},

	/**
	 * Updates a station's name
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newName - the new station name
	 * @param cb
	 */
	updateName: hooks.ownerRequired((session, stationId, newName, cb) => {
		async.waterfall([
			(next) => {
				db.models.station.update({_id: stationId}, {$set: {name: newName}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_UPDATE_DISPLAY_NAME", `Updating station "${stationId}" displayName to "${newName}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_UPDATE_DISPLAY_NAME", `Updated station "${stationId}" displayName to "${newName}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully updated the name.'});
		});
	}),

	/**
	 * Updates a station's display name
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newDisplayName - the new station display name
	 * @param cb
	 */
	updateDisplayName: hooks.ownerRequired((session, stationId, newDisplayName, cb) => {
		async.waterfall([
			(next) => {
				db.models.station.update({_id: stationId}, {$set: {displayName: newDisplayName}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_UPDATE_DISPLAY_NAME", `Updating station "${stationId}" displayName to "${newDisplayName}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_UPDATE_DISPLAY_NAME", `Updated station "${stationId}" displayName to "${newDisplayName}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully updated the display name.'});
		});
	}),

	/**
	 * Updates a station's description
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newDescription - the new station description
	 * @param cb
	 */
	updateDescription: hooks.ownerRequired((session, stationId, newDescription, cb) => {
		async.waterfall([
			(next) => {
				db.models.station.update({_id: stationId}, {$set: {description: newDescription}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_UPDATE_DESCRIPTION", `Updating station "${stationId}" description to "${newDescription}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_UPDATE_DESCRIPTION", `Updated station "${stationId}" description to "${newDescription}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully updated the description.'});
		});
	}),

	/**
	 * Updates a station's privacy
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newPrivacy - the new station privacy
	 * @param cb
	 */
	updatePrivacy: hooks.ownerRequired((session, stationId, newPrivacy, cb) => {
		async.waterfall([
			(next) => {
				db.models.station.update({_id: stationId}, {$set: {privacy: newPrivacy}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_UPDATE_PRIVACY", `Updating station "${stationId}" privacy to "${newPrivacy}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_UPDATE_PRIVACY", `Updated station "${stationId}" privacy to "${newPrivacy}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully updated the privacy.'});
		});
	}),

	/**
	 * Updates a station's party mode
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param newPartyMode - the new station party mode
	 * @param cb
	 */
	updatePartyMode: hooks.ownerRequired((session, stationId, newPartyMode, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.partyMode === newPartyMode) return next('The party mode was already ' + ((newPartyMode) ? 'enabled.' : 'disabled.'));
				db.models.station.update({_id: stationId}, {$set: {partyMode: newPartyMode}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_UPDATE_PARTY_MODE", `Updating station "${stationId}" party mode to "${newPartyMode}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_UPDATE_PARTY_MODE", `Updated station "${stationId}" party mode to "${newPartyMode}" successfully.`);
			cache.pub('station.updatePartyMode', {stationId: stationId, partyMode: newPartyMode});
			stations.skipStation(stationId)();
			return cb({'status': 'success', 'message': 'Successfully updated the party mode.'});
		});
	}),

	/**
	 * Pauses a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	pause: hooks.ownerRequired((session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.paused) return next('That station was already paused.');
				db.models.station.update({_id: stationId}, {$set: {paused: true, pausedAt: Date.now()}}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_PAUSE", `Pausing station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_PAUSE", `Paused station "${stationId}" successfully.`);
			cache.pub('station.pause', stationId);
			notifications.unschedule(`stations.nextSong?id=${stationId}`);
			return cb({'status': 'success', 'message': 'Successfully paused.'});
		});
	}),

	/**
	 * Resumes a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	resume: hooks.ownerRequired((session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (!station.paused) return next('That station is not paused.');
				station.timePaused += (Date.now() - station.pausedAt);
				db.models.station.update({_id: stationId}, {$set: {paused: false}, $inc: {timePaused: Date.now() - station.pausedAt}}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_RESUME", `Resuming station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_RESUME", `Resuming station "${stationId}" successfully.`);
			cache.pub('station.resume', stationId);
			return cb({'status': 'success', 'message': 'Successfully resumed.'});
		});
	}),

	/**
	 * Removes a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	remove: hooks.ownerRequired((session, stationId, cb) => {
		async.waterfall([
			(next) => {
				db.models.station.remove({ _id: stationId }, err => next(err));
			},

			(next) => {
				cache.hdel('stations', stationId, err => next(err));
			}
		], (err) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_REMOVE", `Removing station "${stationId}" failed. "${err}"`);
				return cb({ 'status': 'failure', 'message': err });
			}
			logger.success("STATIONS_REMOVE", `Removing station "${stationId}" successfully.`);
			cache.pub('station.remove', stationId);
			return cb({ 'status': 'success', 'message': 'Successfully removed.' });
		});
	}),

	/**
	 * Create a station
	 *
	 * @param session
	 * @param data - the station data
	 * @param cb
	 * @param userId
	 */
	create: hooks.loginRequired((session, data, cb, userId) => {
		data.name = data.name.toLowerCase();
		let blacklist = ["country", "edm", "musare", "hip-hop", "rap", "top-hits", "todays-hits", "old-school", "christmas", "about", "support", "staff", "help", "news", "terms", "privacy", "profile", "c", "community", "tos", "login", "register", "p", "official", "o", "trap", "faq", "team", "donate", "buy", "shop", "forums", "explore", "settings", "admin", "auth", "reset_password"];
		async.waterfall([
			(next) => {
				if (!data) return next('Invalid data.');
				next();
			},

			(next) => {
				db.models.station.findOne({ $or: [{name: data.name}, {displayName: new RegExp(`^${data.displayName}$`, 'i')}] }, next);
			},

			(station, next) => {
				if (station) return next('A station with that name or display name already exists.');
				const { name, displayName, description, genres, playlist, type, blacklistedGenres } = data;
				if (type === 'official') {
					db.models.user.findOne({_id: userId}, (err, user) => {
						if (err) return next(err);
						if (!user) return next('User not found.');
						if (user.role !== 'admin') return next('Admin required.');
						db.models.station.create({
							name,
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
					if (blacklist.indexOf(name) !== -1) return next('That name is blacklisted. Please use a different name.');
					db.models.station.create({
						name,
						displayName,
						description,
						type,
						privacy: 'private',
						owner: userId,
						queue: [],
						currentSong: null
					}, next);
				}
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_CREATE", `Creating station failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_CREATE", `Created station "${station._id}" successfully.`);
			cache.pub('station.create', station._id);
			return cb({'status': 'success', 'message': 'Successfully created station.'});
		});
	}),

	/**
	 * Adds song to station queue
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	addToQueue: hooks.loginRequired((session, stationId, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type !== 'community') return next('That station is not a community station.');
				if (station.currentSong && station.currentSong.songId === songId) return next('That song is currently playing.');
				async.each(station.queue, (queueSong, next) => {
					if (queueSong.songId === songId) return next('That song is already in the queue.');
					next();
				}, (err) => {
					next(err, station);
				});
			},

			(station, next) => {
				songs.getSong(songId, (err, song) => {
					if (!err && song) return next(null, song);
					utils.getSongFromYouTube(songId, (song) => {
						song.artists = [];
						song.skipDuration = 0;
						song.likes = -1;
						song.dislikes = -1;
						song.thumbnail = "empty";
						song.explicit = false;
						next(null, song);
					});
				});
			},

			(song, next) => {
				song.requestedBy = userId;
				db.models.station.update({_id: stationId}, {$push: {queue: song}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_ADD_SONG_TO_QUEUE", `Adding song "${songId}" to station "${stationId}" queue failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_ADD_SONG_TO_QUEUE", `Added song "${songId}" to station "${stationId}" successfully.`);
			cache.pub('station.queueUpdate', stationId);
			return cb({'status': 'success', 'message': 'Successfully added song to queue.'});
		});
	}),

	/**
	 * Removes song from station queue
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	removeFromQueue: hooks.ownerRequired((session, stationId, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				if (!songId) return next('Invalid song id.');
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type !== 'community') return next('Station is not a community station.');
				async.each(station.queue, (queueSong, next) => {
					if (queueSong.songId === songId) return next(true);
					next();
				}, (err) => {
					if (err === true) return next();
					next('Song is not currently in the queue.');
				});
			},

			(next) => {
				db.models.update({_id: stationId}, {$pull: {queue: {songId: songId}}}, next);
			},

			(next) => {
				stations.updateStation(stationId, next);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_REMOVE_SONG_TO_QUEUE", `Removing song "${songId}" from station "${stationId}" queue failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_REMOVE_SONG_TO_QUEUE", `Removed song "${songId}" from station "${stationId}" successfully.`);
			cache.pub('station.queueUpdate', stationId);
			return cb({'status': 'success', 'message': 'Successfully removed song from queue.'});
		});
	}),

	/**
	 * Gets the queue from a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param cb
	 */
	getQueue: hooks.adminRequired((session, stationId, cb) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type !== 'community') return next('Station is not a community station.');
				next(null, station);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_GET_QUEUE", `Getting queue for station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_GET_QUEUE", `Got queue for station "${stationId}" successfully.`);
			return cb({'status': 'success', 'message': 'Successfully got queue.', queue: station.queue});
		});
	}),

	/**
	 * Selects a private playlist for a station
	 *
	 * @param session
	 * @param stationId - the station id
	 * @param playlistId - the private playlist id
	 * @param cb
	 * @param userId
	 */
	selectPrivatePlaylist: hooks.ownerRequired((session, stationId, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				stations.getStation(stationId, next);
			},

			(station, next) => {
				if (!station) return next('Station not found.');
				if (station.type !== 'community') return next('Station is not a community station.');
				if (station.privatePlaylist === playlistId) return next('That private playlist is already selected.');
				db.models.playlist.findOne({_id: playlistId}, next);
			},

			(playlist, next) => {
				if (!playlist) return next('Playlist not found.');
				let currentSongIndex = (playlist.songs.length > 0) ? playlist.songs.length - 1 : 0;
				db.models.station.update({_id: stationId}, {$set: {privatePlaylist: playlistId, currentSongIndex: currentSongIndex}}, {runValidators: true}, next);
			},

			(res, next) => {
				stations.updateStation(stationId, next);
			}
		], (err, station) => {
			if (err) {
				err = utils.getError(err);
				logger.error("STATIONS_SELECT_PRIVATE_PLAYLIST", `Selecting private playlist "${playlistId}" for station "${stationId}" failed. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("STATIONS_SELECT_PRIVATE_PLAYLIST", `Selected private playlist "${playlistId}" for station "${stationId}" successfully.`);
			notifications.unschedule(`stations.nextSong?id${stationId}`);
			if (!station.partyMode) stations.skipStation(stationId)();
			cache.pub('privatePlaylist.selected', {playlistId, stationId});
			return cb({'status': 'success', 'message': 'Successfully selected playlist.'});
		});
	}),
};
