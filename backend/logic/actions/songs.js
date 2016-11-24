'use strict';

const db = require('../db');

module.exports = {

	index: (session, cb) => {
		db.models.song.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	},

	update: (session, id, song, cb) => {
		//TODO Require admin/login
		db.models.song.findOneAndUpdate({ id }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			cb(updatedSong);
		});
	},

	remove: (session, id, cb) => {
		//TODO Require admin/login
		db.models.song.find({ id }).remove().exec();
	},

	add: (session, id, cb) => {
		//TODO Require admin/login
		// if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });
		//TODO Check if video already in songs list
		//TODO Check if video is in queue
		//TODO Move video over, if it has the proper properties, and add the song to the appropriate stations
	}

};