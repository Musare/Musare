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
      bcrypt = require('bcrypt'),
	  passport  = require('passport');

// custom modules
const global   = require('./global'),
	  stations = require('./stations');

var eventEmitter = new events.EventEmitter();

const edmStation = new stations.Station("edm", {
	"genres": ["edm"],
	playlist: [
		{
			id: "dQw4w9WgXcQ",
			title: "Never gonna give you up",
			artists: ["Rick Astley"],
			duration: '00:01:18',
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		},
		{
			id: "GxBSyx85Kp8",
			title: "Yeah!",
			artists: ["Usher", "test"],
			duration: '00:00:08',
			thumbnail: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1
		}
	],
	currentSongIndex: 0,
	paused: false,
	displayName: "EDM",
	description: "EDM Music"
});

stations.addStation(edmStation);

module.exports = {

	// module functions

	on: (name, cb) => {
		eventEmitter.on(name, cb);
	},

	emit: (name, data) => {
		eventEmitter.emit(name, data);
	},

	// core route handlers

	'/users/register': (username, email, password, recaptcha, cb) => {
		console.log(username, password);
		request({
			url: 'https://www.google.com/recaptcha/api/siteverify',
			method: 'POST',
			form: {
				'secret': config.get("apis.recapthca.secret"),
				'response': recaptcha
			}
		}, function (error, response, body) {
			if (error === null && JSON.parse(body).success === true) {
				body = JSON.parse(body);
				global.db.user.findOne({'username': username}, function (err, user) {
					console.log(err, user);
					if (err) return cb(err);
					if (user) return cb("username");
					else {
						global.db.user.findOne({'email.address': email}, function (err, user) {
							console.log(err, user);
							if (err) return cb(err);
							if (user) return cb("email");
							else {
								// TODO: Email verification code, send email
								bcrypt.genSalt(10, function (err, salt) {
									if (err) {
										return cb(err);
									} else {
										bcrypt.hash(password, salt, function (err, hash) {
											if (err) {
												return cb(err);
											} else {
												let newUser = new global.db.user({
													username: username,
													email: {
														address: email,
														verificationToken: global.generateRandomString("64")
													},
													services: {
														password: {
															password: hash
														}
													}
												});
												newUser.save(function (err) {
													if (err) throw err;
													return cb(null, newUser);
												});
											}
										});
									}
								});
							}
						});
					}
				});
			} else {
				cb("Recaptcha failed");
			}
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

		if (user.logged_in) {
			request(`https://www.googleapis.com/youtube/v3/videos?${params}`, (err, res, body) => {
				// TODO: Get data from Wikipedia and Spotify
				body = JSON.parse(body);
				let newSong = {
					id: body.items[0].id,
					title: body.items[0].snippet.title,
					artists: [""],
					duration: global.convertTime(body.items[0].contentDetails.duration),
					thumbnail: body.items[0].snippet.thumbnails.high.url
				};
				stations.getStation(station).playlist.push(newSong);
				cb(stations.getStation(station.playlist));
			});
		}
	},

	'/songs': cb => {
		let songs = [];
		cb(stations.getStations().map(station => {
			station.playlist.forEach(song => {
				songs.push(song);
			});
			return songs;
		}));
	},

	'/songs/update': (songs, cb) => {
		console.log(songs);
		cb(stations.getStations());
	}
};
