'use strict';

// This file contains all the logic for Socket.IO

const app = require('./app');
const actions = require('./actions');
const cache = require('./cache');

module.exports = {

	io: null,

	init: (cb) => {

		this.io = require('socket.io')(app.server);

		this.io.on('connection', socket => {

			console.log("io: User has connected");

			// catch when the socket has been disconnected
			socket.on('disconnect', () => {

				// remove the user from their current station
				if (socket.sessionId) {
					actions.stations.leave(socket.sessionId, result => {});
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
						let session = cache.findRow('sessions', 'id', socket.sessionId);

						// if the action set 'session' to null, that means they want to delete it
						if (session === null) delete socket.sessionId;

						// call the action, passing it the session, and the arguments socket.io passed us
						actions[namespace][action].apply(null, [session].concat(args).concat([
							(result) => {
								// store the session id, which we use later when the user disconnects
								if (name == 'users.login' && result.user) socket.sessionId = result.user.sessionId;
								// respond to the socket with our message
								cb(result);
							}
						]));
					})
				})
			});

			socket.emit('ready');
		});

		cb();
	}

};