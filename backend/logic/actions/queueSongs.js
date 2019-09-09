'use strict';

const config = require('config');
const async = require('async');
const request = require('request');

const hooks = require('./hooks');

const moduleManager = require("../../index");

const db = moduleManager.modules["db"];
const utils = moduleManager.modules["utils"];
const logger = moduleManager.modules["logger"];
const cache = moduleManager.modules["cache"];

cache.sub('queue.newSong', songId => {
	db.models.queueSong.findOne({_id: songId}, (err, song) => {
		utils.emitToRoom('admin.queue', 'event:admin.queueSong.added', song);
	});
});

cache.sub('queue.removedSong', songId => {
	utils.emitToRoom('admin.queue', 'event:admin.queueSong.removed', songId);
});

cache.sub('queue.update', songId => {
	db.models.queueSong.findOne({_id: songId}, (err, song) => {
		utils.emitToRoom('admin.queue', 'event:admin.queueSong.updated', song);
	});
});

let lib = {

	/**
	 * Returns the length of the queue songs list
	 *
	 * @param session
	 * @param cb
	 */
	length: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.countDocuments({}, next);
			}
		], async (err, count) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("QUEUE_SONGS_LENGTH", `Failed to get length from queue songs. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("QUEUE_SONGS_LENGTH", `Got length from queue songs successfully.`);
			cb(count);
		});
	}),

	/**
	 * Gets a set of queue songs
	 *
	 * @param session
	 * @param set - the set number to return
	 * @param cb
	 */
	getSet: hooks.adminRequired((session, set, cb) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.find({}).skip(15 * (set - 1)).limit(15).exec(next);
			},
		], async (err, songs) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("QUEUE_SONGS_GET_SET", `Failed to get set from queue songs. "${err}"`);
				return cb({'status': 'failure', 'message': err});
			}
			logger.success("QUEUE_SONGS_GET_SET", `Got set from queue songs successfully.`);
			cb(songs);
		});
	}),

	/**
	 * Updates a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the queuesong that gets updated
	 * @param {Object} updatedSong - the object of the updated queueSong
	 * @param {Function} cb - gets called with the result
	 */
	update: hooks.adminRequired((session, songId, updatedSong, cb) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.findOne({_id: songId}, next);
			},

			(song, next) => {
				if(!song) return next('Song not found');
				let updated = false;
				let $set = {};
				for (let prop in updatedSong) if (updatedSong[prop] !== song[prop]) $set[prop] = updatedSong[prop]; updated = true;
				if (!updated) return next('No properties changed');
				db.models.queueSong.updateOne({_id: songId}, {$set}, {runValidators: true}, next);
			}
		], async (err) => {
			if (err) {
				err = await  utils.getError(err);
				logger.error("QUEUE_UPDATE", `Updating queuesong "${songId}" failed for user ${session.userId}. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			cache.pub('queue.update', songId);
			logger.success("QUEUE_UPDATE", `User "${session.userId}" successfully update queuesong "${songId}".`);
			return cb({status: 'success', message: 'Successfully updated song.'});
		});
	}),

	/**
	 * Removes a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the queuesong that gets removed
	 * @param {Function} cb - gets called with the result
	 */
	remove: hooks.adminRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.deleteOne({_id: songId}, next);
			}
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("QUEUE_REMOVE", `Removing queuesong "${songId}" failed for user ${session.userId}. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			cache.pub('queue.removedSong', songId);
			logger.success("QUEUE_REMOVE", `User "${session.userId}" successfully removed queuesong "${songId}".`);
			return cb({status: 'success', message: 'Successfully updated song.'});
		});
	}),

	/**
	 * Creates a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song that gets added
	 * @param {Function} cb - gets called with the result
	 */
	add: hooks.loginRequired((session, songId, cb) => {
		let requestedAt = Date.now();

		async.waterfall([
			(next) => {
				db.models.queueSong.findOne({songId}, next);
			},

			(song, next) => {
				if (song) return next('This song is already in the queue.');
				db.models.song.findOne({songId}, next);
			},

			// Get YouTube data from id
			(song, next) => {
				if (song) return next('This song has already been added.');
				//TODO Add err object as first param of callback
				utils.getSongFromYouTube(songId, (song) => {
					song.artists = [];
					song.genres = [];
					song.skipDuration = 0;
					song.thumbnail = `${config.get("domain")}/assets/notes.png`;
					song.explicit = false;
					song.requestedBy = session.userId;
					song.requestedAt = requestedAt;
					next(null, song);
				});
			},
			/*(newSong, next) => {
				utils.getSongFromSpotify(newSong, (err, song) => {
					if (!song) next(null, newSong);
					else next(err, song);
				});
			},*/
			(newSong, next) => {
				const song = new db.models.queueSong(newSong);
				song.save((err, song) => {
					if (err) return next(err);
					next(null, song);
				});
			},
			(newSong, next) => {
				db.models.user.findOne({ _id: session.userId }, (err, user) => {
					if (err) next(err, newSong);
					else {
						user.statistics.songsRequested = user.statistics.songsRequested + 1;
						user.save(err => {
							if (err) return next(err, newSong);
							else next(null, newSong);
						});
					}
				});
			}
		], async (err, newSong) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("QUEUE_ADD", `Adding queuesong "${songId}" failed for user ${session.userId}. "${err}"`);
				return cb({status: 'failure', message: err});
			}
			cache.pub('queue.newSong', newSong._id);
			logger.success("QUEUE_ADD", `User "${session.userId}" successfully added queuesong "${songId}".`);
			return cb({ status: 'success', message: 'Successfully added that song to the queue' });
		});
	}),

	/**
	 * Adds a set of songs to the queue
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} url - the url of the the YouTube playlist
	 * @param {Function} cb - gets called with the result
	 */
	addSetToQueue: hooks.loginRequired((session, url, cb) => {
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
					lib.add(session, songs[s].contentDetails.videoId, () => {
						processed++;
						checkDone();
					});
				}
			}
		], async (err) => {
			if (err) {
				err = await utils.getError(err);
				logger.error("QUEUE_IMPORT", `Importing a YouTube playlist to the queue failed for user "${session.userId}". "${err}"`);
				return cb({ status: 'failure', message: err});
			} else {
				logger.success("QUEUE_IMPORT", `Successfully imported a YouTube playlist to the queue for user "${session.userId}".`);
				cb({ status: 'success', message: 'Playlist has been successfully imported.' });
			}
		});
	})
};

module.exports = lib;
