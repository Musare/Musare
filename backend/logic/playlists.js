'use strict';

const cache = require('./cache');
const db = require('./db');
const async = require('async');

module.exports = {

	init: cb => {
		db.models.playlist.find({}, (err, playlists) => {
			if (!err) {
				playlists.forEach((playlist) => {
					cache.hset('playlists', playlist._id, cache.schemas.playlist(playlist));
				});
				cb();
			}
		});
	},

	getPlaylist: (_id, cb) => {
		async.waterfall([

			(next) => {
				cache.hget('playlists', _id, next);
			},

			(playlist, next) => {
				if (playlist) return next(true, playlist);
				db.models.playlist.findOne({ _id }, next);
			},

			(playlist, next) => {
				if (playlist) {
					cache.hset('playlists', _id, playlist);
					next(true, playlist);
				} else next('Playlist not found');
			},

		], (err, playlist) => {
			if (err && err !== true) return cb(err);
			else cb(null, playlist);
		});
	},

	updatePlaylist: (_id, cb) => {
		async.waterfall([

			(next) => {
				db.models.playlist.findOne({ _id }, next);
			},

			(playlist, next) => {
				if (!playlist) return next('Playlist not found');
				cache.hset('playlists', _id, playlist, (err) => {
					if (err) return next(err);
					return next(null, playlist);
				});
			}

		], (err, playlist) => {
			if (err && err !== true) cb(err);
			cb(null, playlist);
		});
	}

};