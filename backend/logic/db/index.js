'use strict';

const mongoose = require('mongoose');

const bluebird = require('bluebird');

const regex = {
	azAZ09_: /^[A-Za-z0-9_]+$/,
	az09_: /^[a-z0-9_]+$/,
	emailSimple: /^[\x00-\x7F]+@[a-z0-9]+\.[a-z0-9]+(\.[a-z0-9]+)?$/,
	password: /[a-z]+[A-Z]+[0-9]+[^a-zA-Z0-9]+/,
	ascii: /^[\x00-\x7F]+$/
};

const isLength = (string, min, max) => {
	return !(typeof string !== 'string' || string.length < min || string.length > max);
}

mongoose.Promise = bluebird;

let lib = {

	connection: null,
	schemas: {},
	models: {},

	init: (url, cb) => {

		lib.connection = mongoose.connect(url).connection;

		lib.connection.on('error', err => {
			console.error('Database error: ' + err.message)
			process.exit();
		});

		lib.connection.once('open', _ => {

			lib.schemas = {
				song: new mongoose.Schema(require(`./schemas/song`)),
				queueSong: new mongoose.Schema(require(`./schemas/queueSong`)),
				station: new mongoose.Schema(require(`./schemas/station`)),
				user: new mongoose.Schema(require(`./schemas/user`)),
				playlist: new mongoose.Schema(require(`./schemas/playlist`)),
				news: new mongoose.Schema(require(`./schemas/news`)),
				report: new mongoose.Schema(require(`./schemas/report`))
			};

			lib.models = {
				song: mongoose.model('song', lib.schemas.song),
				queueSong: mongoose.model('queueSong', lib.schemas.queueSong),
				station: mongoose.model('station', lib.schemas.station),
				user: mongoose.model('user', lib.schemas.user),
				playlist: mongoose.model('playlist', lib.schemas.playlist),
				news: mongoose.model('news', lib.schemas.news),
				report: mongoose.model('report', lib.schemas.report)
			};

			lib.schemas.user.path('username').validate((username) => {
				return (isLength(username, 2, 32) && regex.azAZ09_.test(username));
			}, 'Invalid username.');

			lib.schemas.user.path('email.address').validate((email) => {
				if (!isLength(email, 3, 254)) return false;
				if (email.indexOf('@') !== email.lastIndexOf('@')) return false;
				return regex.emailSimple.test(email);
			}, 'Invalid email.');

			lib.schemas.station.path('name').validate((id) => {
				return (isLength(id, 2, 16) && regex.az09_.test(id));
			}, 'Invalid station name.');

			lib.schemas.station.path('displayName').validate((displayName) => {
				return (isLength(displayName, 2, 32) && regex.azAZ09_.test(displayName));
			}, 'Invalid display name.');

			lib.schemas.station.path('description').validate((description) => {
				if (!isLength(description, 2, 200)) return false;
				let characters = description.split("");
				return characters.filter((character) => {
					return character.charCodeAt(0) === 21328;
				}).length === 0;
			}, 'Invalid display name.');


			lib.schemas.station.path('owner').validate((owner, callback) => {
				lib.models.station.count({owner: owner}, (err, c) => {
					callback(!(err || c >= 3));
				});
			}, 'User already has 3 stations.');

			lib.schemas.station.path('queue').validate((queue, callback) => {
				let totalDuration = 0;
				queue.forEach((song) => {
					totalDuration += song.duration;
				});
				return callback(totalDuration <= 3600);
			}, 'The max length of the queue is 3 hours.');

			lib.schemas.station.path('queue').validate((queue, callback) => {
				if (queue.length === 0) return callback(true);
				let totalDuration = 0;
				const userId = queue[queue.length - 1].requestedBy;
				queue.forEach((song) => {
					if (userId === song.requestedBy) {
						totalDuration += song.duration;
					}
				});
				return callback(totalDuration <= 900);
			}, 'The max length of songs per user is 15 minutes.');

			lib.schemas.station.path('queue').validate((queue, callback) => {
				if (queue.length === 0) return callback(true);
				let totalSongs = 0;
				const userId = queue[queue.length - 1].requestedBy;
				queue.forEach((song) => {
					if (userId === song.requestedBy) {
						totalSongs++;
					}
				});
				if (totalSongs <= 2) return callback(true);
				if (totalSongs > 3) return callback(false);
				if (queue[queue.length - 2].requestedBy !== userId || queue[queue.length - 3] !== userId) return callback(true);
				return callback(false);
			}, 'The max amount of songs per user is 3, and only 2 in a row is allowed.');

			let songTitle = (title) => {
				return (isLength(title, 1, 64) && regex.ascii.test(title));
			};
			lib.schemas.song.path('title').validate(songTitle, 'Invalid title.');
			lib.schemas.queueSong.path('title').validate(songTitle, 'Invalid title.');

			let songArtists = (artists) => {
				if (artists.length < 1 || artists.length > 10) return false;
				return artists.filter((artist) => {
						return (isLength(artist, 1, 32) && regex.ascii.test(artist) && artist !== "NONE");
					}).length === artists.length;
			};
			lib.schemas.song.path('artists').validate(songArtists, 'Invalid artists.');
			lib.schemas.queueSong.path('artists').validate(songArtists, 'Invalid artists.');

			let songGenres = (genres) => {
				return genres.filter((genre) => {
						return (isLength(genre, 1, 16) && regex.az09_.test(genre));
					}).length === genres.length;
			};
			lib.schemas.song.path('genres').validate(songGenres, 'Invalid genres.');
			lib.schemas.queueSong.path('genres').validate(songGenres, 'Invalid genres.');

			let songThumbnail = (thumbnail) => {
				return isLength(thumbnail, 8, 256);
			};
			lib.schemas.song.path('thumbnail').validate(songThumbnail, 'Invalid thumbnail.');
			lib.schemas.queueSong.path('thumbnail').validate(songThumbnail, 'Invalid thumbnail.');

			lib.schemas.playlist.path('displayName').validate((displayName) => {
				return (isLength(displayName, 1, 16) && regex.ascii.test(displayName));
			}, 'Invalid display name.');

			lib.schemas.playlist.path('createdBy').validate((createdBy, callback) => {
				lib.models.playlist.count({createdBy: createdBy}, (err, c) => {
					callback(!(err || c >= 10));
				});
			}, 'Max 10 playlists per user.');

			lib.schemas.playlist.path('songs').validate((songs) => {
				return songs.length <= 2000;
			}, 'Max 2000 songs per playlist.');

			lib.schemas.playlist.path('songs').validate((songs) => {
				if (songs.length === 0) return true;
				return songs[0].duration <= 10800;
			}, 'Max 3 hours per song.');

			lib.schemas.report.path('description').validate((description) => {
				return (!description || (isLength(description, 0, 400) && regex.ascii.test(description)));
			}, 'Invalid description.');

			cb();
		});
	},

	passwordValid: (password) => {
		if (!isLength(password, 6, 200)) return false;
		return regex.password.test(password);
	}
};

module.exports = lib;
