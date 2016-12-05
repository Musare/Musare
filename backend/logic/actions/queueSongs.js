'use strict';

const db = require('../db');
const utils = require('../utils');
const notifications = require('../notifications');
const cache = require('../cache');
const async = require('async');
const config = require('config');
const request = require('request');
const hooks = require('./hooks');

notifications.subscribe('queue.newSong', songId => {
	io.to('admin.queue').emit('event:song.new', { songId });
});

notifications.subscribe('queue.removedSong', songId => {
	io.to('admin.queue').emit('event:song.removed', { songId });
});

notifications.subscribe('queue.updatedSong', songId => {
	//TODO Retrieve new Song object
	io.to('admin.queue').emit('event:song.updated', { songId });
});

module.exports = {

	index: hooks.adminRequired((session, cb) => {
		db.models.queueSong.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	}),

	update: hooks.adminRequired((session, _id, updatedSong, cb) => {
		//TODO Check if id and updatedSong is valid
		db.models.queueSong.findOne({ _id }, (err, currentSong) => {
			if (err) console.error(err);
			// TODO Check if new id, if any, is already in use in queue or on rotation
			let updated = false;
			for (let prop in updatedSong) if (updatedSong[prop] !== currentSong[prop]) currentSong[prop] = updatedSong[prop]; updated = true;
			if (!updated) return cb({ status: 'error', message: 'No properties changed' });
			else {
				currentSong.save(err => {
					if (err) console.error(err);
					return cb({ status: 'success', message: 'Successfully updated the queued song' });
				});
			}
		});
	}),

	remove: hooks.adminRequired((session, songId, cb) => {
		db.models.queueSong.remove({ _id: songId }, (err, res) => {
			if (err) return cb({ status: 'failure', message: err.message });
			//TODO Pub/sub for (queue)songs on admin pages.
			cb({ status: 'success', message: 'Song was removed successfully' });
		});
	}),

	add: hooks.loginRequired((session, songId, cb, userId) => {
		//TODO Check if id is valid

		let requestedAt = Date.now();

		async.waterfall([
			(next) => {
				db.models.queueSong.findOne({_id: songId}, (err, song) => {
					if (err) return next('Something went wrong while getting the song from the Database.');
					if (song) return next('This song is already in the queue.');
					next();
				});
			},

			(next) => {
				db.models.song.findOne({_id: songId}, (err, song) => {
					if (err) return next('Something went wrong while getting the song from the Database.');
					if (song) return next('This song has already been added.');
					next();
				});
			},

			// Get YouTube data from id
			(next) => {
				utils.getSongFromYouTube(songId, (song) => {
					song.artists = [];
					song.genres = [];
					song.skipDuration = 0;
					song.thumbnail = 'empty';
					song.explicit = false;
					song.requestedBy = userId;
					song.requestedAt = requestedAt;
					next(null, song);
				});
			},
			(newSong, next) => {
				utils.getSongFromSpotify(newSong, (song) => {
					next(null, song);
				});
			},
			(newSong, next) => {
				const song = new db.models.queueSong(newSong);

				// check if song already exists

				song.save(err => {

					if (err) {
						console.error(err);
						return next('Failed to add song to database');
					}

					//stations.getStation(station).playlist.push(newSong);
					next(null, newSong);
				});
			}
		],
		(err, newSong) => {
			if (err) return cb({ status: 'error', message: err });
			cache.pub('queue.newSong', newSong._id);
			return cb({ status: 'success', message: 'Successfully added that song to the queue' });
		});
	})

};