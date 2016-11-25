'use strict';

// This file contains all the logic for Socket.IO

const app = require('./app');
const actions = require('./actions');
const cache = require('./cache');
const utils = require('./utils');

module.exports = {

	io: null,

	init: (cb) => {

		//TODO Check every 30s/60s, for all sockets, if they are still allowed to be in the rooms they are in, and on socket at all (permission changing/banning)
		this.io = require('socket.io')(app.server);

		this.io.use((socket, next) => {
			let cookies = socket.request.headers.cookie;
			// set the sessionId for the socket (this will have to be checked every request, this allows us to have a logout all devices option)
			if (cookies) socket.sessionId = utils.cookies.parseCookies(cookies).SID;
			return next();
		});

		this.io.on('connection', socket => {

			socket.join("SomeRoom");
			console.log("io: User has connected");

			// catch when the socket has been disconnected
			socket.on('disconnect', () => {

				// remove the user from their current station (if any)
				if (socket.sessionId) {
					//actions.stations.leave(socket.sessionId, result => {});
					delete socket.sessionId;
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
								return cb({
									status: 'error',
									message: 'An error occurred while obtaining your session'
								});
							}

							// make sure the sockets sessionId isn't set if there is no session
							if (socket.sessionId && session === null) delete socket.sessionId;

							// call the action, passing it the session, and the arguments socket.io passed us
							actions[namespace][action].apply(null, [session].concat(args).concat([
								(result) => {
									// store the session id
									if (name == 'users.login' && result.user) socket.sessionId = result.user.sessionId;
									// respond to the socket with our message
									cb(result);
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
					socket.emit('ready', true);
				} else {
					socket.emit('ready', false);
				}
			});
		});

		cb();
	}

};