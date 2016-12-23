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

cache.sub('queue.updatedSong', songId => {
	//TODO Retrieve new Song object
	utils.emitToRoom('admin.queue', 'event:queueSong.updated', { songId });
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
				logger.log("QUEUE_INDEX", "ERROR", `Indexing queuesongs failed. "${err.message}"`);
				return cb({status: 'failure', message: 'Something went wrong.'});
			}
			logger.log("QUEUE_INDEX", "SUCCESS", `Indexing queuesongs successful.`);
			return cb(songs);
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
				logger.log("QUEUE_UPDATE", "ERROR", `Updating queuesong "${songId}" failed for user ${userId}. "${err.message}"`);
				return cb({status: 'failure', message: error});
			}
			cache.pub('queue.updatedSong', songId);
			logger.log("QUEUE_UPDATE", "SUCCESS", `User "${userId}" successfully update queuesong "${songId}".`);
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
				logger.log("QUEUE_REMOVE", "ERROR", `Removing queuesong "${songId}" failed for user ${userId}. "${err.message}"`);
				return cb({status: 'failure', message: error});
			}
			cache.pub('queue.removedSong', songId);
			logger.log("QUEUE_REMOVE", "SUCCESS", `User "${userId}" successfully removed queuesong "${songId}".`);
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