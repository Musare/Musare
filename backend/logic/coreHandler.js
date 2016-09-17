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
	  passport  = require('passport');

// custom modules
const global   = require('./global'),
	  stations = require('./stations');

var eventEmitter = new events.EventEmitter();

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
		//TODO Check recaptcha
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
								//TODO Encrypt password
								let newUser = new global.db.user({
									username: username,
									email: {
										address: email,
										verificationToken: "Code"
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

			this.emit('station-joined', {
				user: {
					id: user.id,
					username: user.username
				}
			});

			return cb({
				status: 'joined',
				data: {
					displayName: station.getDisplayName(),
					users: station.getUsers(),
					currentSong: station.getCurrentSong()
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
	}
};
