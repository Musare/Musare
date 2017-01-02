'use strict';

const db = require('../db');
const utils = require('../utils');
const logger = require('../logger');
const notifications = require('../notifications');
const cache = require('../cache');
const async = require('async');
const config = require('config');
const request = require('request');
const hooks = require('./hooks');

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

module.exports = {

	/**
	 * Gets all queuesongs
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {Function} cb - gets called with the result
	 */
	index: hooks.adminRequired((session, cb) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.find({}, next);
			}
		], (err, songs) => {
			if (err) {
				logger.error("QUEUE_INDEX", `Indexing queuesongs failed. "${err.message}"`);
				return cb({status: 'failure', message: 'Something went wrong.'});
			} else {
				module.exports.getSet(session, 1, result => {
					logger.success("QUEUE_INDEX", `Indexing queuesongs successful.`);
					return cb({
						songs: result,
						maxLength: songs.length
					});
				});
			}
		});
	}),

	getSet: hooks.adminRequired((session, set, cb) => {
		db.models.queueSong.find({}).limit(50 * set).exec((err, songs) => {
			if (err) throw err;
			cb(songs.splice(Math.max(songs.length - 50, 0)));
		});
	}),

	/**
	 * Updates a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the queuesong that gets updated
	 * @param {Object} updatedSong - the object of the updated queueSong
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	update: hooks.adminRequired((session, songId, updatedSong, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.findOne({ _id: songId }, next);
			},

			(song, next) => {
				if(!song) return next('Song not found');
				let updated = false;
				let $set = {};
				for (let prop in updatedSong) if (updatedSong[prop] !== song[prop]) $set[prop] = updatedSong[prop]; updated = true;
				if (!updated) return next('No properties changed');
				db.models.queueSong.update({ _id: songId }, {$set}, next);
			}
		], (err) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.error("QUEUE_UPDATE", `Updating queuesong "${songId}" failed for user ${userId}. "${err.message}"`);
				return cb({status: 'failure', message: error});
			}
			cache.pub('queue.update', songId);
			logger.success("QUEUE_UPDATE", `User "${userId}" successfully update queuesong "${songId}".`);
			return cb({status: 'success', message: 'Successfully updated song.'});
		});
	}),

	/**
	 * Removes a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the queuesong that gets removed
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	remove: hooks.adminRequired((session, songId, cb, userId) => {
		async.waterfall([
			(next) => {
				db.models.queueSong.remove({ _id: songId }, next);
			}
		], (err) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				logger.error("QUEUE_REMOVE", `Removing queuesong "${songId}" failed for user ${userId}. "${err.message}"`);
				return cb({status: 'failure', message: error});
			}
			cache.pub('queue.removedSong', songId);
			logger.success("QUEUE_REMOVE", `User "${userId}" successfully removed queuesong "${songId}".`);
			return cb({status: 'success', message: 'Successfully updated song.'});
		});
	}),

	/**
	 * Creates a queuesong
	 *
	 * @param {Object} session - the session object automatically added by socket.io
	 * @param {String} songId - the id of the song that gets added
	 * @param {Function} cb - gets called with the result
	 * @param {String} userId - the userId automatically added by hooks
	 */
	add: hooks.loginRequired((session, songId, cb, userId) => {
		let requestedAt = Date.now();

		async.waterfall([
			(next) => {
				db.models.queueSong.findOne({_id: songId}, next);
			},

			(song, next) => {
				if (song) return next('This song is already in the queue.');
				db.models.song.findOne({_id: songId}, next);
			},

			// Get YouTube data from id
			(song, next) => {
				if (song) return next('This song has already been added.');
				//TODO Add err object as first param of callback
				utils.getSongFromYouTube(songId, (song) => {
					song.artists = [];
					song.genres = [];
					song.skipDuration = 0;
					song.thumbnail = 'empty';
					song.explicit = false;
					song.requestedBy = userId;
					song.requestedAt = requestedAt;
					next(null, song);
				});
			},
			(newSong, next) => {
				//TODO Add err object as first param of callback
				utils.getSongFromSpotify(newSong, (song) => {
					next(null, song);
				});
			},
			(newSong, next) => {
				const song = new db.models.queueSong(newSong);
				song.save(err => {
					if (err) return next(err);
					next(null, newSong);
				});
			},
			(newSong, next) => {
				db.models.user.findOne({ _id: userId }, (err, user) => {
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
		], (err, newSong) => {
			if (err) {
				let error = 'An error occurred.';
				if (typeof err === "string") error = err;
				else if (err.message) error = err.message;
				return cb({status: 'failure', message: error});
			}
			cache.pub('queue.newSong', newSong._id);
			return cb({ status: 'success', message: 'Successfully added that song to the queue' });
		});
	})
};