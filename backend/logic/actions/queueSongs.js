'use strict';

const db = require('../db');
const utils = require('../utils');
const async = require('async');

module.exports = {

	index: (session, cb) => {
		//TODO Require admin/login
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
		//TODO Require login
		//TODO Check if id is valid
		//TODO Check if id is duplicate
		// if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });

		let requestedAt = Date.now();

		async.waterfall([
			// Get YouTube data from id
			(next) => {
				const youtubeParams = [
					'part=snippet,contentDetails,statistics,status',
					`id=${encodeURIComponent(id)}`,
					`key=${config.get('apis.youtube.key')}`
				].join('&');

				request(`https://www.googleapis.com/youtube/v3/videos?${youtubeParams}`, (err, res, body) => {

					if (err) {
						console.error(err);
						return next('Failed to find song from YouTube');
					}

					body = JSON.parse(body);

					//TODO Clean up duration converter
					let dur = body.items[0].contentDetails.duration;
					dur = dur.replace("PT", "");
					let durInSec = 0;
					dur = dur.replace(/([\d]*)H/, function(v, v2) {
						v2 = Number(v2);
						durInSec = (v2 * 60 * 60)
						return "";
					});
					dur = dur.replace(/([\d]*)M/, function(v, v2) {
						v2 = Number(v2);
						durInSec = (v2 * 60)
						return "";
					});
					dur = dur.replace(/([\d]*)S/, function(v, v2) {
						v2 = Number(v2);
						durInSec += v2;
						return "";
					});

					let newSong = {
						id: body.items[0].id,
						title: body.items[0].snippet.title,
						artists: [],
						genres: [],
						duration: durInSec,
						skipDuration: 0,
						thumbnail: '',
						requestedBy: '',
						requestedAt: requestedAt
					};

					next(null, newSong);
				});
			},
			(newSong, next) => {
				const spotifyParams = [
					`q=${encodeURIComponent(newSong.title)}`,
					`type=track`
				].join('&');

				request(`https://api.spotify.com/v1/search?${spotifyParams}`, (err, res, body) => {

					if (err) {
						console.error(err);
						return next('Failed to find song from Spotify');
					}

					body = JSON.parse(body);

					durationArtistLoop:
					for (let i in body) {
						let items = body[i].items;
						for (let j in items) {
							let item = items[j];
							let hasArtist = false;
							for (let k = 0; k < item.artists.length; k++) {
								let artist = item.artists[k];
								if (newSong.title.indexOf(artist.name) !== -1) {
									hasArtist = true;
								}
							}
							if (hasArtist && newSong.title.indexOf(item.name) !== -1) {
								newSong.duration = item.duration_ms / 1000;
								newSong.artists = item.map(artist => {
									return artist.name;
								});
								newSong.title = item.name;
								break durationArtistLoop;
							}
						}
					}

					next(null, newSong);
				});
			},
			(newSong, next) => {
				const song = new db.models.song(newSong);

				song.save(err => {

					if (err) {
						console.error(err);
						return next('Failed to add song to database.');
					}

					//stations.getStation(station).playlist.push(newSong);

					next(null);
				});
			}
		],
		(err) => {
			if (err) {
				return cb({ status: 'failure', message: err });
			}

			return cb({ status: 'success', message: 'Successfully added that song to the queue.' });
		});
	}

};