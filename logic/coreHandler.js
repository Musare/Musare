'use strict';

// nodejs modules
const path   = require('path'),
      fs     = require('fs'),
      os     = require('os'),
      events = require('events');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall').
      r         = require('rethinkdb');

// custom modules
const global    = require('./global'),
      stations = require('./stations');

var eventEmitter = new events.EventEmitter();

module.exports = {

	// module functions

	on: function (name, cb) {
		eventEmitter.on(name, cb);
	},

	emit: function (name, data) {
		eventEmitter.emit(name, data);
	},

	// core route handlers

	'/users/login': function (user, cb) {

		if (!user.username || !user.password) {
			return cb({ status: 'error', message: 'Invalid login request' });
		}

		r.table('users').filter({
			username: user.username,
			password: crypto.createHash('md5').update(user.password).digest("hex")
		}).run(rc, (err, cursor) => {
			if (err) {
				return cb({ status: 'failure', message: 'Error while fetching the user' });
			}
			else {
				cursor.toArray((err, result) => {
					if (err) {
						return cb({ status: 'failure', message: 'Error while fetching the user' });
					}
					else {
						return cb({ status: 'success', user: result });
					}
				});
			}
		});
	},

	'/users/register': function (user, cb) {

		if (!user.email || !user.username || !user.password) {
			return cb({ status: 'error', message: 'Invalid register request' });
		}

		// TODO: Implement register
	},

	'/stations': function (cb) {
		cb(stations.getStations().map(function (result) {
			return {
				id: result.getId(),
				displayName: result.getDisplayName(),
				description: result.getDescription(),
				users: result.getUsers()
			}
		}));
	},

	'/stations/join/:id': function (id, user, cb) {

		var station = stations.getStation(id);

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

	'/stations/search/:query': function (query, cb) {

		var params = [
			'part=snippet',
			`q=${encodeURIComponent(query)}`,
			`key=${config.get('apis.youtube.key')}`,
			'type=video',
			'maxResults=25'
		].join('&');

		request(`https://www.googleapis.com/youtube/v3/search?${params}`, function (err, res, body) {
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
