'use strict';

const cache = require('./cache');
const db = require('./db');
const io = require('./io');
const utils = require('./utils');
const async = require('async');

module.exports = {

	init: function(cb) {
		let _this = this;
		db.models.song.find({}, (err, songs) => {
			if (!err) {
				songs.forEach((song) => {
					cache.hset('songs', song._id, cache.schemas.song(song));
				});
				cb();
			}
		});
	},

	// Attempts to get the song from Reids. If it's not in Redis, get it from Mongo and add it to Redis.
	getSong: function(songId, cb) {
		async.waterfall([

			(next) => {
				cache.hget('songs', songId, next);
			},

			(song, next) => {
				if (song) return next(true, song);

				db.models.song.findOne({_id: songId}, next);
			},

			(song, next) => {
				if (song) {
					cache.hset('songs', songId, song);
					next(true, song);
				} else next('Song not found.');
			},

		], (err, song) => {
			if (err && err !== true) cb(err);

			cb(null, song);
		});
	},

	updateSong: (songId, cb) => {
		async.waterfall([

			(next) => {
				db.models.song.findOne({_id: songId}, next);
			},

			(song, next) => {
				if (!song) return next('Song not found.');

				cache.hset('songs', songId, song, next);
			}

		], (err, song) => {
			if (err && err !== true) cb(err);

			cb(null, song);
		});
	}

};