'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const async = require('async');
const mongoose = require('mongoose');

let initialized = false;
let lockdown = false;

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
					db.models.song.findOne({songId}, (err, song) => {
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
					cache.hset('songs', song.songId, cache.schemas.song(song), next);
				}, next);
			}
		], (err) => {
			if (lockdown) return this._lockdown();
			if (err) {
				err = utils.getError(err);
				cb(err);
			} else {
				initialized = true;
				cb();
			}
		});
	},

	/**
	 * Gets a song by id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} id - the id of the song we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getSong: function(id, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([

			(next) => {
				if (!mongoose.Types.ObjectId.isValid(id)) return next('Id is not a valid ObjectId.');
				cache.hget('songs', id, next);
			},

			(song, next) => {
				if (song) return next(true, song);
				db.models.song.findOne({_id: id}, next);
			},

			(song, next) => {
				if (song) {
					cache.hset('songs', id, song, next);
				} else next('Song not found.');
			},

		], (err, song) => {
			if (err && err !== true) return cb(err);

			cb(null, song);
		});
	},

	/**
	 * Gets a song by song id from the cache or Mongo, and if it isn't in the cache yet, adds it the cache
	 *
	 * @param {String} songId - the mongo id of the song we are trying to get
	 * @param {Function} cb - gets called once we're done initializing
	 */
	getSongFromId: function(songId, cb) {
		if (lockdown) return cb('Lockdown');
		async.waterfall([
			(next) => {
				db.models.song.findOne({ songId }, next);
			}
		], (err, song) => {
			if (err && err !== true) return cb(err);
			else return cb(null, song);
		});
	},

	/**
	 * Gets a song from id from Mongo and updates the cache with it
	 *
	 * @param {String} songId - the id of the song we are trying to update
	 * @param {Function} cb - gets called when an error occurred or when the operation was successful
	 */
	updateSong: (songId, cb) => {
		if (lockdown) return cb('Lockdown');
		async.waterfall([

			(next) => {
				db.models.song.findOne({_id: songId}, next);
			},

			(song, next) => {
				if (!song) {
					cache.hdel('songs', songId);
					return next('Song not found.');
				}

				cache.hset('songs', songId, song, next);
			}

		], (err, song) => {
			if (err && err !== true) return cb(err);

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
		if (lockdown) return cb('Lockdown');
		async.waterfall([

			(next) => {
				db.models.song.deleteOne({ songId }, next);
			},

			(next) => {
				cache.hdel('songs', songId, next);
			}

		], (err) => {
			if (err && err !== true) cb(err);

			cb(null);
		});
	},

	_lockdown: () => {
		lockdown = true;
	}
};
