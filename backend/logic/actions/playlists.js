import async from "async";

import { isLoginRequired } from "./hooks";

import moduleManager from "../../index";

const DBModule = moduleManager.modules.db;
const UtilsModule = moduleManager.modules.utils;
const IOModule = moduleManager.modules.io;
const SongsModule = moduleManager.modules.songs;
const CacheModule = moduleManager.modules.cache;
const PlaylistsModule = moduleManager.modules.playlists;
const YouTubeModule = moduleManager.modules.youtube;
const ActivitiesModule = moduleManager.modules.activities;

CacheModule.runJob("SUB", {
	channel: "playlist.create",
	cb: playlist => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: playlist.createdBy }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.create", playlist);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.delete",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.delete", res.playlistId);
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.moveSongToTop",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.moveSongToTop", {
					playlistId: res.playlistId,
					songId: res.songId
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.moveSongToBottom",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.moveSongToBottom", {
					playlistId: res.playlistId,
					songId: res.songId
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.addSong",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.addSong", {
					playlistId: res.playlistId,
					song: res.song
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.removeSong",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.removeSong", {
					playlistId: res.playlistId,
					songId: res.songId
				});
			});
		});
	}
});

CacheModule.runJob("SUB", {
	channel: "playlist.updateDisplayName",
	cb: res => {
		IOModule.runJob("SOCKETS_FROM_USER", { userId: res.userId }, this).then(response => {
			response.sockets.forEach(socket => {
				socket.emit("event:playlist.updateDisplayName", {
					playlistId: res.playlistId,
					displayName: res.displayName
				});
			});
		});
	}
});

