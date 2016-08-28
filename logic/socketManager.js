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

module.exports = {

	setup: (io, rc) => {

		r.table('comments')

	},

	handle: (socket, io, rc) => {

		socket.custom = {};

		socket.on('disconnect', () => {

		});

		socket.on('login', (user) => {

			if (!user.username || !user.password) {
				socket.emit('login', { status: 'error', message: 'Invalid login request' });
				return;
			}

			r.table('users').filter({
				username: user.username, password: crypto.createHash('md5').update(user.password).digest("hex")
			}).run(rc, (err, cursor) => {
				if (err) {
					socket.emit('login', { status: 'failure', message: 'Error while fetching the user' });
				}
				else {
					cursor.toArray((err, result) => {
						if (err) {
							socket.emit('login', { status: 'failure', message: 'Error while fetching the user' });
						}
						else {
							socket.emit('login', { status: 'success', user: result });
						}
					});
				}
			});
		});

		socket.on('register', (user) => {

			console.log(user);

			if (!user.email || !user.username || !user.password) {
				socket.emit('register', { status: 'error', message: 'Invalid register request' });
				return;
			}
		});

		socket.on('rooms', () => {
			r.table('rooms').run(rc, (err, cursor) => {
				if (err) {
					socket.emit('rooms', { status: 'failure', message: 'Error while fetching the rooms' });
				}
				else {
					cursor.toArray((err, result) => {
						if (err) {
							socket.emit('rooms', { status: 'failure', message: 'Error while fetching the rooms' });
						}
						else {
							socket.emit('rooms', result);
						}
					});
				}
			});
		});

		socket.on('room', (id) => {

			if (socket.custom.user == null) {
				socket.emit('room', { status: 'error', message: "You can't join a room until you've logged in" });
				return;
			}

			r.table('rooms').get(id).run(rc, (err, result) => {
				if (err) {
					socket.emit('room', { status: 'error', message: 'Room with that id does not exist' });
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

					socket.emit('room', { status: 'joined', data: {
						room: result, users: otherUsersInfo
					}});
				}
			});
		});

		socket.on('search', (query) => {
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
		});

		socket.emit('ready');
	}
};
