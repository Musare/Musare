'use strict';

// This file contains all the logic for Socket.IO

const app = require('./app');
const actions = require('./actions');
const cache = require('./cache');
const utils = require('./utils');
const db = require('./db');

module.exports = {

	io: null,

	init: (cb) => {
		//TODO Check every 30s/60s, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
		this.io = require('socket.io')(app.server);

		this.io.use((socket, next) => {
			let cookies = socket.request.headers.cookie;
			let SID = utils.cookies.parseCookies(cookies).SID;

			cache.hget('userSessions', SID, (err, userSession) => {
				console.log(err, userSession);
				if (err) {
					SID = null;
				}
				let sessionId = utils.guid();
				cache.hset('sessions', sessionId, cache.schemas.session(SID), (err) => {
					socket.sessionId = sessionId;
					return next();
				});
			});
		});

		this.io.on('connection', socket => {
			socket.join("SomeRoom");
			console.log("io: User has connected");

			// catch when the socket has been disconnected
			socket.on('disconnect', () => {

				// remove the user from their current station (if any)
				if (socket.sessionId) {
					//actions.stations.leave(socket.sessionId, result => {});
					// Remove session from Redis
					cache.hdel('sessions', socket.sessionId);
				}

				console.log('io: User has disconnected');
			});

			// catch errors on the socket (internal to socket.io)
			socket.on('error', err => console.log(err));

			// have the socket listen for each action
			Object.keys(actions).forEach((namespace) => {
				Object.keys(actions[namespace]).forEach((action) => {

					// the full name of the action
					let name = `${namespace}.${action}`;

					// listen for this action to be called
					socket.on(name, function () {

						let args = Array.prototype.slice.call(arguments, 0, -1);
						let cb = arguments[arguments.length - 1];

						// load the session from the cache
						cache.hget('sessions', socket.sessionId, (err, session) => {
							if (err && err !== true) {
								if (typeof cb === 'function') return cb({
									status: 'error',
									message: 'An error occurred while obtaining your session'
								});
							}

							// make sure the sockets sessionId isn't set if there is no session
							if (socket.sessionId && session === null) delete socket.sessionId;

							// call the action, passing it the session, and the arguments socket.io passed us
							actions[namespace][action].apply(null, [socket.sessionId].concat(args).concat([
								(result) => {
									// respond to the socket with our message
									if (typeof cb === 'function') return cb(result);
								}
							]));
						});
					})
				})
			});

			//TODO check if session is valid before returning true/false
			if (socket.sessionId !== undefined) cache.hget('sessions', socket.sessionId, (err, session) => {
				if (err && err !== true) {
					socket.emit('ready', false);
				} else if (session) {
					if (!!session.userSessionId) {
						cache.hget('userSessions', session.userSessionId, (err2, userSession) => {
							if (err2 && err2 !== true) {
								socket.emit('ready', false);
							} else if (userSession) {
								db.models.user.findOne({_id: userSession.userId}, (err, user) => {
									let role = 'default';
									if (user) {
										role = user.role;
									}
									socket.emit('ready', true, role);
								});
							} else {
								socket.emit('ready', false);
							}
						});
					} else {
						socket.emit('ready', false);
					}
				} else {
					socket.emit('ready', false);
				}
			});
		});

		cb();
	}

};