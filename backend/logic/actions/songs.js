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

	remove: (session, _id, cb) => {
		//TODO Require admin/login
		db.models.song.find({ _id }).remove().exec();
	},

	add: (session, song, cb) => {
		//TODO Require admin/login
		console.log(session.logged_in);
		// if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });
		const newSong = new db.models.song(song);
		newSong.save(err => {
			if (err) throw err;
			else cb({ status: 'success', message: 'Song has been moved from Queue' })
		});
		//TODO Check if video already in songs list
		//TODO Check if video is in queue
		//TODO Add the song to the appropriate stations
	}

};