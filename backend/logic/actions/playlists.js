'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');

module.exports = {

	indexForUser: (session, username, cb) => {
		db.models.playlist.find({ username }, (err, playlists) => {
			if (err) throw err;
			cb(playlists);
		});
	},

	update: hooks.adminRequired((session, _id, playlist, cb) => {
		db.models.playlist.findOneAndUpdate({ _id }, playlist, { upsert: true }, (err, updatedPlaylist) => {
			if (err) throw err;
			return cb({ status: 'success', message: 'Playlist has been successfully updated', data: updatedPlaylist });
		});
	}),

	remove: hooks.adminRequired((session, _id, cb) => {
		db.models.playlist.remove({ _id });
	})

};