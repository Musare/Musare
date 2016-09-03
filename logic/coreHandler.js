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

	disconnect: function () {//TODO Find out why we even need this.

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
		var _rooms = stations.map(function(result) {
			return {
				id: result.getId(),
				displayName: result.getDisplayName(),
				description: result.getDescription(),
				users: result.getUsers()
			}
		});
		cb(_rooms);
	},

	joinRoom: function (id, cb) {//TODO Think of a better name than joinRoom

		var room = getStation(id);
		socket.custom.roomId = id;

		var userInfo = {
			username: socket.custom.user.username
		};

		// tell all the users in this room that someone is joining it
		io.sockets.clients().forEach(function (otherSocket) {
			if (otherSocket != socket && otherSocket.custom.roomId === id) {
				otherSocket.emit('roomUserJoin', { user: userInfo });
			}
		});
		//TODO Add errors.
		return cb({
			status: 'joined',
			data: {
				room: room
			}
		});
	},

	search: function (query, cb) {//TODO Replace search with a better name.
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
