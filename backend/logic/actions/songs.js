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
		db.models.song.findOneAndUpdate({ id: id }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			cb(updatedSong);
		});
	},

	remove: (session, id, cb) => {
		//TODO Require admin/login
		db.models.song.find({ id: id }).remove().exec();
	},

	add: (session, id, cb) => {
		//TODO Require admin/login
		// if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });

		const params = [
			'part=snippet,contentDetails,statistics,status',
			`id=${encodeURIComponent(id)}`,
			`key=${config.get('apis.youtube.key')}`
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/videos?${params}`, (err, res, body) => {

			if (err) {
				console.error(err);
				return cb({ status: 'error', message: 'Failed to find song from youtube' });
			}

			body = JSON.parse(body);

			const newSong = new db.models.song({
				id: body.items[0].id,
				title: body.items[0].snippet.title,
				duration: utils.convertTime(body.items[0].contentDetails.duration),
				thumbnail: body.items[0].snippet.thumbnails.high.url
			});

			// save the song to the database
			newSong.save(err => {

				if (err) {
					console.error(err);
					return cb({ status: 'error', message: 'Failed to save song from youtube to the database' });
				}

				// stations.getStation(station).playlist.push(newSong);

				// cb({ status: 'success', data: stations.getStation(station.playlist) });
			});
		});
	}

};