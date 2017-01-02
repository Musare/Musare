'use strict';

const cache = require('./cache');
const db = require('./db');
const async = require('async');

module.exports = {

	/**
	 * Initializes the playlists module, and exits if it is unsuccessful
	 *
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: cb => {
		async.waterfall([
			(next) => {
				cache.hgetall('playlists', next);
			},

			(playlists, next) => {
				if (!playlists) return next();
				let playlistIds = Object.keys(playlists);
				async.each(playlistIds, (playlistId, next) => {
					db.models.playlist.findOne({_id: playlistId}, (err, playlist) => {
						if (err) next(err);
						else if (!playlist) {
							cache.hdel('playlists', playlistId, next);
						}
						else next();
					});
				}, next);
			},

			(next) => {
				db.models.playlist.find({}, next);
			},

			(playlists, next) => {
				async.each(playlists, (playlist, next) => {
					cache.hset('playlists', playlist._id, cache.schemas.playlist(playlist), next);
				}, next);
			}
		], (err) => {
			if (err) {
				console.log(`FAILED TO INITIALIZE PLAYLISTS. ABORTING. "${err.message}"`);
				process.exit();
			} else {
				cb();
			}
		});
	},

	/**
	 * Gets a playlist by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getPlaylist: (playlistId, cb) => {
		async.waterfall([
			(next) => {
				cache.hgetall('playlists', next);
			},

			(playlists, next) => {
				let playlistIds = Object.keys(playlists);
				async.each(playlistIds, (playlistId, next) => {
					db.models.playlist.findOne({_id: playlistId}, (err, playlist) => {
						if (err) next(err);
						else if (!playlist) {
							cache.hdel('playlists', playlistId, next);
						}
						else next();
					});
				}, next);
			},

			(next) => {
				cache.hget('playlists', playlistId, next);
			},

			(playlist, next) => {
				if (playlist) return next(true, playlist);
				db.models.playlist.findOne({ _id: playlistId }, next);
			},

			(playlist, next) => {
				if (playlist) {
					cache.hset('playlists', playlistId, playlist, next);
				} else next('Playlist not found');
			},

		], (err, playlist) => {
			if (err && err !== true) return cb(err);
			else cb(null, playlist);
		});
	},

	/**
	 * Gets a playlist from id from Mongo and updates the cache with it
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to update
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	updatePlaylist: (playlistId, cb) => {
		async.waterfall([

			(next) => {
				db.models.playlist.findOne({ _id: playlistId }, next);
			},

			(playlist, next) => {
				if (!playlist) {
					cache.hdel('playlists', playlistId);
					return next('Playlist not found');
				}
				cache.hset('playlists', playlistId, playlist, next);
			}

		], (err, playlist) => {
			if (err && err !== true) cb(err);
			cb(null, playlist);
		});
	},

	/**
	 * Deletes playlist from id from Mongo and cache
	 *
	 * @param {String} playlistId - the id of the playlist we are trying to delete
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	deletePlaylist: (playlistId, cb) => {
		async.waterfall([

			(next) => {
				db.models.playlist.remove({ _id: playlistId }, next);
			},

			(res, next) => {
				cache.hdel('playlists', playlistId, next);
			}

		], (err) => {
			if (err && err !== true) cb(err);

			cb(null);
		});
	}
};