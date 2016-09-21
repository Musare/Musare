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

const station = new stations.Station("edm", {
	playlist: [
		{
			startedAt: Date.now(),
			id: "dQw4w9WgXcQ",
			title: "Never gonna give you up",
			artists: ["Rick Astley"],
			duration: 20,
			skipDuration: 0,
			image: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1,
			genres: ["pop", "edm"]
		},
		{
			startedAt: Date.now(),
			id: "GxBSyx85Kp8",
			title: "Yeah!",
			artists: ["Usher"],
			duration: 20,
			skipDuration: 0,
			image: "https://yt3.ggpht.com/-CGlBu6kDEi8/AAAAAAAAAAI/AAAAAAAAAAA/Pi679mvyyyU/s88-c-k-no-mo-rj-c0xffffff/photo.jpg",
			likes: 0,
			dislikes: 1,
			genres: ["pop", "edm"]
		}
	],
	currentSongIndex: 1,
	paused: false,
	locked: false,
	displayName: "EDM",
	description: "EDM Music"
});

stations.addStation(station);

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
			console.log(error, body, error === null, JSON.parse(body).success === true);
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
								//TODO Email verification code, send email
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
		cb(stations.getStations().map(function (result) {
			return {
				id: result.getId(),
				displayName: result.getDisplayName(),
				description: result.getDescription(),
				users: result.getUsers()
			}
		}));
	},

	'/stations/join/:id': (id, user, cb) => {

		const station = stations.getStation(id);

		if (station) {

			user.stationId = id;

			/*io.sockets.emit('station-joined', {
				user: {
					id: user.id,
					username: user.username
				}
			});*/

			return cb({
				status: 'joined',
				data: {
					displayName: station.getDisplayName(),
					users: station.getUsers(),
					currentSong: station.getCurrentSong(),
					timePaused: station.getTimePaused(),
					paused: station.isPaused(),
					currentTime: Date.now()
				}
			});
		}
		else {
			return cb({ status: 'error', message: 'Room with that ID does not exists' });
		}
	},

	'/stations/search/:query': (query, cb) => {

		const params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=25'
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, (err, res, body) => {
			if (err) {
				return cb({ status: 'error', message: 'Failed to make request' });
			}
			else {
				try {
					return cb({ status: 'success', body: JSON.parse(body) });
				}
				catch (e) {
					return cb({ status: 'error', message: 'Non JSON response' });
				}
			}
		});
	},

	'/songs/:id/toggleLike': (songId, userId, cb) => {

		var user = global.db.user.findOne(userId);
		var song = global.db.song.findOne(songId);
		if (user !== undefined) {
			if (song !== undefined) {
				var liked = false;
				if (song.likes.indexOf(userId) === -1) {
					liked = true;
					// Add like
				} else {
					// Remove like
				}
				if (song.dislikes.indexOf(userId) !== -1) {
					// Remove dislike
				}
				// Emit to all sockets with this user that their likes/dislikes updated.
				// Emit to all sockets in the room that the likes/dislikes has updated
				cb({liked: liked, disliked: false});
			} else {
				cb({err: "Song not found."});
			}
		} else {
			cb({err: "User not found."});
		}

	},

	'/user/ratings': (userId, cb) => {

		var user = global.db.user.findOne(userId);
		if (user !== undefined) {
			cb({likes: user.likes, dislikes: user.dislikes});
		} else {
			cb({err: "User not found."});
		}

	}
};
