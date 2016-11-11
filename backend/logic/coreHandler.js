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

	'/users/register': (username, email, password, recaptcha, cb) => {

		console.log(username, email, password, recaptcha);

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
				return cb({ status: 'error', message: 'An error occurred while registering a new user' });
			}
			// respond with the payload that was passed to us earlier
			cb(payload);
		});
	},

	'/stations': cb => {
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

	'/stations/join/:id': (id, cb) => {
		stations.getStation(id).users = stations.getStation(id).users + 1;
		cb(stations.getStation(id).users);
	},

	'/stations/leave/:id': (id, cb) => {
		if (stations.getStation(id)) {
			stations.getStation(id).users = stations.getStation(id).users - 1;
			if (cb) cb(stations.getStation(id).users);
		}
	},

	'/youtube/getVideo/:query': (query, cb) => {
		const params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=15'
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, (err, res, body) => {
			cb(body);
		});
	},

	'/stations/add/:song': (station, song, user, cb) => {
		const params = [
			'part=snippet,contentDetails,statistics,status',
			`id=${encodeURIComponent(song.id)}`,
			`key=${config.get('apis.youtube.key')}`
		].join('&');

		// if (user.logged_in) {
			request(`https://www.googleapis.com/youtube/v3/videos?${params}`, (err, res, body) => {
				// TODO: Get data from Wikipedia and Spotify
				body = JSON.parse(body);
				const newSong = new globals.db.models.song({
					id: body.items[0].id,
					title: body.items[0].snippet.title,
					duration: globals.utils.convertTime(body.items[0].contentDetails.duration),
					thumbnail: body.items[0].snippet.thumbnails.high.url
				});

				console.log(newSong);

				newSong.save(err => {
					if (err) throw err;
				});

				stations.getStation(station).playlist.push(newSong);
				cb(stations.getStation(station.playlist));
			});
		//}
	},

	'/songs': cb => {
		globals.db.models.song.find({}, (err, songs) => {
			if (err) throw err;
			cb(songs);
		});
	},

	'/songs/:song/update': (song, cb) => {
		globals.db.models.song.findOneAndUpdate({ id: song.id }, song, { upsert: true }, (err, updatedSong) => {
			if (err) throw err;
			cb(updatedSong);
		});
	},

	'/songs/:song/remove': (song, cb) => {
		globals.db.models.song.find({ id: song.id }).remove().exec();
	}
};
