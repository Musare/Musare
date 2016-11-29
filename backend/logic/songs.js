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
	}

	//TODO Add way to get song, which adds song to Redis if not in Redis and returns the song

};