'use strict';

const async = require('async');

const hooks = require('./hooks');
const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];
const playlists = moduleManager.modules["playlists"];
const songs = moduleManager.modules["songs"];

cache.sub('playlist.create', playlistId => {
	playlists.getPlaylist(playlistId, (err, playlist) => {
		if (!err) {
			utils.socketsFromUser(playlist.createdBy, (sockets) => {
				sockets.forEach(socket => {
					socket.emit('event:playlist.create', playlist);
				});
			});
		}
	});
});

cache.sub('playlist.delete', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.delete', res.playlistId);
		});
	});
});

cache.sub('playlist.moveSongToTop', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.moveSongToTop', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.moveSongToBottom', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.moveSongToBottom', {playlistId: res.playlistId, songId: res.songId});
		});
	});
});

cache.sub('playlist.addSong', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.addSong', { playlistId: res.playlistId, song: res.song });
		});
	});
});

cache.sub('playlist.removeSong', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.removeSong', { playlistId: res.playlistId, songId: res.songId });
		});
	});
});

cache.sub('playlist.updateDisplayName', res => {
	utils.socketsFromUser(res.userId, sockets => {
		sockets.forEach(socket => {
			socket.emit('event:playlist.updateDisplayName', { playlistId: res.playlistId, displayName: res.displayName });
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
	 */
	getFirstSong: hooks.loginRequired((session, playlistId, cb) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found.');
				next(null, playlist.songs[0]);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_GET_FIRST_SONG", `Getting the first song of playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_GET_FIRST_SONG", `Successfully got the first song of playlist "${playlistId}" for user "${session.userId}".`);
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
	 */
	indexForUser: hooks.loginRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.playlist.find({ createdBy: session.userId }, next);
			}
		], async (err, playlists) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_INDEX_FOR_USER", `Indexing playlists for user "${session.userId}" failed. "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_INDEX_FOR_USER", `Successfully indexed playlists for user "${session.userId}".`);
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
	 */
	create: hooks.loginRequired((session, data, cb) => {
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			(next) => {
				const { displayName, songs } = data;
				db.models.playlist.create({
					displayName,
					songs,
					createdBy: session.userId,
					createdAt: Date.now()
				}, next);
			}

		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_CREATE", `Creating private playlist failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			cache.pub('playlist.create', playlist._id);
			logger.success("PLAYLIST_CREATE", `Successfully created private playlist for user "${session.userId}".`);
			cb({ status: 'success', message: 'Successfully created playlist', data: {
				_id: playlist._id
			} });
		});
	}),

	/**
	 * Gets a playlist from id
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are getting
	 * @param {Function} cb - gets called with the result
	 */
	getPlaylist: hooks.loginRequired((session, playlistId, cb) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found');
				next(null, playlist);
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_GET", `Getting private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_GET", `Successfully got private playlist "${playlistId}" for user "${session.userId}".`);
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
	 */
	update: hooks.loginRequired((session, playlistId, playlist, cb) => {
		async.waterfall([
			(next) => {
				db.models.playlist.updateOne({ _id: playlistId, createdBy: session.userId }, playlist, {runValidators: true}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next)
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_UPDATE", `Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_UPDATE", `Successfully updated private playlist "${playlistId}" for user "${session.userId}".`);
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
	 */
	addSongToPlaylist: hooks.loginRequired((session, songId, playlistId, cb) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, (err, playlist) => {
					if (err || !playlist || playlist.createdBy !== session.userId) return next('Something went wrong when trying to get the playlist');

					async.each(playlist.songs, (song, next) => {
						if (song.songId === songId) return next('That song is already in the playlist');
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
							_id: song._id,
							songId: songId,
							title: song.title,
							duration: song.duration
						});
					}
				});
			},
			(newSong, next) => {
				db.models.playlist.updateOne({_id: playlistId}, {$push: {songs: newSong}}, {runValidators: true}, (err) => {
					if (err) return next(err);
					playlists.updatePlaylist(playlistId, (err, playlist) => {
						next(err, playlist, newSong);
					});
				});
			}
		],
		async (err, playlist, newSong) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_ADD_SONG", `Adding song "${songId}" to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			} else {
				logger.success("PLAYLIST_ADD_SONG", `Successfully added song "${songId}" to private playlist "${playlistId}" for user "${session.userId}".`);
				cache.pub('playlist.addSong', { playlistId: playlist._id, song: newSong, userId: session.userId });
				return cb({ status: 'success', message: 'Song has been successfully added to the playlist', data: playlist.songs });
			}
		});
	}),

	/**
	 * Adds a set of songs to a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} url - the url of the the YouTube playlist
	 * @param {String} playlistId - the id of the playlist we are adding the set of songs to
	 * @param {Function} cb - gets called with the result
	 */
	addSetToPlaylist: hooks.loginRequired((session, url, playlistId, cb) => {
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
				for (let s = 0; s < songs.length; s++) {
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
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found.');
				next(null, playlist);
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_IMPORT", `Importing a YouTube playlist to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			} else {
				logger.success("PLAYLIST_IMPORT", `Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${session.userId}".`);
				cb({ status: 'success', message: 'Playlist has been successfully imported.', data: playlist.songs });
			}
		});
	}),

	/**
	 * Removes a song from a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song we are removing from the private playlist
	 * @param {String} playlistId - the id of the playlist we are removing the song from
	 * @param {Function} cb - gets called with the result
	 */
	removeSongFromPlaylist: hooks.loginRequired((session, songId, playlistId, cb) => {
		async.waterfall([
			(next) => {
				if (!songId || typeof songId !== 'string') return next('Invalid song id.');
				if (!playlistId  || typeof playlistId !== 'string') return next('Invalid playlist id.');
				next();
			},

			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found');
				db.models.playlist.updateOne({_id: playlistId}, {$pull: {songs: {songId: songId}}}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_REMOVE_SONG", `Removing song "${songId}" from private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			} else {
				logger.success("PLAYLIST_REMOVE_SONG", `Successfully removed song "${songId}" from private playlist "${playlistId}" for user "${session.userId}".`);
				cache.pub('playlist.removeSong', { playlistId: playlist._id, songId: songId, userId: session.userId });
				return cb({ status: 'success', message: 'Song has been successfully removed from playlist', data: playlist.songs });
			}
		});
	}),

	/**
	 * Updates the displayName of a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are updating the displayName for
	 * @param {Function} cb - gets called with the result
	 */
	updateDisplayName: hooks.loginRequired((session, playlistId, displayName, cb) => {
		async.waterfall([
			(next) => {
				db.models.playlist.updateOne({ _id: playlistId, createdBy: session.userId }, { $set: { displayName } }, {runValidators: true}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_UPDATE_DISPLAY_NAME", `Updating display name to "${displayName}" for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_UPDATE_DISPLAY_NAME", `Successfully updated display name to "${displayName}" for private playlist "${playlistId}" for user "${session.userId}".`);
			cache.pub('playlist.updateDisplayName', {playlistId: playlistId, displayName: displayName, userId: session.userId});
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
	 */
	moveSongToTop: hooks.loginRequired((session, playlistId, songId, cb) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found');
				async.each(playlist.songs, (song, next) => {
					if (song.songId === songId) return next(song);
					next();
				}, (err) => {
					if (err && err.songId) return next(null, err);
					next('Song not found');
				});
			},

			(song, next) => {
				db.models.playlist.updateOne({_id: playlistId}, {$pull: {songs: {songId}}}, (err) => {
					if (err) return next(err);
					return next(null, song);
				});
			},

			(song, next) => {
				db.models.playlist.updateOne({_id: playlistId}, {
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
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_MOVE_SONG_TO_TOP", `Moving song "${songId}" to the top for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_MOVE_SONG_TO_TOP", `Successfully moved song "${songId}" to the top for private playlist "${playlistId}" for user "${session.userId}".`);
			cache.pub('playlist.moveSongToTop', {playlistId, songId, userId: session.userId});
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
	 */
	moveSongToBottom: hooks.loginRequired((session, playlistId, songId, cb) => {
		async.waterfall([
			(next) => {
				playlists.getPlaylist(playlistId, next);
			},

			(playlist, next) => {
				if (!playlist || playlist.createdBy !== session.userId) return next('Playlist not found');
				async.each(playlist.songs, (song, next) => {
					if (song.songId === songId) return next(song);
					next();
				}, (err) => {
					if (err && err.songId) return next(null, err);
					next('Song not found');
				});
			},

			(song, next) => {
				db.models.playlist.updateOne({_id: playlistId}, {$pull: {songs: {songId}}}, (err) => {
					if (err) return next(err);
					return next(null, song);
				});
			},

			(song, next) => {
				db.models.playlist.updateOne({_id: playlistId}, {
					$push: {
						songs: song
					}
				}, next);
			},

			(res, next) => {
				playlists.updatePlaylist(playlistId, next);
			}
		], async (err, playlist) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_MOVE_SONG_TO_BOTTOM", `Moving song "${songId}" to the bottom for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_MOVE_SONG_TO_BOTTOM", `Successfully moved song "${songId}" to the bottom for private playlist "${playlistId}" for user "${session.userId}".`);
			cache.pub('playlist.moveSongToBottom', {playlistId, songId, userId: session.userId});
			return cb({ status: 'success', message: 'Playlist has been successfully updated' });
		});
	}),

	/**
	 * Removes a private playlist
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {Function} cb - gets called with the result
	 */
	remove: hooks.loginRequired((session, playlistId, cb) => {
		async.waterfall([
			(next) => {
				playlists.deletePlaylist(playlistId, next);
			}
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("PLAYLIST_REMOVE", `Removing private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			}
			logger.success("PLAYLIST_REMOVE", `Successfully removed private playlist "${playlistId}" for user "${session.userId}".`);
			cache.pub('playlist.delete', {userId: session.userId, playlistId});
			return cb({ status: 'success', message: 'Playlist successfully removed' });
		});
	})

};

module.exports = lib;
