'use strict';

// nodejs modules
const path   = require('path'),
      fs     = require('fs'),
      os     = require('os'),
      events = require('events');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall'),
      bcrypt    = require('bcrypt'),
      passport  = require('passport');

// custom modules
const globals   = require('./globals'),
      stations = require('./stations');

var eventEmitter = new events.EventEmitter();

const edmStation = new stations.Station("edm", {
	"genres": ["edm"],
	playlist: [
		'gCYcHz2k5x0'
	],
	currentSongIndex: 0,
	paused: false,
	displayName: "EDM",
	description: "EDM Music"
});

const chillStation = new stations.Station("chill", {
	"genres": ["chill"],
	playlist: [
		'gCYcHz2k5x0'
	],
	currentSongIndex: 0,
	paused: false,
	displayName: "Chill",
	description: "Chill Music"
});

stations.addStation(edmStation);
stations.addStation(chillStation);

module.exports = {

	// module functions

	on: (name, cb) => eventEmitter.on(name, cb),

	emit: (name, data) => eventEmitter.emit(name, data),

	// core route handlers

	'/users/register': (session, username, email, password, recaptcha, cb) => {

		waterfall([

			// verify the request with google recaptcha
			(next) => {
				request({
					url: 'https://www.google.com/recaptcha/api/siteverify',
					method: 'POST',
					form: {
						'secret': config.get("apis.recaptcha.secret"),
						'response': recaptcha
					}
				}, next);
			},

			// check if the response from Google recaptcha is successful
			// if it is, we check if a user with the requested username already exists
			(response, body, next) => {
				let json = JSON.parse(body);
				console.log(json);
				if (json.success !== true) return next('Response from recaptcha was not successful');
				globals.db.models.user.findOne({ 'username': username }, next);
			},

			// if the user already exists, respond with that
			// otherwise check if a user with the requested email already exists
			(user, next) => {
				if (user) return next(true, { status: 'failure', message: 'A user with that username already exists' });
				globals.db.models.user.findOne({ 'email.address': email }, next);
			},

			// if the user already exists, respond with that
			// otherwise, generate a salt to use with hashing the new users password
			(user, next) => {
				if (user) return next(true, { status: 'failure', message: 'A user with that email already exists' });
				bcrypt.genSalt(10, next);
			},

			// hash the password
			(salt, next) => {
				bcrypt.hash(password, salt, next)
			},

			// save the new user to the database
			(hash, next) => {
				globals.db.models.user.create({
					username: username,
					email: {
						address: email,
						verificationToken: globals.utils.generateRandomString(64)
					},
					services: {
						password: {
							password: hash
						}
					}
				}, next);
			},

			// respond with the new user
			(newUser, next) => {
				next(null, { status: 'success', user: newUser })
			}

		], (err, payload) => {
			// log this error somewhere
			if (err && err !== true) {
				console.error(err);
				return cb({ status: 'error', message: 'An error occurred while registering for an account' });
			}
			// respond with the payload that was passed to us earlier
			cb(payload);
		});
	},

	'/users/login': (session, identifier, password, cb) => {

		waterfall([

			// check if a user with the requested identifier exists
			(next) => globals.db.models.user.findOne({
				$or: [{ 'username': identifier }, { 'email.address': identifier }]
			}, next),

			// if the user doesn't exist, respond with a failure
			// otherwise compare the requested password and the actual users password
			(user, next) => {
				if (!user) return next(true, { status: 'failure', message: 'User not found' });
				bcrypt.compare(password, user.services.password.password, next);
			},

			// if the user exists, and the passwords match, respond with a success
			(result, next) => {

				// TODO: Authenticate the user with Passport here I think?
				// TODO: We need to figure out how other login methods will work

				next(null, {
					status: result ? 'success': 'failure',
					message: result ? 'Logged in' : 'User not found'
				});
			}

		], (err, payload) => {
			// log this error somewhere
			if (err && err !== true) {
				console.error(err);
				return cb({ status: 'error', message: 'An error occurred while logging in' });
			}
			// respond with the payload that was passed to us earlier
			cb(payload);
		});

	},

	'/u/:username': (username, cb) => {
		globals.db.models.user.find({ username }, (err, account) => {
			if (err) throw err;
			account = account[0];
			cb({status: 'success', data: {
				username: account.username,
				createdAt: account.createdAt,
				statistics: account.statistics
			}});
		});
	},

	'/users/logout': (req, cb) => {
		if (!req.user || !req.user.logged_in) return cb({ status: 'failure', message: `You're not currently logged in` });

		req.logout();

		cb({ status: 'success', message: `You've been successfully logged out` });
	},

	'/stations': (session, cb) => {
		cb(stations.getStations().map(station => {
			return {
				id: station.id,
				playlist: station.playlist,
				displayName: station.displayName,
				description: station.description,
				currentSongIndex: station.currentSongIndex,
				users: station.users
			}
		}));
	},

	'/stations/join/:id': (session, id, cb) => {

		let station = stations.getStation(id);

		if (!station) return cb({ status: 'error', message: `Station with id '${id}' does not exist` });

		session.station_id = id;
		station.users++;

		cb({ status: 'success', users: station.users });
	},

	// leaves the users current station
	// returns the count of users that are still in that station
	'/stations/leave': (session, cb) => {

		let station = stations.getStation(session.station_id);

		if (!station) return cb({ status: 'failure', message: `Not currently in a station, or station doesn't exist` });

		session.station_id = "";
		station.users--;

		cb({ status: 'success', users: station.users });
	},

	'/youtube/getVideo/:query': (session, query, cb) => {

		const params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=15'
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, (err, res, body) => {

			if (err) {
				console.error(err);
				return cb({ status: 'error', message: 'Failed to search youtube with the requested query' });
			}

			cb({ status: 'success', data: JSON.parse(body) });
		});
	},

	'/stations/add/:song': (session, station, song, cb) => {

		if (!session.logged_in) return cb({ status: 'failure', message: 'You must be logged in to add a song' });

		const params = [
			'part=snippet,contentDetails,statistics,status',
			`id=${encodeURIComponent(song.id)}`,
			`key=${config.get('apis.youtube.key')}`
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/videos?${params}`, (err, res, body) => {

			// TODO: Get data from Wikipedia and Spotify

			if (err) {
				console.error(err);
				return cb({ status: 'error', message: 'Failed to find song from youtube' });
			}

			const newSong = new globals.db.models.song({
				id: json.items[0].id,
				title: json.items[0].snippet.title,
				duration: globals.utils.convertTime(json.items[0].contentDetails.duration),
				thumbnail: json.items[0].snippet.thumbnails.high.url
			});

			// save the song to the database
			newSong.save(err => {

				if (err) {
					console.error(err);
					return cb({ status: 'error', message: 'Failed to save song from youtube to the database' });
				}

				stations.getStation(station).playlist.push(newSong);

				cb({ status: 'success', data: stations.getStation(station.playlist) });
			});
		});
	},

	'/songs': (session, cb) => {
		globals.db.models.song.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	},

	'/songs/:song/update': (session, song, cb) => {
		globals.db.models.song.findOneAndUpdate({ id: song.id }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			cb(updatedSong);
		});
	},

	'/songs/:song/remove': (session, song, cb) => {
		globals.db.models.song.find({ id: song.id }).remove().exec();
	}
};
