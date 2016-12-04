'use strict';

const db = require('../db');
const io = require('../io');
const cache = require('../cache');
const utils = require('../utils');
const hooks = require('./hooks');
const async = require('async');
const playlists = require('../playlists');

module.exports = {

	indexForUser: (session, createdBy, cb) => {
		db.models.playlist.find({ createdBy }, (err, playlists) => {
			if (err) throw err;
			cb({
				status: 'success',
				data: playlists
			});
		});
	},

	create: (session, data, cb) => {
		async.waterfall([

			(next) => {
				return (data) ? next() : cb({ 'status': 'failure', 'message': 'Invalid data' });
			},

			// check the cache for the playlist
			(next) => cache.hget('playlists', data._id, next),

			// if the cached version exist
			(playlist, next) => {
				if (playlist) return next({ 'status': 'failure', 'message': 'A playlist with that id already exists' });
				db.models.playlist.findOne({ _id: data._id }, next);
			},

			(playlist, next) => {
				if (playlist) return next({ 'status': 'failure', 'message': 'A playlist with that id already exists' });
				const { _id, displayName, songs, createdBy } = data;
				db.models.playlist.create({
					_id,
					displayName,
					songs,
					createdBy,
					createdAt: Date.now()
				}, next);
			}

		], (err, playlist) => {
			if (err) {console.log(err); return cb({ 'status': 'failure', 'message': 'Something went wrong'});}
			cache.pub('playlist.create', data._id);
			return cb(null, { 'status': 'success', 'message': 'Successfully created playlist' });
		});
	},

	getPlaylist: (session, id, cb) => {
		playlists.getPlaylist(id, (err, playlist) => {
			if (err == null) return cb({
				status: 'success',
				data: playlist
			});
		});
	},

	update: (session, _id, playlist, cb) => {
		db.models.playlist.findOneAndUpdate({ _id }, playlist, { upsert: true }, (err, data) => {
			if (err) throw err;
			return cb({ status: 'success', message: 'Playlist has been successfully updated', data });
		});
	},

	updateDisplayName: (session, _id, displayName, cb) => {
		db.models.playlist.findOneAndUpdate({ _id }, { displayName }, { upsert: true }, (err, data) => {
			if (err) throw err;
			return cb({ status: 'success', message: 'Playlist has been successfully updated', data });
		});
	},

	remove: (session, _id, cb) => {
		db.models.playlist.remove({ _id });
	}

};