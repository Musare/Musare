'use strict';

const db = require('../db');

module.exports = {

	index: (session, cb) => {
		db.models.song.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	},

	update: (session, song, cb) => {
		db.models.song.findOneAndUpdate({ id: song.id }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			cb(updatedSong);
		});
	},

	remove: (session, song, cb) => {
		db.models.song.find({ id: song.id }).remove().exec();
	}

};