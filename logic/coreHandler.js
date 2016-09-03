'use strict';

// nodejs modules
const path = require('path'),
      fs   = require('fs'),
      os   = require('os');

// npm modules
const config    = require('config'),
      request   = require('request'),
      waterfall = require('async/waterfall').
      r         = require('rethinkdb');

// custom modules
const utils = require('./utils');

var dbConnection = null;

module.exports = {

	setup: function (dbConn) {
		dbConnection = dbConn;
	},

	disconnect: function () {

	},

	login: function (user, cb) {

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

	register: function (user, cb) {

		if (!user.email || !user.username || !user.password) {
			return cb({ status: 'error', message: 'Invalid register request' });
		}

		// TODO: Implement register
	},

	rooms: function (cb) {
		r.table('rooms').run(rc, (err, cursor) => {
			if (err) {
				return cb({ status: 'failure', message: 'Error while fetching the rooms' });
			}
			else {
				cursor.toArray((err, result) => {
					if (err) {
						return cb({ status: 'failure', message: 'Error while fetching the rooms' });
					}
					else {
						return cb(result);
					}
				});
			}
		});
	},

	room: function (id, cb) {

		if (socket.custom.user == null) {
			return cb({ status: 'error', message: "You can't join a room until you've logged in" });
		}

		r.table('rooms').get(id).run(rc, (err, result) => {
			if (err) {
				return cb({ status: 'error', message: 'Room with that id does not exist' });
			}
			else {
				socket.custom.roomId = id;

				var userInfo = {
					username: socket.custom.user.username
				};

				var otherUsersInfo = [];

				// tell all the users in this room that someone is joining it
				io.sockets.clients().forEach((otherSocket) => {
					if (otherSocket != socket && otherSocket.custom.roomId == id) {
						otherUsersInfo.push({ username: otherSocket.custom.user.username });
						otherSocket.emit('room', { status: 'joining', user: userInfo });
					}
				});

				return cb({
					status: 'joined',
					data: {
						room: result,
						users: otherUsersInfo
					}
				});
			}
		});
	},

	search: function (query, cb) {
		request('https://www.googleapis.com/youtube/v3/search?' + [
				'part=snippet', `q=${encodeURIComponent(query)}`, `key=${config.get('apis.youtube.key')}`, 'type=video', 'maxResults=25'
			].join('&'), (err, res, body) => {
			if (err) {
				socket.emit('search', { status: 'error', message: 'Failed to make request' });
			}
			else {
				try {
					socket.emit('search', { status: 'success', body: JSON.parse(body) });
				}
				catch (e) {
					socket.emit('search', { status: 'error', message: 'Non JSON response' });
				}
			}
		});
	}
};