export default {
	/**
	 * Gets the first song from a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are getting the first song from
	 * @param {Function} cb - gets called with the result
	 */
	getFirstSong: isLoginRequired(function getFirstSong(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found.");
					return next(null, playlist.songs[0]);
				}
			],
			async (err, song) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_GET_FIRST_SONG",
						`Getting the first song of playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_GET_FIRST_SONG",
					`Successfully got the first song of playlist "${playlistId}" for user "${session.userId}".`
				);
				return cb({
					status: "success",
					song
				});
			}
		);
	}),

	/**
	 * Gets all playlists for the user requesting it
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	indexForUser: isLoginRequired(async function indexForUser(session, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					playlistModel.find({ createdBy: session.userId }, next);
				}
			],
			async (err, playlists) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_INDEX_FOR_USER",
						`Indexing playlists for user "${session.userId}" failed. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_INDEX_FOR_USER",
					`Successfully indexed playlists for user "${session.userId}".`
				);
				return cb({
					status: "success",
					data: playlists
				});
			}
		);
	}),

	/**
	 * Creates a new private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {object} data - the data for the new private playlist
	 * @param {Function} cb - gets called with the result
	 */
	create: isLoginRequired(async function create(session, data, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => (data ? next() : cb({ status: "failure", message: "Invalid data" })),

				next => {
					const { displayName, songs } = data;
					playlistModel.create(
						{
							displayName,
							songs,
							createdBy: session.userId,
							createdAt: Date.now()
						},
						next
					);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_CREATE",
						`Creating private playlist failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				CacheModule.runJob("PUB", {
					channel: "playlist.create",
					value: playlist
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					activityType: "created_playlist",
					payload: [playlist._id]
				});

				this.log(
					"SUCCESS",
					"PLAYLIST_CREATE",
					`Successfully created private playlist for user "${session.userId}".`
				);

				return cb({
					status: "success",
					message: "Successfully created playlist",
					data: {
						_id: playlist._id
					}
				});
			}
		);
	}),

	/**
	 * Gets a playlist from id
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are getting
	 * @param {Function} cb - gets called with the result
	 */
	getPlaylist: isLoginRequired(function getPlaylist(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");
					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_GET",
						`Getting private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_GET",
					`Successfully got private playlist "${playlistId}" for user "${session.userId}".`
				);
				return cb({
					status: "success",
					data: playlist
				});
			}
		);
	}),

	/**
	 * Obtains basic metadata of a playlist in order to format an activity
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the playlist id
	 * @param {Function} cb - callback
	 */
	getPlaylistForActivity(session, playlistId, cb) {
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
						`Failed to obtain metadata of playlist ${playlistId} for activity formatting. "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLISTS_GET_PLAYLIST_FOR_ACTIVITY",
					`Obtained metadata of playlist ${playlistId} for activity formatting successfully.`
				);
				return cb({
					status: "success",
					data: {
						title: playlist.displayName
					}
				});
			}
		);
	},

	// TODO Remove this
	/**
	 * Updates a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are updating
	 * @param {object} playlist - the new private playlist object
	 * @param {Function} cb - gets called with the result
	 */
	update: isLoginRequired(async function update(session, playlistId, playlist, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					playlistModel.updateOne(
						{ _id: playlistId, createdBy: session.userId },
						playlist,
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_UPDATE",
						`Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE",
					`Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
				);
				return cb({
					status: "success",
					data: playlist
				});
			}
		);
	}),

	/**
	 * Updates a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are updating
	 * @param {Function} cb - gets called with the result
	 */
	shuffle: isLoginRequired(async function shuffle(session, playlistId, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					if (!playlistId) return next("No playlist id.");
					return playlistModel.findById(playlistId, next);
				},

				(playlist, next) => {
					UtilsModule.runJob("SHUFFLE", { array: playlist.songs }, this)
						.then(result => {
							next(null, result.array);
						})
						.catch(next);
				},

				(songs, next) => {
					playlistModel.updateOne({ _id: playlistId }, { $set: { songs } }, { runValidators: true }, next);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_SHUFFLE",
						`Updating private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_SHUFFLE",
					`Successfully updated private playlist "${playlistId}" for user "${session.userId}".`
				);
				return cb({
					status: "success",
					message: "Successfully shuffled playlist.",
					data: playlist
				});
			}
		);
	}),

	/**
	 * Adds a song to a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {boolean} isSet - is the song part of a set of songs to be added
	 * @param {string} songId - the id of the song we are trying to add
	 * @param {string} playlistId - the id of the playlist we are adding the song to
	 * @param {Function} cb - gets called with the result
	 */
	addSongToPlaylist: isLoginRequired(async function addSongToPlaylist(session, isSet, songId, playlistId, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							if (!playlist || playlist.createdBy !== session.userId)
								return next("Something went wrong when trying to get the playlist");

							return async.each(
								playlist.songs,
								(song, next) => {
									if (song.songId === songId) return next("That song is already in the playlist");
									return next();
								},
								next
							);
						})
						.catch(next);
				},
				next => {
					SongsModule.runJob("GET_SONG", { id: songId }, this)
						.then(response => {
							const { song } = response;
							next(null, {
								_id: song._id,
								songId,
								title: song.title,
								duration: song.duration
							});
						})
						.catch(() => {
							YouTubeModule.runJob("GET_SONG", { songId }, this)
								.then(response => next(null, response.song))
								.catch(next);
						});
				},
				(newSong, next) => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{ $push: { songs: newSong } },
						{ runValidators: true },
						err => {
							if (err) return next(err);
							return PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
								.then(playlist => next(null, playlist, newSong))
								.catch(next);
						}
					);
				}
			],
			async (err, playlist, newSong) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_ADD_SONG",
						`Adding song "${songId}" to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_ADD_SONG",
					`Successfully added song "${songId}" to private playlist "${playlistId}" for user "${session.userId}".`
				);
				if (!isSet)
					ActivitiesModule.runJob("ADD_ACTIVITY", {
						userId: session.userId,
						activityType: "added_song_to_playlist",
						payload: [{ songId, playlistId }]
					});

				CacheModule.runJob("PUB", {
					channel: "playlist.addSong",
					value: {
						playlistId: playlist._id,
						song: newSong,
						userId: session.userId
					}
				});
				return cb({
					status: "success",
					message: "Song has been successfully added to the playlist",
					data: playlist.songs
				});
			}
		);
	}),

	/**
	 * Adds a set of songs to a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} url - the url of the the YouTube playlist
	 * @param {string} playlistId - the id of the playlist we are adding the set of songs to
	 * @param {boolean} musicOnly - whether to only add music to the playlist
	 * @param {Function} cb - gets called with the result
	 */
	addSetToPlaylist: isLoginRequired(function addSetToPlaylist(session, url, playlistId, musicOnly, cb) {
		let videosInPlaylistTotal = 0;
		let songsInPlaylistTotal = 0;
		let addSongsStats = null;

		const addedSongs = [];

		async.waterfall(
			[
				next => {
					YouTubeModule.runJob(
						"GET_PLAYLIST",
						{
							url,
							musicOnly
						},
						this
					).then(response => {
						if (response.filteredSongs) {
							videosInPlaylistTotal = response.songs.length;
							songsInPlaylistTotal = response.filteredSongs.length;
						} else {
							songsInPlaylistTotal = videosInPlaylistTotal = response.songs.length;
						}
						next(null, response.songs);
					});
				},
				(songIds, next) => {
					let processed = 0;
					let successful = 0;
					let failed = 0;
					let alreadyInPlaylist = 0;

					if (songIds.length === 0) next();

					songIds.forEach(songId => {
						IOModule.runJob(
							"RUN_ACTION2",
							{
								session,
								namespace: "playlists",
								action: "addSongToPlaylist",
								args: [true, songId, playlistId]
							},
							this
						)
							.then(res => {
								if (res.status === "success") {
									successful += 1;
									addedSongs.push(songId);
								} else failed += 1;
								if (res.message === "That song is already in the playlist") alreadyInPlaylist += 1;
							})
							.catch(() => {
								failed += 1;
							})
							.finally(() => {
								processed += 1;
								if (processed === songIds.length) {
									addSongsStats = { successful, failed, alreadyInPlaylist };
									next(null);
								}
							});
					});
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found.");
					return next(null, playlist);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_IMPORT",
						`Importing a YouTube playlist to private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					activityType: "added_songs_to_playlist",
					payload: addedSongs
				});
				this.log(
					"SUCCESS",
					"PLAYLIST_IMPORT",
					`Successfully imported a YouTube playlist to private playlist "${playlistId}" for user "${session.userId}". Videos in playlist: ${videosInPlaylistTotal}, songs in playlist: ${songsInPlaylistTotal}, songs successfully added: ${addSongsStats.successful}, songs failed: ${addSongsStats.failed}, already in playlist: ${addSongsStats.alreadyInPlaylist}.`
				);
				return cb({
					status: "success",
					message: `Playlist has been imported. ${addSongsStats.successful} were addedd successfully, ${addSongsStats.failed} failed (${addSongsStats.alreadyInPlaylist} were already in the playlist)`,
					data: playlist.songs,
					stats: {
						videosInPlaylistTotal,
						songsInPlaylistTotal
					}
				});
			}
		);
	}),

	/**
	 * Removes a song from a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} songId - the id of the song we are removing from the private playlist
	 * @param {string} playlistId - the id of the playlist we are removing the song from
	 * @param {Function} cb - gets called with the result
	 */
	removeSongFromPlaylist: isLoginRequired(async function removeSongFromPlaylist(session, songId, playlistId, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					if (!songId || typeof songId !== "string") return next("Invalid song id.");
					if (!playlistId || typeof playlistId !== "string") return next("Invalid playlist id.");
					return next();
				},

				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");
					return playlistModel.updateOne({ _id: playlistId }, { $pull: { songs: { songId } } }, next);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async (err, playlist) => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_REMOVE_SONG",
						`Removing song "${songId}" from private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_REMOVE_SONG",
					`Successfully removed song "${songId}" from private playlist "${playlistId}" for user "${session.userId}".`
				);
				CacheModule.runJob("PUB", {
					channel: "playlist.removeSong",
					value: {
						playlistId: playlist._id,
						songId,
						userId: session.userId
					}
				});
				return cb({
					status: "success",
					message: "Song has been successfully removed from playlist",
					data: playlist.songs
				});
			}
		);
	}),

	/**
	 * Updates the displayName of a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are updating the displayName for
	 * @param {Function} cb - gets called with the result
	 */
	updateDisplayName: isLoginRequired(async function updateDisplayName(session, playlistId, displayName, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					playlistModel.updateOne(
						{ _id: playlistId, createdBy: session.userId },
						{ $set: { displayName } },
						{ runValidators: true },
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_UPDATE_DISPLAY_NAME",
						`Updating display name to "${displayName}" for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}
				this.log(
					"SUCCESS",
					"PLAYLIST_UPDATE_DISPLAY_NAME",
					`Successfully updated display name to "${displayName}" for private playlist "${playlistId}" for user "${session.userId}".`
				);
				CacheModule.runJob("PUB", {
					channel: "playlist.updateDisplayName",
					value: {
						playlistId,
						displayName,
						userId: session.userId
					}
				});
				return cb({
					status: "success",
					message: "Playlist has been successfully updated"
				});
			}
		);
	}),

	/**
	 * Moves a song to the top of the list in a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {string} songId - the id of the song we are moving to the top of the list
	 * @param {Function} cb - gets called with the result
	 */
	moveSongToTop: isLoginRequired(async function moveSongToTop(session, playlistId, songId, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");
					return async.each(
						playlist.songs,
						(song, next) => {
							if (song.songId === songId) return next(song);
							return next();
						},
						err => {
							if (err && err.songId) return next(null, err);
							return next("Song not found");
						}
					);
				},

				(song, next) => {
					playlistModel.updateOne({ _id: playlistId }, { $pull: { songs: { songId } } }, err => {
						if (err) return next(err);
						return next(null, song);
					});
				},

				(song, next) => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{
							$push: {
								songs: {
									$each: [song],
									$position: 0
								}
							}
						},
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_MOVE_SONG_TO_TOP",
						`Moving song "${songId}" to the top for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_MOVE_SONG_TO_TOP",
					`Successfully moved song "${songId}" to the top for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.moveSongToTop",
					value: {
						playlistId,
						songId,
						userId: session.userId
					}
				});

				return cb({
					status: "success",
					message: "Playlist has been successfully updated"
				});
			}
		);
	}),

	/**
	 * Moves a song to the bottom of the list in a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are moving the song to the bottom from
	 * @param {string} songId - the id of the song we are moving to the bottom of the list
	 * @param {Function} cb - gets called with the result
	 */
	moveSongToBottom: isLoginRequired(async function moveSongToBottom(session, playlistId, songId, cb) {
		const playlistModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "playlist"
			},
			this
		);
		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("GET_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				},

				(playlist, next) => {
					if (!playlist || playlist.createdBy !== session.userId) return next("Playlist not found");
					return async.each(
						playlist.songs,
						(song, next) => {
							if (song.songId === songId) return next(song);
							return next();
						},
						err => {
							if (err && err.songId) return next(null, err);
							return next("Song not found");
						}
					);
				},

				(song, next) => {
					playlistModel.updateOne({ _id: playlistId }, { $pull: { songs: { songId } } }, err => {
						if (err) return next(err);
						return next(null, song);
					});
				},

				(song, next) => {
					playlistModel.updateOne(
						{ _id: playlistId },
						{
							$push: {
								songs: song
							}
						},
						next
					);
				},

				(res, next) => {
					PlaylistsModule.runJob("UPDATE_PLAYLIST", { playlistId }, this)
						.then(playlist => {
							next(null, playlist);
						})
						.catch(next);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_MOVE_SONG_TO_BOTTOM",
						`Moving song "${songId}" to the bottom for private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_MOVE_SONG_TO_BOTTOM",
					`Successfully moved song "${songId}" to the bottom for private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.moveSongToBottom",
					value: {
						playlistId,
						songId,
						userId: session.userId
					}
				});

				return cb({
					status: "success",
					message: "Playlist has been successfully updated"
				});
			}
		);
	}),

	/**
	 * Removes a private playlist
	 *
	 * @param {object} session - the session object automatically added by socket.io
	 * @param {string} playlistId - the id of the playlist we are moving the song to the top from
	 * @param {Function} cb - gets called with the result
	 */
	remove: isLoginRequired(async function remove(session, playlistId, cb) {
		const stationModel = await DBModule.runJob(
			"GET_MODEL",
			{
				modelName: "station"
			},
			this
		);

		async.waterfall(
			[
				next => {
					PlaylistsModule.runJob("DELETE_PLAYLIST", { playlistId }, this).then(next).catch(next);
				},

				next => {
					stationModel.find({ privatePlaylist: playlistId }, (err, res) => {
						next(err, res);
					});
				},

				(stations, next) => {
					async.each(
						stations,
						(station, next) => {
							async.waterfall(
								[
									next => {
										stationModel.updateOne(
											{ _id: station._id },
											{ $set: { privatePlaylist: null } },
											{ runValidators: true },
											next
										);
									},

									(res, next) => {
										if (!station.partyMode) {
											moduleManager.modules.stations
												.runJob(
													"UPDATE_STATION",
													{
														stationId: station._id
													},
													this
												)
												.then(station => next(null, station))
												.catch(next);
											CacheModule.runJob("PUB", {
												channel: "privatePlaylist.selected",
												value: {
													playlistId: null,
													stationId: station._id
												}
											});
										} else next();
									}
								],

								() => {
									next();
								}
							);
						},
						() => {
							next();
						}
					);
				}
			],
			async err => {
				if (err) {
					err = await UtilsModule.runJob("GET_ERROR", { error: err }, this);
					this.log(
						"ERROR",
						"PLAYLIST_REMOVE",
						`Removing private playlist "${playlistId}" failed for user "${session.userId}". "${err}"`
					);
					return cb({ status: "failure", message: err });
				}

				this.log(
					"SUCCESS",
					"PLAYLIST_REMOVE",
					`Successfully removed private playlist "${playlistId}" for user "${session.userId}".`
				);

				CacheModule.runJob("PUB", {
					channel: "playlist.delete",
					value: {
						userId: session.userId,
						playlistId
					}
				});

				ActivitiesModule.runJob("ADD_ACTIVITY", {
					userId: session.userId,
					activityType: "deleted_playlist",
					payload: [playlistId]
				});

				return cb({
					status: "success",
					message: "Playlist successfully removed"
				});
			}
		);
	})
};
