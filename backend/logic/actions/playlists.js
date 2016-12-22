'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const logger = require('../logger');
const hooks = require('./hooks');
const async = require('async');
const playlists = require('../playlists');
const songs = require('../songs');

cache.sub('playlist.create', playlistId => {
	playlists.getPlaylist(playlistId, (err, playlist) => {
		if (!err) {
			utils.socketsFromUser(playlist.createdBy, (sockets) => {
				sockets.forEach((socket) => {
					socket.emit('event:playlist.create', playlist);
				});
			});
		}
	});
});

cache.sub('playlist.delete', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.delete', res.playlistId);
		});
	});
});

cache.sub('playlist.moveSongToTop', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.moveSongToTop', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.moveSongToBottom', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.moveSongToBottom', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.addSong', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.addSong', {playlistId: res.playlistId, song: res.song});
		});
	});
});

cache.sub('playlist.removeSong', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.removeSong', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.updateDisplayName', res => {
	utils.socketsFromUser(res.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:playlist.updateDisplayName', {playlistId: res.playlistId, displayName: res.displayName});
		});
	});
});

let lib = {

	/**
	 * Gets the first song from a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are getting the first song from
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	getFirstSong: hooks.loginRequired((session, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found.');
				next(null, playlist.songs[0]);
			}
		], (err, song) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_GET_FIRST_SONG", "ERROR", `Getting the first song of playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: 'Something went wrong when getting the playlist'});
			}
			logger.log("PLAYLIST_GET_FIRST_SONG", "SUCCESS", `Successfully got the first song of playlist "${playlistId}" for user "${userId}".`);
			cb({
				status: 'success',
				song: song
			});
		});
	}),

	/**
	 * Gets all playlists for the user requesting it
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	indexForUser: hooks.loginRequired((session, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.playlist.find({ createdBy: userId }, next);
			}
		], (err, playlists) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_INDEX_FOR_USER", "ERROR", `Indexing playlists for user "${userId}" failed. "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_INDEX_FOR_USER", "SUCCESS", `Successfully indexed playlists for user "${userId}".`);
			cb({
				status: 'success',
				data: playlists
			});
		});
	}),

	/**
	 * Creates a new private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Object} data - the data for the new private playlist
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	create: hooks.loginRequired((session, data, cb, userId) => {
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			(next) => {
				const { displayName, songs } = data;
				db.models.playlist.create({
					_id: utils.generateRandomString(17),//TODO Check if exists
					displayName,
					songs,
					createdBy: userId,
					createdAt: Date.now()
				}, next);
			}

		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_CREATE", "ERROR", `Creating private playlist failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			cache.pub('playlist.create', playlist._id);
			logger.log("PLAYLIST_CREATE", "SUCCESS", `Successfully created private playlist for user "${userId}".`);
			cb({ 'status': 'success', 'message': 'Successfully created playlist' });
		});
	}),

	/**
	 * Gets a playlist from id
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are getting
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	getPlaylist: hooks.loginRequired((session, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found');
				next(null, playlist);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_GET", "ERROR", `Getting private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_GET", "SUCCESS", `Successfully got private playlist "${playlistId}" for user "${userId}".`);
			cb({
				status: 'success',
				data: playlist
			});
		});
	}),

	//TODO Remove this
	/**
	 * Updates a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are updating
	 * @param {Object} playlist - the new private playlist object
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	update: hooks.loginRequired((session, playlistId, playlist, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.playlist.update({ _id: playlistId, createdBy: userId }, playlist, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next)
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_UPDATE", "ERROR", `Updating private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_UPDATE", "SUCCESS", `Successfully updated private playlist "${playlistId}" for user "${userId}".`);
			cb({
				status: 'success',
				data: playlist
			});
		});
	}),

	/**
	 * Adds a song to a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song we are trying to add
	 * @param {String} playlistId - the id of the playlist we are adding the song to
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	addSongToPlaylist: hooks.loginRequired((session, songId, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, (err, playlist) => {
					if (err || !playlist || playlist.createdBy !== userId) return next('Something went wrong when trying to get the playlist');

					async.each(playlist.songs, (song, next) => {
						if (song._id === songId) return next('That song is already in the playlist');
						next();
					}, next);
				});
			},
			(next) => {
				songs.getSong(songId, (err, song) => {
					if (err) {
						utils.getSongFromYouTube(songId, (song) => {
							next(null, song);
						});
					} else {
						next(null, {
							_id: songId,
							title: song.title,
							duration: song.duration
						});
					}
				});
			},
			(newSong, next) => {
				db.models.playlist.update({ _id: playlistId }, { $push: { songs: newSong } }, (err) => {
					if (err) return next(err);
					playlists.updatePlaylist(playlistId, (err, playlist) => {
						next(err, playlist, newSong);
					});
				});
			}
		],
		(err, playlist, newSong) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_ADD_SONG", "ERROR", `Adding song "${songId}" to private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_ADD_SONG", "SUCCESS", `Successfully added song "${songId}" to private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.addSong', { playlistId: playlist._id, song: newSong, userId: userId });
			return cb({ status: 'success', message: 'Song has been successfully added to the playlist', data: playlist.songs });
		});
	}),

	/**
	 * Adds a set of songs to a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} url - the url of the the YouTube playlist
	 * @param {String} playlistId - the id of the playlist we are adding the set of songs to
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	addSetToPlaylist: hooks.loginRequired((session, url, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				utils.getPlaylistFromYouTube(url, songs => {
					next(null, songs);
				});
			},
			(songs, next) => {
				let processed = 0;
				function checkDone() {
					if (processed === songs.length) next();
				}
				for (let s = 0; sif (playlist.song < songs.length; s++) {
					lib.addSongToPlaylist(session, songs[s].contentDetails.videoId, playlistId, () => {
						processed++;
						checkDone();
					});
				}
			},
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found.');
				next(null, playlist);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_IMPORT", "ERROR", `Importing a YouTube playlist to private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_IMPORT", "SUCCESS", `Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${userId}".`);
			cb({ status: 'success', message: 'Playlist has been successfully imported.', data: playlist.songs });
		});
	}),

	/**
	 * Removes a song from a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song we are removing from the private playlist
	 * @param {String} playlistId - the id of the playlist we are removing the song from
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	removeSongFromPlaylist: hooks.loginRequired((session, songId, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found');
				db.models.update({_id: playlistId}, {$pull: {songs: songId}}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_REMOVE_SONG", "ERROR", `Removing song "${songId}" from private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_REMOVE_SONG", "SUCCESS", `Successfully removed song "${songId}" from private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.removeSong', {playlistId: playlist._id, songId: songId, userId: userId});
			return cb({ status: 'success', message: 'Song has been successfully removed from playlist', data: playlist.songs });
		});
	}),

	/**
	 * Updates the displayName of a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are updating the displayName for
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	updateDisplayName: hooks.loginRequired((session, playlistId, displayName, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.playlist.update({ _id: playlistId, createdBy: userId }, { $set: displayName }, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_UPDATE_DISPLAY_NAME", "ERROR", `Updating display name to "${displayName}" for private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_UPDATE_DISPLAY_NAME", "SUCCESS", `Successfully updated display name to "${displayName}" for private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.updateDisplayName', {playlistId: playlistId, displayName: displayName, userId: userId});
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	}),

	/**
	 * Moves a song to the top of the list in a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {String} songId - the id of the song we are moving to the top of the list
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	moveSongToTop: hooks.loginRequired((session, playlistId, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found');
				async.each(playlist.songs, (song) => {
					if (song._id === songId) return next(true, song);
					next();
				}, (err, song) => {
					if (err === true) return next(null, song);
					next('Song not found');
				});
			},

			(song, next) => {
				db.models.playlist.update({_id: playlistId}, {$pull: {songs: {_id: songId}}}, (err) => {
					if (err) return next(err);
					return next(null, song);
				});
			},

			(song, next) => {
				db.models.playlist.update({_id: playlistId}, {
					$push: {
						songs: {
							$each: [song],
							$position: 0
						}
					}
				}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_MOVE_SONG_TO_TOP", "ERROR", `Moving song "${songId}" to the top for private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_MOVE_SONG_TO_TOP", "SUCCESS", `Successfully moved song "${songId}" to the top for private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.moveSongToTop', {playlistId, songId, userId: userId});
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	}),

	/**
	 * Moves a song to the bottom of the list in a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are moving the song to the bottom from
	 * @param {String} songId - the id of the song we are moving to the bottom of the list
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	moveSongToBottom: hooks.loginRequired((session, playlistId, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== userId) return next('Playlist not found');
				async.each(playlist.songs, (song) => {
					if (song._id === songId) return next(true, song);
					next();
				}, (err, song) => {
					if (err === true) return next(null, song);
					next('Song not found');
				});
			},

			(song, next) => {
				db.models.playlist.update({_id: playlistId}, {$pull: {songs: {_id: songId}}}, (err) => {
					if (err) return next(err);
					return next(null, song);
				});
			},

			(song, next) => {
				db.models.playlist.update({_id: playlistId}, {
					$push: {
						songs: {
							song
						}
					}
				}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], (err, playlist) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_MOVE_SONG_TO_BOTTOM", "ERROR", `Moving song "${songId}" to the bottom for private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_MOVE_SONG_TO_BOTTOM", "SUCCESS", `Successfully moved song "${songId}" to the bottom for private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.moveSongToBottom', {playlistId, songId, userId: userId});
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	}),

	/**
	 * Removes a song from a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	remove: hooks.loginRequired((session, playlistId, cb, userId) => {
		async.waterfall([
			(next) => {
				playlists.deletePlaylist(playlistId, next);
			}
		], (err) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.log("PLAYLIST_REMOVE", "ERROR", `Removing private playlist "${playlistId}" failed for user "${userId}". "${error}"`);
				return cb({ status: 'failure', message: error});
			}
			logger.log("PLAYLIST_REMOVE", "SUCCESS", `Successfully removed private playlist "${playlistId}" for user "${userId}".`);
			cache.pub('playlist.delete', {userId: userId, playlistId});
			return cb({ status: 'success', message: 'Playlist successfully removed' });
		});
	})

};

module.exports = lib;