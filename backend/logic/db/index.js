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
					console.log(character.charCodeAt(0), character.charCodeAt(0) === 21328);
					return character.charCodeAt(0) === 21328;
				}).length === 0;
			}, 'Invalid display name.');

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

			lib.schemas.report.path('description').validate((description) => {
				return (!description || (isLength(description, 0, 400) && regex.ascii.test(description)));
			}, 'Invalid description.');

			lib.models = {
				song: mongoose.model('song', lib.schemas.song),
				queueSong: mongoose.model('queueSong', lib.schemas.queueSong),
				station: mongoose.model('station', lib.schemas.station),
				user: mongoose.model('user', lib.schemas.user),
				playlist: mongoose.model('playlist', lib.schemas.playlist),
				news: mongoose.model('news', lib.schemas.news),
				report: mongoose.model('report', lib.schemas.report)
			};

			cb();
		});
	},

	passwordValid: (password) => {
		if (!isLength(password, 6, 200)) return false;
		return regex.password.test(password);
	}
};

module.exports = lib;
