'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const async = require('async');

module.exports = {

	/**
	 * Initializes the songs module, and exits if it is unsuccessful
	 *
	 * @param {Function} cb - gets called once we're done initializing
	 */
	init: cb => {
		async.waterfall([
			(next) => {
				cache.hgetall('songs', next);
			},

			(songs, next) => {
				if (!songs) return next();
				let songIds = Object.keys(songs);
				async.each(songIds, (songId, next) => {
					db.models.song.findOne({ _id: songId }, (err, song) => {
						if (err) next(err);
						else if (!song) cache.hdel('songs', songId, next);
						else next();
					});
				}, next);
			},

			(next) => {
				db.models.song.find({}, next);
			},

			(songs, next) => {
				async.each(songs, (song, next) => {
					cache.hset('songs', song._id, cache.schemas.song(song), next);
				}, next);
			}
		], (err) => {
			if (err) {
				console.log(`FAILED TO INITIALIZE SONGS. ABORTING. "${err.message}"`);
				process.exit();
			} else cb();
		});
	},

	/**
	 * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} songId - the id of the song we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getSong: function(songId, cb) {
		async.waterfall([

			(next) => {
				cache.hget('songs', songId, next);
			},

			(song, next) => {
				if (song) return next(true, song);

				db.models.song.findOne({ _id: songId }, next);
			},

			(song, next) => {
				if (song) {
					cache.hset('songs', songId, song, next);
				} else next('Song not found.');
			},

		], (err, song) => {
			if (err && err !== true) return cb(err);

			cb(null, song);
		});
	},

	/**
	 * Gets a song from id from Mongo and updates the cache with it
	 *
	 * @param {String} songId - the id of the song we are trying to update
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	updateSong: (songId, cb) => {
		async.waterfall([

			(next) => {
				db.models.song.findOne({ _id: songId }, next);
			},

			(song, next) => {
				if (!song) {
					cache.hdel('songs', songId);
					return next('Song not found.');
				}

				cache.hset('songs', songId, song, next);
			}

		], (err, song) => {
			if (err && err !== true) cb(err);

			cb(null, song);
		});
	},

	/**
	 * Deletes song from id from Mongo and cache
	 *
	 * @param {String} songId - the id of the song we are trying to delete
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	deleteSong: (songId, cb) => {
		async.waterfall([

			(next) => {
				db.models.song.remove({ _id: songId }, next);
			},

			(next) => {
				cache.hdel('songs', songId, next);
			}

		], (err) => {
			if (err && err !== true) cb(err);

			cb(null);
		});
	}
};