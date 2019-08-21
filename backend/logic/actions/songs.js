'use strict';

const async = require('async');

const hooks = require('./hooks');
const queueSongs = require('./queueSongs');

const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const songs = moduleManager.modules["songs"];
const cache = moduleManager.modules["cache"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];

cache.sub('song.removed', songId => {
	utils.emitToRoom('admin.songs', 'event:admin.song.removed', songId);
});

cache.sub('song.added', songId => {
	db.models.song.findOne({_id: songId}, (err, song) => {
		utils.emitToRoom('admin.songs', 'event:admin.song.added', song);
	});
});

cache.sub('song.updated', songId => {
	db.models.song.findOne({_id: songId}, (err, song) => {
		utils.emitToRoom('admin.songs', 'event:admin.song.updated', song);
	});
});

cache.sub('song.like', (data) => {
	utils.emitToRoom(`song.${data.songId}`, 'event:song.like', {songId: data.songId, likes: data.likes, dislikes: data.dislikes});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: true, disliked: false});
		});
	});
});

cache.sub('song.dislike', (data) => {
	utils.emitToRoom(`song.${data.songId}`, 'event:song.dislike', {songId: data.songId, likes: data.likes, dislikes: data.dislikes});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: true});
		});
	});
});

cache.sub('song.unlike', (data) => {
	utils.emitToRoom(`song.${data.songId}`, 'event:song.unlike', {songId: data.songId, likes: data.likes, dislikes: data.dislikes});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: false});
		});
	});
});

cache.sub('song.undislike', (data) => {
	utils.emitToRoom(`song.${data.songId}`, 'event:song.undislike', {songId: data.songId, likes: data.likes, dislikes: data.dislikes});
	utils.socketsFromUser(data.userId, (sockets) => {
		sockets.forEach((socket) => {
			socket.emit('event:song.newRatings', {songId: data.songId, liked: false, disliked: false});
		});
	});
});

module.exports = {

	/**
	 * Returns the length of the songs list
	 *
	 * @param session
	 * @param cb
	 */
	length: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.song.countDocuments({}, next);
			}
		], async (err, count) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_LENGTH", `Failed to get length from songs. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("SONGS_LENGTH", `Got length from songs successfully.`);
			cb(count);
		});
	}),

	/**
	 * Gets a set of songs
	 *
	 * @param session
	 * @param set - the set number to return
	 * @param cb
	 */
	getSet: hooks.adminRequired((session, set, cb) => {
		async.waterfall([
			(next) => {
				db.models.song.find({}).limit(15 * set).exec(next);
			}
		], async (err, songs) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_GET_SET", `Failed to get set from songs. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("SONGS_GET_SET", `Got set from songs successfully.`);
			logger.stationIssue(songs.length, true);
			logger.stationIssue(Math.max(songs.length - 15, 0), true);
			cb(songs.splice(Math.max(songs.length - 15, 0)));
		});
	}),

	/**
	 * Gets a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 */
	getSong: hooks.adminRequired((session, songId, cb) => {
		console.log(songId);

		async.waterfall([
			(next) => {
				db.models.song.findOne({ songId }).exec(next);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_GET_SONG", `Failed to get song ${songId}. "${err}"`);
				return cb({ status: 'failure', message: err });
			} else {
				logger.success("SONGS_GET_SONG", `Got song ${songId} successfully.`);
				cb({ status: "success", data: song });
			}
		});
	}),

	/**
	 * Updates a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param song - the updated song object
	 * @param cb
	 */
	update: hooks.adminRequired((session, songId, song, cb) => {
		async.waterfall([
			(next) => {
				db.models.song.updateOne({_id: songId}, song, {runValidators: true}, next);
			},

			(res, next) => {
				songs.updateSong(songId, next);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_UPDATE", `Failed to update song "${songId}". "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("SONGS_UPDATE", `Successfully updated song "${songId}".`);
			cache.pub('song.updated', song.songId);
			cb({ status: 'success', message: 'Song has been successfully updated', data: song });
		});
	}),

	/**
	 * Removes a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 */
	remove: hooks.adminRequired((session, songId, cb) => {
		async.waterfall([
			(next) => {
				db.models.song.deleteOne({_id: songId}, next);
			},

			(res, next) => {//TODO Check if res gets returned from above
				cache.hdel('songs', songId, next);
			}
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_UPDATE", `Failed to remove song "${songId}". "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("SONGS_UPDATE", `Successfully remove song "${songId}".`);
			cache.pub('song.removed', songId);
			cb({status: 'success', message: 'Song has been successfully updated'});
		});
	}),

	/**
	 * Adds a song
	 *
	 * @param session
	 * @param song - the song object
	 * @param cb
	 * @param userId
	 */
	add: hooks.adminRequired((session, song, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId: song.songId}, next);
			},

			(existingSong, next) => {
				if (existingSong) return next('Song is already in rotation.');
				next();
			},

			(next) => {
				const newSong = new db.models.song(song);
				newSong.acceptedBy = userId;
				newSong.acceptedAt = Date.now();
				newSong.save(next);
			},

			(res, next) => {
				queueSongs.remove(session, song._id, () => {
					next();
				});
			},
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_ADD", `User "${userId}" failed to add song. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("SONGS_ADD", `User "${userId}" successfully added song "${song.songId}".`);
			cache.pub('song.added', song.songId);
			cb({status: 'success', message: 'Song has been moved from the queue successfully.'});
		});
		//TODO Check if video is in queue and Add the song to the appropriate stations
	}),

	/**
	 * Likes a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	like: hooks.loginRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId}, next);
			},

			(song, next) => {
				if (!song) return next('No song found with that id.');
				next(null, song);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_LIKE", `User "${userId}" failed to like song ${songId}. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			let oldSongId = songId;
			songId = song._id;
			db.models.user.findOne({ _id: userId }, (err, user) => {
				if (user.liked.indexOf(songId) !== -1) return cb({ status: 'failure', message: 'You have already liked this song.' });
				db.models.user.updateOne({_id: userId}, {$push: {liked: songId}, $pull: {disliked: songId}}, err => {
					if (!err) {
						db.models.user.countDocuments({"liked": songId}, (err, likes) => {
							if (err) return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
							db.models.user.countDocuments({"disliked": songId}, (err, dislikes) => {
								if (err) return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
								db.models.song.update({_id: songId}, {$set: {likes: likes, dislikes: dislikes}}, (err) => {
									if (err) return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
									songs.updateSong(songId, (err, song) => {});
									cache.pub('song.like', JSON.stringify({ songId: oldSongId, userId: session.userId, likes: likes, dislikes: dislikes }));
									return cb({ status: 'success', message: 'You have successfully liked this song.' });
								});
							});
						});
					} else return cb({ status: 'failure', message: 'Something went wrong while liking this song.' });
				});
			});
		});
	}),

	/**
	 * Dislikes a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	dislike: hooks.loginRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId}, next);
			},

			(song, next) => {
				if (!song) return next('No song found with that id.');
				next(null, song);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_DISLIKE", `User "${userId}" failed to like song ${songId}. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			let oldSongId = songId;
			songId = song._id;
			db.models.user.findOne({ _id: userId }, (err, user) => {
				if (user.disliked.indexOf(songId) !== -1) return cb({ status: 'failure', message: 'You have already disliked this song.' });
				db.models.user.updateOne({_id: userId}, {$push: {disliked: songId}, $pull: {liked: songId}}, err => {
					if (!err) {
						db.models.user.countDocuments({"liked": songId}, (err, likes) => {
							if (err) return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
							db.models.user.countDocuments({"disliked": songId}, (err, dislikes) => {
								if (err) return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
								db.models.song.update({_id: songId}, {$set: {likes: likes, dislikes: dislikes}}, (err, res) => {
									if (err) return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
									songs.updateSong(songId, (err, song) => {});
									cache.pub('song.dislike', JSON.stringify({ songId: oldSongId, userId: session.userId, likes: likes, dislikes: dislikes }));
									return cb({ status: 'success', message: 'You have successfully disliked this song.' });
								});
							});
						});
					} else return cb({ status: 'failure', message: 'Something went wrong while disliking this song.' });
				});
			});
		});
	}),

	/**
	 * Undislikes a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	undislike: hooks.loginRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId}, next);
			},

			(song, next) => {
				if (!song) return next('No song found with that id.');
				next(null, song);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_UNDISLIKE", `User "${userId}" failed to like song ${songId}. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			let oldSongId = songId;
			songId = song._id;
			db.models.user.findOne({_id: userId}, (err, user) => {
				if (user.disliked.indexOf(songId) === -1) return cb({
					status: 'failure',
					message: 'You have not disliked this song.'
				});
				db.models.user.updateOne({_id: userId}, {$pull: {liked: songId, disliked: songId}}, err => {
					if (!err) {
						db.models.user.countDocuments({"liked": songId}, (err, likes) => {
							if (err) return cb({
								status: 'failure',
								message: 'Something went wrong while undisliking this song.'
							});
							db.models.user.countDocuments({"disliked": songId}, (err, dislikes) => {
								if (err) return cb({
									status: 'failure',
									message: 'Something went wrong while undisliking this song.'
								});
								db.models.song.update({_id: songId}, {$set: {likes: likes, dislikes: dislikes}}, (err) => {
									if (err) return cb({
										status: 'failure',
										message: 'Something went wrong while undisliking this song.'
									});
									songs.updateSong(songId, (err, song) => {
									});
									cache.pub('song.undislike', JSON.stringify({
										songId: oldSongId,
										userId: session.userId,
										likes: likes,
										dislikes: dislikes
									}));
									return cb({
										status: 'success',
										message: 'You have successfully undisliked this song.'
									});
								});
							});
						});
					} else return cb({status: 'failure', message: 'Something went wrong while undisliking this song.'});
				});
			});
		});
	}),

	/**
	 * Unlikes a song
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	unlike: hooks.loginRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId}, next);
			},

			(song, next) => {
				if (!song) return next('No song found with that id.');
				next(null, song);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_UNLIKE", `User "${userId}" failed to like song ${songId}. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			let oldSongId = songId;
			songId = song._id;
			db.models.user.findOne({ _id: userId }, (err, user) => {
				if (user.liked.indexOf(songId) === -1) return cb({ status: 'failure', message: 'You have not liked this song.' });
				db.models.user.updateOne({_id: userId}, {$pull: {liked: songId, disliked: songId}}, err => {
					if (!err) {
						db.models.user.countDocuments({"liked": songId}, (err, likes) => {
							if (err) return cb({ status: 'failure', message: 'Something went wrong while unliking this song.' });
							db.models.user.countDocuments({"disliked": songId}, (err, dislikes) => {
								if (err) return cb({ status: 'failure', message: 'Something went wrong while undiking this song.' });
								db.models.song.updateOne({_id: songId}, {$set: {likes: likes, dislikes: dislikes}}, (err) => {
									if (err) return cb({ status: 'failure', message: 'Something went wrong while unliking this song.' });
									songs.updateSong(songId, (err, song) => {});
									cache.pub('song.unlike', JSON.stringify({ songId: oldSongId, userId: session.userId, likes: likes, dislikes: dislikes }));
									return cb({ status: 'success', message: 'You have successfully unliked this song.' });
								});
							});
						});
					} else return cb({ status: 'failure', message: 'Something went wrong while unliking this song.' });
				});
			});
		});
	}),

	/**
	 * Gets user's own song ratings
	 *
	 * @param session
	 * @param songId - the song id
	 * @param cb
	 * @param userId
	 */
	getOwnSongRatings: hooks.loginRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.song.findOne({songId}, next);
			},

			(song, next) => {
				if (!song) return next('No song found with that id.');
				next(null, song);
			}
		], async (err, song) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("SONGS_GET_OWN_RATINGS", `User "${userId}" failed to get ratings for ${songId}. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			let newSongId = song._id;
			db.models.user.findOne({_id: userId}, (err, user) => {
				if (!err && user) {
					return cb({
						status: 'success',
						songId: songId,
						liked: (user.liked.indexOf(newSongId) !== -1),
						disliked: (user.disliked.indexOf(newSongId) !== -1)
					});
				} else {
					return cb({
						status: 'failure',
						message: utils.getError(err)
					});
				}
			});
		});
	})
};
